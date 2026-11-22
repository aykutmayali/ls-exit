import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { formatMarkdownReport, scanRepository, shouldFailForSeverity } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Works whether executed from src/test or dist/test
const REPO_ROOT = path.resolve(__dirname, "..", "..");

describe("scanRepository", () => {
  it("detects Next.js SaaS Lemon Squeezy touchpoints across SDK, webhook, license, checkout, portal, and env", () => {
    const fixture = path.join(REPO_ROOT, "fixtures", "nextjs-saas");
    const report = scanRepository({ rootPath: fixture, targetProvider: "polar" });

    assert.equal(report.summary.filesScanned, 5);
    assert.equal(report.summary.filesWithFindings, 5);
    assert.ok(report.summary.byCategory.license_keys >= 1);
    assert.ok(report.summary.byCategory.webhooks >= 3);
    assert.ok(report.summary.byCategory.sdk_dependency >= 2);
    assert.ok(report.summary.byCategory.checkout_ui >= 3);
    assert.ok(report.summary.byCategory.customer_portal >= 1);
    assert.ok(report.summary.byCategory.env_config >= 3);
    assert.equal(report.summary.estimatedTier, "Complex");
    assert.ok(shouldFailForSeverity(report, "critical"));

    const licenseFinding = report.findings.find((f) => f.ruleId === "LS-LIC-001");
    assert.ok(licenseFinding);
    assert.match(licenseFinding.migrationHint, /\[POLAR\]/);

    const md = formatMarkdownReport(report);
    assert.match(md, /ls-exit Migration Scan Report/);
    assert.match(md, /Legacy License Compatibility Endpoint/);
  });

  it("detects Python, C#, PHP, and Ruby Lemon Squeezy integrations", () => {
    const fixture = path.join(REPO_ROOT, "fixtures", "polyglot-services");
    const report = scanRepository({ rootPath: fixture, targetProvider: "dodo" });

    assert.ok((report.summary.byLanguage.python ?? 0) >= 4);
    assert.ok((report.summary.byLanguage.csharp ?? 0) >= 4);
    assert.ok((report.summary.byLanguage.php ?? 0) >= 2);
    assert.ok((report.summary.byLanguage.ruby ?? 0) >= 3);
  });

  it("does not produce false positives on clean repo with generic X-Signature", () => {
    const fixture = path.join(REPO_ROOT, "fixtures", "clean-repo");
    const report = scanRepository({ rootPath: fixture });

    assert.equal(report.summary.totalFindings, 0);
    assert.equal(report.summary.estimatedTier, "Clean");
    assert.equal(shouldFailForSeverity(report, "low"), false);
  });

  it("CLI exits with code 1 when --fail-on critical matches and outputs JSON", () => {
    const cliPath = path.join(REPO_ROOT, "dist", "src", "cli.js");
    const fixture = path.join(REPO_ROOT, "fixtures", "nextjs-saas");
    const res = spawnSync(
      process.execPath,
      [cliPath, "scan", fixture, "--format", "json", "--fail-on", "critical"],
      { encoding: "utf8" }
    );
    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.schemaVersion, "1.0.0");
    assert.ok(parsed.summary.bySeverity.critical > 0);

    const cleanFixture = path.join(REPO_ROOT, "fixtures", "clean-repo");
    const cleanOut = execFileSync(
      process.execPath,
      [cliPath, "scan", cleanFixture, "--format", "json", "--fail-on", "critical"],
      { encoding: "utf8" }
    );
    const parsedClean = JSON.parse(cleanOut);
    assert.equal(parsedClean.summary.totalFindings, 0);
  });
});
