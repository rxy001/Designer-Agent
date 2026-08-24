import assert from "node:assert/strict";
import test from "node:test";
import { SiteScheduler } from "../app/site/siteScheduler.ts";
import { OperationTimeoutError, runWithTimeout } from "../app/runtime/runWithTimeout.ts";

test("runs at most two page agents concurrently", async () => {
  const scheduler = new SiteScheduler();
  let active = 0;
  let maximum = 0;
  const releases: Array<() => void> = [];
  const running = scheduler.runPages([1, 2, 3, 4], async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise<void>((resolve) => releases.push(resolve));
    active -= 1;
    return value;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(active, 2);
  releases.shift()?.();
  releases.shift()?.();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(active, 2);
  releases.shift()?.();
  releases.shift()?.();
  assert.deepEqual(await running, [1, 2, 3, 4]);
  assert.equal(maximum, 2);
});

test("shares browser and Reviewer limits across Site scheduler instances", async () => {
  const first = new SiteScheduler();
  const second = new SiteScheduler();
  assert.equal(first.browser, second.browser);
  assert.equal(first.pageReviewer, second.pageReviewer);
  assert.equal(first.siteReviewer, second.siteReviewer);

  for (const [left, right] of [
    [first.browser, second.browser],
    [first.pageReviewer, second.pageReviewer],
    [first.siteReviewer, second.siteReviewer],
  ] as const) {
    let active = 0;
    let maximum = 0;
    let releaseFirst!: () => void;
    const firstRun = left.use(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      active -= 1;
    });
    await new Promise((resolve) => setImmediate(resolve));
    const secondRun = right.use(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      active -= 1;
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(active, 1);
    releaseFirst();
    await Promise.all([firstRun, secondRun]);
    assert.equal(maximum, 1);
  }
});

test("stops waiting when a timed operation ignores cancellation", async () => {
  const startedAt = Date.now();
  await assert.rejects(
    () => runWithTimeout({ timeoutMs: 10, timeoutCode: "test_timeout" }, async () => new Promise<never>(() => undefined)),
    (error: unknown) => error instanceof OperationTimeoutError && error.code === "test_timeout",
  );
  assert.ok(Date.now() - startedAt < 1_000);
});

test("propagates parent cancellation to a timed operation", async () => {
  const controller = new AbortController();
  const running = runWithTimeout({ timeoutMs: 1_000, timeoutCode: "unused", signal: controller.signal }, async () => new Promise<never>(() => undefined));
  controller.abort(new Error("cancelled_by_test"));
  await assert.rejects(() => running, /cancelled_by_test/);
});

test("disables the deadline when timeoutMs is zero", async () => {
  let resolveOperation!: (value: string) => void;
  const running = runWithTimeout(
    { timeoutMs: 0, timeoutCode: "disabled_timeout" },
    async () => new Promise<string>((resolve) => { resolveOperation = resolve; }),
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  resolveOperation("delivered");

  assert.equal(await running, "delivered");
});

test("still propagates parent cancellation when the deadline is disabled", async () => {
  const controller = new AbortController();
  const running = runWithTimeout(
    { timeoutMs: 0, timeoutCode: "disabled_timeout", signal: controller.signal },
    async () => new Promise<never>(() => undefined),
  );
  controller.abort(new Error("cancelled_without_deadline"));

  await assert.rejects(() => running, /cancelled_without_deadline/);
});

test("rejects negative timeout values", async () => {
  await assert.rejects(
    () => runWithTimeout({ timeoutMs: -1, timeoutCode: "invalid" }, async () => "unused"),
    /non-negative/,
  );
});
