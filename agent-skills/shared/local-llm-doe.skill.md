# Local LLM DOE

Use this skill when a local model runs overnight experiments and prepares
morning recommendations.

## Inputs

- target repos and allowed output folders
- one to four factors to vary
- metric command and guard command per repo
- replicate count
- promotion threshold

## Rules

- Keep the experiment narrow enough for a smaller local model to understand.
- Do not interpret one run as a trend.
- Record raw outputs before writing recommendations.
- Label confidence as low, medium, or high.
- Promote only medium-or-higher confidence results with repeated guard passes.
- Escalate security or sandbox findings to a stronger reviewer before action.

## Morning Output

- repo
- experiment
- metric result
- confidence
- recommended action
- artifacts produced
- reason not to trust the result yet
