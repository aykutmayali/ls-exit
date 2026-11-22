import type { LanguageKind } from "./types.js";
export declare const DEFAULT_IGNORE_DIRS: Set<string>;
export interface DiscoveredFile {
    absPath: string;
    relPath: string;
    language: LanguageKind;
}
export declare function detectLanguage(fileName: string): LanguageKind | null;
export declare function walkRepository(rootPath: string, extraIgnoreDirs?: string[], maxFileSizeBytes?: number): DiscoveredFile[];
