export type Severity = "critical" | "high" | "medium" | "low";

export type TargetProvider = "polar" | "paddle" | "creem" | "dodo" | "generic";

export type FindingCategory =
  | "license_keys"
  | "webhooks"
  | "api_calls"
  | "sdk_dependency"
  | "checkout_ui"
  | "customer_portal"
  | "env_config";

export type LanguageKind =
  | "js_ts"
  | "python"
  | "php"
  | "csharp"
  | "ruby"
  | "html_template"
  | "config_env";

export interface ScanRule {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  languages: LanguageKind[] | "all";
  pattern: RegExp;
  effortHours: number;
  baseHint: string;
  targetHints?: Partial<Record<TargetProvider, string>>;
}

export interface ScanFinding {
  ruleId: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  language: LanguageKind;
  file: string;
  line: number;
  column: number;
  snippet: string;
  migrationHint: string;
  effortHours: number;
}

export interface ScanSummary {
  totalFindings: number;
  filesScanned: number;
  filesWithFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<FindingCategory, number>;
  byLanguage: Partial<Record<LanguageKind, number>>;
  estimatedEffortHours: number;
  estimatedTier: "Simple" | "Standard" | "Complex" | "Clean";
}

export interface ScanReport {
  schemaVersion: "1.0.0";
  generatedAt: string;
  rootPath: string;
  targetProvider: TargetProvider;
  deadline: "2027-03-31";
  summary: ScanSummary;
  findings: ScanFinding[];
}

export interface ScanOptions {
  rootPath: string;
  targetProvider?: TargetProvider;
  ignoreDirs?: string[];
  maxFileSizeBytes?: number;
}
