---
name: agent-builder
description: Design, evaluate, or rebuild agentic harnesses — tool use, permissions, workflow state, memory, evals, observability, multi-agent, framework selection. Activates on harness-gap symptoms too.
author: Tyrone Ross
version: 0.3.1
tags: [agentic-harness, agents, architecture, evaluation, memory, observability, frameworks, multi-agent, local-models, open-source, workflow, permissions, skills, skill-bank, plugins, deployment]
category: developer-tools
difficulty: advanced
metadata:
  priority: 6
  pathPatterns:
    - '**/*harness*'
    - '**/*agent-runtime*'
    - '**/*agent_runtime*'
    - '**/*orchestrat*'
    - '**/*workflow*'
    - '**/*tool-registry*'
    - '**/*tool_registry*'
    - '**/*permission*'
    - '**/*approval*'
    - '**/*state-machine*'
    - '**/*state_machine*'
    - '**/*session*'
    - '**/*memory*'
    - '**/*eval*'
    - '**/*skill*'
    - '**/skills/**'
    - '**/*plugin*'
    - '**/.codex-plugin/**'
    - '**/.claude-plugin/**'
    - '**/commands/**'
    - '**/agents/**'
    - '**/*retry*'
    - '**/*ollama*'
    - '**/*llama-cpp*'
    - '**/*vllm*'
  importPatterns:
    - '@modelcontextprotocol/*'
    - 'langgraph'
    - '@langchain/*'
    - 'langchain'
    - '@vercel/workflow'
    - 'langchain_ollama'
    - 'langchain-ollama'
    - 'deepagents'
    - 'ollama'
    - 'llama-cpp-python'
    - 'vllm'
    - 'outlines'
    - 'instructor'
    - 'pydantic_ai'
    - 'pydantic-ai'
    - 'smolagents'
    - 'dspy'
    - 'crewai'
    - 'autogen'
    - 'claude_agent_sdk'
    - 'claude-agent-sdk'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*(langgraph|langchain|@vercel/workflow|@modelcontextprotocol)\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*(langgraph|langchain|@vercel/workflow|@modelcontextprotocol)\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*(langgraph|langchain|@vercel/workflow|@modelcontextprotocol)\b'
    - '\byarn\s+add\s+[^\n]*(langgraph|langchain|@vercel/workflow|@modelcontextprotocol)\b'
    - '\b(pip|uv|uvx)\s+(install|add)\s+[^\n]*(langchain|langgraph|deepagents|ollama|llama-cpp-python|vllm|outlines|instructor|pydantic-ai|smolagents|dspy|crewai|autogen|claude-agent-sdk)\b'
  promptSignals:
    phrases:
      - "agentic harness"
      - "agent harness"
      - "ai harness"
      - "harness architecture"
      - "agent architecture"
      - "agent runtime"
      - "agent workflow runtime"
      - "tool-use architecture"
      - "tool use architecture"
      - "tool calling system"
      - "tool registry"
      - "capability registry"
      - "permission layer"
      - "approval gate"
      - "human-in-the-loop"
      - "workflow state"
      - "session persistence"
      - "durable agent"
      - "durable workflow"
      - "resume after crash"
      - "crash-safe agent"
      - "retry and idempotency"
      - "context assembly"
      - "memory system"
      - "evaluation harness"
      - "replay evals"
      - "agent observability"
      - "operator visibility"
      - "multi-agent architecture"
      - "single agent vs multi-agent"
      - "stop reasons"
      - "local model agent"
      - "open source agent"
      - "ollama agent"
      - "self-hosted agent"
      - "on-device agent"
      - "offline-first agent"
      - "local llm tool calling"
      - "framework selection"
      - "memory substrate"
      - "repo structure"
      - "repository structure"
      - "skill bank"
      - "skill chaining"
      - "skill chain"
      - "build a skill"
      - "create a skill"
      - "modify a skill"
      - "Claude and Codex"
      - "Claude Code and Codex"
      - "API key agent"
      - "host native agent"
      - "cross-host agent"
    allOf:
      - [agent, harness]
      - [tool, registry]
      - [permission, approval]
      - [workflow, state]
      - [resume, retry]
      - [context, memory]
      - [evaluation, harness]
      - [multi-agent, architecture]
      - [durable, agent]
      - [operator, visibility]
      - [local, agent]
      - [open-source, model]
      - [ollama, agent]
      - [skill, bank]
      - [skill, chain]
      - [repo, structure]
      - [Claude, Codex]
      - [API, key]
    anyOf:
      - "agent orchestration"
      - "approval workflow"
      - "tool-calling runtime"
      - "tool calling runtime"
      - "state machine"
      - "retry policy"
      - "framework for agents"
      - "which framework"
      - "which memory store"
    noneOf: []
    minScore: 6
---

# Agent Builder

Cross-LLM skill (Claude Code, Codex, others). Frontmatter `metadata` block above is consumed by Codex for auto-triggering on file paths, imports, shell commands, and prompt signals; runtimes that don't read it ignore it without harm.

## Problem

Most AI products do not break because the model is too weak. They break at the **harness layer**: unclear tool boundaries, missing approval policy, brittle state, sloppy context assembly, no evaluation loop, weak operator visibility. This skill turns those vague issues into concrete primitives, boundaries, phases, and checks — grounded in empirical evidence from production systems.

Three complementary bodies of knowledge ship with this skill:

- **`references/methodology/`** — Agent Builder-owned research synthesis for agentic handoffs and product-development agent systems.
- **`references/catalog/`** — *what exists to choose from*. Empirical inventory: architecture types I–V, six-component harness model, frameworks (LangGraph, CrewAI, Pydantic AI, smolagents, DSPy, AutoGen, Bedrock), memory substrates, lab patterns (Anthropic, OpenAI, Perplexity, Manus, Google, Devin, Cursor).
- **Prompt Builder companion rules** — prompt contracts for generated agents, skills, plugins, eval judges, and tool-using prompts.

## Trigger Conditions

Activate when any of the following hold:

- The user is designing or rebuilding an agent, assistant, copilot, or AI workflow
- The request mentions harness architecture, tool-use architecture, tool registries, permission layers, approval gates, workflow state, session persistence, retries, resumability, memory, evals, observability, or multi-agent design
- The user wants to evaluate an existing harness for risks, missing primitives, UX gaps, or operational weakness
- The user is choosing between frameworks (LangGraph vs CrewAI vs Pydantic AI vs smolagents vs DSPy vs AutoGen vs Bedrock), memory substrates, or coordination patterns
- The user wants repo structure, reusable skills, skill capture, skill chaining, a skill bank, plugin packaging, or host deployment guidance for Claude, Codex, API-key runtimes, or other agent hosts
- The symptoms point to harness problems even if the word "harness" never appears:
  - tools fire without clear permission
  - sessions fail on crash or long waits
  - context gets stale or bloated (routinely hitting 92%+ capacity)
  - tool count climbs past ~50 and quality drops
  - operators cannot see what happened or why
  - costs, retries, or handoffs are drifting out of control
  - multi-agent setup is producing loops or systemic failures

## Default Posture

1. Bias toward lean, solo-maintainable architecture.
2. Start with a single-agent design unless clear constraints justify more.
3. Require an evaluation plan even for greenfield builds.
4. Prefer explicit system boundaries, permission policy, and workflow state over prompt cleverness.
5. Translate ideas into implementation phases, success criteria, and failure tests.
6. **When justifying multi-agent, cite empirical cost**: single agent ≈ 4× chat tokens, multi-agent ≈ 15× chat tokens, 70%+ of multi-agent failures are systemic (MAST), only 11% of orgs run production agentic systems (Deloitte 2025). See `references/catalog/01-architecture-taxonomy.md` for sources.
7. **When the target is a local or open-source model**, apply the stricter local-model posture: start single-agent *always*, cull tools aggressively (Vercel 80% reduction pattern), compaction is non-negotiable (4K–32K context windows), evals are load-bearing not optional. See `references/catalog/06-local-and-open-source-models.md`.
8. **When generating prompts, skills, or plugin instructions**, use Prompt Builder as the prompt-quality source of truth: caller contract, deployment modules, tier calibration, and type-specific rules. Apply the agent contract for tool-using/stateful prompts and the plugin contract for embedded skill/plugin prompts. Preserve current-source checks against OpenAI, Anthropic, Perplexity/Sonar, and MCP prompt-template docs before claiming a prompt pattern is current.
9. **When a harness spans repos, sessions, agents, daemons, or durable memory**, require operational contracts: one state owner, read-after-write evidence, receipt/ACK semantics, provenance, freshness checks, and a promotion/validation path. See `references/catalog/07-local-operational-patterns.md`.
10. **When the user asks for an end-to-end build**, include repo structure, skill bank, skill contracts, host packaging, API-key/env contract, validation, and operating runbook. See `references/catalog/08-repo-skill-architecture.md`, `references/catalog/09-skill-bank-and-chaining.md`, and `references/catalog/10-cross-host-deployment.md`.
11. **Scale the specification to the agent's risk and deployment profile.** A personal/local agent, reusable skill, team workflow, and enterprise runtime do not need the same validation burden. Use the profile matrix below as the minimum contract set, then promote the profile when autonomy, users, side effects, regulated data, or runtime sharing increase.

## Spec Profile Matrix

Use this matrix whenever the user asks whether Agent Builder can define the right components, prompts, or validation for a given agent, system, or skill.

| Profile | Use when | Minimum contracts | Validation emphasis |
|---|---|---|---|
| `skill` | The output is a reusable prompt, skill, or plugin instruction imported by another host agent. | `contracts/spec-profile.json`, `skills/skill-contract.md` | Trigger precision, input/output shape, host permission assumptions, small fixture checks. |
| `personal` | One user or one local workspace runs the agent. | `contracts/spec-profile.json`, `contracts/system-boundary.yaml`, `contracts/tool-contracts.yaml`, `contracts/observability.yaml` | Explicit tool permissions, sandbox/read-only boundaries, visible stop reasons, golden tasks. |
| `team` | A shared workflow, hosted runtime, human checkpoint, or multi-agent topology is present. | Personal contracts plus `flow-topology`, `guardrails`, and `human-checkpoints`. | State ownership, handoffs/retries, approval or review gates, permission-tier review. |
| `enterprise` | Production users, regulated data, system-of-record writes, IAM, or high-risk side effects are present. | Team contracts plus `agent-registry` and `lifecycle`. | Owner registry, IAM/service identity, audit events, rollback/deactivation, eval-gated promotion. |

Profile inference rules:
- Explicit declarations win: `skill`, `personal`, `team`, `enterprise`, or aliases such as `prototype`, `workflow`, and `production`.
- Promote to `enterprise` on regulated/prod/IAM/customer-data/system-of-record signals or high-risk side effects.
- Promote to `team` on hosted/hybrid runtime, approval/review checkpoints, or Type III+ multi-agent topology.
- Keep `personal` for local draft/reasoning agents with no shared runtime, no regulated workflow, and no high-risk side effects.
- Never force enterprise-only gates onto a personal agent or standalone skill. Missing enterprise gates are only defects when the selected profile requires them.

## Step 0 — Gather Context

Before routing, make sure you have enough to work with.

For **design** work, confirm:
- what product or system the harness serves
- what actions the agent will take
- who the users are
- any known constraints (solo maintenance, existing stack, timeline, local/on-device, hardware limits)
- deployment mode: API-key runtime, Claude-native, Codex-native, host-agnostic, or hybrid
- intended profile: skill, personal, team, or enterprise; if unclear, infer it from users, runtime, side effects, data sensitivity, and autonomy
- whether reusable skills should be created, modified, chained, or only selected from a bank

For **evaluation** work, inspect the harness itself:
- read the codebase, agent config, skills, hooks, architecture docs
- identify the implied profile before judging missing components; a personal agent can pass with lighter validation than enterprise
- if evidence is missing, ask for the narrowest missing input and keep moving
- do not evaluate from vibes alone

If the request is vague ("help me build an agent" or "is my harness any good"), ask one or two clarifying questions. Do not stall the conversation with an interview — get enough to pick a mode and start.

## Step 0.5 — Prompt Builder Companion

When the deliverable includes a system prompt, skill prompt, plugin instructions, tool-use prompt, eval judge, or prompt template:

- Use the local Prompt Builder repo as the reusable prompt policy engine when available: `~/dev/git-folder/prompt-builder/skills/prompt-builder/`.
- Read `references/caller-contract.md` for machine-callable output, `references/deployment-modules.md` for `agent` and `plugin` deployments, and `references/type-rules.md` for agent/tooling, RAG, evaluation, and data-pipeline prompts.
- Include a prompt contract in generated outputs that names model tier, deployment, output consumer, risk level, state schema, tool registry, transition rules, termination, failure handling, examples, and validation checks.
- For plugin or skill generation, require trigger conditions, context-loading rules, input schema, action spec, output schema, edge cases, examples, and validation.
- For source-grounded or web-search prompts, apply Perplexity/Sonar-style rules: use accessible sources, state when information is unavailable, and rely on search/API result metadata for source URLs rather than asking the model to invent them.
- For OpenAI reasoning models, keep instructions direct, use delimiters or section labels, specify success criteria, and avoid unnecessary chain-of-thought prompts.
- For Anthropic/Claude prompts, define success criteria and evals first, then tune with explicit output formats, examples, XML-style structure, role boundaries, and literal scope instructions.

## Step 0.6 — Repo, Skill, And Host Packaging

When the deliverable includes a repo layout, reusable skill, skill bank, skill chain, plugin package, or cross-host agent system:

- Read `references/catalog/08-repo-skill-architecture.md` for repo shape, skill anatomy, skill capture, and skill modification.
- Read `references/catalog/09-skill-bank-and-chaining.md` for bank entries, chaining patterns, composition rules, and modify/wrap/fork decisions.
- Read `references/catalog/10-cross-host-deployment.md` for API-key, Claude-native, Codex-native, host-agnostic, and hybrid deployment modes.
- Use `references/templates/agentic-handoff/skill-contract.md` for every reusable skill the design creates or modifies.
- Keep API runtime, host companion, and reusable skill-bank boundaries explicit. Do not hide host-specific assumptions inside core runtime code.

## Step 1 — Classify The Request

Choose one mode before reading reference files.

### `design`
User is creating a new harness, planning a major rebuild, or asking for architecture, MVP shape, or implementation sequencing.

Default reads: `references/catalog/01-architecture-taxonomy.md`, `references/catalog/02-harness-components.md`, `references/catalog/03-frameworks.md`, `references/templates/design-deliverable.md`. Add `references/catalog/06-local-and-open-source-models.md` when the target is a local/OSS model. Add `references/catalog/07-local-operational-patterns.md` when the target uses durable memory, repo-scoped coordination, daemon/client state, receipts, or eval/metric gates. Add `references/catalog/08-repo-skill-architecture.md`, `references/catalog/09-skill-bank-and-chaining.md`, and `references/catalog/10-cross-host-deployment.md` when the target includes repo structure, reusable skills, skill chaining, plugin packaging, API-key runtime, Claude, Codex, or host-agnostic delivery. Add `references/methodology/13-agentic-product-dev-synthesis.md` when the agent's job is to produce a buildable spec for a downstream coding agent.

### `evaluation`
User has a harness and wants gaps, risks, missing primitives, UX upgrades, or architectural cleanup.

Default reads: `references/catalog/02-harness-components.md`, `references/catalog/05-lab-patterns.md`, `references/templates/evaluation-deliverable.md`. Add `references/catalog/07-local-operational-patterns.md` when the harness has memory writes, cross-session state, multi-agent coordination, daemon/client state, or proxy evals. Add `references/catalog/08-repo-skill-architecture.md`, `references/catalog/09-skill-bank-and-chaining.md`, and `references/catalog/10-cross-host-deployment.md` when evaluating repo/package structure, skills, skill chains, or host deployment. Add `references/methodology/12-agentic-systems-handoff-addendum.md` when handoff, autonomy, tool-permission, MCP/A2A, or operations-readiness details matter.

### `design + evaluation`
User wants a target architecture and a way to verify it, compare it with an existing system, or define acceptance criteria before building.

Default reads: union of the two above.

### `catalog-lookup`
User is asking a factual question about what exists — "which framework", "how does Anthropic's orchestrator work", "what memory substrate", "what's the adoption rate of Type III", "best local model tool-calling stack". Route straight to the catalog. Do **not** dump methodology files for this mode.

Default reads: only the catalog file(s) relevant to the question. Cite the exact file and section. Surface trade-offs.

## Step 2 — Classify The Product Shape

Pick the closest shape and state the assumption if ambiguous:

| Shape | Maps to Catalog Type |
|---|---|
| chat assistant | Type I (Augmented Assistant) |
| workflow orchestrator | Type II (Workflow Automaton) or Type III (Orchestrated Team) |
| code agent | Type III (Claude Code / Devin / Cursor patterns) |
| internal copilot | Type I or Type II |
| embedded AI product feature | Type I or Type II |
| hybrid system | Type III+ |

If the target runs on a local/open-source model regardless of shape, also read `references/catalog/06-local-and-open-source-models.md`.

## Step 3 — Read The Smallest Useful Reference Set

Read only the files the request actually needs. This file is the index — do not rely on reference-to-reference chains.

### Research Synthesis (how to decide for buildable agent outputs)
- `references/methodology/12-agentic-systems-handoff-addendum.md` — Perplexity-derived methodology for agentic-system handoffs: autonomy boundaries, tool permission tiers (T0–T5), orchestration topology, memory taxonomy, the 14-file handoff folder, MCP/A2A guidance, OWASP/NIST safety taxonomy.
- `references/methodology/13-agentic-product-dev-synthesis.md` — cross-source synthesis (Perplexity v2 + ChatGPT) for **product-development agent systems**: workflow-first principle, triage + specialists + reviewers default architecture, role-card pattern, canonical A0–A4 autonomy ladder (Perplexity v2 + ChatGPT; Perplexity v1's A0–A5 retained as a more granular variant), ask-before policy, confidence scoring, agent-system-specific eval gates (spec lint, traceability, scorecard). Read this when the agent's job is to produce a buildable spec for a downstream coding agent.

### Catalog (what exists)
- `references/catalog/01-architecture-taxonomy.md` — Type I–V classification, adoption rates, 4 debates (single-vs-multi, frameworks-vs-raw, scaffolding-vs-minimal, augment-vs-automate), 10 verified stats, coordination patterns, architecture timeline.
- `references/catalog/02-harness-components.md` — six-component harness model (prompt / tools / memory / context / error / observability) and its mapping to generated agent, skill, plugin, prompt, and evaluation artifacts.
- `references/catalog/03-frameworks.md` — LangGraph, CrewAI, Pydantic AI, smolagents, DSPy, AutoGen, Bedrock AgentCore. Decision tree for framework selection.
- `references/catalog/04-memory-substrates.md` — filesystem-as-memory, vector DB, in-context, COALA framework, Claude Code memory tiers, Voyager skill library, DSPy optimization formats, self-improvement patterns (MCTS, OPRO, PromptBreeder, Gödel Agent).
- `references/catalog/05-lab-patterns.md` — production architecture patterns from Anthropic, OpenAI, Perplexity, LangChain DeepAgents, Manus, Google ADK, Microsoft AutoGen/Copilot, Meta Llama Stack, DeepSeek, Cohere, Devin, xAI Grok, Cursor, Windsurf.
- `references/catalog/06-local-and-open-source-models.md` — constraints and patterns for agents on local/open-source models (Ollama, llama.cpp, vLLM, Llama, Qwen, DeepSeek, Mistral, Phi, Gemma). Tool-call reliability tiers, framework fit for local deployment, failure modes, decision tree by hardware, three non-obvious insights for local agents.
- `references/catalog/07-local-operational-patterns.md` — local repo scan takeaways: memory promotion, canonical writers, freshness, read-after-write receipts, daemon-owned truth, push streams, bounded consumers, and honest proxy eval gates.
- `references/catalog/08-repo-skill-architecture.md` — repo shapes for API-first, host-native, and hybrid agent systems; skill anatomy, skill capture, skill modification, and build-ready artifact checklist.
- `references/catalog/09-skill-bank-and-chaining.md` — structured skill bank entries, skill categories, chaining patterns, plug-and-play seed slots, and modify/wrap/fork/externalize decisions.
- `references/catalog/10-cross-host-deployment.md` — deployment contracts for API-key runtimes, Claude-native packages, Codex-native packages, host-agnostic packages, hybrid companions, and cross-agent collaboration.

### Templates (output shapes)
- `references/templates/design-deliverable.md` — use when producing a design output.
- `references/templates/evaluation-deliverable.md` — use when producing an evaluation output.
- `references/templates/agentic-handoff/` — reusable schemas for product-development agent systems: role cards, handoff envelopes, agent output contracts, artifact versioning, tool contracts (with T0–T5 permission tiers), skill contracts, guardrails, assumption logs, traceability matrix, agent manifest, evaluation scorecard, spec-lint checklist, agent ADRs, human checkpoints, system boundaries, and flow topologies. Index at `references/templates/agentic-handoff/README.md`. Use alongside `methodology/13-agentic-product-dev-synthesis.md`.

### Examples (calibration)
- `examples/design-solo-pr-review-agent.md` — worked design deliverable for a solo-maintainer PR review agent.
- `examples/evaluation-research-orchestrator.md` — worked evaluation deliverable for a Type III research orchestrator with 9 specialists.

## Operating Rules

- Convert vague ambitions into concrete harness primitives.
- Push back on unnecessary complexity.
- Treat workflow state, permissions, context assembly, and evaluation as first-class architecture, not cleanup tasks.
- Treat source-of-truth ownership, state readback, memory promotion, and freshness as hard operational contracts, not documentation polish.
- Treat repo structure, skill packaging, and host deployment as part of the harness. A design that cannot be installed or run in its intended host is incomplete.
- Separate universal harness primitives from product-specific manifestation.
- For evaluation requests, present findings first and improvement sequence second.
- For design requests, include how the design will be tested before calling it done.
- When recommending a framework, memory substrate, or multi-agent pattern, **cite the catalog file** you pulled it from.

## Output Contract

### For `design`
- recommended harness shape
- selected spec profile and why that profile is sufficient for the users, side effects, deployment mode, and data sensitivity
- deployment mode and repo/package structure
- skill bank, skill contracts, and skill-chain/router if applicable
- core primitives and subsystem boundaries
- MVP boundary
- phased implementation plan
- verification and acceptance criteria

### For `evaluation`
- findings ordered by severity or leverage
- profile verdict: whether the current spec is under-validated, over-validated, or appropriately scaled
- missing or weak primitives
- repo/package/skill-bank gaps
- user experience and operational gaps
- prioritized upgrade path
- tests or checks that confirm the fixes

### For `design + evaluation`
- target architecture
- target spec profile and current-vs-target validation gap
- comparison against current or likely failure modes
- repo/package/skill-bank target state
- implementation phases
- acceptance criteria
- evaluation plan covering regressions, safety, and UX

### For `catalog-lookup`
- direct answer to the factual question
- trade-offs relative to alternatives in the same catalog file
- source citation (`catalog/NN-filename.md § Section`)
- one-line pointer to the methodology file that operationalizes the choice, if applicable

## Final Check Before Responding

- Did you keep the design lean enough for a solo developer unless the request clearly demanded more?
- Did you avoid recommending multi-agent coordination by default?
- Did you include evaluation, not just construction?
- Did you scale validation to skill/personal/team/enterprise instead of forcing one enterprise checklist onto every agent?
- Did you give the user an operational path forward instead of abstract theory?
- If you recommended multi-agent, a framework, or a memory substrate, did you cite the catalog file you pulled it from?
- If the target is a local/open-source model, did you apply the stricter posture from `catalog/06-local-and-open-source-models.md` (single-agent always, cull tools, compaction mandatory, evals non-optional)?
