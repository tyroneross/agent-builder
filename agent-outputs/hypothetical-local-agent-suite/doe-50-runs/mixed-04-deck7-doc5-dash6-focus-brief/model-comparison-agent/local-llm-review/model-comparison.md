# Local LLM Comparison

Model calls skipped for deterministic test run.

## Router Defaults

- `tinyllama:latest` for fast smoke tests: lowest local runtime cost
- `qwen3:8b-q4_K_M` for balanced schedule planning: good structure at moderate size
- `gemma4:26b` for higher-quality synthesis: stronger reasoning if latency is acceptable
- `qwen2.5-coder:32b-instruct-q5_K_M` for coding-heavy edits: installed coder model, run selectively
