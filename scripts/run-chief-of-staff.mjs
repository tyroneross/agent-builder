#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

async function ollamaChat({ model, system, messages, timeoutMs }) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      format: "json",
      options: { temperature: 0.1, num_ctx: 8192 },
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let last = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        last = obj;
        if (obj.message?.content) text += obj.message.content;
        if (obj.done) break;
      } catch {}
    }
  }
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { text, parsed, raw: last };
}

async function ollamaTags() {
  const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
  return r.ok ? r.json() : { models: [] };
}

async function warmup(model, timeoutMs) {
  await ollamaChat({
    model, system: "Reply with strict JSON only.",
    messages: [{ role: "user", content: 'Return {"ok":true}' }],
    timeoutMs: Math.min(timeoutMs, 120000),
  });
}

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const AGENT_DIR = join(ROOT, "generated/agents/chief-of-staff-agent");
const SKILL_DIR = join(ROOT, "agent-skills/chief-of-staff");
const TEAM_FILE = join(
  ROOT,
  "agent-outputs/hypothetical-local-agent-suite/final/chief-of-staff-agent/schedule-optimizer/chief-of-staff-team.md",
);
const SAMPLE_INPUT = join(
  ROOT,
  "agent-outputs/hypothetical-local-agent-suite/final/chief-of-staff-agent/schedule-optimizer/input-schedule.json",
);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function readMaybe(path) {
  if (!path) return null;
  if (!existsSync(path)) return null;
  return readFile(path, "utf8");
}

const scheduleArg = arg("--schedule");
const goalsArg = arg("--goals");
const baseOut = arg("--out", join(ROOT, "runs", new Date().toISOString().replace(/[:.]/g, "-")));
const modelsArg = arg("--models", process.env.OLLAMA_MODELS ?? arg("--model", process.env.OLLAMA_MODEL ?? "qwen3:8b-q4_K_M"));
const MODELS = modelsArg.split(",").map((s) => s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.AGENT_BUILDER_LLM_TIMEOUT_MS ?? 900000);

const systemPrompt = await readFile(join(AGENT_DIR, "system-prompt.md"), "utf8");
const tools = await readFile(join(AGENT_DIR, "tools.json"), "utf8");
const team = await readFile(TEAM_FILE, "utf8");
const skillIntake = await readFile(join(SKILL_DIR, "schedule-intake.skill.md"), "utf8");
const skillPlan = await readFile(join(SKILL_DIR, "100x-productivity-planning.skill.md"), "utf8");
const skillFeedback = await readFile(join(SKILL_DIR, "feedback-loop.skill.md"), "utf8");

const scheduleRaw = (await readMaybe(scheduleArg)) ?? (await readFile(SAMPLE_INPUT, "utf8"));
const goalsRaw =
  (await readMaybe(goalsArg)) ??
  "Become 100x more productive by spending more time on high-leverage strengths and less time manually coordinating low-leverage work.";

const HARD_RULES = [
  "You are a local Chief of Staff agent. No web access. No invented data.",
  "Return ONLY valid JSON matching the schema. No prose outside the JSON.",
  "If a value is unknown, use null and add an entry to a top-level `notes` array.",
  "Never invent owners, dates, or events that are not present in the input.",
].join("\n");

const TEAM_BRIEF = team
  .replace(/^#.*$/gm, "")
  .split("\n")
  .filter((l) => l.trim())
  .slice(0, 14)
  .join("\n");

let currentModel;
let currentStatus;

async function callNode(name, schema, instructions, skillContext = "") {
  const system = [
    HARD_RULES,
    `Role: ${name}.`,
    skillContext ? `Skill guidance:\n${skillContext.trim()}` : "",
    `Team context:\n${TEAM_BRIEF}`,
  ].filter(Boolean).join("\n\n");

  const userMsg = [
    instructions,
    "",
    "User goal:",
    goalsRaw.trim(),
    "",
    "Schedule input (JSON):",
    scheduleRaw.trim(),
    "",
    "Output schema (JSON):",
    JSON.stringify(schema),
    "",
    "Return ONLY the JSON object.",
  ].join("\n");

  const t0 = Date.now();
  let out;
  try {
    out = await ollamaChat({
      model: currentModel,
      system,
      messages: [{ role: "user", content: userMsg }],
      timeoutMs: TIMEOUT_MS,
    });
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`[cos] ${name}: ${ms}ms FAIL ${err.message}`);
    throw err;
  }
  const ms = Date.now() - t0;
  console.log(`[cos] ${name}: ${ms}ms parsed=${out.parsed != null} bytes=${out.text.length}`);
  return { ...out, durationMs: ms };
}

const NODES = [
  {
    key: "intake",
    name: "Context intake",
    schema: {
      type: "object",
      properties: {
        weekOf: { type: "string" },
        ownerGoal: { type: "string" },
        fixedEvents: { type: "array" },
        flexibleEvents: { type: "array" },
        baseline: {
          type: "object",
          properties: {
            deepWorkHours: { type: "number" },
            adminHours: { type: "number" },
            contextSwitches: { type: "number" },
            openLoopRisk: { type: "string" },
          },
        },
        notes: { type: "array", items: { type: "string" } },
      },
      required: ["weekOf", "fixedEvents", "flexibleEvents", "baseline"],
    },
    instructions:
      "Apply the schedule-intake skill. Separate fixed from flexible events, label each by type, compute baseline metrics, and list any missing-data items.",
    skill: skillIntake,
  },
  {
    key: "triage",
    name: "Priority triage",
    schema: {
      type: "object",
      properties: {
        topThree: {
          type: "array",
          items: {
            type: "object",
            properties: {
              outcome: { type: "string" },
              owner: { type: "string" },
              leverageRationale: { type: "string" },
              dueBy: { type: "string" },
            },
          },
        },
        rejected: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
      },
      required: ["topThree"],
    },
    instructions:
      "Act as the Priority Strategist. From the schedule and goal, pick the three weekly outcomes with the highest leverage. Reject low-yield commitments by name.",
  },
  {
    key: "time_block_plan",
    name: "Time architect",
    schema: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string" },
              start: { type: "string" },
              end: { type: "string" },
              mode: { type: "string" },
              why: { type: "string" },
            },
            required: ["day", "start", "end", "mode"],
          },
        },
        protectedHours: { type: "number" },
        contextSwitches: { type: "number" },
        tradeoffs: { type: "array", items: { type: "string" } },
      },
      required: ["blocks"],
    },
    instructions:
      "Act as the Calendar Architect. Use the 100x-productivity-planning skill. Protect peak-energy blocks, batch admin, and produce 5-9 named blocks for the week. Note any tradeoff that overrides a fixed event (require approval).",
    skill: skillPlan,
  },
  {
    key: "decision_log",
    name: "Decision prep",
    schema: {
      type: "object",
      properties: {
        decisions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" },
              status: { type: "string" },
              owner: { type: "string" },
            },
          },
        },
      },
      required: ["decisions"],
    },
    instructions:
      "Prepare 1-3 decision log entries for the week's blocked or pending decisions. Each must include options, a recommendation, and a status.",
  },
  {
    key: "follow_up_plan",
    name: "Follow-up planner",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              owner: { type: "string" },
              action: { type: "string" },
              dueBy: { type: "string" },
              channel: { type: "string" },
            },
            required: ["owner", "action"],
          },
        },
        missingOwners: { type: "array", items: { type: "string" } },
      },
      required: ["items"],
    },
    instructions:
      "Act as the Follow-up Operator. Draft owner-specific follow-ups for the week. Use 'MISSING' when no owner exists and surface it in missingOwners.",
  },
  {
    key: "operating_risks",
    name: "Operating risk check",
    schema: {
      type: "object",
      properties: {
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              mitigation: { type: "string" },
            },
            required: ["risk", "severity"],
          },
        },
        unverifiedClaims: { type: "array", items: { type: "string" } },
      },
      required: ["risks"],
    },
    instructions:
      "Act as the Honesty Auditor. Flag missing owners, blocked decisions, overloaded calendars, and any productivity claims not tied to an observable metric.",
  },
];

async function runForModel(modelName) {
  const safe = modelName.replace(/[^a-z0-9]+/gi, "-");
  const outDir = MODELS.length > 1 ? join(baseOut, safe) : baseOut;
  await mkdir(outDir, { recursive: true });

  currentModel = modelName;
  const tags = await ollamaTags();
  const known = (tags.models ?? []).some((m) => m.name === modelName);
  console.log(`\n[cos] === model=${modelName} (${known ? "loaded" : "missing"}) -> ${outDir} ===`);
  if (!known) {
    console.log(`[cos] model ${modelName} not pulled — try: ollama pull ${modelName}`);
  }
  try {
    console.log(`[cos] warmup...`);
    await warmup(modelName, TIMEOUT_MS);
  } catch (err) {
    console.log(`[cos] warmup failed: ${err.message}`);
  }
  currentStatus = { model: modelName, mode: "ollama" };

  const transcript = {
    startedAt: new Date().toISOString(),
    model: modelName,
    mode: "ollama",
    inputs: { schedule: scheduleArg ?? SAMPLE_INPUT, goals: goalsArg ?? "(default)" },
    nodes: {},
  };

  for (const node of NODES) {
    try {
      const out = await callNode(node.name, node.schema, node.instructions, node.skill);
      transcript.nodes[node.key] = {
        name: node.name,
        durationMs: out.durationMs,
        parsed: out.parsed,
        raw: out.text,
      };
      await writeFile(
        join(outDir, `${node.key}.json`),
        JSON.stringify(out.parsed ?? { _raw: out.text }, null, 2),
      );
    } catch (err) {
      console.error(`[cos] ${node.name} failed: ${err.message}`);
      transcript.nodes[node.key] = { name: node.name, error: err.message };
      await writeFile(join(outDir, `${node.key}.json`), JSON.stringify({ error: err.message }, null, 2));
    }
  }

  await writeFile(join(outDir, "transcript.json"), JSON.stringify(transcript, null, 2));

  const blocks = transcript.nodes.time_block_plan?.parsed?.blocks ?? [];
  const top = transcript.nodes.triage?.parsed?.topThree ?? [];
  const risks = transcript.nodes.operating_risks?.parsed?.risks ?? [];
  const md = [
    `# Weekly Operating Brief`,
    ``,
    `Model: ${currentStatus.model} (${currentStatus.mode})`,
    `Generated: ${transcript.startedAt}`,
    ``,
    `## Top 3 leverage outcomes`,
    ...top.map((t, i) => `${i + 1}. **${t.outcome ?? "?"}** — owner: ${t.owner ?? "?"} · due ${t.dueBy ?? "?"}\n   _${t.leverageRationale ?? ""}_`),
    ``,
    `## Time blocks`,
    ...blocks.map((b) => `- **${b.day} ${b.start}-${b.end}** · ${b.mode} — ${b.why ?? ""}`),
    ``,
    `## Operating risks`,
    ...risks.map((r) => `- [${r.severity}] ${r.risk}${r.mitigation ? ` → ${r.mitigation}` : ""}`),
    ``,
    `Full artifacts: \`${outDir}\``,
  ].join("\n");
  await writeFile(join(outDir, "weekly-operating-brief.md"), md);

  console.log(`[cos] done -> ${join(outDir, "weekly-operating-brief.md")}`);
  return { model: modelName, outDir };
}

const results = [];
for (const m of MODELS) {
  results.push(await runForModel(m));
}

if (results.length > 1) {
  console.log(`\n[cos] all models done. Compare:`);
  for (const r of results) console.log(`  - ${r.model}: ${join(r.outDir, "weekly-operating-brief.md")}`);
}
