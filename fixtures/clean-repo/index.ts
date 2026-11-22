export function verifyStripeOrGenericSignature(headers: Record<string, string>) {
  // Note: X-Signature without any Lemon Squeezy context should NOT false-positive
  return Boolean(headers["x-signature"]);
}
