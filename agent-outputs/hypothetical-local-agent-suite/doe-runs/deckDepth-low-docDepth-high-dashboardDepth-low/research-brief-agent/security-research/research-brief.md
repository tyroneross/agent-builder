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

## Local Model Notes

- qwen3:8b-q4_K_M: A security or quality control measure for local agents generating files in a sandbox is implementing strict input validation and output sanitization to prevent malicious or malformed file creation.
- gemma4:26b: Implement automated file integrity monitoring and malware scanning within the sandbox to detect unauthorized modifications or malicious payloads before they exit the isolated environment.
- tinyllama:latest: Satisfactory Agent for Local Agents Generating Files in Sandbox

## Open Question

- Whether to add chunked long-run validation for slower local models.
