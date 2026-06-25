# Agent Builder — Codex Plugin Guide

## What this plugin is

A cross-LLM skill for designing and evaluating agentic harnesses — tool use, permissions, workflow state, memory, evals, observability, multi-agent, and framework selection.

## How Codex accesses this plugin

The marketplace install points at `path: plugin` inside this repo. The `plugin/.codex-plugin/plugin.json` maps `"skills": "./"`, which auto-loads `plugin/SKILL.md` on install. No commands, no MCP servers ship with this plugin.

## Skills

| Skill ID | Purpose | Load when |
|----------|---------|-----------|
| `agent-builder` | Design, evaluate, or rebuild agentic harnesses | User is designing a new agent/harness, evaluating an existing one, choosing between frameworks or memory substrates, or showing harness-gap symptoms (tool sprawl, brittle state, missing evals, cost drift) |

### Modes (declared in SKILL.md)

| Mode | Use |
|------|-----|
| `design` | Creating a new harness or planning a major rebuild |
| `evaluation` | Auditing an existing harness for gaps, risks, or missing primitives |
| `design + evaluation` | Target architecture + acceptance criteria before building |
| `catalog-lookup` | Factual questions about frameworks, memory substrates, lab patterns, or adoption data |

### Reference files loaded by the skill

| File | Content |
|------|---------|
| `references/catalog/01-architecture-taxonomy.md` | Type I–V classification, adoption rates, 4 architectural debates, 10 verified stats |
| `references/catalog/02-harness-components.md` | Six-component harness model (prompt/tools/memory/context/error/observability) |
| `references/catalog/03-frameworks.md` | LangGraph, CrewAI, Pydantic AI, smolagents, DSPy, AutoGen, Bedrock — decision tree |
| `references/catalog/04-memory-substrates.md` | Filesystem-as-memory, vector DB, in-context, COALA, self-improvement patterns |
| `references/catalog/05-lab-patterns.md` | Production patterns from Anthropic, OpenAI, Perplexity, Manus, Google, Devin, Cursor |
| `references/catalog/06-local-and-open-source-models.md` | Constraints and patterns for Ollama/llama.cpp/vLLM agents — tool-call tiers, failure modes |
| `references/catalog/07-local-operational-patterns.md` | Local repo scan takeaways — memory promotion, receipts/readback, daemon-owned truth, freshness, proxy eval gates |
| `references/catalog/08-repo-skill-architecture.md` | Repo shapes, skill anatomy, skill capture/modification workflow, build-ready artifact checklist |
| `references/catalog/09-skill-bank-and-chaining.md` | Structured skill bank, skill chaining patterns, plug-and-play skill slots, modify/wrap/fork decisions |
| `references/catalog/10-cross-host-deployment.md` | API-key runtime, Claude-native, Codex-native, host-agnostic, hybrid deployment and collaboration contracts |
| `references/methodology/12-agentic-systems-handoff-addendum.md` | Autonomy boundaries, tool permission tiers (T0–T5), MCP/A2A guidance, OWASP/NIST safety |
| `references/methodology/13-agentic-product-dev-synthesis.md` | Product-development agent systems: workflow-first, A0–A4 autonomy ladder, eval gates |
| `references/methodology/14-data-integrity-contract.md` | Data-bearing agents: accurate sourced collection, deterministic computation, sourced rendering, automated-gate + human-verifier verification; deterministic-vs-LLM boundary |
| `references/templates/design-deliverable.md` | Output shape for design mode |
| `references/templates/evaluation-deliverable.md` | Output shape for evaluation mode |
| `references/templates/agentic-handoff/` | Reusable schemas: role cards, handoff envelopes, tool contracts, skill contracts, guardrails, traceability matrix, eval scorecard, spec-lint checklist (index at `README.md`) |

## Out of scope

The Next.js workbench app at the **repo root** (`app/`, `lib/`, `scripts/`, etc.) is not part of the installed plugin. It is a local-only development tool for building and testing the skill content. Plugin users interact only with `plugin/SKILL.md` and its `references/` directory.

## Version

0.3.1
