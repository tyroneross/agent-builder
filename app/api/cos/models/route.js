import { ollamaTags } from "../../../../lib/cos-runner.mjs";

export const runtime = "nodejs";

export async function GET() {
  const tags = await ollamaTags();
  const models = (tags.models ?? [])
    .map((m) => ({
      name: m.name,
      sizeGB: m.size ? Math.round((m.size / 1e9) * 10) / 10 : null,
      family: m.details?.family ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return Response.json({ models });
}
