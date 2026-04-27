import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { buildAgentArtifacts } from "./generator.js";

function assertSafeRelativePath(filePath) {
  if (!filePath || filePath.startsWith("/") || filePath.includes("..")) {
    throw new Error(`Unsafe generated path: ${filePath}`);
  }
}

export async function writeAgentArtifacts(spec, options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const result = buildAgentArtifacts(spec);
  const outputRoot = resolve(root, "generated", "agents");
  const targetDir = resolve(outputRoot, result.slug);

  if (!(targetDir === outputRoot || targetDir.startsWith(`${outputRoot}${sep}`))) {
    throw new Error("Generated output escaped the allowed directory.");
  }

  for (const file of result.files) {
    assertSafeRelativePath(file.path);
    const target = resolve(targetDir, file.path);
    if (!target.startsWith(`${targetDir}${sep}`)) {
      throw new Error(`Generated file escaped the agent directory: ${file.path}`);
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }

  return {
    ...result,
    outputDir: relative(root, targetDir),
  };
}
