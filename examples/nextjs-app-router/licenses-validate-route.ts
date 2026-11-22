// Example: app/api/licenses/validate/route.ts
// Drop-in replacement for https://api.lemonsqueezy.com/v1/licenses/validate
import fs from "node:fs";
import path from "node:path";
import {
  InMemoryLegacyLicenseStore,
  LegacyLicenseCompatService,
  parseLemonSqueezyLicensesJson
} from "ls-exit";

const exported = fs.readFileSync(
  path.join(process.cwd(), "data/lemonsqueezy-licenses.json"),
  "utf8"
);
const store = new InMemoryLegacyLicenseStore(parseLemonSqueezyLicensesJson(exported));
const licenseService = new LegacyLicenseCompatService(store, {
  organizationId: process.env.POLAR_ORGANIZATION_ID ?? ""
});

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    license_key?: string;
    instance_id?: string;
  };
  if (!body.license_key) {
    return Response.json({ valid: false, error: "license_key required" }, { status: 400 });
  }
  const result = await licenseService.validate(body.license_key, body.instance_id);
  return Response.json(result, { status: result.valid ? 200 : 404 });
}
