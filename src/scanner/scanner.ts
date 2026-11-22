import fs from "node:fs";
import path from "node:path";
import { SCAN_RULES } from "./rules.js";
import type {
  FindingCategory,
  LanguageKind,
  ScanFinding,
  ScanOptions,
  ScanReport,
  Severity,
  TargetProvider
} from "./types.js";
import { walkRepository } from "./walker.js";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function hasLemonSqueezyContext(contentLower: string): boolean {
  return (
    contentLower.includes("lemonsqueezy") ||
    contentLower.includes("lemon_squeezy") ||
    contentLower.includes("lemon-squeezy") ||
    contentLower.includes("x-event-name") ||
    contentLower.includes("order_created") ||
    contentLower.includes("subscription_created") ||
    contentLower.includes("license_key_created")
  );
}

function resolveHint(
  baseHint: string,
  targetHints: Partial<Record<TargetProvider, string>> | undefined,
  target: TargetProvider
): string {
  if (target !== "generic" && targetHints?.[target]) {
    return `${baseHint} [${target.toUpperCase()}]: ${targetHints[target]}`;
  }
  return baseHint;
}

export function scanRepository(options: ScanOptions): ScanReport {
  const rootPath = path.resolve(options.rootPath);
  if (!fs.existsSync(rootPath)) {
    throw new Error(`Scan target path does not exist: ${rootPath}`);
  }

  const targetProvider: TargetProvider = options.targetProvider ?? "generic";
  const files = walkRepository(rootPath, options.ignoreDirs ?? [], options.maxFileSizeBytes);
  const findings: ScanFinding[] = [];
  const filesWithFindingsSet = new Set<string>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file.absPath, "utf8");
    } catch {
      continue;
    }

    const contentLower = content.toLowerCase();
    const lsContext = hasLemonSqueezyContext(contentLower);
    const lines = content.split(/\r?\n/);

    for (const rule of SCAN_RULES) {
      if (rule.languages !== "all" && !rule.languages.includes(file.language)) {
        continue;
      }

      if (rule.id === "LS-WHK-002" && !lsContext) {
        continue;
      }

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const match = rule.pattern.exec(lineText);
        if (!match) continue;

        filesWithFindingsSet.add(file.relPath);
        findings.push({
          ruleId: rule.id,
          title: rule.title,
          category: rule.category,
          severity: rule.severity,
          language: file.language,
          file: file.relPath,
          line: i + 1,
          column: (match.index ?? 0) + 1,
          snippet: lineText.trim().slice(0, 160),
          migrationHint: resolveHint(rule.baseHint, rule.targetHints, targetProvider),
          effortHours: rule.effortHours
        });
      }
    }
  }

  findings.sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    return a.line - b.line;
  });

  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const byCategory: Record<FindingCategory, number> = {
    license_keys: 0,
    webhooks: 0,
    api_calls: 0,
    sdk_dependency: 0,
    checkout_ui: 0,
    customer_portal: 0,
    env_config: 0
  };
  const byLanguage: Partial<Record<LanguageKind, number>> = {};

  // Deduplicate effort by (ruleId, file) so repeated lines in one file don't inflate hours
  const seenRuleFile = new Set<string>();
  const seenRule = new Set<string>();
  let estimatedHours = 0;

  for (const f of findings) {
    bySeverity[f.severity]++;
    byCategory[f.category]++;
    byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;

    const ruleFileKey = `${f.ruleId}::${f.file}`;
    if (!seenRuleFile.has(ruleFileKey)) {
      seenRuleFile.add(ruleFileKey);
      if (!seenRule.has(f.ruleId)) {
        seenRule.add(f.ruleId);
        estimatedHours += f.effortHours;
      } else {
        estimatedHours += Math.max(0.5, Number((f.effortHours * 0.4).toFixed(1)));
      }
    }
  }

  estimatedHours = Number(estimatedHours.toFixed(1));

  let estimatedTier: ScanReport["summary"]["estimatedTier"] = "Clean";
  if (findings.length > 0) {
    if (byCategory.license_keys > 0 || estimatedHours >= 18) {
      estimatedTier = "Complex";
    } else if (bySeverity.critical > 0 || estimatedHours >= 7) {
      estimatedTier = "Standard";
    } else {
      estimatedTier = "Simple";
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    rootPath,
    targetProvider,
    deadline: "2027-03-31",
    summary: {
      totalFindings: findings.length,
      filesScanned: files.length,
      filesWithFindings: filesWithFindingsSet.size,
      bySeverity,
      byCategory,
      byLanguage,
      estimatedEffortHours: estimatedHours,
      estimatedTier
    },
    findings
  };
}

export function shouldFailForSeverity(
  report: ScanReport,
  failOn: Severity | "none" | undefined
): boolean {
  if (!failOn || failOn === "none") return false;
  const threshold = SEVERITY_RANK[failOn];
  return report.findings.some((f) => SEVERITY_RANK[f.severity] <= threshold);
}
