import crypto from "node:crypto";
function getHeader(headers, name) {
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower) {
            return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
        }
    }
    return "";
}
function constantTimeBase64Match(expectedB64, sigHeader) {
    const expectedBuf = Buffer.from(expectedB64, "utf8");
    // Standard Webhooks header may contain space-delimited entries like "v1,<b64> v1,<b64>"
    const parts = sigHeader.trim().split(/\s+/);
    for (const part of parts) {
        const [version, signature] = part.split(",", 2);
        if (version !== "v1" || !signature)
            continue;
        const actualBuf = Buffer.from(signature, "utf8");
        if (actualBuf.length === expectedBuf.length &&
            crypto.timingSafeEqual(actualBuf, expectedBuf)) {
            return true;
        }
    }
    return false;
}
export function verifyPolarWebhookSignature(rawBody, headers, webhookSecret, toleranceSeconds = 300, nowEpochSeconds = Math.floor(Date.now() / 1000)) {
    if (!webhookSecret) {
        throw new Error("POLAR_WEBHOOK_SECRET is missing");
    }
    const webhookId = getHeader(headers, "webhook-id");
    const webhookTimestamp = getHeader(headers, "webhook-timestamp");
    const webhookSignature = getHeader(headers, "webhook-signature");
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
        throw new Error("Missing Standard Webhooks headers (webhook-id/timestamp/signature)");
    }
    const ts = Number(webhookTimestamp);
    if (!Number.isFinite(ts) || Math.abs(nowEpochSeconds - ts) > toleranceSeconds) {
        throw new Error("Webhook timestamp outside tolerance window");
    }
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const signedContent = `${webhookId}.${webhookTimestamp}.${bodyStr}`;
    // Per Polar docs: secrets generated >= 2026-09-08 follow Standard Webhooks (base64 after whsec_);
    // older secrets use Polar HMAC (UTF-8 bytes of full secret string). Try Standard Webhooks key first,
    // then legacy Polar HMAC key for compatibility.
    const candidateKeys = [];
    if (webhookSecret.startsWith("whsec_")) {
        const stripped = webhookSecret.slice("whsec_".length);
        candidateKeys.push(Buffer.from(stripped, "base64"));
    }
    candidateKeys.push(Buffer.from(webhookSecret, "utf8"));
    const matched = candidateKeys.some((key) => {
        const digest = crypto
            .createHmac("sha256", key)
            .update(signedContent, "utf8")
            .digest("base64");
        return constantTimeBase64Match(digest, webhookSignature);
    });
    if (!matched) {
        throw new Error("Invalid Polar webhook signature");
    }
}
function mapPolarEventType(polarType) {
    switch (polarType) {
        case "order.paid":
            return "order.completed";
        case "order.refunded":
            return "order.refunded";
        case "subscription.active":
        case "subscription.created":
        case "subscription.uncanceled":
            return "subscription.active";
        case "subscription.updated":
            return "subscription.updated";
        case "subscription.canceled":
            return "subscription.canceled";
        case "subscription.revoked":
            return "subscription.revoked";
        case "subscription.migrated":
            return "subscription.migrated";
        case "benefit_grant.created":
            return "license.created";
        default:
            return "unknown";
    }
}
export class PolarBillingProvider {
    config;
    id = "polar";
    baseUrl;
    fetchImpl;
    tolerance;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.sandbox
            ? "https://sandbox-api.polar.sh/v1"
            : "https://api.polar.sh/v1";
        this.fetchImpl = config.fetchImpl ?? fetch;
        this.tolerance = config.webhookToleranceSeconds ?? 300;
    }
    async createCheckout(request) {
        const res = await this.fetchImpl(`${this.baseUrl}/checkouts/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                products: [request.productId],
                success_url: request.successUrl,
                customer_email: request.customerEmail,
                external_customer_id: request.customerExternalId,
                metadata: request.metadata ?? {}
            })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Polar checkout failed (${res.status}): ${errText}`);
        }
        const data = (await res.json());
        return {
            provider: "polar",
            checkoutId: data.id,
            checkoutUrl: data.url
        };
    }
    verifyAndNormalizeWebhook(rawBody, headers, nowEpochSeconds) {
        verifyPolarWebhookSignature(rawBody, headers, this.config.webhookSecret, this.tolerance, nowEpochSeconds);
        const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
        const payload = JSON.parse(bodyStr);
        const data = (payload.data ?? {});
        const customer = (data.customer ?? {});
        const metadataRaw = (data.metadata ?? {});
        const metadata = {};
        for (const [k, v] of Object.entries(metadataRaw)) {
            if (v !== undefined && v !== null)
                metadata[k] = String(v);
        }
        const isSubscription = payload.type.startsWith("subscription.");
        const isOrder = payload.type.startsWith("order.");
        return {
            provider: "polar",
            eventId: getHeader(headers, "webhook-id"),
            rawEventType: payload.type,
            type: mapPolarEventType(payload.type),
            occurredAt: payload.timestamp ?? new Date().toISOString(),
            customerId: typeof data.customer_id === "string" ? data.customer_id : undefined,
            customerExternalId: typeof customer.external_id === "string" ? customer.external_id : undefined,
            customerEmail: typeof customer.email === "string"
                ? customer.email
                : typeof data.customer_email === "string"
                    ? data.customer_email
                    : undefined,
            productId: typeof data.product_id === "string" ? data.product_id : undefined,
            subscriptionId: isSubscription
                ? data.id
                : data.subscription_id,
            orderId: isOrder ? data.id : undefined,
            amountCents: typeof data.net_amount === "number"
                ? data.net_amount
                : typeof data.total_amount === "number"
                    ? data.total_amount
                    : undefined,
            currency: typeof data.currency === "string" ? data.currency : undefined,
            metadata,
            rawPayload: payload
        };
    }
    async getCustomerPortalUrl(customerId) {
        const res = await this.fetchImpl(`${this.baseUrl}/customer-sessions/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ customer_id: customerId })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Polar customer session failed (${res.status}): ${errText}`);
        }
        const data = (await res.json());
        return data.customer_portal_url;
    }
}
//# sourceMappingURL=polar.js.map