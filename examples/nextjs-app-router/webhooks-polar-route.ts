// Example: app/api/webhooks/polar/route.ts
// Uses DualProviderRouter + PolarBillingProvider from `ls-exit`
import { DualProviderRouter, PolarBillingProvider } from "ls-exit";

const polar = new PolarBillingProvider({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? ""
});

const router = new DualProviderRouter(polar, {
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  apiKey: process.env.LEMONSQUEEZY_API_KEY
});

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const event = router.handleWebhook("polar", rawBody, headers);

    switch (event.type) {
      case "order.completed":
      case "subscription.active":
      case "subscription.migrated":
        // Grant entitlement in DB for event.customerEmail / event.customerExternalId
        break;
      case "subscription.revoked":
      case "order.refunded":
        // Revoke entitlement in DB
        break;
      default:
        break;
    }

    return new Response("ok", { status: 202 });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Invalid webhook",
      { status: 403 }
    );
  }
}
