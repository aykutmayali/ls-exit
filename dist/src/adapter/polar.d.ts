import type { BillingProvider, CheckoutRequest, CheckoutResult, NormalizedWebhookEvent } from "./types.js";
export interface PolarProviderConfig {
    accessToken: string;
    webhookSecret: string;
    sandbox?: boolean;
    /** Maximum clock skew allowed on Standard Webhooks timestamp (seconds). Default 300. */
    webhookToleranceSeconds?: number;
    fetchImpl?: typeof fetch;
}
export declare function verifyPolarWebhookSignature(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>, webhookSecret: string, toleranceSeconds?: number, nowEpochSeconds?: number): void;
export declare class PolarBillingProvider implements BillingProvider {
    private readonly config;
    readonly id: "polar";
    private readonly baseUrl;
    private readonly fetchImpl;
    private readonly tolerance;
    constructor(config: PolarProviderConfig);
    createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
    verifyAndNormalizeWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>, nowEpochSeconds?: number): NormalizedWebhookEvent;
    getCustomerPortalUrl(customerId: string): Promise<string>;
}
