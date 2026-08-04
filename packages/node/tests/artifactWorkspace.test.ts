import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  persistWorkspaceChanges,
  snapshotWorkspaceFiles,
} from "../app/artifactWorkspace.ts";

test("persists failed-run Artifact changes without copying an unchanged baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "artifact-workspace-"));
  const isolated = join(root, "isolated");
  const persistent = join(root, "persistent");
  await Promise.all([
    mkdir(isolated, { recursive: true }),
    mkdir(persistent, { recursive: true }),
  ]);
  await writeFile(
    join(isolated, "current-artifact.jsx"),
    "export default function App() { return null; }\n",
    "utf8",
  );
  const baseline = await snapshotWorkspaceFiles(isolated);

  await writeFile(
    join(isolated, "failed-page.jsx"),
    "export default function App() { throw new Error('verify'); }\n",
    "utf8",
  );
  await writeFile(join(isolated, "page.css"), ".page { color: red; }\n");

  try {
    assert.deepEqual(
      await persistWorkspaceChanges({
        sourceDir: isolated,
        destinationDir: persistent,
        baseline,
      }),
      ["failed-page.jsx", "page.css"],
    );
    assert.match(
      await readFile(join(persistent, "failed-page.jsx"), "utf8"),
      /verify/,
    );
    await assert.rejects(
      readFile(join(persistent, "current-artifact.jsx"), "utf8"),
      { code: "ENOENT" },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
