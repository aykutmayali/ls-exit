export { scanRepository, shouldFailForSeverity } from "./scanner/scanner.js";
export { formatJsonReport, formatMarkdownReport } from "./scanner/reporters.js";
export { SCAN_RULES } from "./scanner/rules.js";
export type {
  FindingCategory,
  LanguageKind,
  ScanFinding,
  ScanOptions,
  ScanReport,
  ScanRule,
  ScanSummary,
  Severity,
  TargetProvider
} from "./scanner/types.js";

export {
  PolarBillingProvider,
  verifyPolarWebhookSignature
} from "./adapter/polar.js";
export type { PolarProviderConfig } from "./adapter/polar.js";

export {
  DualProviderRouter,
  verifyAndNormalizeLemonSqueezyWebhook
} from "./adapter/dual-router.js";
export type { LegacyLemonSqueezyConfig } from "./adapter/dual-router.js";

export {
  InMemoryLegacyLicenseStore,
  LegacyLicenseCompatService,
  parseLemonSqueezyLicensesCsv,
  parseLemonSqueezyLicensesJson
} from "./adapter/legacy-license-compat.js";
export type {
  LegacyLicenseStore,
  PolarLicenseFallbackConfig
} from "./adapter/legacy-license-compat.js";

export type {
  BillingEventType,
  BillingProvider,
  BillingProviderId,
  CheckoutRequest,
  CheckoutResult,
  LegacyLicenseRecord,
  LsCompatibleLicenseResponse,
  NormalizedWebhookEvent
} from "./adapter/types.js";
