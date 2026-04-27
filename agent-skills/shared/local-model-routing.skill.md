# Local Model Routing Skill

## Purpose

Choose the smallest local model that can complete the current agent step with
acceptable quality and latency.

## Inputs

- Task type.
- Available local models.
- Timeout budget.
- Quality requirements.
- Prior model comparison results.

## Outputs

- Selected model.
- Fallback model.
- Timeout and token budget.
- Reason for selection.

## Procedure

1. Use the smallest model for deterministic smoke tests.
2. Use a stronger general model for planning and synthesis.
3. Use a coder model for code-heavy edits or schema generation.
4. Keep prompts short and bounded for large local models.
5. Record response quality, latency, and failure mode.

## Default Routing

- `tinyllama:latest`: fast smoke tests.
- `qwen3:8b-q4_K_M`: balanced local planning.
- `gemma4:26b`: higher-quality synthesis when latency is acceptable.
- `qwen2.5-coder:32b-instruct-q5_K_M`: code and schema-heavy work.
