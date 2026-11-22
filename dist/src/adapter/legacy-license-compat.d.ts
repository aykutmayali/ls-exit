import type { LegacyLicenseRecord, LsCompatibleLicenseResponse } from "./types.js";
export interface PolarLicenseFallbackConfig {
    organizationId: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
}
export interface LegacyLicenseStore {
    getByKey(key: string): Promise<LegacyLicenseRecord | undefined> | LegacyLicenseRecord | undefined;
    save(record: LegacyLicenseRecord): Promise<void> | void;
}
export declare class InMemoryLegacyLicenseStore implements LegacyLicenseStore {
    private readonly records;
    constructor(initialRecords?: LegacyLicenseRecord[]);
    getByKey(key: string): LegacyLicenseRecord | undefined;
    save(record: LegacyLicenseRecord): void;
    size(): number;
}
/**
 * Parse JSON exported from Lemon Squeezy GET /v1/license-keys
 */
export declare function parseLemonSqueezyLicensesJson(jsonText: string): LegacyLicenseRecord[];
/**
 * Parse simple CSV export (columns: id,key,status,activation_limit,created_at,expires_at,product_id,product_name,customer_email)
 */
export declare function parseLemonSqueezyLicensesCsv(csvText: string): LegacyLicenseRecord[];
/**
 * Drop-in replacement for Lemon Squeezy /v1/licenses/{validate,activate,deactivate}.
 * Keeps desktop apps, VS Code/Figma/Chrome plugins, and CLIs validating exported LS keys
 * after March 31, 2027, with optional fallback to Polar for newly issued keys.
 */
export declare class LegacyLicenseCompatService {
    private readonly store;
    private readonly polarFallback?;
    private readonly nowFn;
    constructor(store: LegacyLicenseStore, polarFallback?: PolarLicenseFallbackConfig | undefined, nowFn?: () => Date);
    private isExpired;
    validate(licenseKey: string, instanceId?: string): Promise<LsCompatibleLicenseResponse>;
    activate(licenseKey: string, instanceName: string): Promise<LsCompatibleLicenseResponse & {
        activated?: boolean;
    }>;
    deactivate(licenseKey: string, instanceId: string): Promise<{
        deactivated: boolean;
        error: string | null;
    }>;
    private validateViaPolar;
    private activateViaPolar;
}
