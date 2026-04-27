import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentArtifacts, slugify } from "../lib/generator.js";
import { writeAgentArtifacts } from "../lib/build-files.js";
import { PATTERNS } from "../lib/patterns.js";

test("slugify returns a safe stable folder name", () => {
  assert.equal(slugify("Research Agent: OpenAI + Claude"), "research-agent-openai-claude");
  assert.equal(slugify("../Bad Name"), "bad-name");
  assert.equal(slugify(""), "agent");
});

test("all bundled patterns generate the core artifact set", () => {
  for (const pattern of PATTERNS) {
    const result = buildAgentArtifacts({ patternId: pattern.id, projectName: pattern.name }, { createdAt: "test" });
    const paths = result.files.map((file) => file.path).sort();
    assert.deepEqual(paths, [
      "README.md",
      "agent.yaml",
      "evals/golden-tasks.json",
      "manifest.json",
      "sources.md",
      "system-prompt.md",
      "tools.json",
    ]);
    assert.match(result.files.find((file) => file.path === "agent.yaml").content, /permissions:/);
    assert.match(result.files.find((file) => file.path === "tools.json").content, /inputSchema/);
  }
});

test("writer creates files only inside generated agents folder", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-builder-test-"));
  const result = await writeAgentArtifacts(
    {
      patternId: "solo-tool-agent",
      projectName: "Local Agent",
      description: "A local test agent.",
    },
    { root },
  );

  assert.equal(result.outputDir, "generated/agents/local-agent");
  const manifest = await readFile(join(root, result.outputDir, "manifest.json"), "utf8");
  const tools = await readFile(join(root, result.outputDir, "tools.json"), "utf8");
  assert.match(manifest, /"schemaVersion": "agent-builder.v1"/);
  assert.match(tools, /"schemaVersion": "agent-builder.tools.v1"/);
});
