import assert from "node:assert/strict";
import test from "node:test";

import {
  getBrowserRuntimeWorkerKey,
  isBrowserInfrastructureError,
  withBrowserRuntimeScope,
} from "../app/agent.ts";

test("isolates browser workers across concurrent Agent runs", async () => {
  const [first, second] = await Promise.all([
    withBrowserRuntimeScope("run-a", async () => {
      await Promise.resolve();
      return getBrowserRuntimeWorkerKey("desktop");
    }),
    withBrowserRuntimeScope("run-b", async () => {
      await Promise.resolve();
      return getBrowserRuntimeWorkerKey("desktop");
    }),
  ]);

  assert.equal(first, "run-a:desktop");
  assert.equal(second, "run-b:desktop");
  assert.notEqual(first, second);
});

test("keeps standalone browser verification in a shared runtime", () => {
  assert.equal(getBrowserRuntimeWorkerKey("mobile"), "shared:mobile");
});

test("classifies missing selectable DevTools pages as infrastructure", () => {
  assert.equal(
    isBrowserInfrastructureError(
      "Chrome DevTools created no selectable browser page.",
    ),
    true,
  );
});
