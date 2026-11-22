import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { DualProviderRouter, PolarBillingProvider } from "../src/index.js";

describe("DualProviderRouter", () => {
  it("handles both legacy Lemon Squeezy webhooks and Polar portal routing during migration", async () => {
    const lsSecret = "ls_test_secret_123";
    const polar = new PolarBillingProvider({
      accessToken: "polar_oat",
      webhookSecret: "whsec_dGVzdA==",
      fetchImpl: async () =>
        new Response(JSON.stringify({ customer_portal_url: "https://polar.sh/portal/1" }), {
          status: 200
        })
    });

    const router = new DualProviderRouter(polar, {
      webhookSecret: lsSecret,
      apiKey: "ls_api_key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: { attributes: { urls: { customer_portal: "https://shop.lemonsqueezy.com/billing?tok=1" } } }
          }),
          { status: 200 }
        )
    });

    const lsBody = JSON.stringify({
      meta: {
        event_name: "subscription_cancelled",
        webhook_id: "wh_ls_1",
        custom_data: { user_id: "u_99" }
      },
      data: {
        id: "sub_ls_1",
        type: "subscriptions",
        attributes: {
          customer_id: 500,
          user_email: "legacy@example.com",
          product_id: 10,
          updated_at: "2026-12-01T00:00:00Z"
        }
      }
    });

    const lsSig = crypto.createHmac("sha256", lsSecret).update(lsBody).digest("hex");
    const event = router.handleWebhook("lemonsqueezy", lsBody, {
      "x-signature": lsSig,
      "x-event-name": "subscription_cancelled"
    });

    assert.equal(event.provider, "lemonsqueezy");
    assert.equal(event.type, "subscription.canceled");
    assert.equal(event.customerExternalId, "u_99");
    assert.equal(event.subscriptionId, "sub_ls_1");

    const lsPortal = await router.resolveCustomerPortalUrl("lemonsqueezy", "500");
    assert.match(lsPortal, /lemonsqueezy\.com\/billing/);

    const polarPortal = await router.resolveCustomerPortalUrl("polar", "cust_1");
    assert.equal(polarPortal, "https://polar.sh/portal/1");
  });
});
