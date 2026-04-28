import { runPlan } from "../../../../lib/plan-runner.mjs";

export const runtime = "nodejs";
export const maxDuration = 1800;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { model, goal, context } = body ?? {};

  if (!model) {
    return Response.json({ ok: false, error: "model required" }, { status: 400 });
  }
  if (!goal?.trim()) {
    return Response.json({ ok: false, error: "goal required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await runPlan({ model, goal, context, onEvent: send });
      } catch (err) {
        send({ type: "fatal", error: err?.message ?? String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
