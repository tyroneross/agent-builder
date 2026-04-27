# Agent Structure Research Validation

This file records the research criteria used to validate the first sandboxed agent structures.

## Research Question

Do the bundled agent structures match current agent-building evidence from research labs, official SDK docs, and recent agent-evaluation research?

## Findings

- **Keep the default simple.** Anthropic's agent guidance says successful teams often use simple, composable patterns before complex frameworks. The structures therefore favor single orchestrators and deterministic workflows, with multi-agent breadth reserved for the research brief agent.
- **Separate workflows from autonomous agents.** Anthropic distinguishes predefined workflows from agents that dynamically direct tool use. The structures encode that distinction through `patternId`, `autonomy`, graph nodes, and explicit permission tiers.
- **Treat guardrails, tracing, and tool boundaries as architecture.** OpenAI Agents SDK docs describe guardrails and tracing around model generations, tool calls, handoffs, and custom events. The generated files include `tools.json`, evals, and manifests so runtime adapters can implement those controls.
- **Sandbox writes and shell access.** OpenAI's 2026 Agents SDK direction emphasizes controlled workspaces and sandbox execution for agents that inspect files, run commands, or edit code. The sandbox runner only writes inside temporary generated agent directories.
- **Evaluate agents as systems, not prompts.** The 2025 Survey on Evaluation of LLM-based Agents highlights planning, tool use, memory, safety, robustness, cost-efficiency, and realistic continuously updated benchmarks as key evaluation dimensions. The scanner therefore checks artifact generation, permissions, eval presence, and sandbox e2e execution.
- **Learn only through regression-tested domain memory.** Domain learning is modeled as a ledger plus playbook, not silent prompt mutation. Candidate lessons need scenario provenance, measurable improvement, and rollback rules before becoming persistent guidance.
- **Use DOE for improvements.** The optimize pass uses a `2^3` full factorial design to test acceptance criteria, permission invariants, and reflection prompts against the sandbox score. This keeps iteration evidence-driven instead of preference-driven.
- **Be conservative with multi-agent structures.** The MAST work on multi-agent failures finds failures rooted in system design, inter-agent misalignment, and task verification. The first structures avoid deep delegation and require verifier/eval/approval nodes.
- **Local models need tighter tool budgets.** Local/open-source agent guidance in this repo says small local models are more brittle around tool calling, so each structure keeps the tool count at five or fewer.

## Validation Rules

Implemented in `lib/research-validation.js`:

- `simple-composable-default`
- `tool-scope-control`
- `sandboxed-write-boundary`
- `evals-are-first-class`
- `termination-visible`
- `local-model-tool-budget`
- `eval-gated-domain-learning`
- `scenario-coverage`

## Sources

- Anthropic, "Building effective agents", 2024-12-19: https://www.anthropic.com/research/building-effective-agents/
- Anthropic, "How we built our multi-agent research system", 2025-06-13: https://www.anthropic.com/engineering/built-multi-agent-research-system
- OpenAI Agents SDK guardrails: https://openai.github.io/openai-agents-js/guides/guardrails/
- OpenAI Agents SDK tracing: https://openai.github.io/openai-agents-js/guides/tracing/
- OpenAI, "The next evolution of the Agents SDK", 2026-04-15: https://openai.com/index/the-next-evolution-of-the-agents-sdk
- OpenAI Deep Research System Card, 2025-02-25: https://openai.com/research/deep-research-system-card/
- MAST, "Why Do Multi-Agent LLM Systems Fail?", arXiv:2503.13657: https://arxiv.org/abs/2503.13657
- "Survey on Evaluation of LLM-based Agents", arXiv:2503.16416: https://arxiv.org/abs/2503.16416
- Reflexion, "Language Agents with Verbal Reinforcement Learning", arXiv:2303.11366: https://arxiv.org/abs/2303.11366
- DSPy, "Compiling Declarative Language Model Calls into Self-Improving Pipelines", arXiv:2310.03714: https://arxiv.org/abs/2310.03714
- Ollama API generate docs: https://docs.ollama.com/api/generate
