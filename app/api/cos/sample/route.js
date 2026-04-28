import { readFile } from "node:fs/promises";
import { SAMPLE_INPUT } from "../../../../lib/cos-runner.mjs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const text = await readFile(SAMPLE_INPUT, "utf8");
    return Response.json({ schedule: text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
