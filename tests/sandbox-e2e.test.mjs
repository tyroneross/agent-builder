import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_STRUCTURES } from "../agent-structures/index.js";
import { validateStructuresAgainstResearch } from "../lib/research-validation.js";
import { runSandboxSuite } from "../sandbox/runner.js";

test("all agent structures build and pass sandbox scenarios", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-builder-e2e-"));
  const result = await runSandboxSuite(AGENT_STRUCTURES, { root, llmMode: "fixture" });

  assert.equal(result.total, AGENT_STRUCTURES.length);
  assert.ok(result.total >= 6);
  assert.ok(result.totalScenarios >= AGENT_STRUCTURES.length * 3);
  assert.equal(result.failed, 0, JSON.stringify(result.results, null, 2));
  assert.equal(result.score, result.maxScore, JSON.stringify(result.results, null, 2));
  for (const item of result.results) {
    assert.ok(item.files.length >= 11);
    assert.ok(item.scenarios.length >= 3);
    assert.equal(item.provider, "local-fixture");
  }
});

test("agent structures pass research-derived architecture checks", () => {
  const result = validateStructuresAgainstResearch(AGENT_STRUCTURES);
  assert.equal(result.failed, 0, JSON.stringify(result.results, null, 2));
});

test("each agent has an eval-gated domain learning profile", () => {
  for (const structure of AGENT_STRUCTURES) {
    assert.equal(structure.spec.learning.mode, "eval-gated-domain-learning");
    assert.ok(structure.spec.learning.domain);
    assert.ok(structure.spec.learning.metrics.length >= 3);
    assert.ok(structure.spec.nodes.some((node) => node.kind === "memory"));
    assert.ok(structure.spec.edges.some((edge) => edge.to === "learn"));
    assert.ok(structure.spec.edges.some((edge) => edge.from === "learn"));
  }
});
