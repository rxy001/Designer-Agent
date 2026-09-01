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
import {
  getArtifactEditReadLeaseError,
  getArtifactPatchOperation,
  getReviewedDeliveryCommitBlock,
  normalizeArtifactPatchResult,
} from "../app/agent.ts";

test("requires a current one-attempt read lease before artifact edits", () => {
  assert.deepEqual(
    getArtifactPatchOperation({
      operation: {
        type: "update_file",
        path: "output/page.jsx",
        diff: "@@",
      },
    }),
    { type: "update_file", path: "output/page.jsx" },
  );
  assert.equal(
    getArtifactEditReadLeaseError({ currentDigest: "current" }),
    "artifact_edit_requires_fresh_read",
  );
  assert.equal(
    getArtifactEditReadLeaseError({
      currentDigest: "current",
      leasedDigest: "older",
    }),
    "artifact_edit_read_stale",
  );
  assert.equal(
    getArtifactEditReadLeaseError({
      currentDigest: "current",
      leasedDigest: "current",
    }),
    undefined,
  );
});

test("distinguishes reviewed-delivery commit blocks", () => {
  const acceptedPath = "/workspace/output/page.jsx";
  assert.equal(
    getReviewedDeliveryCommitBlock({
      workflowState: "ready_for_done",
      checkpointPath: acceptedPath,
      suppliedPath: acceptedPath,
      activeEditLeaseCount: 0,
    }),
    undefined,
  );
  assert.equal(
    getReviewedDeliveryCommitBlock({
      workflowState: "ready_for_review",
      checkpointPath: acceptedPath,
      suppliedPath: acceptedPath,
      activeEditLeaseCount: 0,
    }),
    "candidate_review_required",
  );
  assert.equal(
    getReviewedDeliveryCommitBlock({
      workflowState: "ready_for_done",
      checkpointPath: acceptedPath,
      suppliedPath: "/workspace/output/other.jsx",
      activeEditLeaseCount: 0,
    }),
    "candidate_path_mismatch",
  );
  assert.equal(
    getReviewedDeliveryCommitBlock({
      workflowState: "ready_for_done",
      checkpointPath: acceptedPath,
      suppliedPath: acceptedPath,
      activeEditLeaseCount: 1,
    }),
    "artifact_edit_lease_active",
  );
});

test("distinguishes patch execution completion from patch application", () => {
  assert.deepEqual(JSON.parse(String(normalizeArtifactPatchResult(""))), {
    ok: true,
    status: "applied",
  });
  assert.deepEqual(
    JSON.parse(
      String(
        normalizeArtifactPatchResult(
          'Invalid Context 0:\n  brand="ATELIER MODE"',
        ),
      ),
    ),
    {
      ok: false,
      status: "not_applied",
      error: "patch_context_mismatch",
      message: 'Invalid Context 0:\n  brand="ATELIER MODE"',
      nextAction:
        "Read the latest artifact with read_artifact_for_edit, then build a new patch from that exact digest.",
    },
  );
});

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
