import crypto from "node:crypto";
export class InMemoryLegacyLicenseStore {
    records = new Map();
    constructor(initialRecords = []) {
        for (const r of initialRecords) {
            this.records.set(r.key, r);
        }
    }
    getByKey(key) {
        return this.records.get(key);
    }
    save(record) {
        this.records.set(record.key, record);
    }
    size() {
        return this.records.size;
    }
}
/**
 * Parse JSON exported from Lemon Squeezy GET /v1/license-keys
 */
export function parseLemonSqueezyLicensesJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.data)) {
        throw new Error("Expected Lemon Squeezy license export JSON with data[] array");
    }
    return parsed.data.map((item) => ({
        id: item.id,
        key: item.attributes.key,
        status: item.attributes.status,
        activationLimit: item.attributes.activation_limit ?? null,
        instances: [],
        createdAt: item.attributes.created_at,
        expiresAt: item.attributes.expires_at ?? null,
        meta: {
            storeId: item.attributes.store_id,
            orderId: item.attributes.order_id,
            productId: item.attributes.product_id,
            customerId: item.attributes.customer_id
        }
    }));
}
/**
 * Parse simple CSV export (columns: id,key,status,activation_limit,created_at,expires_at,product_id,product_name,customer_email)
 */
export function parseLemonSqueezyLicensesCsv(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (name) => headers.indexOf(name);
    const keyCol = idx("key");
    if (keyCol === -1) {
        throw new Error("CSV export must include a 'key' column");
    }
    return lines.slice(1).map((line, rowIdx) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const rawLimit = idx("activation_limit") >= 0 ? cols[idx("activation_limit")] : "";
        const parsedLimit = rawLimit ? Number(rawLimit) : null;
        const rawStatus = (idx("status") >= 0 ? cols[idx("status")] : "active");
        return {
            id: idx("id") >= 0 && cols[idx("id")] ? cols[idx("id")] : rowIdx + 1,
            key: cols[keyCol],
            status: rawStatus || "active",
            activationLimit: Number.isFinite(parsedLimit) ? parsedLimit : null,
            instances: [],
            createdAt: idx("created_at") >= 0 && cols[idx("created_at")]
                ? cols[idx("created_at")]
                : new Date().toISOString(),
            expiresAt: idx("expires_at") >= 0 && cols[idx("expires_at")] ? cols[idx("expires_at")] : null,
            meta: {
                productId: idx("product_id") >= 0 ? cols[idx("product_id")] : undefined,
                productName: idx("product_name") >= 0 ? cols[idx("product_name")] : undefined,
                customerEmail: idx("customer_email") >= 0 ? cols[idx("customer_email")] : undefined
            }
        };
    });
}
function formatMeta(record) {
    return {
        store_id: record.meta.storeId,
        order_id: record.meta.orderId,
        product_id: record.meta.productId,
        product_name: record.meta.productName,
        variant_id: record.meta.variantId,
        variant_name: record.meta.variantName,
        customer_id: record.meta.customerId,
        customer_name: record.meta.customerName,
        customer_email: record.meta.customerEmail
    };
}
function formatLicenseKeyObj(record) {
    return {
        id: record.id,
        status: record.status,
        key: record.key,
        activation_limit: record.activationLimit,
        activation_usage: record.instances.length,
        created_at: record.createdAt,
        expires_at: record.expiresAt
    };
}
/**
 * Drop-in replacement for Lemon Squeezy /v1/licenses/{validate,activate,deactivate}.
 * Keeps desktop apps, VS Code/Figma/Chrome plugins, and CLIs validating exported LS keys
 * after March 31, 2027, with optional fallback to Polar for newly issued keys.
 */
export class LegacyLicenseCompatService {
    store;
    polarFallback;
    nowFn;
    constructor(store, polarFallback, nowFn = () => new Date()) {
        this.store = store;
        this.polarFallback = polarFallback;
        this.nowFn = nowFn;
    }
    isExpired(record) {
        if (record.status === "expired")
            return true;
        if (!record.expiresAt)
            return false;
        return new Date(record.expiresAt).getTime() <= this.nowFn().getTime();
    }
    async validate(licenseKey, instanceId) {
        const record = await this.store.getByKey(licenseKey);
        if (!record) {
            if (this.polarFallback) {
                return this.validateViaPolar(licenseKey, instanceId);
            }
            return {
                valid: false,
                error: "license_key not found",
                license_key: null,
                instance: null,
                meta: null
            };
        }
        if (record.status === "disabled") {
            return {
                valid: false,
                error: "This license key is disabled.",
                license_key: formatLicenseKeyObj(record),
                instance: null,
                meta: formatMeta(record)
            };
        }
        if (this.isExpired(record)) {
            return {
                valid: false,
                error: "This license key has expired.",
                license_key: { ...formatLicenseKeyObj(record), status: "expired" },
                instance: null,
                meta: formatMeta(record)
            };
        }
        let matchedInstance = null;
        if (instanceId) {
            const found = record.instances.find((inst) => inst.id === instanceId);
            if (!found) {
                return {
                    valid: false,
                    error: "instance_id not found for this license key.",
                    license_key: formatLicenseKeyObj(record),
                    instance: null,
                    meta: formatMeta(record)
                };
            }
            matchedInstance = {
                id: found.id,
                name: found.name,
                created_at: found.createdAt
            };
        }
        return {
            valid: true,
            error: null,
            license_key: formatLicenseKeyObj(record),
            instance: matchedInstance,
            meta: formatMeta(record)
        };
    }
    async activate(licenseKey, instanceName) {
        const record = await this.store.getByKey(licenseKey);
        if (!record) {
            if (this.polarFallback) {
                return this.activateViaPolar(licenseKey, instanceName);
            }
            return {
                activated: false,
                valid: false,
                error: "license_key not found",
                license_key: null,
                instance: null,
                meta: null
            };
        }
        if (record.status === "disabled" || this.isExpired(record)) {
            return {
                activated: false,
                valid: false,
                error: record.status === "disabled"
                    ? "This license key is disabled."
                    : "This license key has expired.",
                license_key: formatLicenseKeyObj(record),
                instance: null,
                meta: formatMeta(record)
            };
        }
        if (record.activationLimit !== null &&
            record.instances.length >= record.activationLimit) {
            return {
                activated: false,
                valid: false,
                error: "This license key has reached the activation limit.",
                license_key: formatLicenseKeyObj(record),
                instance: null,
                meta: formatMeta(record)
            };
        }
        const instance = {
            id: crypto.randomUUID(),
            name: instanceName,
            createdAt: this.nowFn().toISOString()
        };
        record.instances.push(instance);
        if (record.status === "inactive") {
            record.status = "active";
        }
        await this.store.save(record);
        return {
            activated: true,
            valid: true,
            error: null,
            license_key: formatLicenseKeyObj(record),
            instance: {
                id: instance.id,
                name: instance.name,
                created_at: instance.createdAt
            },
            meta: formatMeta(record)
        };
    }
    async deactivate(licenseKey, instanceId) {
        const record = await this.store.getByKey(licenseKey);
        if (!record) {
            return { deactivated: false, error: "license_key not found" };
        }
        const before = record.instances.length;
        record.instances = record.instances.filter((i) => i.id !== instanceId);
        if (record.instances.length === before) {
            return { deactivated: false, error: "instance_id not found" };
        }
        await this.store.save(record);
        return { deactivated: true, error: null };
    }
    async validateViaPolar(licenseKey, instanceId) {
        const fallback = this.polarFallback;
        const fetchImpl = fallback.fetchImpl ?? fetch;
        const baseUrl = fallback.baseUrl ?? "https://api.polar.sh/v1";
        const res = await fetchImpl(`${baseUrl}/customer-portal/license-keys/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: licenseKey,
                organization_id: fallback.organizationId,
                ...(instanceId ? { activation_id: instanceId } : {})
            })
        });
        if (!res.ok) {
            return {
                valid: false,
                error: `Polar license validation failed (${res.status})`,
                license_key: null,
                instance: null,
                meta: null
            };
        }
        const polar = (await res.json());
        const valid = polar.status === "granted";
        return {
            valid,
            error: valid ? null : `License status is ${polar.status}`,
            license_key: {
                id: polar.id,
                status: valid ? "active" : polar.status,
                key: polar.key,
                activation_limit: polar.limit_activations,
                activation_usage: polar.activation ? 1 : 0,
                created_at: new Date().toISOString(),
                expires_at: polar.expires_at
            },
            instance: polar.activation
                ? {
                    id: polar.activation.id,
                    name: polar.activation.label,
                    created_at: polar.activation.created_at
                }
                : null,
            meta: null
        };
    }
    async activateViaPolar(licenseKey, instanceName) {
        const fallback = this.polarFallback;
        const fetchImpl = fallback.fetchImpl ?? fetch;
        const baseUrl = fallback.baseUrl ?? "https://api.polar.sh/v1";
        const res = await fetchImpl(`${baseUrl}/customer-portal/license-keys/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: licenseKey,
                organization_id: fallback.organizationId,
                label: instanceName
            })
        });
        if (!res.ok) {
            return {
                activated: false,
                valid: false,
                error: `Polar license activation failed (${res.status})`,
                license_key: null,
                instance: null,
                meta: null
            };
        }
        const data = (await res.json());
        const valid = data.license_key.status === "granted";
        return {
            activated: valid,
            valid,
            error: valid ? null : `License status is ${data.license_key.status}`,
            license_key: {
                id: data.license_key.id,
                status: valid ? "active" : data.license_key.status,
                key: data.license_key.key,
                activation_limit: data.license_key.limit_activations,
                activation_usage: 1,
                created_at: data.created_at,
                expires_at: data.license_key.expires_at
            },
            instance: {
                id: data.id,
                name: data.label,
                created_at: data.created_at
            },
            meta: null
        };
    }
}
//# sourceMappingURL=legacy-license-compat.js.map