import assert from "node:assert/strict";
import test from "node:test";

import { parseBrowserVerifyArgs } from "../app/browserVerifyCli.ts";

test("parses a workspace path and a viewport subset", () => {
  assert.deepEqual(
    parseBrowserVerifyArgs([
      "--path",
      "/workspace/output/page.jsx",
      "--viewports",
      "tablet,mobile,tablet",
    ]),
    {
      path: "/workspace/output/page.jsx",
      viewports: ["tablet", "mobile"],
      repair: false,
      help: false,
    },
  );
});

test("parses the model-free repair mode", () => {
  assert.deepEqual(
    parseBrowserVerifyArgs([
      "--repair",
      "--path",
      "/workspace/output/page.jsx",
    ]),
    {
      path: "/workspace/output/page.jsx",
      viewports: undefined,
      repair: true,
      help: false,
    },
  );
});

test("rejects missing paths and unknown viewports", () => {
  assert.throws(() => parseBrowserVerifyArgs([]), /--path is required/);
  assert.throws(
    () =>
      parseBrowserVerifyArgs([
        "--path",
        "/workspace/output/page.jsx",
        "--viewports",
        "watch",
      ]),
    /Invalid viewport/,
  );
});
