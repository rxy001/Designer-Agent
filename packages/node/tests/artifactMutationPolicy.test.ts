import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  getShellJsxMutationBlock,
  restoreJsxArtifacts,
  snapshotJsxArtifacts,
} from "../app/artifactMutationPolicy.ts";

test("blocks shell mutation commands that target JSX output", () => {
  assert.match(
    getShellJsxMutationBlock(
      JSON.stringify({
        cmd: "perl -0pi -e 's/a/b/' /workspace/output/page.jsx",
        workdir: "/workspace",
      }),
    ) ?? "",
    /apply_patch/,
  );
  assert.match(
    getShellJsxMutationBlock(
      JSON.stringify({
        cmd: "python -c 'open(\"page.jsx\",\"w\").write(\"x\")'",
        workdir: "/workspace/output",
      }),
    ) ?? "",
    /disabled/,
  );
  assert.equal(
    getShellJsxMutationBlock(
      JSON.stringify({
        cmd: "sed -n '1,120p' /workspace/output/page.jsx",
        workdir: "/workspace",
      }),
    ),
    undefined,
  );
  assert.equal(
    getShellJsxMutationBlock(
      JSON.stringify({
        cmd: "grep -n '=>' /workspace/output/page.jsx",
        workdir: "/workspace",
      }),
    ),
    undefined,
  );
});

test("restores JSX files changed, created, or removed by shell execution", async () => {
  const root = await mkdtemp(join(tmpdir(), "artifact-mutation-policy-"));
  const retainedPath = join(root, "retained.jsx");
  const removedPath = join(root, "removed.tsx");
  const createdPath = join(root, "created.jsx");
  await writeFile(retainedPath, "before");
  await writeFile(removedPath, "restore me");
  const snapshot = await snapshotJsxArtifacts(root);

  await writeFile(retainedPath, "after");
  await writeFile(createdPath, "created");
  await unlink(removedPath);

  assert.deepEqual(await restoreJsxArtifacts(root, snapshot), [
    "created.jsx",
    "removed.tsx",
    "retained.jsx",
  ]);
  assert.equal(await readFile(retainedPath, "utf8"), "before");
  assert.equal(await readFile(removedPath, "utf8"), "restore me");
  await assert.rejects(readFile(createdPath), { code: "ENOENT" });
});
