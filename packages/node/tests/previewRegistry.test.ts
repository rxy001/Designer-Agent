import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("restores the Artifact-to-ID mapping after a process restart", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "preview-registry-"));
  const artifactPath = join(workspaceDir, "artifact.jsx");
  const registryFile = join(workspaceDir, "preview-artifacts.json");
  await writeFile(artifactPath, "export default function App() {}\n", "utf8");

  const environment = {
    ...process.env,
    PREVIEW_ARTIFACT_REGISTRY_FILE: registryFile,
  };

  try {
    const registered = await runRegistryProcess(
      `
        const registry = await import(${JSON.stringify(
          new URL("../app/previewRegistry.ts", import.meta.url).href,
        )});
        const artifact = await registry.registerPreviewArtifact(
          ${JSON.stringify(artifactPath)},
          ${JSON.stringify(workspaceDir)},
        );
        process.stdout.write(JSON.stringify(artifact));
      `,
      environment,
    );
    const artifact = JSON.parse(registered) as {
      id: string;
      hostPath: string;
      filePath: string;
    };

    const manifest = JSON.parse(await readFile(registryFile, "utf8")) as {
      version: number;
      artifacts: Array<{ id: string }>;
    };
    assert.equal(manifest.version, 1);
    assert.equal(manifest.artifacts[0]?.id, artifact.id);

    const restored = await runRegistryProcess(
      `
        const registry = await import(${JSON.stringify(
          new URL("../app/previewRegistry.ts", import.meta.url).href,
        )});
        await registry.initializePreviewRegistry();
        process.stdout.write(JSON.stringify(registry.getPreviewArtifact(${JSON.stringify(
          artifact.id,
        )})));
      `,
      environment,
    );

    assert.deepEqual(JSON.parse(restored), artifact);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("registers generated editor previews by their current source", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "editor-preview-source-"));
  const registryFile = join(workspaceDir, "preview-artifacts.json");
  const environment = {
    ...process.env,
    PREVIEW_ARTIFACT_REGISTRY_FILE: registryFile,
  };

  try {
    const output = await runRegistryProcess(
      `
        const registry = await import(${JSON.stringify(
          new URL("../app/previewRegistry.ts", import.meta.url).href,
        )});
        const first = await registry.registerPreviewSource("first", "page-1");
        const firstAgain = await registry.registerPreviewSource("first", "page-1");
        const second = await registry.registerPreviewSource("second", "page-1");
        process.stdout.write(JSON.stringify({
          first,
          firstAgain,
          second,
          registeredFirst: registry.getPreviewArtifact(first.id),
          registeredSecond: registry.getPreviewArtifact(second.id),
        }));
      `,
      environment,
    );
    const result = JSON.parse(output) as {
      first: { id: string; source: string };
      firstAgain: { id: string; source: string };
      second: { id: string; source: string };
      registeredFirst: { id: string; source: string };
      registeredSecond: { id: string; source: string };
    };

    assert.equal(result.first.id, result.firstAgain.id);
    assert.notEqual(result.first.id, result.second.id);
    assert.equal(result.first.source, "first");
    assert.equal(result.second.source, "second");
    assert.deepEqual(result.registeredFirst, result.first);
    assert.deepEqual(result.registeredSecond, result.second);
    await assert.rejects(readFile(registryFile), { code: "ENOENT" });
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

async function runRegistryProcess(
  source: string,
  env: NodeJS.ProcessEnv,
) {
  const result = await execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", source],
    { env },
  );
  return result.stdout;
}
