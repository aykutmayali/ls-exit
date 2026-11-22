import type { BillingProvider, BillingProviderId, CheckoutRequest, CheckoutResult, NormalizedWebhookEvent } from "./types.js";
export interface LegacyLemonSqueezyConfig {
    webhookSecret: string;
    apiKey?: string;
    fetchImpl?: typeof fetch;
}
export declare function verifyAndNormalizeLemonSqueezyWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>, webhookSecret: string): NormalizedWebhookEvent;
/**
 * DualProviderRouter keeps existing Lemon Squeezy subscribers working cleanly
 * while routing all new checkouts to your target Merchant of Record (e.g. Polar).
 */
export declare class DualProviderRouter {
    private readonly primaryProvider;
    private readonly legacyLs?;
    constructor(primaryProvider: BillingProvider, legacyLs?: LegacyLemonSqueezyConfig | undefined);
    createNewCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
    handleWebhook(sourceProvider: BillingProviderId, rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): NormalizedWebhookEvent;
    resolveCustomerPortalUrl(customerProvider: BillingProviderId, providerCustomerIdOrSubscriptionId: string): Promise<string>;
}
