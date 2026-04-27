# Local LLM DOE Guardrails

## Small Model Rules

- Do not infer a trend from one run.
- Change at most four factors per nightly DOE.
- Keep prompts short and artifact-specific.
- Use confidence labels in every recommendation.
- Repeat high-impact recommendations before promotion.
- Separate measurement from interpretation.
- Escalate security findings to a stronger reviewer before action.

## Promotion Gate

- requiresRepeatedGuardPasses: True
- requiresHumanApprovalForRepoWrites: True
- requiresNoNewSecretExposure: True
- requiresConfidenceAtLeast: medium

## Nightly Automation Boundary

- Codex or Claude automations may run experiments overnight.
- Morning output should be recommendations and artifacts, not silent production changes.
- Security, UI, product, and customer-specific tracks need separate metrics.
