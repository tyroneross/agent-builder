import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = join(process.cwd(), "agent-outputs", "test-artifact-suite");

test("artifact agents create real constrained outputs", async () => {
  rmSync(root, { recursive: true, force: true });
  const output = execFileSync("python3", [
    "scripts/run-artifact-agents.py",
    "--root",
    root,
    "--doe",
    "--skip-models",
    "--json",
  ], { encoding: "utf8" });

  const result = JSON.parse(output);
  assert.equal(result.passed, true, JSON.stringify(result.validation.errors, null, 2));
  assert.ok(result.score > 0);
  assert.ok(result.final.outputs.includes("powerpoint-deck-builder/board-update/deck.pptx"));
  assert.ok(result.final.outputs.includes("writing-agent/executive-brief/domain-learning-agent-brief.docx"));
  assert.ok(result.final.outputs.includes("chief-of-staff-agent/schedule-optimizer/weekly-time-plan.docx"));
  assert.ok(result.final.outputs.includes("chief-of-staff-agent/productivity-dashboard/index.html"));
  assert.ok(result.final.outputs.includes("chief-of-staff-agent/schedule-optimizer/time-block-plan.json"));
  assert.ok(result.final.outputs.includes("chief-of-staff-agent/schedule-optimizer/learning-ledger.json"));
  assert.ok(result.final.outputs.includes("chief-of-staff-agent/schedule-optimizer/optimized-week.ics"));
  assert.ok(result.final.outputs.includes("model-comparison-agent/local-llm-review/model-comparison.json"));
  assert.ok(result.final.outputs.includes("researched-deck-agent/agent-framework-topic/researched-agent-patterns.pptx"));
  assert.ok(result.final.outputs.includes("researched-deck-agent/agent-framework-topic/claim-table.json"));
  assert.ok(result.final.outputs.includes("local-llm-doe-agent/experiment-loop/local-doe-results.json"));
  assert.ok(result.final.outputs.includes("local-llm-doe-agent/experiment-loop/morning-recommendations.md"));
  assert.ok(result.final.outputs.includes("agent-handoff-agent/instruction-handoff/handoff-protocol.json"));
  assert.ok(result.final.outputs.includes("agent-skill-pack/skills-index.json"));
  assert.ok(result.final.outputs.includes("data-analysis-agent/usage-review/metrics-workbook.xlsx"));
  assert.ok(result.final.outputs.includes("data-analysis-agent/usage-review/metrics.csv"));
  assert.ok(result.final.outputs.includes("app-builder-agent/html-dashboard/index.html"));
  assert.ok(result.final.outputs.includes("artifact-index.html"));
  assert.ok(result.final.outputs.includes("research-brief-agent/security-research/security-brief.pdf"));
  assert.equal(result.doe.best.runId, "deckDepth-high-docDepth-high-dashboardDepth-high");

  for (const path of [
    "final/powerpoint-deck-builder/board-update/deck.pptx",
    "final/writing-agent/executive-brief/domain-learning-agent-brief.docx",
    "final/chief-of-staff-agent/schedule-optimizer/weekly-time-plan.docx",
    "final/chief-of-staff-agent/productivity-dashboard/index.html",
    "final/chief-of-staff-agent/schedule-optimizer/time-block-plan.json",
    "final/chief-of-staff-agent/schedule-optimizer/optimized-week.ics",
    "final/model-comparison-agent/local-llm-review/model-comparison.json",
    "final/researched-deck-agent/agent-framework-topic/researched-agent-patterns.pptx",
    "final/researched-deck-agent/agent-framework-topic/claim-table.json",
    "final/local-llm-doe-agent/experiment-loop/local-doe-results.json",
    "final/local-llm-doe-agent/experiment-loop/morning-recommendations.md",
    "final/agent-handoff-agent/instruction-handoff/handoff-protocol.json",
    "final/agent-skill-pack/skills-index.json",
    "final/data-analysis-agent/usage-review/metrics-workbook.xlsx",
    "final/data-analysis-agent/usage-review/metrics.csv",
    "final/app-builder-agent/html-dashboard/index.html",
    "final/artifact-index.html",
    "final/research-brief-agent/security-research/security-brief.pdf",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
  }

  const html = await readFile(join(root, "final/app-builder-agent/html-dashboard/index.html"), "utf8");
  assert.match(html, /dashboardData/);
  assert.doesNotMatch(html, /https:\/\//);

  const timePlan = JSON.parse(await readFile(join(root, "final/chief-of-staff-agent/schedule-optimizer/time-block-plan.json"), "utf8"));
  assert.ok(timePlan.optimizedMetrics.deepWorkHours > timePlan.baselineMetrics.deepWorkHours);
  assert.ok(timePlan.team.length >= 5);
  assert.ok(timePlan.learningLedger.length >= 3);

  const skillIndex = JSON.parse(await readFile(join(root, "final/agent-skill-pack/skills-index.json"), "utf8"));
  assert.ok(skillIndex.skills.some((skill) => skill.id.includes("honesty")));
  assert.ok(skillIndex.skills.some((skill) => skill.id.includes("local-llm-doe")));

  const localDoe = JSON.parse(await readFile(join(root, "final/local-llm-doe-agent/experiment-loop/local-doe-results.json"), "utf8"));
  assert.equal(localDoe.runCadence, "nightly");
  assert.ok(localDoe.smallModelCautions.length >= 5);
  assert.ok(localDoe.experiments.every((experiment) => experiment.confidence));

  rmSync(root, { recursive: true, force: true });
});

test("artifact agents can run a mixed-level DOE", async () => {
  const doeRoot = join(process.cwd(), "agent-outputs", "test-artifact-doe-suite");
  rmSync(doeRoot, { recursive: true, force: true });
  const output = execFileSync("python3", [
    "scripts/run-artifact-agents.py",
    "--root",
    doeRoot,
    "--doe",
    "--doe-runs",
    "12",
    "--skip-models",
    "--json",
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

  const result = JSON.parse(output);
  assert.equal(result.passed, true, JSON.stringify(result.validation.errors, null, 2));
  assert.equal(result.doe.runs.length, 12);
  assert.match(result.doe.design, /mixed-level DOE/);
  assert.ok(result.doe.effects.some((effect) => effect.factor === "handoffFormat"));
  assert.ok(result.doe.effects.some((effect) => effect.factor === "localDoeInterpretation"));
  assert.ok(result.doe.best.factors.handoffFormat);
  assert.equal(existsSync(join(doeRoot, "doe-12-runs")), true);

  rmSync(doeRoot, { recursive: true, force: true });
});
