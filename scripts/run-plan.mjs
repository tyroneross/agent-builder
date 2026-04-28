#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { runPlan } from "../lib/plan-runner.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function readMaybe(path) {
  if (!path || !existsSync(path)) return null;
  return readFile(path, "utf8");
}

const goalArg = arg("--goal");
const goalFile = arg("--goal-file");
const contextFile = arg("--context");
const out = arg("--out", join(ROOT, "runs", `plan-${new Date().toISOString().replace(/[:.]/g, "-")}`));
const model = arg("--model", process.env.OLLAMA_MODEL ?? "gpt-oss:20b");
const TIMEOUT_MS = Number(process.env.AGENT_BUILDER_LLM_TIMEOUT_MS ?? 900000);

const goal = goalArg ?? (await readMaybe(goalFile));
if (!goal?.trim()) {
  console.error("usage: run-plan --goal '<one-line goal>' [--context ./context.md] [--model gpt-oss:20b]");
  console.error("    or run-plan --goal-file ./goal.md [--context ./context.md]");
  process.exit(2);
}
const context = await readMaybe(contextFile);

await mkdir(out, { recursive: true });
console.log(`[plan] model=${model} -> ${out}`);

const onEvent = (ev) => {
  if (ev.type === "warmup") console.log("[plan] warmup...");
  if (ev.type === "warmup-fail") console.log(`[plan] warmup failed: ${ev.error}`);
  if (ev.type === "outline-start") console.log("[plan] outlining...");
  if (ev.type === "outline-end")
    console.log(
      `[plan] outline: ${ev.outline.sections.length} sections (${(ev.durationMs / 1000).toFixed(1)}s)`,
    );
  if (ev.type === "outline-error") console.log(`[plan] outline failed: ${ev.error}`);
  if (ev.type === "section-start") console.log(`[plan] section ${ev.id} (${ev.shape})...`);
  if (ev.type === "section-end")
    console.log(
      `[plan]  ${ev.id}: ${(ev.durationMs / 1000).toFixed(1)}s · ${ev.bytes}b ✓`,
    );
  if (ev.type === "section-error") console.log(`[plan]  ${ev.id} failed: ${ev.error}`);
};

const { transcript, brief } = await runPlan({ model, goal, context, onEvent, timeoutMs: TIMEOUT_MS });

await writeFile(join(out, "transcript.json"), JSON.stringify(transcript, null, 2));
await writeFile(join(out, "brief.md"), brief);
console.log(`[plan] done -> ${join(out, "brief.md")}`);
