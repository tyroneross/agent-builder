// Output primitives the planner can pick for each section.
// Each primitive has:
//   id          — what the outliner returns in `shape`
//   description — one-line cue used in the outline meta-prompt
//   schema      — fill-phase JSON schema (omit `format:json` for `prose`)
//   format      — "json" | "text"; controls Ollama format constraint
//   render(data) → markdown string for the compose phase

export const PRIMITIVES = {
  prose: {
    id: "prose",
    description: "Free-form paragraphs. Use for narrative, executive summary, recommendation, rationale.",
    format: "text",
    schema: null,
    render: (data) => (typeof data === "string" ? data.trim() : (data?.text ?? "").trim()),
  },

  bullets: {
    id: "bullets",
    description: "Flat list of short statements. Use for assumptions, unknowns, open questions, caveats, scope items.",
    format: "json",
    schema: {
      type: "object",
      properties: {
        items: { type: "array", items: { type: "string" } },
      },
      required: ["items"],
    },
    render: (data) => (data?.items ?? []).map((s) => `- ${s}`).join("\n"),
  },

  actions: {
    id: "actions",
    description: "Owner, action, due-by items. Use for follow-ups, next steps, task lists, who-does-what.",
    format: "json",
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
              status: { type: "string" },
            },
            required: ["owner", "action"],
          },
        },
      },
      required: ["items"],
    },
    render: (data) =>
      (data?.items ?? [])
        .map((it) => {
          const due = it.dueBy ? ` · due ${it.dueBy}` : "";
          const status = it.status ? ` · ${it.status}` : "";
          return `- **${it.owner ?? "?"}** — ${it.action ?? "?"}${due}${status}`;
        })
        .join("\n"),
  },

  timeline: {
    id: "timeline",
    description: "Sequenced when/what items. Use for project phases, milestones, weekly schedules, rollout sequences.",
    format: "json",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              when: { type: "string" },
              what: { type: "string" },
              why: { type: "string" },
              owner: { type: "string" },
            },
            required: ["when", "what"],
          },
        },
      },
      required: ["items"],
    },
    render: (data) =>
      (data?.items ?? [])
        .map((it) => {
          const why = it.why ? ` — ${it.why}` : "";
          const owner = it.owner ? ` (${it.owner})` : "";
          return `- **${it.when}** · ${it.what}${owner}${why}`;
        })
        .join("\n"),
  },

  options: {
    id: "options",
    description: "Scored options with pros and cons. Use for decision matrices, tradeoff analysis, vendor selection.",
    format: "json",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              option: { type: "string" },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
              score: { type: "number" },
              recommendation: { type: "boolean" },
            },
            required: ["option"],
          },
        },
      },
      required: ["items"],
    },
    render: (data) =>
      (data?.items ?? [])
        .map((it) => {
          const star = it.recommendation ? " ★" : "";
          const score = typeof it.score === "number" ? ` · score ${it.score}` : "";
          const pros = (it.pros ?? []).map((p) => `  - ✓ ${p}`).join("\n");
          const cons = (it.cons ?? []).map((c) => `  - ✗ ${c}`).join("\n");
          return [`- **${it.option}**${star}${score}`, pros, cons].filter(Boolean).join("\n");
        })
        .join("\n"),
  },

  risks: {
    id: "risks",
    description: "Severity-tagged risks with mitigation. Use for risk registers, blocker surfacing, honesty checks.",
    format: "json",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              mitigation: { type: "string" },
              owner: { type: "string" },
            },
            required: ["risk", "severity"],
          },
        },
      },
      required: ["items"],
    },
    render: (data) =>
      (data?.items ?? [])
        .map((it) => {
          const mit = it.mitigation ? ` → ${it.mitigation}` : "";
          const owner = it.owner ? ` (${it.owner})` : "";
          return `- [${it.severity}] ${it.risk}${owner}${mit}`;
        })
        .join("\n"),
  },
};

export const PRIMITIVE_IDS = Object.keys(PRIMITIVES);

export function getPrimitive(id) {
  return PRIMITIVES[id] ?? null;
}

export function describePrimitivesForOutline() {
  return PRIMITIVE_IDS.map((id) => `- ${id}: ${PRIMITIVES[id].description}`).join("\n");
}
