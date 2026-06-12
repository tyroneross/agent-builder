# Evaluation Deliverable Template

> Use when the skill is in `evaluation` or `design + evaluation` mode. Findings first, fixes second. Never present an evaluation as a design.

---

## 1. Summary

One paragraph: what harness was reviewed, which spec profile it appears to target (`skill`, `personal`, `team`, or `enterprise`), what the headline problems are, whether the design is salvageable in place or needs a rebuild.

State whether the harness is **under-validated**, **over-validated**, or **appropriately scaled** for that profile. Do not mark enterprise-only artifacts missing for a personal agent or standalone skill unless the evidence shows it should be promoted.

## 2. Findings (ordered by severity / leverage)

For each finding:

- **Title** — short phrase
- **Severity** — critical / high / medium / low
- **Evidence** — file path, code snippet, log excerpt, or observed symptom. No vibes.
- **Why it matters** — failure mode, cost, user impact
- **Root cause** — harness component involved (cite `catalog/02-harness-components.md § N`; cite `catalog/08`, `09`, or `10` when the issue is repo, skill-bank, chaining, or host deployment)

Order by severity first, then by leverage (cheap-to-fix big-impact items above expensive-to-fix ones of the same severity).

## 3. Missing or Weak Primitives

Which harness primitives are absent or under-specified. Use the harness component vocabulary:

| Primitive | State | Notes |
|---|---|---|
| Capability registry | missing / weak / adequate | |
| Permission layer | missing / weak / adequate | |
| Approval gates | missing / weak / adequate | |
| Workflow state | missing / weak / adequate | |
| State owner | missing / weak / adequate | |
| Resumability | missing / weak / adequate | |
| Readback / receipts | missing / weak / adequate | |
| Context assembly | missing / weak / adequate | |
| Memory promotion | missing / weak / adequate | |
| Memory provenance | missing / weak / adequate | |
| Freshness checks | missing / weak / adequate | |
| Evaluation loop | missing / weak / adequate | |
| Eval validity | missing / weak / adequate | |
| Observability | missing / weak / adequate | |
| Repo/package structure | missing / weak / adequate | |
| Skill inventory | missing / weak / adequate | |
| Skill contracts | missing / weak / adequate | |
| Skill chaining | missing / weak / adequate | |
| Host packaging | missing / weak / adequate | |
| API-key/env contract | missing / weak / adequate | |

Add a profile note under the table:
- `skill`: skill contract, trigger/input/output, host assumptions, and fixtures are load-bearing.
- `personal`: boundary/tool/observability/golden-task evidence is load-bearing.
- `team`: topology, guardrails, human checkpoints, and shared-state evidence are load-bearing.
- `enterprise`: registry, IAM, lifecycle, audit, rollback, and eval-gated promotion are load-bearing.

## 4. Repo, Skill, And Host Packaging Gaps

- Whether the repo shape matches the intended deployment mode
- Whether Claude, Codex, API, CLI, MCP, or hybrid entrypoints are explicit
- Whether skills have precise triggers, inputs, outputs, references, scripts, and validation
- Whether skill chaining has input/output artifacts and a termination condition
- Whether plugin manifests point at the correct skill roots and required files
- Whether API-key mode has `.env.example`, credential preflight, fixture/offline test path
- Whether host-specific files leak into the reusable runtime or plugin companion boundary

## 5. UX & Operational Gaps

- What the user can't see that they should
- What operators can't debug when something breaks
- What state changes cannot be traced to a receipt, ACK, replay, or readback
- Cost/latency surprises with no instrumentation
- Support paths that require code reading to resolve

## 6. Prioritized Upgrade Path

Ordered list. For each step:

- **Action** — what to change
- **Primitive affected** — from the table above
- **Expected effect** — which findings it closes
- **Effort** — rough t-shirt (S/M/L)
- **Risk** — what could regress

Favor sequences where the first two items close the critical findings and the rest are opportunistic improvements.

## 7. Confirmation Tests

For each fix, name the test or check that proves it landed:

- **Fix** — reference to upgrade path step
- **Test** — golden task, permission boundary probe, crash-recovery script, replay regression, read-after-write check, slow-consumer test, skill trigger fixture, skill-chain handoff, host manifest validation, API fixture-mode smoke, eval metric threshold
- **Pass criteria** — concrete observable
- **Profile relevance** — why the test is required for this profile, or which promotion signal would make it required later

No fix is "done" without a confirmation test the user can run.

## 8. Out Of Scope

Items surfaced during evaluation that are real issues but outside this engagement. List them so the user can triage later without rediscovering them.

---

*Template · Agent Builder original evaluation output contract*
