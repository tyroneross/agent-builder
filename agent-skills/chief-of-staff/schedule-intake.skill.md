# Schedule Intake Skill

## Purpose

Convert a user's calendar, goals, open loops, and energy constraints into a
validated planning input for the Chief of Staff agent.

## Inputs

- Calendar export or pasted schedule.
- Weekly goals and non-negotiable constraints.
- Strengths to protect.
- Weaknesses to compensate for.
- Known deadlines and owner/action lists.

## Outputs

- `input-schedule.json`
- Missing-data questions.
- Fixed vs flexible event map.
- Baseline productivity metrics.

## Procedure

1. Separate fixed events from flexible work.
2. Label each event as deep work, strategy, review, coordination, admin, or recovery.
3. Compute baseline deep-work hours, context switches, admin hours, and open-loop risk.
4. Mark missing dates, owners, durations, or priorities instead of guessing them.
5. Send only validated schedule data to the planning skill.

## Honesty Rules

- If the schedule is incomplete, state what is missing.
- If a conflict cannot be resolved from the input, mark it as a human decision.
- Do not infer private commitments that were not provided.
