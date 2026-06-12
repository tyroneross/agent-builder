# The Agent Harness — Six Components

> Empirical catalog · RossLabs.ai research corpus · April 2026
> Parent skill: `agent-builder` · Sibling: `01-architecture-taxonomy.md`

**Read this when** the request involves decomposing a harness into parts, diagnosing which part is weak, or grounding the methodology's topic files in the component vocabulary used by Anthropic, LangChain, Manus, and Phil Schmid.

---

## Core Claim

**The harness, not the model, is the product.** Phil Schmid's analogy: the harness is the OS, the model is the CPU.

**Key evidence:** LangChain achieved a 13.7pt improvement on TerminalBench 2.0 through harness changes alone, with no model swap.

---

## The Six Components

### 1. System Prompt Architecture
Layered documents built to delete with each model release. Claude Code: custom → built-in → skills → filesystem → tool-specific. Manus: XML semantic markup.

### 2. Tool Definitions
Each MCP tool costs 500–1,000+ context tokens. On-demand loading is critical. Anthropic's tool-testing agent — which rewrites tool descriptions automatically — reduced completion time 40%.

For tools that mutate state, the definition is incomplete unless it names the state owner, side effect, receipt/readback evidence, rollback path, and permission tier. See `07-local-operational-patterns.md` for the read-after-write contract.

### 3. Memory (COALA Framework)
Five layers:
- **Working** — context window, ephemeral
- **Short-term / Session** — durable within session
- **Long-term Semantic** — vector stores
- **Long-term Episodic** — conversation logs
- **Procedural** — AGENTS.md / CLAUDE.md files

See `04-memory-substrates.md` for substrate-level implementation detail. For long-term project memory, also require a promotion boundary: raw/candidate observations must not become durable decisions or lessons without review, provenance, and validation.

### 4. Context Window Management
The #1 bottleneck. Six strategies in production:
- Compaction at 92% capacity
- Sub-agent delegation for context isolation
- File buffering (filesystem as external working memory)
- Fan-out to smaller models
- Todo lists as attention anchors
- Progressive disclosure of tools/skills

### 5. Error Handling
Four tiers:
1. **Self-recovery** — retry with adjustment
2. **Validation gates** — schema/type check before commit
3. **Critic agents** — second model reviews output
4. **Human escalation** — approval gate

Max-retry with exponential backoff is the minimum baseline. In stateful or multi-agent harnesses, add replay and read-after-write regressions for every prior stale-read, dropped-write, or missing-receipt failure.

### 6. Observability
"Way more impactful in agents than single LLM apps." Tooling: LangSmith, Logfire, Langfuse. Emerging pattern: **harness-as-dataset** — failure trajectories become training data for the next harness iteration.

Operational observability should include the facts operators actually need: state owner, current phase, last mutation evidence, pending receipts/ACKs, stale-memory warnings, queue/backpressure state, eval validity, cost, and stop reason.

---

## Reconciliation With Agent Builder Outputs

The six-component view above is the fastest checklist for design and evaluation work. Map each component to generated Agent Builder artifacts so the output remains actionable:

| Component (this file) | Agent Builder artifact(s) |
|---|---|
| 1. System Prompt Architecture | `system-prompt.md`, `prompts/prompt-builder-contract.md` |
| 2. Tool Definitions | `tools.json`, `manifest.json` |
| 3. Memory | `memory/domain-playbook.md`, `memory/learning-ledger.json`, catalog `04-memory-substrates.md` |
| 4. Context Window Management | `manifest.json`, `sources.md`, prompt contract context rules |
| 5. Error Handling | `tools.json`, evals, prompt contract failure handling |
| 6. Observability | evals, generated README, sandbox/DOE reports |

Use the component view when talking to operators or SREs. Use the artifact view when turning an agent idea into files.

## Profile-Scaled Component Depth

Do not apply the same component depth to every agent. The six components are always relevant, but the required evidence changes by profile:

| Profile | Sufficient component evidence |
|---|---|
| `skill` | Trigger conditions, input/output contract, prompt instructions, host permission assumptions, and fixture-level validation. A standalone skill does not need agent registry or lifecycle governance unless it also deploys a runtime. |
| `personal` | System boundary, tool contracts, local sandbox/read-only policy, visible stop reasons, golden tasks, and basic observability. This is the default for one-user/local agents. |
| `team` | Personal evidence plus flow topology, guardrails, human approval/review checkpoints, retry/handoff behavior, and state ownership. Use when multiple people, hosted runtime, or shared workflow state exists. |
| `enterprise` | Team evidence plus agent registry, IAM/service identities, audit events, lifecycle/rollback/deactivation, and eval-gated promotion. Use for production users, regulated data, system-of-record writes, or high-risk side effects. |

Evaluation rule: call a primitive "missing" only if the selected profile requires it. A personal agent without an enterprise registry is acceptable; an enterprise runtime without an owner registry or lifecycle contract is not.

---

## Local Operational Overlay

For repo-local, long-running, daemon-backed, or multi-agent systems, apply `07-local-operational-patterns.md` after this six-component checklist. It adds nine concrete contracts that are easy to miss in abstract architecture reviews:

- state owner
- mutation readback
- receipts / ACKs
- memory promotion
- provenance
- freshness
- backpressure
- eval honesty
- real transport tests

If those contracts are absent, the harness can appear complete while still failing under resume, coordination, memory reuse, or live-runtime pressure.

---

*Catalog file 02/10 · derived from RossLabs agentic architectures research corpus · April 2026*
