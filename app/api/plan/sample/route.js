export const runtime = "nodejs";

const SAMPLES = [
  {
    label: "Weekly operating brief",
    goal: "Plan my week. Pick the three highest-leverage outcomes, build protected time blocks, surface decisions that need to happen, and flag operating risks.",
    context: `(paste your weekly schedule, goals, open loops, energy constraints here)

Example shape:
- Goals this week: ship X, hire Y, decide on Z
- Fixed events: Mon 10:00 board prep, Wed 14:00 1:1s
- Open loops: contract review with legal, follow-up with vendor A
- Strengths to protect: deep work blocks before noon
- Compensate for: context switching, late-day fatigue`,
  },
  {
    label: "Project rollout plan",
    goal: "Plan a 6-week rollout for the new feature: phased delivery, dependencies, owners, comms cadence, success criteria, and rollback plan.",
    context: `(paste project context here)

Example shape:
- Feature: real-time notifications
- Team: 2 engineers, 1 designer, 1 PM
- Hard deadline: 2026-06-09 (board demo)
- Known dependencies: auth refactor must ship first
- Stakeholders: customer success, sales`,
  },
  {
    label: "Research plan",
    goal: "Design a research plan to evaluate whether to migrate from Postgres to a managed alternative. Include scope, methods, sources by tier, deliverables, and an assumption log.",
    context: `(paste research context here)

Example shape:
- Triggering question: are we hitting Postgres scale limits at 50M rows?
- Stakeholders: backend lead, infra, finance
- Time budget: 2 weeks
- Known unknowns: query patterns under peak load, true cost of managed alternatives
- Out of scope: NoSQL alternatives`,
  },
  {
    label: "Decision brief",
    goal: "Frame a decision brief: enumerate options, score them against criteria, recommend one, list counterfactuals and unverified claims.",
    context: `(paste decision context here)

Example shape:
- Decision: pick cloud provider for new ML training cluster
- Options: AWS, GCP, on-prem
- Criteria: cost predictability, team skill match, time to first model, lock-in risk
- Constraints: $200k budget, 6-week ramp
- Stakeholders who must sign off: CTO, head of ML`,
  },
];

export async function GET() {
  return Response.json({ samples: SAMPLES });
}
