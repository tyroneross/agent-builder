# Research Brief: Secure Local Artifact Agents

## Finding

- Local artifact agents should prefer narrow tool scope, explicit guardrails, and package validation.

## Source References

- https://docs.ollama.com/api/generate
- https://openai.github.io/openai-agents-js/guides/guardrails/
- https://openai.github.io/openai-agents-js/guides/tracing/
- https://www.anthropic.com/research/building-effective-agents/
- https://arxiv.org/abs/2303.11366
- https://arxiv.org/abs/2310.03714

## Accuracy Notes

- Claims are split into verified, inferred, unsupported, and needs-review labels before they are allowed into decks or Word artifacts.

## Local Model Notes

- Model calls skipped for deterministic test run

## Open Question

- Whether to add chunked long-run validation for slower local models.
