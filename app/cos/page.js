"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_GOAL = "";

export default function PlannerPage() {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("gpt-oss:20b");
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [context, setContext] = useState("");
  const [samples, setSamples] = useState([]);
  const [running, setRunning] = useState(false);
  const [warmup, setWarmup] = useState(null);
  const [outline, setOutline] = useState(null);
  const [outlineStatus, setOutlineStatus] = useState("idle");
  const [sections, setSections] = useState({});
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  useEffect(() => {
    fetch("/api/cos/models")
      .then((r) => r.json())
      .then((d) => {
        const list = d.models ?? [];
        setModels(list);
        const preferred = ["gpt-oss:20b", "qwen2.5-coder:32b-instruct-q5_K_M", "qwen3:8b-q4_K_M"];
        const first = preferred.find((p) => list.some((m) => m.name === p)) ?? list[0]?.name;
        if (first) setModel(first);
      })
      .catch(() => {});
    fetch("/api/plan/sample")
      .then((r) => r.json())
      .then((d) => setSamples(d.samples ?? []))
      .catch(() => {});
  }, []);

  function loadSample(sample) {
    setGoal(sample.goal);
    setContext(sample.context);
  }

  async function start() {
    setRunning(true);
    setError("");
    setBrief("");
    setWarmup(null);
    setOutline(null);
    setOutlineStatus("running");
    setSections({});

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/plan/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, goal, context }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`server ${res.status}: ${t.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const block of events) {
          const line = block.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let ev;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          handleEvent(ev);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleEvent(ev) {
    if (ev.type === "warmup") setWarmup({ status: "running" });
    if (ev.type === "warmup-ok") setWarmup({ status: "ok" });
    if (ev.type === "warmup-fail") setWarmup({ status: "fail", error: ev.error });
    if (ev.type === "outline-start") setOutlineStatus("running");
    if (ev.type === "outline-chunk") setOutline((o) => ({ ...(o ?? {}), bytes: ev.bytes }));
    if (ev.type === "outline-end") {
      setOutline({ ...ev.outline, durationMs: ev.durationMs });
      setOutlineStatus("ok");
      const initial = {};
      for (const s of ev.outline.sections) initial[s.id] = { status: "idle", name: s.name, shape: s.shape };
      setSections(initial);
    }
    if (ev.type === "outline-error") {
      setOutlineStatus("error");
      setError(ev.error);
    }
    if (ev.type === "section-start") {
      setSections((s) => ({
        ...s,
        [ev.id]: { ...(s[ev.id] ?? {}), status: "running", bytes: 0 },
      }));
    }
    if (ev.type === "section-chunk") {
      setSections((s) => ({
        ...s,
        [ev.id]: { ...(s[ev.id] ?? {}), bytes: ev.bytes },
      }));
    }
    if (ev.type === "section-end") {
      setSections((s) => ({
        ...s,
        [ev.id]: {
          ...(s[ev.id] ?? {}),
          status: "ok",
          durationMs: ev.durationMs,
          bytes: ev.bytes,
        },
      }));
    }
    if (ev.type === "section-error") {
      setSections((s) => ({
        ...s,
        [ev.id]: { ...(s[ev.id] ?? {}), status: "error", error: ev.error },
      }));
    }
    if (ev.type === "complete") setBrief(ev.brief);
    if (ev.type === "fatal") setError(ev.error);
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const orderedSections = useMemo(
    () => (outline?.sections ?? []).map((s) => ({ ...s, ...(sections[s.id] ?? {}) })),
    [outline, sections],
  );

  return (
    <div className="cos-shell">
      <header className="cos-header">
        <h1>Planner</h1>
        <p>Local agent. Designs its own structure for any planning task. Runs on your Ollama models.</p>
      </header>

      <section className="cos-form">
        <div className="cos-row">
          <label>
            <span>Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={running}>
              {models.length === 0 && <option value={model}>{model}</option>}
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.sizeGB ? ` · ${m.sizeGB} GB` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {samples.length > 0 && (
          <div className="cos-row">
            <span className="cos-row-label">Start from a template</span>
            <div className="cos-samples">
              {samples.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="cos-sample"
                  onClick={() => loadSample(s)}
                  disabled={running}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="cos-row">
          <label>
            <span>Goal</span>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={running}
              placeholder="What do you want planned? e.g. Plan a 6-week rollout for the auth refactor."
            />
          </label>
        </div>

        <div className="cos-row">
          <label>
            <span>Context (optional)</span>
            <textarea
              rows={10}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={running}
              placeholder="Paste any relevant data: schedules, scope notes, constraints, prior decisions."
            />
          </label>
        </div>

        <div className="cos-actions">
          {!running ? (
            <button
              type="button"
              className="cos-primary"
              onClick={start}
              disabled={!model || !goal.trim()}
            >
              Run agent
            </button>
          ) : (
            <button type="button" className="cos-secondary" onClick={cancel}>
              Cancel
            </button>
          )}
          {error && <span className="cos-error">{error}</span>}
        </div>
      </section>

      <section className="cos-progress">
        <h2>Progress</h2>
        <ol className="cos-steps">
          <li className={`cos-step cos-step-${warmup?.status ?? "idle"}`}>
            <span className="cos-step-label">Warmup</span>
            <span className="cos-step-meta">
              {warmup?.status === "running" && "loading model..."}
              {warmup?.status === "ok" && "ready"}
              {warmup?.status === "fail" && (warmup.error ?? "failed")}
            </span>
          </li>
          <li className={`cos-step cos-step-${outlineStatus}`}>
            <span className="cos-step-label">Outline</span>
            <span className="cos-step-meta">
              {outlineStatus === "idle" && "waiting"}
              {outlineStatus === "running" && `${outline?.bytes ?? 0} bytes...`}
              {outlineStatus === "ok" &&
                `${outline?.sections?.length ?? 0} sections · ${(outline.durationMs / 1000).toFixed(1)}s ✓`}
              {outlineStatus === "error" && "failed"}
            </span>
          </li>
          {orderedSections.map((s) => (
            <li key={s.id} className={`cos-step cos-step-${s.status ?? "idle"}`}>
              <span className="cos-step-label">
                {s.name}
                <span className="cos-step-shape">[{s.shape}]</span>
              </span>
              <span className="cos-step-meta">
                {s.status === "running" && `${s.bytes ?? 0} bytes...`}
                {s.status === "ok" && `${(s.durationMs / 1000).toFixed(1)}s · ${s.bytes}b ✓`}
                {s.status === "error" && `✗ ${s.error}`}
                {(!s.status || s.status === "idle") && "queued"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {brief && (
        <section className="cos-brief">
          <h2>Brief</h2>
          <pre>{brief}</pre>
        </section>
      )}

      <style jsx>{`
        .cos-shell {
          max-width: 880px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          color: var(--ink);
        }
        .cos-header h1 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.01em;
        }
        .cos-header p {
          margin: 6px 0 24px;
          color: var(--muted);
        }
        .cos-form,
        .cos-progress,
        .cos-brief {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .cos-row {
          margin-bottom: 14px;
        }
        .cos-row label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cos-row span,
        .cos-row-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .cos-samples {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .cos-sample {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 12px;
          cursor: pointer;
          color: var(--ink);
        }
        .cos-sample:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent-strong);
        }
        .cos-sample:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cos-row select,
        .cos-row textarea {
          width: 100%;
          font-family: inherit;
          font-size: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--ink);
        }
        .cos-row textarea {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 13px;
          line-height: 1.45;
          resize: vertical;
        }
        .cos-row textarea:focus,
        .cos-row select:focus {
          outline: 2px solid var(--accent-soft);
          border-color: var(--accent);
        }
        .cos-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .cos-primary,
        .cos-secondary {
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .cos-primary {
          background: var(--accent);
          color: #fff;
        }
        .cos-primary:hover:not(:disabled) {
          background: var(--accent-strong);
        }
        .cos-primary:disabled {
          background: var(--surface-muted);
          color: var(--faint);
          cursor: not-allowed;
        }
        .cos-secondary {
          background: var(--surface);
          color: var(--danger);
          border-color: var(--danger);
        }
        .cos-error {
          color: var(--danger);
          font-size: 13px;
        }
        .cos-progress h2,
        .cos-brief h2 {
          margin: 0 0 14px;
          font-size: 16px;
          letter-spacing: 0.01em;
        }
        .cos-steps {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .cos-step {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 6px;
          background: var(--surface-muted);
          border: 1px solid transparent;
        }
        .cos-step-label {
          font-weight: 500;
          font-size: 14px;
        }
        .cos-step-shape {
          margin-left: 8px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          color: var(--faint);
          font-weight: 400;
        }
        .cos-step-meta {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12px;
          color: var(--muted);
        }
        .cos-step-running {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .cos-step-ok {
          border-color: var(--accent);
        }
        .cos-step-error {
          border-color: var(--danger);
          background: var(--danger-soft);
        }
        .cos-brief pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 13px;
          line-height: 1.5;
          background: var(--bg);
          padding: 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
