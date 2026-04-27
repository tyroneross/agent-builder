# Agent DOE

This repo uses a small design-of-experiments pass to improve generated agents without relying on subjective review.

## Response Variable

Primary response: `npm run sandbox:score`

The score rewards:

- Scenario artifact materialization.
- Required term coverage.
- Domain quality term coverage.
- Candidate lesson plus promotion gate.
- Acceptance criteria.
- Permission invariants.
- Reflection prompts.
- Learning ledger and domain playbook creation.

## Factors

The first DOE uses a `2^3` full factorial design:

| Factor | Low | High |
| --- | --- | --- |
| `acceptanceCriteria` | omit acceptance criteria | include acceptance criteria |
| `permissionInvariants` | omit sandbox invariants | include sandbox invariants |
| `reflectionPrompts` | omit improvement prompts | include improvement prompts |

Run it:

```bash
npm run agent:doe
npm run agent:doe -- --json
```

The high/high/high setting is the default artifact profile because it maximizes measurable scenario quality while keeping `npm test` green.

## Promotion Rule

A DOE factor becomes part of the default agent structure only when:

1. It improves the sandbox score.
2. It keeps `npm test` passing.
3. It does not remove permission metadata, sandbox boundaries, or rollback requirements.
