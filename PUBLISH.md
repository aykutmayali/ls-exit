# Publishing `ls-exit` (GitHub + npm)

Nothing has been pushed to GitHub or published to npm yet. Follow these exact steps when ready.

## 1. Verify tests & clean build locally

```bash
cd /workspace/money-ideas/ls-exit-tr/ls-exit
npm test
npm run typecheck
```

## 2. Create GitHub repository & push (`aykutmayali/ls-exit`)

Create an empty public MIT repo named `ls-exit` under `https://github.com/aykutmayali` (without initializing a README/license since they already exist here), or use `gh`:

```bash
cd /workspace/money-ideas/ls-exit-tr/ls-exit
git init -b main
git add .
git commit -m "feat: initial ls-exit scanner, billing adapter, and legacy license compat server"
gh repo create aykutmayali/ls-exit --public --source=. --remote=origin --push
git tag v0.1.0
git push origin v0.1.0
```

> Note: Keeping `dist/` ignored or committed? Currently `.gitignore` ignores `dist/` for clean git history, and `action.yml` automatically runs `npm install && npm run build` if `dist/src/cli.js` is not present. If you want faster GitHub Action runs without `npm install`, remove `dist/` from `.gitignore` before tagging `v0.1.0`.

## 3. (Optional) Publish to npm so `npx ls-exit` works globally

Check if package name `ls-exit` is available on npm first (`npm view ls-exit` — if 404, it's free; otherwise scope as `@aykutmayali/ls-exit` in `package.json`):

```bash
npm login
npm publish --dry-run
npm publish --access public
```

After publishing, update the Gist/blog/X/LinkedIn drafts with your live URL:
- Repo: `https://github.com/aykutmayali/ls-exit`
- CLI: `npx ls-exit scan . --target polar`
