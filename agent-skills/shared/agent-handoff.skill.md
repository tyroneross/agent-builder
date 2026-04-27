# Agent Handoff Skill

## Purpose

Transfer enough context for another agent to act accurately without dumping the
whole transcript or expanding permissions.

## Inputs

- Sender role and receiver role.
- Current goal.
- Accepted assumptions.
- Source and claim state.
- Tool and permission limits.
- Expected artifact contract.

## Outputs

- `handoff-protocol.json`
- Handoff brief.
- Stop condition.
- Escalation trigger.

## Procedure

1. State the receiver's role and ownership boundary.
2. Share only the context needed for the next action.
3. Include source state and uncertainty labels when claims matter.
4. Include allowed tools, forbidden actions, and output format.
5. End with stop conditions and when to ask for help.

## Do Not Share

- Credentials or secrets.
- Irrelevant transcript history.
- Unverified claims without labels.
- Permissions broader than the receiver needs.
