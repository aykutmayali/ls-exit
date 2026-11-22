import type { ScanOptions, ScanReport, Severity } from "./types.js";
export declare function scanRepository(options: ScanOptions): ScanReport;
export declare function shouldFailForSeverity(report: ScanReport, failOn: Severity | "none" | undefined): boolean;
