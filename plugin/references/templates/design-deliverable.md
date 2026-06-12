# Design Deliverable Template

> Use when the skill is in `design` or `design + evaluation` mode. Structure the output this way — do not free-form.

---

## 1. Job Definition

State in one paragraph:
- **Who** the harness serves (user + operator)
- **What job** it owns (single sentence)
- **Actions** it may take (bullet list, ≤10)
- **What must never happen** (hard constraints — safety, cost, data)

## 2. Architecture

- **Shape:** (chat assistant / workflow orchestrator / code agent / copilot / embedded feature / hybrid)
- **Catalog type:** (Type I / II / III / IV / V — cite `catalog/01-architecture-taxonomy.md`)
- **Spec profile:** (`skill` / `personal` / `team` / `enterprise`) with one sentence explaining why this is enough and what signal would promote it
- **Coordination pattern:** (prompt chain / routing / parallel / orchestrator-workers / evaluator-optimizer / hierarchical / autonomous loop)
- **Deployment mode:** (API-key runtime / Claude-native / Codex-native / host-agnostic / hybrid — cite `catalog/10-cross-host-deployment.md`)
- **Rationale:** one paragraph explaining why this shape beats the next-closest alternative

## 3. Repository & Delivery Structure

- **Repo shape:** (API-first / host-native skill-plugin / hybrid product + host companion — cite `catalog/08-repo-skill-architecture.md`)
- **Runtime entrypoint:** file/command/API route
- **Host entrypoints:** Claude, Codex, API, CLI, MCP, or other host surfaces
- **Package boundary:** what is copyable/installable as a unit
- **Contracts folder:** where agent manifests, role cards, tools, skills, handoffs, and eval schemas live
- **Environment contract:** API key names, fixture/offline mode, credential preflight
- **Validation commands:** tests, package checks, host-manifest checks

## 4. Skill Bank & Skill Chaining

List reusable skills the system will use or create. For each:

- **Skill id**
- **Purpose**
- **Source:** reuse existing / modify existing / wrap / fork / create new
- **Host support:** API wrapper / Claude / Codex / host-agnostic
- **Input artifact**
- **Output artifact**
- **Chain position:** before / after / router branch / standalone
- **Validation**

If chaining is used, name the pattern from `catalog/09-skill-bank-and-chaining.md` and the termination condition.

## 5. Primitives & Subsystems

List the minimum useful set. For each:
- **Name**
- **Responsibility** (one line)
- **Reads / Writes** (what state, what side effects)
- **Trust tier** (free / user-approved / admin-approved / never)
- **Audit evidence** (what log or record proves it ran correctly)

## 6. State & Lifecycle

- Request entrypoint
- Preflight checks
- First model call inputs
- State owner for each mutable domain
- State writes
- Read-after-write / receipt evidence
- Side-effect boundaries
- Wait / resume conditions
- Completion path
- Failure path

If retries or approvals exist, name the explicit workflow states.

## 7. Context & Memory

- **Turn-one mandatory context** — what's always injected
- **Retrieved later** — what's pulled on demand
- **Persistent memory** — what survives the session, and which substrate (cite `catalog/04-memory-substrates.md` if non-obvious)
- **Promotion rule** — what moves from raw/candidate observations into durable memory
- **Provenance** — how each context item's source is tracked
- **Staleness defense** — how old context is prevented from dominating

## 8. UX & Observability

- What the user sees while work runs (streaming / spinner / live log)
- How approvals are surfaced
- Stop reasons the user can see
- Logs / health surfaces operators get
- Pending receipts, ACKs, or unresolved handoffs users/operators can inspect
- Cost signals that matter (per-turn tokens, per-session $, per-tool invocation count)

## 9. MVP Boundary

Name the thinnest vertical slice that proves the harness works end-to-end. Everything outside this boundary is Phase 2+.

## 10. Phased Implementation

### Phase 1 — Minimum safe harness
- Entrypoint
- Orchestrator
- Capability registry
- Permission layer
- Basic state handling
- Minimal skill bank / skill contract
- Minimal evaluation suite

### Phase 2 — Durability, richer UX, observability
Only where the product actually needs them.

### Phase 3 — Extensibility / multi-agent
Only after the core harness is stable and measurable. If Phase 3 involves multi-agent, include the cost/failure-rate citation from `catalog/01-architecture-taxonomy.md` justifying the escalation.

## 11. Evaluation Plan (before calling it done)

- **Profile-scaled validation** — contracts required by the selected profile; do not apply enterprise-only gates to personal agents or standalone skills
- **Golden tasks** — the 5–20 happy-path cases that must always work
- **Risky tasks** — inputs that probe known failure modes
- **Recovery tests** — crash, timeout, approval denial, tool failure
- **Readback tests** — state mutation survives read-after-write / replay / resume
- **Permission boundary tests** — prove restricted tools stay restricted
- **Skill tests** — trigger routing, reference loading, chain handoff, script behavior
- **Package tests** — Claude/Codex manifest paths, API fixture mode, install/copy boundary
- **Metric validity** — measured vs proxy evals, and how proxy metrics become validated
- **UX acceptance** — what "feels explainable" means measurably

## 12. Key Risks

Top 3–5 risks with mitigation or acceptance note.

## 13. Framework / Substrate / Host Choices (if applicable)

If the design commits to a framework, memory substrate, skill-bank pattern, or host deployment, cite:
- `catalog/03-frameworks.md § <framework>` — reason for pick, reason against alternatives
- `catalog/04-memory-substrates.md § <substrate>` — reason for pick
- `catalog/08-repo-skill-architecture.md` — reason for repo/skill package shape
- `catalog/09-skill-bank-and-chaining.md` — reason for skill-chain pattern
- `catalog/10-cross-host-deployment.md` — reason for API/Claude/Codex/hybrid target

Do not recommend a framework if the user hasn't asked for one and raw SDK calls suffice.

---

*Template · Agent Builder original deliverable format + `catalog/01` architecture selection*
