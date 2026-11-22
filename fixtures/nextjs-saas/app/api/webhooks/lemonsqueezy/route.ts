import crypto from "node:crypto";
import { lemonSqueezySetup, getSubscription } from "@lemonsqueezy/lemonsqueezy.js";

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature") ?? "";
  const eventName = req.headers.get("X-Event-Name") ?? "";
  const digest = crypto
    .createHmac("sha256", process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "")
    .update(rawBody)
    .digest("hex");

  if (signature !== digest) {
    return new Response("Invalid", { status: 401 });
  }

  if (eventName === "order_created" || eventName === "subscription_created") {
    await getSubscription("sub_1");
  }
  return new Response("ok");
}
