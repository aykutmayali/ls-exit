import fs from "node:fs";
import path from "node:path";
export const DEFAULT_IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".vercel",
    "dist",
    "build",
    "out",
    "coverage",
    "vendor",
    "bin",
    "obj",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    "tmp",
    ".cache"
]);
const EXT_TO_LANG = {
    ".js": "js_ts",
    ".jsx": "js_ts",
    ".mjs": "js_ts",
    ".cjs": "js_ts",
    ".ts": "js_ts",
    ".tsx": "js_ts",
    ".mts": "js_ts",
    ".cts": "js_ts",
    ".py": "python",
    ".pyw": "python",
    ".php": "php",
    ".blade.php": "php",
    ".cs": "csharp",
    ".csproj": "csharp",
    ".rb": "ruby",
    ".erb": "ruby",
    ".html": "html_template",
    ".htm": "html_template",
    ".vue": "html_template",
    ".svelte": "html_template",
    ".astro": "html_template",
    ".json": "config_env",
    ".yml": "config_env",
    ".yaml": "config_env",
    ".toml": "config_env",
    ".xml": "config_env",
    ".env": "config_env",
    ".txt": "config_env",
    ".lock": "config_env"
};
const EXACT_FILENAMES = {
    Gemfile: "ruby",
    "Gemfile.lock": "config_env",
    "package.json": "config_env",
    "composer.json": "config_env",
    "requirements.txt": "config_env",
    "pyproject.toml": "config_env",
    "Pipfile": "config_env"
};
const SKIP_LOCKFILES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "composer.lock",
    "poetry.lock",
    "Gemfile.lock"
]);
export function detectLanguage(fileName) {
    if (SKIP_LOCKFILES.has(fileName))
        return null;
    if (fileName.startsWith(".env"))
        return "config_env";
    if (EXACT_FILENAMES[fileName])
        return EXACT_FILENAMES[fileName];
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".min.js") || lower.endsWith(".min.css"))
        return null;
    if (lower.endsWith(".blade.php"))
        return "php";
    const ext = path.extname(lower);
    return EXT_TO_LANG[ext] ?? null;
}
export function walkRepository(rootPath, extraIgnoreDirs = [], maxFileSizeBytes = 1024 * 1024) {
    const absRoot = path.resolve(rootPath);
    const ignored = new Set([...DEFAULT_IGNORE_DIRS, ...extraIgnoreDirs]);
    const results = [];
    function visit(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                if (!ignored.has(entry.name)) {
                    visit(fullPath);
                }
                continue;
            }
            if (!entry.isFile())
                continue;
            const language = detectLanguage(entry.name);
            if (!language)
                continue;
            let stat;
            try {
                stat = fs.statSync(fullPath);
            }
            catch {
                continue;
            }
            if (stat.size > maxFileSizeBytes)
                continue;
            results.push({
                absPath: fullPath,
                relPath: path.relative(absRoot, fullPath).split(path.sep).join("/"),
                language
            });
        }
    }
    visit(absRoot);
    return results;
}
//# sourceMappingURL=walker.js.map