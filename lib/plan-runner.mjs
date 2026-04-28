import {
  PRIMITIVES,
  PRIMITIVE_IDS,
  getPrimitive,
  describePrimitivesForOutline,
} from "./plan-primitives.mjs";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export async function ollamaTags() {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { models: [] };
    return r.json();
  } catch {
    return { models: [] };
  }
}

async function ollamaChat({ model, system, user, format, timeoutMs, onChunk }) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      ...(format === "json" ? { format: "json" } : {}),
      options: { temperature: 0.2, num_ctx: 8192 },
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: user },
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
  if (format === "json") {
    try { parsed = JSON.parse(text); } catch {}
  }
  return { text, parsed, raw: last };
}

const HARD_RULES = [
  "You are a local planning agent. No web access. No invented facts.",
  "If a value is unknown, say so explicitly rather than fabricating.",
  "Never invent owners, dates, or numbers that are not present in the user's input.",
].join("\n");

const OUTLINE_META_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          purpose: { type: "string" },
          shape: { type: "string", enum: PRIMITIVE_IDS },
          hint: { type: "string" },
        },
        required: ["id", "name", "purpose", "shape"],
      },
    },
  },
  required: ["title", "summary", "sections"],
};

function buildOutlinePrompt({ goal, context }) {
  return [
    "Design the structure for the brief that best answers the user's request.",
    "",
    "Pick 3 to 7 sections. Each section uses one of the available shapes:",
    "",
    describePrimitivesForOutline(),
    "",
    "Available shape ids: " + PRIMITIVE_IDS.join(", "),
    "",
    "Return JSON matching this meta-schema:",
    JSON.stringify(OUTLINE_META_SCHEMA),
    "",
    "Rules for the outline:",
    "- Pick the smallest section count that fully answers the request.",
    "- Each section.id is kebab-case, unique, no spaces.",
    "- Each section.name is human-readable Title Case.",
    "- Each section.purpose is one sentence describing what the section will say.",
    "- Each section.shape MUST be one of: " + PRIMITIVE_IDS.join(", "),
    "- Use `prose` for narrative or rationale. Use structured shapes (actions, timeline, options, risks, bullets) for lists.",
    "- Order sections logically: setup/scope first, structured analysis middle, recommendation and risks last.",
    "",
    "User goal:",
    (goal ?? "").trim(),
    "",
    "Optional context the user provided:",
    (context ?? "").trim() || "(none provided — work from the goal alone)",
    "",
    "Return ONLY the JSON object.",
  ].join("\n");
}

function buildFillPrompt({ goal, context, section, primitive, outline }) {
  const lines = [
    `Fill the section "${section.name}" of the brief.`,
    `Section purpose: ${section.purpose}`,
  ];
  if (section.hint) lines.push(`Hint: ${section.hint}`);
  lines.push("");
  lines.push(`Brief title: ${outline.title}`);
  lines.push(`Brief summary: ${outline.summary}`);
  lines.push("");
  lines.push("User goal:");
  lines.push((goal ?? "").trim());
  lines.push("");
  lines.push("User context:");
  lines.push((context ?? "").trim() || "(none provided)");
  lines.push("");

  if (primitive.format === "json") {
    lines.push(`Output shape: ${primitive.id}`);
    lines.push("Return JSON matching this schema:");
    lines.push(JSON.stringify(primitive.schema));
    lines.push("");
    lines.push("Return ONLY the JSON object. No prose outside the JSON.");
  } else {
    lines.push("Output shape: prose");
    lines.push("Return clear, concise paragraphs. No headings, no bullet lists. 2 to 5 sentences.");
  }
  return lines.join("\n");
}

function composeBrief({ outline, sections, model, startedAt }) {
  const out = [];
  out.push(`# ${outline.title}`);
  out.push("");
  out.push(`_Model: ${model} · Generated: ${startedAt}_`);
  out.push("");
  if (outline.summary) {
    out.push(outline.summary.trim());
    out.push("");
  }
  for (const sec of outline.sections) {
    const filled = sections[sec.id];
    out.push(`## ${sec.name}`);
    out.push("");
    if (filled?.error) {
      out.push(`_(failed: ${filled.error})_`);
    } else if (filled?.rendered) {
      out.push(filled.rendered);
    } else {
      out.push("_(no content)_");
    }
    out.push("");
  }
  return out.join("\n").trimEnd() + "\n";
}

export async function runPlan({
  model,
  goal,
  context,
  onEvent = () => {},
  timeoutMs = 900000,
}) {
  if (!goal?.trim()) throw new Error("goal is required");

  const transcript = {
    startedAt: new Date().toISOString(),
    model,
    goal,
    context: context ?? "",
    outline: null,
    sections: {},
  };

  // Warmup
  onEvent({ type: "warmup", model });
  try {
    await ollamaChat({
      model,
      system: "Reply with strict JSON only.",
      user: 'Return {"ok":true}',
      format: "json",
      timeoutMs: Math.min(timeoutMs, 120000),
    });
    onEvent({ type: "warmup-ok" });
  } catch (err) {
    onEvent({ type: "warmup-fail", error: err.message });
  }

  // Phase 1: Outline
  onEvent({ type: "outline-start" });
  const outlineSystem = [
    HARD_RULES,
    "Role: Outliner. You design the structure of a brief by choosing sections and shapes.",
  ].join("\n\n");
  const outlineUser = buildOutlinePrompt({ goal, context });
  let outline;
  try {
    const t0 = Date.now();
    const out = await ollamaChat({
      model,
      system: outlineSystem,
      user: outlineUser,
      format: "json",
      timeoutMs,
      onChunk: (_chunk, totalBytes) => onEvent({ type: "outline-chunk", bytes: totalBytes }),
    });
    if (!out.parsed) throw new Error("outline did not return valid JSON");
    outline = out.parsed;
    if (!Array.isArray(outline.sections) || outline.sections.length === 0) {
      throw new Error("outline returned no sections");
    }
    // Filter sections to valid shapes
    outline.sections = outline.sections.filter((s) => PRIMITIVE_IDS.includes(s.shape));
    if (outline.sections.length === 0) {
      throw new Error("outline picked no valid shapes");
    }
    transcript.outline = outline;
    onEvent({
      type: "outline-end",
      durationMs: Date.now() - t0,
      outline,
    });
  } catch (err) {
    onEvent({ type: "outline-error", error: err.message });
    throw err;
  }

  // Phase 2: Fill
  for (const section of outline.sections) {
    const primitive = getPrimitive(section.shape);
    if (!primitive) {
      transcript.sections[section.id] = { error: `unknown shape ${section.shape}` };
      onEvent({ type: "section-error", id: section.id, error: `unknown shape ${section.shape}` });
      continue;
    }

    onEvent({ type: "section-start", id: section.id, name: section.name, shape: section.shape });

    const sectionSystem = [
      HARD_RULES,
      `Role: Section writer for "${section.name}".`,
    ].join("\n\n");
    const sectionUser = buildFillPrompt({ goal, context, section, primitive, outline });

    const t0 = Date.now();
    try {
      const out = await ollamaChat({
        model,
        system: sectionSystem,
        user: sectionUser,
        format: primitive.format,
        timeoutMs,
        onChunk: (_chunk, totalBytes) =>
          onEvent({ type: "section-chunk", id: section.id, bytes: totalBytes }),
      });

      let rendered;
      if (primitive.format === "json") {
        if (!out.parsed) throw new Error("section did not return valid JSON");
        rendered = primitive.render(out.parsed);
      } else {
        rendered = primitive.render(out.text);
      }

      transcript.sections[section.id] = {
        durationMs: Date.now() - t0,
        bytes: out.text.length,
        parsed: out.parsed,
        text: out.text,
        rendered,
      };
      onEvent({
        type: "section-end",
        id: section.id,
        name: section.name,
        durationMs: Date.now() - t0,
        bytes: out.text.length,
        rendered,
      });
    } catch (err) {
      transcript.sections[section.id] = {
        durationMs: Date.now() - t0,
        error: err.message,
      };
      onEvent({
        type: "section-error",
        id: section.id,
        name: section.name,
        error: err.message,
      });
    }
  }

  // Phase 3: Compose
  const brief = composeBrief({
    outline,
    sections: transcript.sections,
    model,
    startedAt: transcript.startedAt,
  });
  onEvent({ type: "complete", brief, transcript });
  return { transcript, brief };
}
