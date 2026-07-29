import assert from "node:assert/strict";
import test from "node:test";

import {
  safeStringify,
  summarizeToolCallForLog,
  summarizeValueForLog,
} from "../app/runnerLogSummaries.ts";

test("summarizes an apply_patch call from its operation field", () => {
  assert.deepEqual(
    summarizeToolCallForLog({
      type: "apply_patch_call",
      callId: "call_patch",
      status: "in_progress",
      operation: {
        type: "update_file",
        path: "/workspace/output/page.jsx",
        diff: "@@ -1 +1 @@\n-old\n+new",
      },
    }),
    {
      type: "apply_patch_call",
      callId: "call_patch",
      status: "in_progress",
      operation: {
        type: "update_file",
        path: "/workspace/output/page.jsx",
        diff: "@@ -1 +1 @@\n-old\n+new",
      },
    },
  );
});

test("preserves function-call arguments without assuming every tool uses them", () => {
  assert.deepEqual(
    summarizeToolCallForLog({
      type: "function_call",
      callId: "call_function",
      name: "exec_command",
      arguments: '{"cmd":"pwd"}',
    }),
    {
      type: "function_call",
      callId: "call_function",
      name: "exec_command",
      arguments: '{"cmd":"pwd"}',
    },
  );
});

test("does not throw for values that JSON.stringify cannot serialize", () => {
  assert.deepEqual(summarizeValueForLog(undefined), {
    type: "undefined",
    serializable: false,
  });
  assert.deepEqual(summarizeValueForLog(Symbol("value")), {
    type: "symbol",
    serializable: false,
  });

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.deepEqual(summarizeValueForLog(circular), {
    type: "object",
    unreadable: true,
  });
});

test("preserves large patch diffs without truncating runner logs", () => {
  const summary = summarizeToolCallForLog({
    type: "apply_patch_call",
    callId: "call_large_patch",
    operation: {
      type: "update_file",
      path: "/workspace/output/page.jsx",
      diff: "x".repeat(3000),
    },
  }) as Record<string, unknown>;
  const operation = summary.operation as Record<string, unknown>;

  assert.equal(operation.type, "update_file");
  assert.equal(operation.path, "/workspace/output/page.jsx");
  assert.equal(operation.diff, "x".repeat(3000));
});

test("preserves large tool results without truncating runner logs", () => {
  const result = {
    ok: false,
    browserMatrixReport: { evidence: "x".repeat(10_000) },
  };

  assert.deepEqual(summarizeValueForLog(result), result);
});

test("serializes shared issue evidence without mislabeling it as circular", () => {
  const target = { sectionId: "site-footer" };
  const scrollVsClient = { bottom: 490 };
  const payload = {
    unresolvedIssues: [
      {
        code: "outside-viewport-x",
        target,
        evidence: { scrollVsClient },
      },
      {
        code: "content-scroll-overflow-y",
        target,
        evidence: { scrollVsClient },
      },
    ],
  };

  const serialized = safeStringify(payload);

  assert.equal(serialized.includes("[Circular]"), false);
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("replaces only actual recursive references with a circular marker", () => {
  const circularObject: Record<string, unknown> = {};
  circularObject.self = circularObject;
  const circularArray: unknown[] = [];
  circularArray.push(circularArray);

  assert.deepEqual(
    JSON.parse(safeStringify({ circularObject, circularArray })),
    {
      circularObject: { self: "[Circular]" },
      circularArray: ["[Circular]"],
    },
  );
});
