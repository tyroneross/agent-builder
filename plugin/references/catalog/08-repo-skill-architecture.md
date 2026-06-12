# Repo And Skill Architecture For Agent Systems

> Delivery reference - load when Agent Builder must produce a repo layout, plugin package, skill set, or end-to-end build plan.
> Parent skill: `agent-builder` - pairs with `09-skill-bank-and-chaining.md` and `10-cross-host-deployment.md`.

---

## Core Claim

An agent system is easier to build, test, and reuse when the repo separates five concerns:

1. Runtime code
2. Tool contracts
3. Skills and prompts
4. Memory and evaluation
5. Host packaging

Do not scatter these across the repo based on the first implementation path. Make the delivery surface explicit before writing prompts, tools, or orchestration code.

---

## Recommended Repo Shapes

### API-first agent app

Use when the agent runs in a product backend, worker, server, or CLI with provider API keys.

```text
.
├── AGENTS.md                    # repo-wide agent instructions
├── README.md                    # human install/use notes
├── .env.example                 # key names only, no secrets
├── src/
│   ├── agents/                  # role definitions and orchestration entrypoints
│   ├── workflows/               # deterministic graph/loop/state code
│   ├── tools/                   # tool implementations
│   ├── memory/                  # storage adapters and retrieval assembly
│   ├── evals/                   # scorer code if it ships with runtime
│   └── observability/           # logs, traces, cost, health
├── contracts/
│   ├── agent-manifest.yaml
│   ├── tools/
│   ├── skills/
│   └── evals/
├── evals/
│   ├── golden/
│   ├── adversarial/
│   └── reports/
├── docs/
│   ├── architecture.md
│   ├── operations.md
│   └── runbook.md
└── tests/
    ├── unit/
    ├── integration/
    └── smoke/
```

### Host-native skill/plugin

Use when the agent is meant to run inside Claude Code, Codex, or another coding-agent host.

```text
plugin-or-skill-root/
├── SKILL.md                     # single-skill package, or skill entrypoint
├── skills/
│   └── <skill-id>/SKILL.md      # multi-skill package
├── references/                  # loaded on demand
├── scripts/                     # deterministic helpers
├── assets/                      # copied/modified output resources
├── agents/                      # optional subagent/role definitions
├── commands/                    # optional slash commands
├── .codex-plugin/plugin.json
└── .claude-plugin/plugin.json
```

### Hybrid product + host companion

Use when an API/backend agent also needs a Claude/Codex companion for repo-local operation.

```text
.
├── src/                         # product runtime
├── contracts/                   # shared schemas and agent manifest
├── evals/                       # shared evals
├── plugin/                      # copyable host companion
│   ├── SKILL.md
│   ├── references/
│   ├── .codex-plugin/plugin.json
│   └── .claude-plugin/plugin.json
└── docs/
```

The companion must not import app-root code. It can reference the product runtime, but it should remain copyable as a unit.

---

## Skill Anatomy

Use this shape for every reusable skill:

```text
<skill-id>/
├── SKILL.md
├── references/
├── scripts/
├── assets/
└── agents/openai.yaml           # optional UI metadata when supported
```

`SKILL.md` should stay lean:

- YAML frontmatter with `name` and a precise `description`.
- Trigger conditions and routing rules.
- The shortest workflow that can guide a smart agent.
- Direct links to reference files with clear "read when" conditions.
- Validation commands or checks.

References should hold detailed variants, schemas, examples, and long explanations. Scripts should hold deterministic steps that are fragile, repetitive, or too easy to rewrite incorrectly.

Do not add extra README/quickstart/change-log files inside a skill unless the host/package explicitly requires them. Extra docs make skill packages harder for agents to route.

---

## Skill Capture Workflow

Use this when turning a repeated workflow into a reusable skill.

1. **Name the repeated job.** One sentence, outcome-focused.
2. **Collect evidence.** Pull the best prior prompts, outputs, scripts, diffs, failures, and validation commands.
3. **Separate invariant from variant.** Keep invariant workflow in `SKILL.md`; move variants to `references/`.
4. **Decide the freedom level.**
   - High freedom: guidance and heuristics.
   - Medium freedom: pseudocode, templates, parameterized scripts.
   - Low freedom: deterministic script with narrow inputs.
5. **Define triggers.** Include phrases, file/path signals, imports, or command patterns when the host supports them.
6. **Define outputs.** State the artifact shape the skill should produce.
7. **Define validation.** Give at least one concrete check.
8. **Package for host.** Add Codex/Claude manifests when this must work in those hosts.

---

## Skill Modification Workflow

Use this when improving an existing skill instead of creating a parallel one.

1. Read the existing `SKILL.md` and direct references.
2. Identify whether the issue is trigger, workflow, reference depth, script determinism, output contract, or validation.
3. Patch the smallest surface that owns the problem.
4. Avoid duplicating the same rule in `SKILL.md` and a reference file.
5. Preserve host manifests and relative paths.
6. Validate frontmatter, path existence, and at least one realistic use case.

Create a new skill only when the new job has a distinct trigger, distinct output, or distinct validation loop. Otherwise extend the existing skill.

---

## Design Checklist

For an end-to-end agent-system repo, Agent Builder should produce:

- Spec profile (`skill`, `personal`, `team`, or `enterprise`) with rationale
- Repo layout
- Agent manifest
- Role cards
- Tool contracts
- Skill contracts
- Prompt contracts
- Memory contract
- Eval plan
- Host packaging plan
- API-key/env preflight
- Smoke tests
- Operator runbook

If the deliverable omits repo structure or skill structure, the agent system is not build-ready.

Profile-specific packaging notes:
- `skill` packages can be build-ready with a skill contract, prompt contract, fixtures, and host manifest. Do not require runtime lifecycle files unless a runtime ships.
- `personal` agents need local boundary, tool, observability, and eval evidence, but can keep owner/IAM/lifecycle sections lightweight.
- `team` agents need explicit flow topology, guardrails, and human checkpoints because shared state and handoffs create coordination risk.
- `enterprise` agents need registry, lifecycle, audit, and rollback artifacts before production because ownership and deactivation are part of the runtime contract.

---

*Catalog file 08/10 - repo and skill architecture synthesis - June 2026*
