import type { ScanRule } from "./types.js";

export const SCAN_RULES: ScanRule[] = [
  // 1. License Keys (CRITICAL — desktop/plugin/CLI installs break on Mar 31, 2027)
  {
    id: "LS-LIC-001",
    title: "Lemon Squeezy License API endpoint",
    category: "license_keys",
    severity: "critical",
    languages: "all",
    pattern: /api\.lemonsqueezy\.com\/v1\/licenses\/(validate|activate|deactivate)/i,
    effortHours: 6,
    baseHint:
      "Calls to /v1/licenses/* will fail after March 31, 2027. Export existing keys and route validation through your own compatibility endpoint (see ls-exit LegacyLicenseCompatService) while issuing new keys on your target MoR.",
    targetHints: {
      polar:
        "Polar issues new POLAR_* keys via /v1/customer-portal/license-keys/validate, and is still exploring importing legacy LS keys. Use ls-exit LegacyLicenseCompatService to validate exported LS keys + delegate new ones to Polar.",
      paddle:
        "Paddle Billing deprecated built-in license keys. Use ls-exit LegacyLicenseCompatService for legacy LS keys and generate new keys in your DB on transaction.completed.",
      creem:
        "Creem issues new license keys but does NOT import existing LS keys. Keep validating exported LS keys via your backend compat endpoint.",
      dodo:
        "Dodo Payments provides automated license keys for new orders; keep validating legacy exported LS keys via your backend compat endpoint."
    }
  },
  {
    id: "LS-LIC-002",
    title: "Lemon Squeezy JS SDK license helper",
    category: "license_keys",
    severity: "critical",
    languages: ["js_ts"],
    pattern: /\b(validateLicense|activateLicense|deactivateLicense)\s*\(/,
    effortHours: 4,
    baseHint:
      "Replace @lemonsqueezy/lemonsqueezy.js license helper calls with your provider-agnostic license client pointing to your own compatibility endpoint or new MoR."
  },

  // 2. Webhooks & Signature Verification (CRITICAL / HIGH)
  {
    id: "LS-WHK-001",
    title: "Lemon Squeezy webhook event name",
    category: "webhooks",
    severity: "critical",
    languages: "all",
    pattern:
      /["'`](order_created|order_refunded|subscription_created|subscription_updated|subscription_cancelled|subscription_expired|subscription_paused|subscription_unpaused|subscription_resumed|subscription_payment_success|subscription_payment_failed|subscription_payment_recovered|license_key_created|license_key_updated)["'`]/,
    effortHours: 3,
    baseHint:
      "Rewrite webhook event switch/case to a normalized BillingEventType. Keep the Lemon Squeezy handler running in parallel until all legacy subscriptions finish migrating.",
    targetHints: {
      polar:
        "Map order_created → order.paid, order_refunded → order.refunded, subscription_created/resumed → subscription.active, subscription_cancelled → subscription.canceled, subscription_expired → subscription.revoked.",
      paddle:
        "Map to Paddle Billing events: transaction.completed, adjustment.created, subscription.activated, subscription.updated, subscription.canceled.",
      creem:
        "Map to Creem webhook events: checkout.completed, subscription.active, subscription.paid, subscription.canceled, subscription.expired.",
      dodo:
        "Map to Dodo Payments webhook events: payment.succeeded, payment.refunded, subscription.active, subscription.renewed, subscription.cancelled, subscription.expired."
    }
  },
  {
    id: "LS-WHK-002",
    title: "Lemon Squeezy X-Signature header verification",
    category: "webhooks",
    severity: "high",
    languages: "all",
    pattern: /["'`]x-signature["'`]|HTTP_X_SIGNATURE|X-Signature/,
    effortHours: 2,
    baseHint:
      "Verify whether this X-Signature check belongs to Lemon Squeezy HMAC-SHA256. Keep it isolated in a legacy adapter route during dual-run, and add the new provider's signature verifier separately.",
    targetHints: {
      polar:
        "Polar uses Standard Webhooks headers (webhook-id, webhook-timestamp, webhook-signature) verified with POLAR_WEBHOOK_SECRET.",
      paddle:
        "Paddle Billing uses the Paddle-Signature header (ts=...;h1=...) verified against your notification secret.",
      creem: "Creem uses creem-signature HMAC-SHA256 verification.",
      dodo: "Dodo Payments uses Standard Webhooks headers (webhook-id, webhook-timestamp, webhook-signature)."
    }
  },
  {
    id: "LS-WHK-003",
    title: "Lemon Squeezy webhook header X-Event-Name",
    category: "webhooks",
    severity: "high",
    languages: "all",
    pattern: /["'`]x-event-name["'`]|HTTP_X_EVENT_NAME|X-Event-Name/,
    effortHours: 1,
    baseHint:
      "X-Event-Name is specific to Lemon Squeezy webhooks. New MoR providers place the event type inside the verified JSON payload (e.g., event.type)."
  },

  // 3. REST API Calls (HIGH)
  {
    id: "LS-API-001",
    title: "Lemon Squeezy REST API base URL",
    category: "api_calls",
    severity: "high",
    languages: "all",
    pattern: /https?:\/\/api\.lemonsqueezy\.com\/v1[^\s"'`)]*/i,
    effortHours: 4,
    baseHint:
      "Direct REST call to api.lemonsqueezy.com/v1. Abstract behind a BillingProvider interface before swapping to your target MoR."
  },
  {
    id: "LS-API-002",
    title: "Lemon Squeezy JS SDK billing methods",
    category: "api_calls",
    severity: "high",
    languages: ["js_ts"],
    pattern:
      /\b(lemonSqueezySetup|createCheckout|getSubscription|cancelSubscription|updateSubscription|listSubscriptions|listOrders|getOrder|listCustomers|getCustomer|listProducts|listVariants)\s*\(/,
    effortHours: 3,
    baseHint:
      "Replace @lemonsqueezy/lemonsqueezy.js API call with your BillingProvider adapter method. Keep LS subscription lookup only for existing customers tagged provider='lemonsqueezy'."
  },

  // 4. SDK Dependencies across JS/TS, Python, PHP, C#, Ruby (MEDIUM/HIGH)
  {
    id: "LS-SDK-001",
    title: "Node/TS @lemonsqueezy/lemonsqueezy.js dependency or import",
    category: "sdk_dependency",
    severity: "high",
    languages: ["js_ts", "config_env"],
    pattern: /@lemonsqueezy\/lemonsqueezy\.js|["']lemonsqueezy\.ts["']|["']lemonsqueezy["']\s*:/,
    effortHours: 2,
    baseHint:
      "Lemon Squeezy npm package detected. Plan removal after March 31, 2027 cutover; keep temporarily only if running dual-provider during migration.",
    targetHints: {
      polar: "Install @polar-sh/sdk (or use direct fetch via PolarBillingProvider).",
      paddle: "Install @paddle/paddle-node-sdk and @paddle/paddle-js.",
      creem: "Install creem (or call api.creem.io/v1 directly).",
      dodo: "Install dodopayments TypeScript SDK."
    }
  },
  {
    id: "LS-SDK-002",
    title: "Python Lemon Squeezy package or import",
    category: "sdk_dependency",
    severity: "high",
    languages: ["python", "config_env"],
    pattern:
      /(?:^|\s)(?:from|import)\s+lemonsqueezy\b|python-lemonsqueezy|lemonsqueezy==|lemonsqueezy>=/i,
    effortHours: 2,
    baseHint:
      "Python Lemon Squeezy integration detected. Migrate to target MoR Python SDK (e.g. polar-sdk, paddle-python-sdk, dodopayments) or httpx adapter."
  },
  {
    id: "LS-SDK-003",
    title: "PHP / Laravel Lemon Squeezy package or namespace",
    category: "sdk_dependency",
    severity: "high",
    languages: ["php", "config_env"],
    pattern: /lemonsqueezy\/laravel|LemonSqueezy\\Laravel|LemonSqueezy::/i,
    effortHours: 4,
    baseHint:
      "PHP/Laravel Lemon Squeezy package detected (e.g. lemonsqueezy/laravel). Note that Laravel Cashier supports Paddle directly if migrating to Paddle."
  },
  {
    id: "LS-SDK-004",
    title: "C# / .NET Lemon Squeezy reference",
    category: "sdk_dependency",
    severity: "high",
    languages: ["csharp", "config_env"],
    pattern: /LemonSqueezy(?:\.Net|\.Sdk|Client|Webhook|Service)/,
    effortHours: 4,
    baseHint:
      ".NET/C# Lemon Squeezy client or service detected. Wrap behind an IBillingProvider interface using HttpClientFactory for your chosen MoR."
  },
  {
    id: "LS-SDK-005",
    title: "Ruby Lemon Squeezy gem or client",
    category: "sdk_dependency",
    severity: "high",
    languages: ["ruby", "config_env"],
    pattern: /gem\s+["']lemonsqueezy["']|LemonSqueezy::|require\s+["']lemonsqueezy["']/,
    effortHours: 3,
    baseHint:
      "Ruby Lemon Squeezy gem/client detected. Replace with target MoR REST client or Pay gem (supports Paddle Billing)."
  },

  // 5. Checkout UI & Lemon.js Overlay (HIGH / MEDIUM)
  {
    id: "LS-CHK-001",
    title: "Lemon.js checkout overlay script",
    category: "checkout_ui",
    severity: "high",
    languages: ["js_ts", "html_template"],
    pattern: /assets\.lemonsqueezy\.com\/lemon\.js/,
    effortHours: 2,
    baseHint:
      "Remove lemon.js script tag after cutover and replace with your new MoR checkout link or embedded/overlay script (e.g., Polar Checkout / Paddle.js)."
  },
  {
    id: "LS-CHK-002",
    title: "Lemon.js client API or button class",
    category: "checkout_ui",
    severity: "medium",
    languages: ["js_ts", "html_template"],
    pattern: /createLemonSqueezy|LemonSqueezy\.Url\.Open|lemonsqueezy-button/,
    effortHours: 2,
    baseHint:
      "Replace Lemon.js overlay trigger with a server-created checkout session URL from your BillingProvider."
  },
  {
    id: "LS-CHK-003",
    title: "Hardcoded Lemon Squeezy checkout or storefront URL",
    category: "checkout_ui",
    severity: "high",
    languages: "all",
    pattern: /https?:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/(checkout\/buy|buy)\/[a-z0-9-]+/i,
    effortHours: 1,
    baseHint:
      "Static Lemon Squeezy buy/checkout URL will stop working on March 31, 2027 (no automatic redirects). Replace with new provider checkout URL or dynamic checkout endpoint."
  },

  // 6. Customer Portal (MEDIUM)
  {
    id: "LS-PRT-001",
    title: "Lemon Squeezy customer billing portal URL",
    category: "customer_portal",
    severity: "medium",
    languages: "all",
    pattern: /https?:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/billing\b|signed_customer_portal_url/i,
    effortHours: 2,
    baseHint:
      "Route customer portal links dynamically by the user's stored billing_provider so legacy LS subscribers still reach LS billing until migrated, while new customers open the new MoR portal."
  },

  // 7. Environment Variables & Config (MEDIUM / LOW)
  {
    id: "LS-ENV-001",
    title: "Lemon Squeezy environment variable",
    category: "env_config",
    severity: "medium",
    languages: "all",
    pattern: /\b(LEMONSQUEEZY_[A-Z0-9_]+|LEMON_SQUEEZY_[A-Z0-9_]+|LS_WEBHOOK_SECRET|LS_API_KEY)\b/,
    effortHours: 0.5,
    baseHint:
      "Keep LS_* env vars during dual-run transition; provision target MoR env vars (e.g., POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET) alongside them and delete LS vars post-March 31, 2027."
  }
];
