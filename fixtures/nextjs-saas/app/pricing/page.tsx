import Script from "next/script";

export default function PricingPage() {
  return (
    <div>
      <Script src="https://assets.lemonsqueezy.com/lemon.js" />
      <a
        href="https://demoapp.lemonsqueezy.com/checkout/buy/9b32c2f0-1111-2222-3333-444455556666?embed=1"
        className="lemonsqueezy-button"
      >
        Buy Pro
      </a>
      <a href="https://demoapp.lemonsqueezy.com/billing">Manage subscription</a>
    </div>
  );
}
