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
  assert.ok(result.final.outputs.includes("data-analysis-agent/usage-review/metrics-workbook.xlsx"));
  assert.ok(result.final.outputs.includes("data-analysis-agent/usage-review/metrics.csv"));
  assert.ok(result.final.outputs.includes("app-builder-agent/html-dashboard/index.html"));
  assert.ok(result.final.outputs.includes("artifact-index.html"));
  assert.ok(result.final.outputs.includes("research-brief-agent/security-research/security-brief.pdf"));
  assert.equal(result.doe.best.runId, "deckDepth-high-docDepth-high-dashboardDepth-high");

  for (const path of [
    "final/powerpoint-deck-builder/board-update/deck.pptx",
    "final/writing-agent/executive-brief/domain-learning-agent-brief.docx",
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

  rmSync(root, { recursive: true, force: true });
});
