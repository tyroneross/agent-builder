# Honesty And Uncertainty Skill

## Purpose

Keep agent outputs accurate, calibrated, and explicit about uncertainty.

## Inputs

- User request.
- Available sources or files.
- Tool results.
- Assumptions and unresolved questions.

## Outputs

- Answer or artifact with uncertainty labels.
- Assumption list.
- Unsupported-claim list.
- Verification notes.

## Procedure

1. Separate observed facts from inferred conclusions.
2. Cite local files or source references when claims depend on evidence.
3. Mark stale, missing, or unverified data.
4. Prefer a smaller true answer over a larger speculative answer.
5. Use a clear stop condition when the task requires unavailable data.

## Required Labels

- `observed`
- `inferred`
- `unverified`
- `needs_user_decision`
