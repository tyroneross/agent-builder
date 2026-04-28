import { runChiefOfStaff } from "../../../../lib/cos-runner.mjs";

export const runtime = "nodejs";
export const maxDuration = 1800;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { model, schedule, goals } = body ?? {};

  if (!model) {
    return Response.json({ ok: false, error: "model required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runChiefOfStaff({
          model,
          schedule,
          goals,
          onEvent: send,
        });
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
