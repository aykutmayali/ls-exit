export async function checkKey(licenseKey: string, instanceId?: string) {
  const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: licenseKey, instance_id: instanceId })
  });
  return res.json();
}
