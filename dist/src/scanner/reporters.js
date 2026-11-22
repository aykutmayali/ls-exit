const SEVERITY_BADGE = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW"
};
export function formatJsonReport(report) {
    return JSON.stringify(report, null, 2);
}
export function formatMarkdownReport(report) {
    const { summary } = report;
    const lines = [];
    lines.push("# ls-exit Migration Scan Report");
    lines.push("");
    lines.push(`- **Scanned path:** \`${report.rootPath}\``);
    lines.push(`- **Target provider:** \`${report.targetProvider}\``);
    lines.push(`- **Lemon Squeezy shutdown deadline:** \`${report.deadline}\` (no extension)`);
    lines.push(`- **Generated at:** ${report.generatedAt}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Files scanned | ${summary.filesScanned} |`);
    lines.push(`| Files with Lemon Squeezy touchpoints | ${summary.filesWithFindings} |`);
    lines.push(`| Total findings | ${summary.totalFindings} |`);
    lines.push(`| Critical / High / Medium / Low | ${summary.bySeverity.critical} / ${summary.bySeverity.high} / ${summary.bySeverity.medium} / ${summary.bySeverity.low} |`);
    lines.push(`| Estimated engineering effort | ~${summary.estimatedEffortHours} hours |`);
    lines.push(`| Migration complexity tier | **${summary.estimatedTier}** |`);
    lines.push("");
    if (summary.totalFindings === 0) {
        lines.push("No Lemon Squeezy references found in scanned files.");
        return lines.join("\n");
    }
    lines.push("## Category Breakdown");
    lines.push("");
    lines.push("| Category | Findings |");
    lines.push("| --- | --- |");
    for (const [cat, count] of Object.entries(summary.byCategory)) {
        if (count > 0) {
            lines.push(`| \`${cat}\` | ${count} |`);
        }
    }
    lines.push("");
    lines.push("## Findings");
    lines.push("");
    for (const f of report.findings) {
        lines.push(`### [${SEVERITY_BADGE[f.severity]}] ${f.ruleId} — ${f.title}`);
        lines.push(`- **Location:** \`${f.file}:${f.line}:${f.column}\` (\`${f.language}\`)`);
        lines.push(`- **Code:** \`${f.snippet}\``);
        lines.push(`- **Migration hint:** ${f.migrationHint}`);
        lines.push("");
    }
    lines.push("## Recommended Cutover Checklist");
    lines.push("");
    lines.push("- [ ] Export customers, orders, subscriptions, discounts, and license keys from Lemon Squeezy.");
    lines.push("- [ ] Verify target Merchant of Record supports your country and product/service type.");
    lines.push("- [ ] Deploy provider-agnostic billing adapter + target MoR checkout for **new** customers.");
    if (summary.byCategory.license_keys > 0) {
        lines.push("- [ ] Stand up Legacy License Compatibility Endpoint before shipping app/plugin updates so existing keys keep validating past March 31, 2027.");
    }
    if (summary.byCategory.webhooks > 0) {
        lines.push("- [ ] Run dual webhooks (Lemon Squeezy + new MoR) until all legacy subscriptions cancel or migrate.");
    }
    lines.push("- [ ] Run PayPal subscription re-subscribe email sequence timed to each renewal date.");
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=reporters.js.map