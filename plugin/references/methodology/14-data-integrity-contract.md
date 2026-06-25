# Data-Integrity Contract for Data-Bearing Agents & Plugins

> Read when the agent or plugin being designed **collects, computes, transforms, or displays data** — numbers, statistics, charts, tables, metrics, financial figures, scientific values, calculated results. The shape differs by use case, but the contract is mandatory whenever an artifact presents data as fact.

## Why this exists

LLMs fabricate plausible data. They invent intermediate values to "smooth" a series, do arithmetic wrong while sounding confident, and render numbers without provenance. An agent that emits data is making factual claims on the user's behalf — and if nothing in the harness enforces accuracy, **the end user becomes the first and only integrity check**, usually too late (a wrong number already shipped in a deck, report, or dashboard).

Origin case: a deck-generation plugin charted a population time-series the model had fabricated, with no citation. The fix was not "be more careful" — it was a *contract* the harness enforces. Generalize that contract to every data-bearing agent.

## Scope: build it into the agent, don't depend on Agent Builder

Agent Builder's only job here is to **design data-bearing agents that are effective** — it applies this contract while building or updating an agent, and at no other time. It does not police, retrofit, or enforce anything on agents that already exist; those are independent artifacts.

Therefore the contract must be realized as **self-contained primitives inside the agent being built** — the agent ships its own validation script, its own computation step, its own citation rendering, its own fail-closed gate. The built agent runs standalone and is fully usable outside Agent Builder; Agent Builder is the designer, never a runtime dependency. If satisfying any pillar would require calling back into Agent Builder at run time, the design is wrong — inline the primitive instead.

## The four pillars

A data-bearing agent must address all four. Each names what the LLM owns vs. what code/humans own.

### 1. Accurate collection (sourced, validated input)
- Data comes from a **credible source**, not model memory. Research it at author time (registry/docs for library facts; web search for statistics, prices, real-world figures). Apply source tiers — primary/official > well-cited secondary > forums; ≥2 sources for contested numbers.
- **Never fabricate or interpolate.** No invented intermediate points, no "approximately" numbers presented as measured.
- Validate on ingest: schema/range/type checks, unit consistency, freshness. Reject or quarantine bad input rather than charting it.

### 2. Deterministic computation (code does the math)
- **Any calculation — arithmetic, statistics, aggregation, unit conversion, financial math — runs in a program or script, not in the model's head.** The LLM decides *what* to compute and *why*; deterministic code computes the value. This is the single highest-leverage rule: it removes the largest fabrication/arithmetic-error surface.
- Prefer the right tool for the math (a stats library/R for statistics, a spreadsheet engine or SQL for aggregation), with a pure-language fallback so there is no hard runtime dependency.
- Record computation **provenance**: which engine ran, inputs, and version — so a result is reproducible and auditable.

### 3. Sourced rendering (provenance travels with the artifact)
- Every displayed datum, chart, or table carries its **citation in the artifact itself** (caption, footnote, source column, tooltip) — not just in chat. When the file leaves the session, the source goes with it.
- Display **appropriately**: chart type matches data type, axes/units labeled, no misleading scales, uncertainty shown when it exists. Mislabeled-but-cited is still wrong.
- Mark anything illustrative or modeled **as such**, visibly — never let a placeholder read as measured fact.

### 4. Verification (automated gate + human checkpoint)
- **Automated, fail-closed gate** for what code *can* verify: citation present, format/integrity valid, ranges sane, totals reconcile. Block emission on failure — do not warn-and-continue. This is a forcing function, not a checklist.
- **Human verifier checkpoint** for what code *cannot* verify: is the source real and credible, do the numbers match the source, is the interpretation honest. Route this through a human-checkpoint gate sized to risk (see the `human-checkpoint` template). Higher stakes (financial, medical, legal, public-facing) → mandatory human sign-off before release.
- Be explicit in the spec about the **boundary**: state plainly that the code enforces *presence/format*, while *accuracy and credibility* are owned by the authoring agent and the human verifier. Claiming code "ensures accuracy" when it only checks presence is itself an integrity failure.

## The deterministic-vs-LLM boundary (the load-bearing line)

| Task | Owner |
|------|-------|
| Decide what data is needed, find/choose sources | LLM (with research tools) |
| Compute any number (sum, mean, %, slope, conversion, projection) | **Deterministic code** |
| Decide how to present it | LLM |
| Render the value + attach citation | Code (templated) |
| Gate on citation present / format valid / ranges sane | **Code (fail-closed)** |
| Judge source credibility + numeric correctness | **Human verifier** |

If the model is doing arithmetic or emitting a number it "remembers," the contract is being violated.

## It looks different per use case — scale it

- **Deck/report/document generator** → require a `source` per data slide/figure; render a caption; gate emission on missing source; stats computed by a script. (The origin case.)
- **Dashboard / analytics agent** → query real stores (no synthetic rows); compute in SQL/code; show source + last-refresh; alert on stale/missing data.
- **Research / synthesis agent** → cite every claim to a tier-rated source; ≥2 sources for contested facts; flag unverifiable claims rather than smoothing over them.
- **Financial / scientific / spreadsheet agent** → all math in code with unit checks and reconciliation totals; mandatory human sign-off; full input+formula provenance.
- **Pipeline / ETL agent** → validate on ingest, type/range/uniqueness checks, quarantine bad rows, lineage metadata end-to-end.

Low-risk/personal artifacts can lean on the lighter end (citation + scripted math). High-autonomy, public-facing, or regulated outputs require the full set including human sign-off.

## Spec checklist (include in any data-bearing agent design)

- [ ] Data sources named, with credibility tier; no model-memory data.
- [ ] Ingest validation defined (schema/range/units/freshness); bad-data handling stated.
- [ ] All computation assigned to deterministic code; engine + fallback named; provenance recorded.
- [ ] Every rendered datum carries an in-artifact citation; display format appropriate; illustrative data marked.
- [ ] Automated fail-closed gate specified (what it checks, that it blocks not warns).
- [ ] Human-verifier checkpoint specified, sized to risk; the code-vs-human boundary stated explicitly.

Pair with `references/templates/agentic-handoff/human-checkpoint.md`, `guardrail.md`, and `tool-contract.md`.
