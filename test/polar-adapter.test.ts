import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { PolarBillingProvider } from "../src/index.js";

function signStandardWebhook(
  secret: string,
  webhookId: string,
  timestamp: string,
  body: string
): string {
  const keyBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");
  const digest = crypto
    .createHmac("sha256", keyBytes)
    .update(`${webhookId}.${timestamp}.${body}`, "utf8")
    .digest("base64");
  return `v1,${digest}`;
}

describe("PolarBillingProvider", () => {
  const rawSecretBytes = crypto.randomBytes(32);
  const webhookSecret = `whsec_${rawSecretBytes.toString("base64")}`;

  it("verifies valid Standard Webhooks signature and normalizes subscription.migrated", () => {
    const provider = new PolarBillingProvider({
      accessToken: "polar_oat_test",
      webhookSecret
    });

    const body = JSON.stringify({
      type: "subscription.migrated",
      timestamp: "2026-12-05T10:00:00Z",
      data: {
        id: "sub_polar_123",
        customer_id: "cust_polar_99",
        product_id: "prod_1",
        currency: "usd",
        net_amount: 1900,
        customer: {
          email: "founder@example.com.tr",
          external_id: "user_42"
        },
        metadata: {
          ls_subscription_id: "ls_sub_77"
        }
      }
    });

    const nowSec = 1796464800;
    const webhookId = "msg_001";
    const sig = signStandardWebhook(webhookSecret, webhookId, String(nowSec), body);

    const event = provider.verifyAndNormalizeWebhook(
      body,
      {
        "webhook-id": webhookId,
        "webhook-timestamp": String(nowSec),
        "webhook-signature": sig
      },
      nowSec
    );

    assert.equal(event.provider, "polar");
    assert.equal(event.type, "subscription.migrated");
    assert.equal(event.subscriptionId, "sub_polar_123");
    assert.equal(event.customerEmail, "founder@example.com.tr");
    assert.equal(event.customerExternalId, "user_42");
    assert.equal(event.metadata.ls_subscription_id, "ls_sub_77");
  });

  it("rejects tampered payloads and stale timestamps", () => {
    const provider = new PolarBillingProvider({
      accessToken: "polar_oat_test",
      webhookSecret,
      webhookToleranceSeconds: 60
    });

    const body = JSON.stringify({ type: "order.paid", data: { id: "ord_1" } });
    const nowSec = 1796464800;
    const sig = signStandardWebhook(webhookSecret, "msg_002", String(nowSec), body);

    assert.throws(() => {
      provider.verifyAndNormalizeWebhook(
        JSON.stringify({ type: "order.paid", data: { id: "ord_HACKED" } }),
        {
          "webhook-id": "msg_002",
          "webhook-timestamp": String(nowSec),
          "webhook-signature": sig
        },
        nowSec
      );
    }, /Invalid Polar webhook signature/);

    assert.throws(() => {
      provider.verifyAndNormalizeWebhook(
        body,
        {
          "webhook-id": "msg_002",
          "webhook-timestamp": String(nowSec - 120),
          "webhook-signature": sig
        },
        nowSec
      );
    }, /outside tolerance window/);
  });

  it("creates checkout and customer portal URL via Polar API", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/checkouts/")) {
        return new Response(
          JSON.stringify({ id: "chk_123", url: "https://polar.sh/checkout/chk_123" }),
          { status: 201 }
        );
      }
      return new Response(
        JSON.stringify({ customer_portal_url: "https://polar.sh/portal/sess_1" }),
        { status: 201 }
      );
    };

    const provider = new PolarBillingProvider({
      accessToken: "polar_oat_test",
      webhookSecret,
      sandbox: true,
      fetchImpl: mockFetch
    });

    const chk = await provider.createCheckout({
      productId: "prod_pro",
      successUrl: "https://app.example.com/thanks",
      customerEmail: "buyer@example.com"
    });
    assert.equal(chk.checkoutUrl, "https://polar.sh/checkout/chk_123");
    assert.match(calls[0].url, /^https:\/\/sandbox-api\.polar\.sh\/v1\/checkouts\//);

    const portalUrl = await provider.getCustomerPortalUrl("cust_1");
    assert.equal(portalUrl, "https://polar.sh/portal/sess_1");
  });
});
