# Speaker Notes

## Local Agent Builder

- Actual output run
- Repo-constrained artifacts
- No downloads

## What Changed

- Agents emit docx, pptx, xlsx, html, json, and markdown
- Artifacts are validated for macros and external relationships

## Domain Learning

- Scenario results feed a learning ledger
- Accepted lessons require rollback rules

## Security Boundary

- Writes stay under agent-outputs
- No executable outputs
- No external package downloads

## Model Experiment

- qwen3:8b-q4_K_M: A security or quality control measure for local agents generating files in a sandbox is implementing strict input validation and output sanitization to prevent malicious or malformed file creation.
- gemma4:26b: Implement automated file integrity monitoring and malware scanning within the sandbox to detect unauthorized modifications or malicious payloads before they exit the isolated environment.
- tinyllama:latest: Satisfactory Agent for Local Agents Generating Files in Sandbox

## DOE Result

- Deck depth, document depth, and dashboard depth were varied
- Best setting uses richer artifacts with security pack

## Decision

- Keep real-output artifact runner
- Chunk long local model validation
- Promote passing artifacts into the UI build flow
