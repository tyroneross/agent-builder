"use client";

import {
  AlertTriangle,
  Braces,
  Check,
  ChevronRight,
  Database,
  FileCode2,
  Link2,
  ListChecks,
  MousePointer2,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AGENT_STRUCTURES } from "../agent-structures/index.js";
import { buildAgentArtifacts } from "../lib/generator.js";
import { FRAMEWORKS, PATTERNS, SOURCE_REGISTRY } from "../lib/patterns.js";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function createSpec(pattern) {
  const source = pattern.spec ?? pattern;
  return {
    projectName: source.projectName ?? source.name,
    description: source.description,
    patternId: source.patternId ?? source.id,
    structureId: source.structureId,
    runtime: source.runtime ?? source.defaultRuntime,
    framework: source.framework ?? source.recommendedFrameworks?.[0],
    modelProvider: source.modelProvider ?? source.defaultProvider,
    sandbox: source.sandbox ?? "workspace-write",
    autonomy: source.autonomy,
    nodes: clone(source.nodes),
    edges: clone(source.edges),
    inputs: clone(source.inputs),
    outputs: clone(source.outputs),
    tools: clone(source.tools),
    memory: clone(source.memory),
    permissions: clone(source.permissions),
    evals: clone(source.evals),
    learning: clone(source.learning),
    sources: clone(source.sources),
  };
}

function findPattern(id) {
  return PATTERNS.find((pattern) => pattern.id === id) ?? PATTERNS[0];
}

function nodeClass(kind) {
  if (kind === "guardrail" || kind === "approval") return "flow-node is-policy";
  if (kind === "tool" || kind === "executor") return "flow-node is-tool";
  if (kind === "memory" || kind === "state") return "flow-node is-memory";
  if (kind === "eval" || kind === "verifier") return "flow-node is-eval";
  return "flow-node";
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function PatternButton({ pattern, active, onClick }) {
  return (
    <button className={`pattern-button ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="pattern-head">
        <Workflow size={16} />
        <strong>{pattern.name}</strong>
      </span>
      <span>{pattern.short}</span>
      <small>{pattern.type} · {pattern.nodeCount} nodes</small>
    </button>
  );
}

function StructureButton({ structure, active, onClick }) {
  return (
    <button className={`pattern-button ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="pattern-head">
        <Sparkles size={16} />
        <strong>{structure.label}</strong>
      </span>
      <span>{structure.short}</span>
      <small>{structure.category} · {structure.spec.nodes.length} nodes</small>
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Home() {
  const [spec, setSpec] = useState(() => createSpec(PATTERNS[0]));
  const [selectedNodeId, setSelectedNodeId] = useState(spec.nodes[0]?.id);
  const [dragState, setDragState] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [buildState, setBuildState] = useState({ status: "idle" });
  const [previewMode, setPreviewMode] = useState("files");

  const activePattern = findPattern(spec.patternId);
  const selectedNode = spec.nodes.find((node) => node.id === selectedNodeId) ?? spec.nodes[0];
  const artifacts = useMemo(() => buildAgentArtifacts(spec, { createdAt: "preview" }), [spec]);
  const manifestPreview = artifacts.files.find((file) => file.path === "manifest.json")?.content ?? "";
  const yamlPreview = artifacts.files.find((file) => file.path === "agent.yaml")?.content ?? "";
  const framework = FRAMEWORKS.find((item) => item.id === spec.framework);

  function replaceSpecFromPattern(pattern) {
    const next = createSpec(pattern);
    setSpec(next);
    setSelectedNodeId(next.nodes[0]?.id);
    setConnectingFrom(null);
    setBuildState({ status: "idle" });
  }

  function updateSpec(patch) {
    setSpec((current) => ({ ...current, ...patch }));
  }

  function updateSelectedNode(patch) {
    if (!selectedNode) return;
    setSpec((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, ...patch } : node,
      ),
    }));
  }

  function addNode() {
    const id = `agent-${Date.now().toString(36)}`;
    const nextNode = {
      id,
      title: "New agent",
      kind: "agent",
      description: "Describe the role and constraints for this agent.",
      x: 420,
      y: 260,
      tools: [],
      inputs: ["user_request"],
      outputs: ["agent_result"],
      permission: "ask-first",
      model: "inherit",
    };
    setSpec((current) => ({ ...current, nodes: [...current.nodes, nextNode] }));
    setSelectedNodeId(id);
  }

  function removeNode(id) {
    const remaining = spec.nodes.filter((node) => node.id !== id);
    setSpec((current) => ({
      ...current,
      nodes: remaining,
      edges: current.edges.filter((edge) => edge.from !== id && edge.to !== id),
    }));
    setSelectedNodeId(remaining[0]?.id);
    if (connectingFrom === id) setConnectingFrom(null);
  }

  function handleNodePointerDown(event, node) {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedNodeId(node.id);
    setDragState({
      id: node.id,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event) {
    if (!dragState) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(12, Math.min(rect.width - 180, event.clientX - rect.left - dragState.dx));
    const y = Math.max(12, Math.min(rect.height - 100, event.clientY - rect.top - dragState.dy));
    setSpec((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === dragState.id ? { ...node, x, y } : node)),
    }));
  }

  function handleNodeClick(node) {
    setSelectedNodeId(node.id);
    if (!connectingFrom || connectingFrom === node.id) return;
    const exists = spec.edges.some((edge) => edge.from === connectingFrom && edge.to === node.id);
    if (!exists) {
      setSpec((current) => ({
        ...current,
        edges: [...current.edges, { from: connectingFrom, to: node.id, label: "handoff" }],
      }));
    }
    setConnectingFrom(null);
  }

  async function buildAgent() {
    setBuildState({ status: "building" });
    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Build failed");
      }
      setBuildState({ status: "built", ...body });
    } catch (error) {
      setBuildState({
        status: "error",
        error: error instanceof Error ? error.message : "Build failed",
      });
    }
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Agent Builder</p>
          <h1>Design the harness first. Build the files second.</h1>
        </div>
        <div className="topbar-actions">
          <a className="ghost-button" href="/cos">
            <Play size={16} />
            Run Chief of Staff
          </a>
          <button className="ghost-button" onClick={() => replaceSpecFromPattern(activePattern)}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button className="primary-button" onClick={buildAgent} disabled={buildState.status === "building"}>
            <Play size={17} />
            {buildState.status === "building" ? "Building" : "Build Agent"}
          </button>
        </div>
      </section>

      <section className="workspace" aria-label="Agent builder workspace">
        <aside className="panel palette-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Patterns</p>
              <h2>Choose a starting shape</h2>
            </div>
            <Sparkles size={18} />
          </div>

          <div className="pattern-list">
            {PATTERNS.map((pattern) => (
              <PatternButton
                key={pattern.id}
                pattern={pattern}
                active={pattern.id === spec.patternId}
                onClick={() => replaceSpecFromPattern(pattern)}
              />
            ))}
          </div>

          <div className="quiet-group">
            <p className="group-label">Agent structures</p>
            <div className="pattern-list">
              {AGENT_STRUCTURES.map((structure) => (
                <StructureButton
                  key={structure.id}
                  structure={structure}
                  active={structure.id === spec.structureId}
                  onClick={() => replaceSpecFromPattern(structure)}
                />
              ))}
            </div>
          </div>

          <div className="quiet-group">
            <p className="group-label">Framework fit</p>
            <select value={spec.framework} onChange={(event) => updateSpec({ framework: event.target.value })}>
              {FRAMEWORKS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="hint">{framework?.fit}</p>
          </div>

          <div className="quiet-group">
            <p className="group-label">Runtime</p>
            <select value={spec.runtime} onChange={(event) => updateSpec({ runtime: event.target.value })}>
              <option value="local-nextjs">Local Next.js builder</option>
              <option value="local-sandbox">Local sandbox agent</option>
              <option value="local-python">Local Python runtime</option>
              <option value="hosted-api">Hosted API service</option>
              <option value="hybrid">Hybrid local + cloud</option>
            </select>
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">Flow</p>
              <h2>{spec.projectName}</h2>
            </div>
            <div className="toolbar-actions">
              <button className="icon-button" onClick={addNode} title="Add agent node" aria-label="Add agent node">
                <Plus size={17} />
              </button>
              <button
                className={`icon-button ${connectingFrom ? "is-active" : ""}`}
                onClick={() => setConnectingFrom(selectedNode?.id ?? null)}
                title="Connect selected node"
                aria-label="Connect selected node"
              >
                <Link2 size={17} />
              </button>
            </div>
          </div>

          <div
            className="flow-canvas"
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={() => setDragState(null)}
            onPointerCancel={() => setDragState(null)}
          >
            <svg className="edge-layer" aria-hidden="true">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              {spec.edges.map((edge, index) => {
                const from = spec.nodes.find((node) => node.id === edge.from);
                const to = spec.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.x + 172;
                const y1 = from.y + 42;
                const x2 = to.x + 8;
                const y2 = to.y + 42;
                const bend = Math.max(40, Math.abs(x2 - x1) / 2);
                return (
                  <path
                    key={`${edge.from}-${edge.to}-${index}`}
                    className="edge-path"
                    d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>

            {spec.nodes.map((node) => (
              <button
                key={node.id}
                className={`${nodeClass(node.kind)} ${node.id === selectedNode?.id ? "is-selected" : ""} ${connectingFrom === node.id ? "is-connecting" : ""}`}
                style={{ left: node.x, top: node.y }}
                onPointerDown={(event) => handleNodePointerDown(event, node)}
                onClick={() => handleNodeClick(node)}
              >
                <span className="node-kind">{node.kind}</span>
                <strong>{node.title}</strong>
                <span>{node.description}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel inspector-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Inspector</p>
              <h2>Define the contract</h2>
            </div>
            <MousePointer2 size={18} />
          </div>

          <div className="form-stack">
            <Field label="Agent name">
              <input value={spec.projectName} onChange={(event) => updateSpec({ projectName: event.target.value })} />
            </Field>
            <Field label="Description">
              <textarea value={spec.description} onChange={(event) => updateSpec({ description: event.target.value })} rows={3} />
            </Field>
            <Field label="Model provider">
              <select value={spec.modelProvider} onChange={(event) => updateSpec({ modelProvider: event.target.value })}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama / local</option>
                <option value="nvidia-nim">NVIDIA NIM</option>
                <option value="multi-provider">Multi-provider</option>
              </select>
            </Field>
          </div>

          {selectedNode ? (
            <div className="node-editor">
              <div className="editor-head">
                <p className="group-label">Selected node</p>
                <button className="icon-button danger" onClick={() => removeNode(selectedNode.id)} title="Delete node" aria-label="Delete node">
                  <Trash2 size={16} />
                </button>
              </div>
              <Field label="Title">
                <input value={selectedNode.title} onChange={(event) => updateSelectedNode({ title: event.target.value })} />
              </Field>
              <Field label="Role">
                <select value={selectedNode.kind} onChange={(event) => updateSelectedNode({ kind: event.target.value })}>
                  <option value="agent">Agent</option>
                  <option value="orchestrator">Orchestrator</option>
                  <option value="tool">Tool</option>
                  <option value="executor">Executor</option>
                  <option value="guardrail">Guardrail</option>
                  <option value="approval">Approval</option>
                  <option value="memory">Memory</option>
                  <option value="state">State</option>
                  <option value="verifier">Verifier</option>
                  <option value="eval">Eval</option>
                </select>
              </Field>
              <Field label="Description">
                <textarea value={selectedNode.description} onChange={(event) => updateSelectedNode({ description: event.target.value })} rows={3} />
              </Field>
              <Field label="Tools">
                <input value={joinList(selectedNode.tools)} onChange={(event) => updateSelectedNode({ tools: splitList(event.target.value) })} />
              </Field>
              <Field label="Inputs">
                <input value={joinList(selectedNode.inputs)} onChange={(event) => updateSelectedNode({ inputs: splitList(event.target.value) })} />
              </Field>
              <Field label="Outputs">
                <input value={joinList(selectedNode.outputs)} onChange={(event) => updateSelectedNode({ outputs: splitList(event.target.value) })} />
              </Field>
              <Field label="Permission">
                <select value={selectedNode.permission} onChange={(event) => updateSelectedNode({ permission: event.target.value })}>
                  <option value="allow-read">Allow read</option>
                  <option value="ask-first">Ask first</option>
                  <option value="approval-required">Approval required</option>
                  <option value="deny-by-default">Deny by default</option>
                </select>
              </Field>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="bottom-grid">
        <div className="panel output-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Build output</p>
              <h2>Files that will be created</h2>
            </div>
            <FileCode2 size={18} />
          </div>

          <div className="status-row">
            <span><Braces size={15} /> {artifacts.files.length} files</span>
            <span><Shield size={15} /> {spec.sandbox}</span>
            <span><ListChecks size={15} /> {spec.evals.length} evals</span>
            {spec.learning ? <span><Sparkles size={15} /> {spec.learning.domain}</span> : null}
          </div>

          {buildState.status === "built" ? (
            <div className="success-box">
              <Check size={17} />
              <span>Created {buildState.files.length} files in <strong>{buildState.outputDir}</strong></span>
            </div>
          ) : null}

          {buildState.status === "error" ? (
            <div className="error-box">
              <AlertTriangle size={17} />
              <span>{buildState.error}</span>
            </div>
          ) : null}

          <div className="preview-tabs" role="tablist" aria-label="Preview output">
            <button className={previewMode === "files" ? "is-active" : ""} onClick={() => setPreviewMode("files")}>Files</button>
            <button className={previewMode === "yaml" ? "is-active" : ""} onClick={() => setPreviewMode("yaml")}>YAML</button>
            <button className={previewMode === "manifest" ? "is-active" : ""} onClick={() => setPreviewMode("manifest")}>JSON</button>
          </div>

          {previewMode === "files" ? (
            <div className="file-list">
              {artifacts.files.map((file) => (
                <span key={file.path}>
                  <ChevronRight size={14} />
                  {file.path}
                </span>
              ))}
            </div>
          ) : null}
          {previewMode === "yaml" ? <pre className="code-preview">{yamlPreview}</pre> : null}
          {previewMode === "manifest" ? <pre className="code-preview">{manifestPreview}</pre> : null}
        </div>

        <div className="panel source-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">References</p>
              <h2>Docs to check before implementation</h2>
            </div>
            <Database size={18} />
          </div>
          <div className="source-list">
            {SOURCE_REGISTRY.slice(0, 8).map((source) => (
              <a href={source.url} key={source.id} target="_blank" rel="noreferrer">
                <strong>{source.name}</strong>
                <span>{source.category} · {source.lastChecked}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
