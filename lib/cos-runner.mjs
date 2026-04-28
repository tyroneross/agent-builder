import { readFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENT_DIR = join(ROOT, "generated/agents/chief-of-staff-agent");
const SKILL_DIR = join(ROOT, "agent-skills/chief-of-staff");
const TEAM_FILE = join(
  ROOT,
  "agent-outputs/hypothetical-local-agent-suite/final/chief-of-staff-agent/schedule-optimizer/chief-of-staff-team.md",
);
export const SAMPLE_INPUT = join(
  ROOT,
  "agent-outputs/hypothetical-local-agent-suite/final/chief-of-staff-agent/schedule-optimizer/input-schedule.json",
);

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const DEFAULT_GOAL =
  "Become 100x more productive by spending more time on high-leverage strengths and less time manually coordinating low-leverage work.";

export async function ollamaTags() {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { models: [] };
    return r.json();
  } catch {
    return { models: [] };
  }
}

async function ollamaChat({ model, system, messages, timeoutMs, onChunk }) {
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
        if (obj.message?.content) {
          text += obj.message.content;
          onChunk?.(obj.message.content, text.length);
        }
        if (obj.done) break;
      } catch {}
    }
  }
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { text, parsed, raw: last };
}

const HARD_RULES = [
  "You are a local Chief of Staff agent. No web access. No invented data.",
  "Return ONLY valid JSON matching the schema. No prose outside the JSON.",
  "If a value is unknown, use null and add an entry to a top-level `notes` array.",
  "Never invent owners, dates, or events that are not present in the input.",
].join("\n");

let _cachedContext = null;
async function loadContext() {
  if (_cachedContext) return _cachedContext;
  const [team, skillIntake, skillPlan] = await Promise.all([
    readFile(TEAM_FILE, "utf8"),
    readFile(join(SKILL_DIR, "schedule-intake.skill.md"), "utf8"),
    readFile(join(SKILL_DIR, "100x-productivity-planning.skill.md"), "utf8"),
  ]);
  const teamBrief = team
    .replace(/^#.*$/gm, "")
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 14)
    .join("\n");
  _cachedContext = { teamBrief, skillIntake, skillPlan };
  return _cachedContext;
}

export function buildNodes(skills) {
  return [
    {
      key: "intake",
      name: "Context intake",
      skill: skills.skillIntake,
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
      skill: skills.skillPlan,
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
}

export function buildBrief({ model, transcript }) {
  const blocks = transcript.nodes.time_block_plan?.parsed?.blocks ?? [];
  const top = transcript.nodes.triage?.parsed?.topThree ?? [];
  const risks = transcript.nodes.operating_risks?.parsed?.risks ?? [];
  return [
    `# Weekly Operating Brief`,
    ``,
    `Model: ${model} (ollama)`,
    `Generated: ${transcript.startedAt}`,
    ``,
    `## Top 3 leverage outcomes`,
    ...top.map(
      (t, i) =>
        `${i + 1}. **${t.outcome ?? "?"}** — owner: ${t.owner ?? "?"} · due ${t.dueBy ?? "?"}\n   _${t.leverageRationale ?? ""}_`,
    ),
    ``,
    `## Time blocks`,
    ...blocks.map(
      (b) => `- **${b.day} ${b.start}-${b.end}** · ${b.mode} — ${b.why ?? ""}`,
    ),
    ``,
    `## Operating risks`,
    ...risks.map(
      (r) => `- [${r.severity}] ${r.risk}${r.mitigation ? ` → ${r.mitigation}` : ""}`,
    ),
  ].join("\n");
}

export async function runChiefOfStaff({
  model,
  schedule,
  goals,
  onEvent = () => {},
  timeoutMs = 900000,
}) {
  const ctx = await loadContext();
  const nodes = buildNodes({
    skillIntake: ctx.skillIntake,
    skillPlan: ctx.skillPlan,
  });
  const goalsRaw = (goals ?? "").trim() || DEFAULT_GOAL;
  const scheduleRaw =
    (schedule ?? "").trim() || (await readFile(SAMPLE_INPUT, "utf8"));

  const transcript = {
    startedAt: new Date().toISOString(),
    model,
    mode: "ollama",
    nodes: {},
  };

  onEvent({ type: "warmup", model });
  try {
    await ollamaChat({
      model,
      system: "Reply with strict JSON only.",
      messages: [{ role: "user", content: 'Return {"ok":true}' }],
      timeoutMs: Math.min(timeoutMs, 120000),
    });
    onEvent({ type: "warmup-ok", model });
  } catch (err) {
    onEvent({ type: "warmup-fail", model, error: err.message });
  }

  for (const node of nodes) {
    onEvent({ type: "node-start", key: node.key, name: node.name });

    const system = [
      HARD_RULES,
      `Role: ${node.name}.`,
      node.skill ? `Skill guidance:\n${node.skill.trim()}` : "",
      `Team context:\n${ctx.teamBrief}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const userMsg = [
      node.instructions,
      "",
      "User goal:",
      goalsRaw,
      "",
      "Schedule input (JSON):",
      scheduleRaw,
      "",
      "Output schema (JSON):",
      JSON.stringify(node.schema),
      "",
      "Return ONLY the JSON object.",
    ].join("\n");

    const t0 = Date.now();
    try {
      const out = await ollamaChat({
        model,
        system,
        messages: [{ role: "user", content: userMsg }],
        timeoutMs,
        onChunk: (_chunk, totalBytes) =>
          onEvent({ type: "node-chunk", key: node.key, bytes: totalBytes }),
      });
      const ms = Date.now() - t0;
      transcript.nodes[node.key] = {
        name: node.name,
        durationMs: ms,
        parsed: out.parsed,
        raw: out.text,
      };
      onEvent({
        type: "node-end",
        key: node.key,
        name: node.name,
        durationMs: ms,
        bytes: out.text.length,
        parsed: out.parsed != null,
        result: out.parsed,
      });
    } catch (err) {
      const ms = Date.now() - t0;
      transcript.nodes[node.key] = {
        name: node.name,
        durationMs: ms,
        error: err.message,
      };
      onEvent({
        type: "node-error",
        key: node.key,
        name: node.name,
        durationMs: ms,
        error: err.message,
      });
    }
  }

  const brief = buildBrief({ model, transcript });
  onEvent({ type: "complete", brief, transcript });
  return { transcript, brief };
}
