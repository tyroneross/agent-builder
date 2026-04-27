# 50-Run DOE Experiment Report

Date: 2026-04-27

## Summary

The artifact runner now supports a 50-run mixed-level DOE:

```bash
npm run agents:artifacts:doe50
npm run agents:artifacts:score50
```

The 50-run suite generates real artifacts for each experiment under:

`agent-outputs/hypothetical-local-agent-suite/doe-50-runs/`

Latest score:

`11282`

Best run:

`mixed-05-deck8-doc7-dash5-recovery-minimal`

Best run score:

`270/274`

## Factors

| Factor | Levels |
| --- | --- |
| `deckSlides` | 4, 5, 6, 7, 8 |
| `docSections` | 3, 4, 5, 6, 7 |
| `dashboardWidgets` | 3, 4, 5, 6 |
| `scheduleStrategy` | focus, research, delegate, balanced, recovery |
| `researchDepth` | 3, 4, 5, 6, 7 |
| `wordTables` | 2, 3, 4 |
| `qaDepth` | 3, 4, 5, 6, 7 |
| `skillDepth` | 5, 6, 7, 8, 9, 10 |
| `handoffFormat` | minimal, brief, full, role-card |
| `localDoeInterpretation` | fast, cautious, replicated, strict |
| `localDoeReplicates` | 2, 3, 4, 5 |

## Main Effects

| Factor | Best level | Worst level | Effect |
| --- | --- | --- | ---: |
| `deckSlides` | 8 | 4 | 8.0 |
| `docSections` | 7 | 4 | 8.0 |
| `scheduleStrategy` | recovery | balanced | 8.0 |
| `researchDepth` | 5 | 7 | 8.0 |
| `qaDepth` | 6 | 4 | 8.0 |
| `dashboardWidgets` | 5 | 3 | 4.29 |
| `handoffFormat` | minimal | full | 4.29 |
| `localDoeInterpretation` | cautious | strict | 4.29 |
| `localDoeReplicates` | 4 | 2 | 4.29 |
| `skillDepth` | 5 | 6 | 2.11 |
| `wordTables` | 3 | 2 | 0.29 |

Interpretation: the structural metric rewards complete artifacts, so the best
levels are not universal product decisions. The useful signal is that richer
deck and document structures, moderate research depth, deeper QA, and explicit
handoff templates improved validated output coverage without breaking security
checks. The local LLM DOE factors also behaved as expected: cautious
interpretation with four replicates beat under-replicated two-run conclusions.

## Agent Handoff Optimization

The 50-run suite now includes:

- `agent-handoff-agent/instruction-handoff/handoff-protocol.json`
- `agent-handoff-agent/instruction-handoff/handoff-protocol.md`

The handoff protocol tests:

- what to share
- when to share
- what not to share
- receiver ownership
- output format
- stop condition
- escalation trigger

Finding: `minimal` scored best on the current structural metric because it has
the least overhead while still satisfying the required handoff contract. For
complex research, code, or artifact-generation handoffs, `brief` or `role-card`
may be better despite the smaller measured structural effect.

## New Artifact Families

Each DOE run now emits the existing artifacts plus:

- researched deck: `researched-deck-agent/agent-framework-topic/researched-agent-patterns.pptx`
- claim table: `researched-deck-agent/agent-framework-topic/claim-table.json`
- accuracy review: `researched-deck-agent/agent-framework-topic/accuracy-review.md`
- structured Word research brief: `researched-deck-agent/agent-framework-topic/researched-agent-patterns.docx`
- productivity dashboard: `chief-of-staff-agent/productivity-dashboard/index.html`
- artifact QA scorecard: `artifact-quality-agent/quality-review/quality-scorecard.json`
- handoff protocol: `agent-handoff-agent/instruction-handoff/handoff-protocol.json`
- local LLM DOE runner: `local-llm-doe-agent/experiment-loop/local-doe-results.json`
- morning recommendations: `local-llm-doe-agent/experiment-loop/morning-recommendations.md`

## Local LLM Nightly DOE Agent

The new local LLM DOE agent is designed for overnight Codex or Claude
automations. Its job is to run focused experiments across multiple codebases
and produce morning recommendations, not silent production changes.

Initial tracks:

- agent artifact quality
- code quality and test coverage
- security and penetration-test simulation
- UI improvement
- product/customer-specific update drafting

Small-model interpretation rule: the agent must prefer narrow factors,
replicated runs, confidence labels, and explicit reasons not to trust a result
yet. Low-confidence results become repeat recommendations, not promoted
changes.

## Security Boundary

- No internet downloads are performed.
- Source URLs are recorded as references only.
- Local HTML dashboards do not use external scripts.
- Generated Office files are macro-free OOXML packages.
- Output roots remain constrained to `agent-outputs/`.
- Handoff artifacts explicitly forbid sharing secrets, unrelated transcript
  history, and broader permissions than the receiver needs.
