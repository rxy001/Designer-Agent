import assert from "node:assert/strict";
import test from "node:test";

import {
  getArtifactLogFile,
  getArtifactLogIdForPath,
} from "../app/artifactLog.ts";

test("uses one readable log file for a stable artifact id", () => {
  assert.equal(
    getArtifactLogFile("/tmp/logs", "page-123"),
    "/tmp/logs/page-123.log",
  );
  assert.equal(
    getArtifactLogFile("/tmp/logs", "page-123"),
    getArtifactLogFile("/tmp/logs", "page-123"),
  );
});

test("keeps unsafe artifact ids inside the logs directory", () => {
  const path = getArtifactLogFile("/tmp/logs", "../../another page");
  assert.match(path, /^\/tmp\/logs\/another-page-[a-f0-9]{12}\.log$/);
});

test("maps repeated standalone verification of one path to one log id", () => {
  const first = getArtifactLogIdForPath("/workspace/output/home.jsx");
  const second = getArtifactLogIdForPath("/workspace/output/home.jsx");
  const other = getArtifactLogIdForPath("/workspace/other/home.jsx");

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^home-[a-f0-9]{12}$/);
});
