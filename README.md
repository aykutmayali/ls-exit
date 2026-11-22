# ls-exit

> **Lemon Squeezy stops processing payments on March 31, 2027.**  
> `ls-exit` is a zero-dependency MIT toolkit to audit your codebase for Lemon Squeezy touchpoints, run a provider-agnostic billing adapter during dual-run cutover, and keep legacy license keys validating past shutdown.

🇹🇷 [Türkçe README için tıklayın](./README.tr.md)

## Why `ls-exit` exists

- Lemon Squeezy closed new signups on **November 16, 2026** and shuts down payment processing on **March 31, 2027** (no extensions).
- Stripe Managed Payments excludes several countries (including **Türkiye**) and excludes human/productized services, license key management, PayPal, and affiliates.
- Changing providers safely requires finding every checkout URL, `lemon.js` overlay, `X-Signature` webhook handler, SDK call, and `/v1/licenses/*` call — then running both providers in parallel while keeping legacy license keys working.

## What's inside

1. **Multi-language CLI Scanner (`npx ls-exit scan .`)**
   - Scans **JS/TS, Python, PHP, C#/.NET, Ruby, HTML/Vue/Svelte/Astro, and `.env`/config files**.
   - Flags license key API calls (`CRITICAL`), webhook event names & `X-Signature` / `X-Event-Name` checks, `api.lemonsqueezy.com/v1` endpoints, SDK imports (`@lemonsqueezy/lemonsqueezy.js`, Python, Laravel, C#, Ruby), `lemon.js` overlays, hardcoded checkout/billing URLs, and `LEMONSQUEEZY_*` env vars.
   - Outputs Markdown or JSON with `file:line`, effort estimate, and target-specific migration hints (`polar`, `paddle`, `creem`, `dodo`, `generic`).
2. **GitHub Action (`action.yml`)**
   - Drop into any repository to fail CI on `critical`/`high` touchpoints or publish a Markdown audit to the GitHub Job Summary.
3. **Provider-Agnostic TypeScript Billing Adapter (`src/adapter/`)**
   - `BillingProvider` interface + `PolarBillingProvider` (Standard Webhooks `webhook-id`/`webhook-timestamp`/`webhook-signature` HMAC-SHA256 verification + Checkout & Customer Portal API).
   - `DualProviderRouter` to route new checkouts to Polar while continuing to accept legacy Lemon Squeezy `X-Signature` webhooks and customer portal lookups during the transition window.
4. **Legacy License Key Compatibility Server (`LegacyLicenseCompatService`)**
   - Drop-in handler matching Lemon Squeezy's `POST /v1/licenses/validate`, `/activate`, and `/deactivate` JSON response shape.
   - Imports exported Lemon Squeezy license keys (JSON or CSV) and optionally falls back to Polar's `/v1/customer-portal/license-keys/validate` for newly issued keys — so already-installed desktop apps, CLI tools, and plugins don't break on March 31, 2027.

## Quick start

```bash
# Scan the current repo and output Markdown
npx ls-exit scan . --target polar

# Export JSON and fail CI if critical touchpoints (e.g., license keys / webhooks) exist
npx ls-exit scan . --format json --out ls-exit-report.json --fail-on critical
```

### Run from source

```bash
npm install
npm test
node dist/src/cli.js scan ./fixtures/nextjs-saas --target polar
```

### GitHub Action usage

```yaml
name: Lemon Squeezy Migration Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aykutmayali/ls-exit@v0.1.0
        with:
          path: "."
          target: "polar"
          fail-on: "none"
```

### Adapter & Legacy License Compat usage

See [`examples/nextjs-app-router/`](./examples/nextjs-app-router/) for complete Next.js App Router webhook and license validation routes.

```ts
import {
  PolarBillingProvider,
  DualProviderRouter,
  InMemoryLegacyLicenseStore,
  LegacyLicenseCompatService,
  parseLemonSqueezyLicensesJson
} from "ls-exit";
```

## Need hands-on migration help?

Built and maintained by **Aykut Mayali** (Istanbul, EN/TR). If you want a fixed-price migration audit, dual-run cutover, or legacy license compatibility deployment before March 31, 2027, reach out via [aykutmayali.github.io/launch-audit](https://aykutmayali.github.io/launch-audit/).

## License

MIT © 2026 Aykut Mayali
