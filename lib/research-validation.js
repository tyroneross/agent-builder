export const RESEARCH_CRITERIA = [
  {
    id: "simple-composable-default",
    source: "Anthropic Building Effective Agents",
    rule: "Prefer simple workflows or a single orchestrator unless the job needs parallel breadth.",
    check: (structure) => {
      const agentLike = structure.spec.nodes.filter((node) => ["agent", "orchestrator"].includes(node.kind)).length;
      const isResearch = structure.category === "research";
      return isResearch || agentLike <= 3;
    },
  },
  {
    id: "tool-scope-control",
    source: "OpenAI Agents SDK guardrails and MAST failure taxonomy",
    rule: "Every tool needs explicit side-effect and permission metadata.",
    check: (structure) =>
      structure.spec.tools.every((tool) => tool.name && tool.sideEffect && tool.permission && tool.responsibility),
  },
  {
    id: "sandboxed-write-boundary",
    source: "OpenAI Agents SDK sandboxing direction and agent security literature",
    rule: "Write-capable agents must name a sandbox boundary and avoid arbitrary output paths.",
    check: (structure) => {
      const hasWriteTool = structure.spec.tools.some((tool) => ["write", "shell"].includes(tool.sideEffect));
      return !hasWriteTool || String(structure.spec.sandbox).includes("local") || String(structure.spec.sandbox).includes("sandbox");
    },
  },
  {
    id: "evals-are-first-class",
    source: "Survey on Evaluation of LLM-based Agents",
    rule: "Each structure should include multiple golden or invariant evals.",
    check: (structure) => Array.isArray(structure.spec.evals) && structure.spec.evals.length >= 3,
  },
  {
    id: "termination-visible",
    source: "MAST task verification failure modes",
    rule: "Each structure should include a verifier, eval, approval, or explicit bounded workflow node.",
    check: (structure) =>
      structure.spec.nodes.some((node) => ["eval", "verifier", "approval", "guardrail"].includes(node.kind)),
  },
  {
    id: "local-model-tool-budget",
    source: "Local and open-source model agent guidance",
    rule: "Local-model structures should keep the tool set small enough for reliable tool selection.",
    check: (structure) => structure.spec.tools.length <= 5,
  },
  {
    id: "eval-gated-domain-learning",
    source: "Reflexion-style learning, DSPy optimization, and agent evaluation surveys",
    rule: "Agents that learn should preserve a domain-scoped playbook, regression scenarios, and a promotion gate.",
    check: (structure) =>
      structure.spec.learning?.mode === "eval-gated-domain-learning" &&
      structure.spec.learning?.promotionGate?.rollbackOnRegression === true &&
      structure.spec.learning?.artifacts?.includes("memory/domain-playbook.md") &&
      structure.spec.learning?.artifacts?.includes("memory/learning-ledger.json"),
  },
  {
    id: "scenario-coverage",
    source: "Agent evaluation best practice",
    rule: "Each domain agent should have multiple scenario tests, not a single happy path.",
    check: (structure) => Array.isArray(structure.sandbox?.scenarios) && structure.sandbox.scenarios.length >= 3,
  },
];

export function validateStructureAgainstResearch(structure) {
  const checks = RESEARCH_CRITERIA.map((criterion) => ({
    id: criterion.id,
    source: criterion.source,
    rule: criterion.rule,
    passed: Boolean(criterion.check(structure)),
  }));

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function validateStructuresAgainstResearch(structures) {
  const results = structures.map((structure) => ({
    id: structure.id,
    label: structure.label,
    ...validateStructureAgainstResearch(structure),
  }));

  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results,
  };
}
