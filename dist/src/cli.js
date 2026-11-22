#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatJsonReport, formatMarkdownReport } from "./scanner/reporters.js";
import { scanRepository, shouldFailForSeverity } from "./scanner/scanner.js";
const VALID_TARGETS = new Set([
    "polar",
    "paddle",
    "creem",
    "dodo",
    "generic"
]);
const VALID_SEVERITIES = new Set([
    "critical",
    "high",
    "medium",
    "low",
    "none"
]);
function printHelp() {
    console.log(`ls-exit — Lemon Squeezy migration scanner (deadline: March 31, 2027)

Usage:
  ls-exit scan [path] [options]

Options:
  --format <markdown|json|both>   Output format (default: markdown)
  --out <file>                    Write report to file (for 'both', writes .md and .json)
  --target <provider>             Target MoR for tailored hints: polar | paddle | creem | dodo | generic
  --fail-on <severity|none>       Exit 1 if findings >= severity exist: critical | high | medium | low | none
  --github-summary                Append Markdown summary to GITHUB_STEP_SUMMARY if set
  --help, -h                      Show this help
  --version, -v                   Show version
`);
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        printHelp();
        return 0;
    }
    if (args.includes("--version") || args.includes("-v")) {
        console.log("0.1.0");
        return 0;
    }
    let command = args[0];
    let idx = 1;
    if (command !== "scan") {
        // Allow `ls-exit .` shorthand
        command = "scan";
        idx = 0;
    }
    let targetPath = ".";
    if (idx < args.length && !args[idx].startsWith("-")) {
        targetPath = args[idx];
        idx++;
    }
    let format = "markdown";
    let outFile;
    let targetProvider = "generic";
    let failOn = "none";
    let githubSummary = false;
    while (idx < args.length) {
        const flag = args[idx];
        if (flag === "--format") {
            const val = args[++idx];
            if (val !== "markdown" && val !== "json" && val !== "both") {
                console.error(`Invalid --format value: ${val}`);
                return 2;
            }
            format = val;
        }
        else if (flag === "--out") {
            outFile = args[++idx];
            if (!outFile) {
                console.error("--out requires a file path");
                return 2;
            }
        }
        else if (flag === "--target") {
            const val = args[++idx];
            if (!VALID_TARGETS.has(val)) {
                console.error(`Invalid --target value: ${val}`);
                return 2;
            }
            targetProvider = val;
        }
        else if (flag === "--fail-on") {
            const val = args[++idx];
            if (!VALID_SEVERITIES.has(val)) {
                console.error(`Invalid --fail-on value: ${val}`);
                return 2;
            }
            failOn = val;
        }
        else if (flag === "--github-summary") {
            githubSummary = true;
        }
        else {
            console.error(`Unknown option: ${flag}`);
            return 2;
        }
        idx++;
    }
    const report = scanRepository({ rootPath: targetPath, targetProvider });
    const md = formatMarkdownReport(report);
    const json = formatJsonReport(report);
    if (outFile) {
        const absOut = path.resolve(outFile);
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        if (format === "both") {
            const base = absOut.replace(/\.(md|json)$/i, "");
            fs.writeFileSync(`${base}.md`, md, "utf8");
            fs.writeFileSync(`${base}.json`, json, "utf8");
        }
        else {
            fs.writeFileSync(absOut, format === "json" ? json : md, "utf8");
        }
    }
    else {
        if (format === "json") {
            process.stdout.write(`${json}\n`);
        }
        else if (format === "both") {
            process.stdout.write(`${md}\n\n---\n\n${json}\n`);
        }
        else {
            process.stdout.write(`${md}\n`);
        }
    }
    if (githubSummary && process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`, "utf8");
    }
    if (process.env.GITHUB_OUTPUT) {
        const lines = [
            `total-findings=${report.summary.totalFindings}`,
            `critical-count=${report.summary.bySeverity.critical}`,
            `estimated-hours=${report.summary.estimatedEffortHours}`,
            `estimated-tier=${report.summary.estimatedTier}`
        ];
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`, "utf8");
    }
    return shouldFailForSeverity(report, failOn) ? 1 : 0;
}
process.exitCode = main();
//# sourceMappingURL=cli.js.map