# Domain-Learning Agent Brief

## Conclusion

- Use eval-gated domain memory because it improves without silently mutating prompts.

## Inputs

- Hypothetical operating brief, product metrics, security constraints, and local model observations.

## Outputs

- PowerPoint deck, Word brief, metrics workbook, HTML dashboard, research brief, and review findings.

## Security

- The run writes only under agent-outputs and forbids macros, external relationships, and executable artifacts.

## Model Notes

- qwen3:8b-q4_K_M: A security or quality control measure for local agents generating files in a sandbox is implementing strict input validation and output sanitization to prevent malicious or malformed file creation.
- gemma4:26b: Implement automated file integrity monitoring and malware scanning within the sandbox to detect unauthorized modifications or malicious payloads before they exit the isolated environment.
- tinyllama:latest: Satisfactory Agent for Local Agents Generating Files in Sandbox

## Next Step

- Wire these real artifact adapters into the visual Build Agent action.
