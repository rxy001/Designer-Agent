import assert from "node:assert/strict";
import test from "node:test";

import { normalizeArtifactPath } from "../app/artifactPath.ts";

test("normalizes supported Artifact path forms to one canonical path", () => {
  const canonicalPath = "/workspace/output/page.jsx";

  assert.equal(normalizeArtifactPath("page.jsx"), canonicalPath);
  assert.equal(normalizeArtifactPath("output/page.jsx"), canonicalPath);
  assert.equal(normalizeArtifactPath(canonicalPath), canonicalPath);
});

test("rejects Artifact paths outside the sandbox output directory", () => {
  for (const path of [
    "../page.jsx",
    "output/../page.jsx",
    "/workspace/page.jsx",
    "/workspace/output/../page.jsx",
    "/tmp/page.jsx",
    "",
  ]) {
    assert.throws(
      () => normalizeArtifactPath(path),
      /must identify a file under \/workspace\/output/u,
    );
  }
});
