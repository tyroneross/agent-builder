#!/usr/bin/env node
import { writeAgentArtifacts } from "../lib/build-files.js";
import { AGENT_STRUCTURES } from "../agent-structures/index.js";

const entry = AGENT_STRUCTURES.find((s) => s.id === "chief-of-staff-agent");
if (!entry) {
  console.error("chief-of-staff-agent structure not found");
  process.exit(1);
}

const result = await writeAgentArtifacts(entry.spec, { root: process.cwd() });
console.log(`Wrote ${result.files.length} files to ${result.outputDir}`);
for (const f of result.files) console.log(`  - ${f.path}`);
if (result.warnings?.length) {
  console.log("Warnings:");
  for (const w of result.warnings) console.log(`  ! ${w}`);
}
