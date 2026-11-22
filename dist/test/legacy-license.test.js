import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryLegacyLicenseStore, LegacyLicenseCompatService, parseLemonSqueezyLicensesCsv, parseLemonSqueezyLicensesJson } from "../src/index.js";
describe("LegacyLicenseCompatService", () => {
    const sampleExportJson = JSON.stringify({
        data: [
            {
                id: 101,
                attributes: {
                    key: "LS-KEY-ACTIVE-001",
                    status: "active",
                    activation_limit: 2,
                    created_at: "2025-05-01T10:00:00Z",
                    expires_at: "2028-01-01T00:00:00Z",
                    store_id: 1,
                    order_id: 22,
                    product_id: 33,
                    customer_id: 44
                }
            },
            {
                id: 102,
                attributes: {
                    key: "LS-KEY-EXPIRED-002",
                    status: "active",
                    activation_limit: 1,
                    created_at: "2024-01-01T00:00:00Z",
                    expires_at: "2025-01-01T00:00:00Z"
                }
            }
        ]
    });
    it("imports LS JSON export, activates up to limit, validates, and deactivates", async () => {
        const records = parseLemonSqueezyLicensesJson(sampleExportJson);
        const store = new InMemoryLegacyLicenseStore(records);
        const service = new LegacyLicenseCompatService(store, undefined, () => new Date("2026-11-22T12:00:00Z"));
        // Activate 2 devices
        const act1 = await service.activate("LS-KEY-ACTIVE-001", "MacBook Pro");
        assert.equal(act1.activated, true);
        assert.equal(act1.valid, true);
        assert.ok(act1.instance?.id);
        const act2 = await service.activate("LS-KEY-ACTIVE-001", "Workstation");
        assert.equal(act2.activated, true);
        assert.equal(act2.license_key?.activation_usage, 2);
        // 3rd device hits activation_limit=2
        const act3 = await service.activate("LS-KEY-ACTIVE-001", "Laptop 3");
        assert.equal(act3.activated, false);
        assert.equal(act3.valid, false);
        assert.match(act3.error ?? "", /activation limit/i);
        // Validate with instance_id returns LS-compatible shape
        const val = await service.validate("LS-KEY-ACTIVE-001", act1.instance.id);
        assert.equal(val.valid, true);
        assert.equal(val.license_key?.key, "LS-KEY-ACTIVE-001");
        assert.equal(val.meta?.product_id, 33);
        // Deactivate 1st device frees slot
        const deact = await service.deactivate("LS-KEY-ACTIVE-001", act1.instance.id);
        assert.equal(deact.deactivated, true);
        const actRetry = await service.activate("LS-KEY-ACTIVE-001", "Laptop 3");
        assert.equal(actRetry.activated, true);
        // Expired key rejected
        const exp = await service.validate("LS-KEY-EXPIRED-002");
        assert.equal(exp.valid, false);
        assert.match(exp.error ?? "", /expired/i);
    });
    it("parses CSV exports and delegates unknown keys to Polar fallback", async () => {
        const csv = [
            "id,key,status,activation_limit,created_at,expires_at,product_id,product_name,customer_email",
            "1,LS-CSV-KEY,active,3,2026-01-01T00:00:00Z,,99,DesktopApp,dev@example.com.tr"
        ].join("\n");
        const store = new InMemoryLegacyLicenseStore(parseLemonSqueezyLicensesCsv(csv));
        const service = new LegacyLicenseCompatService(store, {
            organizationId: "org_polar_1",
            fetchImpl: async () => new Response(JSON.stringify({
                id: "polar_lic_1",
                key: "POLAR_NEW_KEY_999",
                status: "granted",
                limit_activations: 5,
                expires_at: null
            }), { status: 200 })
        });
        const csvRes = await service.validate("LS-CSV-KEY");
        assert.equal(csvRes.valid, true);
        assert.equal(csvRes.meta?.customer_email, "dev@example.com.tr");
        const polarRes = await service.validate("POLAR_NEW_KEY_999");
        assert.equal(polarRes.valid, true);
        assert.equal(polarRes.license_key?.id, "polar_lic_1");
    });
});
//# sourceMappingURL=legacy-license.test.js.map