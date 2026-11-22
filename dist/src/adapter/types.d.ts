export type BillingProviderId = "lemonsqueezy" | "polar" | "paddle" | "creem" | "dodo";
export type BillingEventType = "order.completed" | "order.refunded" | "subscription.active" | "subscription.updated" | "subscription.canceled" | "subscription.revoked" | "subscription.migrated" | "license.created" | "unknown";
export interface CheckoutRequest {
    productId: string;
    successUrl: string;
    customerEmail?: string;
    customerExternalId?: string;
    metadata?: Record<string, string>;
    discountCode?: string;
}
export interface CheckoutResult {
    provider: BillingProviderId;
    checkoutId: string;
    checkoutUrl: string;
}
export interface NormalizedWebhookEvent {
    provider: BillingProviderId;
    eventId: string;
    rawEventType: string;
    type: BillingEventType;
    occurredAt: string;
    customerId?: string;
    customerExternalId?: string;
    customerEmail?: string;
    productId?: string;
    subscriptionId?: string;
    orderId?: string;
    amountCents?: number;
    currency?: string;
    metadata: Record<string, string>;
    rawPayload: unknown;
}
export interface BillingProvider {
    readonly id: BillingProviderId;
    createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
    verifyAndNormalizeWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): NormalizedWebhookEvent;
    getCustomerPortalUrl(customerId: string): Promise<string>;
}
export interface LegacyLicenseRecord {
    id: string | number;
    key: string;
    status: "active" | "inactive" | "expired" | "disabled";
    activationLimit: number | null;
    instances: Array<{
        id: string;
        name: string;
        createdAt: string;
    }>;
    createdAt: string;
    expiresAt: string | null;
    meta: {
        storeId?: number | string;
        orderId?: number | string;
        productId?: number | string;
        productName?: string;
        variantId?: number | string;
        variantName?: string;
        customerId?: number | string;
        customerName?: string;
        customerEmail?: string;
    };
}
export interface LsCompatibleLicenseResponse {
    valid: boolean;
    error: string | null;
    license_key: {
        id: string | number;
        status: string;
        key: string;
        activation_limit: number | null;
        activation_usage: number;
        created_at: string;
        expires_at: string | null;
    } | null;
    instance: {
        id: string;
        name: string;
        created_at: string;
    } | null;
    meta: {
        store_id?: string | number;
        order_id?: string | number;
        product_id?: string | number;
        product_name?: string;
        variant_id?: string | number;
        variant_name?: string;
        customer_id?: string | number;
        customer_name?: string;
        customer_email?: string;
    } | null;
}
