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
function mapLemonSqueezyEvent(eventName) {
    switch (eventName) {
        case "order_created":
            return "order.completed";
        case "order_refunded":
            return "order.refunded";
        case "subscription_created":
        case "subscription_resumed":
        case "subscription_unpaused":
        case "subscription_payment_success":
        case "subscription_payment_recovered":
            return "subscription.active";
        case "subscription_updated":
        case "subscription_paused":
            return "subscription.updated";
        case "subscription_cancelled":
            return "subscription.canceled";
        case "subscription_expired":
            return "subscription.revoked";
        case "license_key_created":
            return "license.created";
        default:
            return "unknown";
    }
}
export function verifyAndNormalizeLemonSqueezyWebhook(rawBody, headers, webhookSecret) {
    if (!webhookSecret) {
        throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is missing");
    }
    const signatureHex = getHeader(headers, "x-signature");
    if (!signatureHex) {
        throw new Error("Missing Lemon Squeezy X-Signature header");
    }
    const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    const expectedHex = crypto
        .createHmac("sha256", webhookSecret)
        .update(bodyBuf)
        .digest("hex");
    const actualBuf = Buffer.from(signatureHex, "utf8");
    const expectedBuf = Buffer.from(expectedHex, "utf8");
    if (actualBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
        throw new Error("Invalid Lemon Squeezy webhook signature");
    }
    const payload = JSON.parse(bodyBuf.toString("utf8"));
    const eventName = payload.meta?.event_name ?? getHeader(headers, "x-event-name") ?? "unknown";
    const attrs = payload.data?.attributes ?? {};
    const customData = payload.meta?.custom_data ?? {};
    const metadata = {};
    for (const [k, v] of Object.entries(customData)) {
        if (v !== undefined && v !== null)
            metadata[k] = String(v);
    }
    const dataType = payload.data?.type ?? "";
    return {
        provider: "lemonsqueezy",
        eventId: payload.meta?.webhook_id ?? `${eventName}:${payload.data?.id ?? "unknown"}`,
        rawEventType: eventName,
        type: mapLemonSqueezyEvent(eventName),
        occurredAt: typeof attrs.updated_at === "string"
            ? attrs.updated_at
            : typeof attrs.created_at === "string"
                ? attrs.created_at
                : new Date().toISOString(),
        customerId: attrs.customer_id !== undefined ? String(attrs.customer_id) : undefined,
        customerExternalId: metadata.user_id ?? metadata.customer_external_id,
        customerEmail: typeof attrs.user_email === "string" ? attrs.user_email : undefined,
        productId: attrs.product_id !== undefined ? String(attrs.product_id) : undefined,
        subscriptionId: dataType === "subscriptions"
            ? payload.data?.id
            : attrs.subscription_id !== undefined
                ? String(attrs.subscription_id)
                : undefined,
        orderId: dataType === "orders" ? payload.data?.id : undefined,
        amountCents: typeof attrs.total === "number" ? attrs.total : undefined,
        currency: typeof attrs.currency === "string" ? attrs.currency : undefined,
        metadata,
        rawPayload: payload
    };
}
/**
 * DualProviderRouter keeps existing Lemon Squeezy subscribers working cleanly
 * while routing all new checkouts to your target Merchant of Record (e.g. Polar).
 */
export class DualProviderRouter {
    primaryProvider;
    legacyLs;
    constructor(primaryProvider, legacyLs) {
        this.primaryProvider = primaryProvider;
        this.legacyLs = legacyLs;
    }
    async createNewCheckout(request) {
        return this.primaryProvider.createCheckout(request);
    }
    handleWebhook(sourceProvider, rawBody, headers) {
        if (sourceProvider === this.primaryProvider.id) {
            return this.primaryProvider.verifyAndNormalizeWebhook(rawBody, headers);
        }
        if (sourceProvider === "lemonsqueezy") {
            if (!this.legacyLs) {
                throw new Error("Legacy Lemon Squeezy config not provided");
            }
            return verifyAndNormalizeLemonSqueezyWebhook(rawBody, headers, this.legacyLs.webhookSecret);
        }
        throw new Error(`Unsupported webhook provider: ${sourceProvider}`);
    }
    async resolveCustomerPortalUrl(customerProvider, providerCustomerIdOrSubscriptionId) {
        if (customerProvider === this.primaryProvider.id) {
            return this.primaryProvider.getCustomerPortalUrl(providerCustomerIdOrSubscriptionId);
        }
        if (customerProvider === "lemonsqueezy") {
            if (!this.legacyLs?.apiKey) {
                throw new Error("LEMONSQUEEZY_API_KEY required to fetch legacy customer portal URL");
            }
            const fetchImpl = this.legacyLs.fetchImpl ?? fetch;
            const res = await fetchImpl(`https://api.lemonsqueezy.com/v1/customers/${providerCustomerIdOrSubscriptionId}`, {
                headers: {
                    Accept: "application/vnd.api+json",
                    Authorization: `Bearer ${this.legacyLs.apiKey}`
                }
            });
            if (!res.ok) {
                throw new Error(`Lemon Squeezy customer lookup failed (${res.status})`);
            }
            const json = (await res.json());
            const url = json.data?.attributes?.urls?.customer_portal;
            if (!url) {
                throw new Error("Lemon Squeezy customer_portal URL missing");
            }
            return url;
        }
        throw new Error(`Unsupported customer portal provider: ${customerProvider}`);
    }
}
//# sourceMappingURL=dual-router.js.map