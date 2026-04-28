#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { runChiefOfStaff } from "../lib/cos-runner.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function readMaybe(path) {
  if (!path || !existsSync(path)) return null;
  return readFile(path, "utf8");
}

const scheduleArg = arg("--schedule");
const goalsArg = arg("--goals");
const baseOut = arg("--out", join(ROOT, "runs", new Date().toISOString().replace(/[:.]/g, "-")));
const modelsArg = arg(
  "--models",
  process.env.OLLAMA_MODELS ?? arg("--model", process.env.OLLAMA_MODEL ?? "gpt-oss:20b"),
);
const MODELS = modelsArg.split(",").map((s) => s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.AGENT_BUILDER_LLM_TIMEOUT_MS ?? 900000);

const schedule = await readMaybe(scheduleArg);
const goals = await readMaybe(goalsArg);

async function runForModel(modelName) {
  const safe = modelName.replace(/[^a-z0-9]+/gi, "-");
  const outDir = MODELS.length > 1 ? join(baseOut, safe) : baseOut;
  await mkdir(outDir, { recursive: true });
  console.log(`\n[cos] === model=${modelName} -> ${outDir} ===`);

  const onEvent = (ev) => {
    if (ev.type === "warmup") console.log(`[cos] warmup...`);
    if (ev.type === "warmup-fail") console.log(`[cos] warmup failed: ${ev.error}`);
    if (ev.type === "node-end") {
      const ms = ev.durationMs;
      console.log(
        `[cos] ${ev.name}: ${ms}ms parsed=${ev.parsed} bytes=${ev.bytes}`,
      );
    }
    if (ev.type === "node-error") {
      console.log(`[cos] ${ev.name} failed: ${ev.error}`);
    }
  };

  const { transcript, brief } = await runChiefOfStaff({
    model: modelName,
    schedule,
    goals,
    onEvent,
    timeoutMs: TIMEOUT_MS,
  });

  for (const [key, node] of Object.entries(transcript.nodes)) {
    await writeFile(
      join(outDir, `${key}.json`),
      JSON.stringify(node.parsed ?? { _raw: node.raw, error: node.error }, null, 2),
    );
  }
  await writeFile(join(outDir, "transcript.json"), JSON.stringify(transcript, null, 2));
  await writeFile(join(outDir, "weekly-operating-brief.md"), `${brief}\n\nFull artifacts: \`${outDir}\`\n`);

  console.log(`[cos] done -> ${join(outDir, "weekly-operating-brief.md")}`);
  return { model: modelName, outDir };
}

const results = [];
for (const m of MODELS) {
  results.push(await runForModel(m));
}

if (results.length > 1) {
  console.log(`\n[cos] all models done. Compare:`);
  for (const r of results) {
    console.log(`  - ${r.model}: ${join(r.outDir, "weekly-operating-brief.md")}`);
  }
}
