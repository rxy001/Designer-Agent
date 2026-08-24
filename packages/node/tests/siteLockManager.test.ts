import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  SITE_LOCK_EXPIRY_GRACE_MS,
  SiteLockManager,
} from "../app/site/siteLockManager.ts";

test("enforces one site writer and supports disconnect recovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");
  await assert.rejects(() => manager.acquire("site", "other", "connection-b"), /site_locked/);
  const disconnected = await manager.markDisconnected("site", "batch");
  assert.equal(disconnected.state, "disconnect_grace");
  now += 30_000;
  const resumed = await manager.resume("site", "batch", "connection-b");
  assert.equal(resumed.ownerConnectionId, "connection-b");
  assert.equal(await manager.release("site", "batch", lock.leaseId), true);
  await manager.assertWritable("site");
});

test("heartbeats and resumes preserve the reduced-plan confirmation deadline", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-reduced-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");
  const reduced = await manager.awaitReducedPlan("site", "batch");
  now += 20_000;
  const heartbeat = await manager.heartbeat("site", "batch", lock.leaseId);
  assert.equal(heartbeat.state, "reduced_plan_confirmation");
  assert.equal(heartbeat.expiresAt, reduced.expiresAt);
  const resumed = await manager.resume("site", "batch", "connection-b");
  assert.equal(resumed.state, "reduced_plan_confirmation");
  assert.equal(resumed.expiresAt, reduced.expiresAt);
});

test("activates an approved reduced-plan lock with a fresh lease", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-reduced-active-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");
  const reduced = await manager.awaitReducedPlan("site", "batch");

  now += 20_000;
  const activated = await manager.activate("site", "batch", lock.leaseId);
  assert.equal(activated.state, "active");
  assert.equal(activated.heartbeatAt, now);
  assert.equal(activated.expiresAt, now + 60_000);
  assert.notEqual(activated.expiresAt, reduced.expiresAt);

  now += 20_000;
  const refreshed = await manager.refreshActiveLease("site", "batch", lock.leaseId);
  assert.equal(refreshed.expiresAt, now + 60_000);
});

test("server refreshes only active locks without masking client disconnects", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-server-refresh-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");

  now = 41_000;
  const refreshed = await manager.refreshActiveLease(
    "site",
    "batch",
    lock.leaseId,
  );
  assert.equal(refreshed.expiresAt, 101_000);
  assert.equal(refreshed.heartbeatAt, 1_000);

  now = 51_000;
  const disconnected = await manager.markDisconnected("site", "batch");
  now = 61_000;
  const ignored = await manager.refreshActiveLease(
    "site",
    "batch",
    lock.leaseId,
  );
  assert.equal(ignored.state, "disconnect_grace");
  assert.equal(ignored.expiresAt, disconnected.expiresAt);
  const staleClientHeartbeat = await manager.heartbeat(
    "site",
    "batch",
    lock.leaseId,
  );
  assert.equal(staleClientHeartbeat.state, "disconnect_grace");
  assert.equal(staleClientHeartbeat.expiresAt, disconnected.expiresAt);
});

test("allows a late heartbeat during the expiry grace window", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-grace-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");

  now = 61_000 + SITE_LOCK_EXPIRY_GRACE_MS - 1;
  assert.equal((await manager.sweepExpired()).length, 0);
  const renewed = await manager.heartbeat("site", "batch", lock.leaseId);
  assert.equal(renewed.expiresAt, now + 60_000);
});

test("rejects heartbeats after the expiry grace window", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-grace-expired-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");

  now = 61_000 + SITE_LOCK_EXPIRY_GRACE_MS;
  await assert.rejects(
    () => manager.heartbeat("site", "batch", lock.leaseId),
    /site_lock_expired/,
  );
});

test("serializes simultaneous client and server lock refreshes", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-concurrent-refresh-"));
  let now = 1_000;
  const manager = new SiteLockManager(root, () => now);
  const lock = await manager.acquire("site", "batch", "connection-a");

  now = 21_000;
  await Promise.all(
    Array.from({ length: 20 }, (_, index) => index % 2 === 0
      ? manager.heartbeat("site", "batch", lock.leaseId)
      : manager.refreshActiveLease("site", "batch", lock.leaseId)),
  );

  const persisted = JSON.parse(await readFile(
    join(root, "site", "locks", "active-lock.json"),
    "utf8",
  )) as { batchId: string; expiresAt: number };
  assert.equal(persisted.batchId, "batch");
  assert.equal(persisted.expiresAt, 81_000);
});

test("sweepExpired discovers and releases expired locks left on disk", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-locks-restart-"));
  let now = 1_000;
  const previousProcess = new SiteLockManager(root, () => now);
  await previousProcess.acquire("site", "batch", "connection-a");

  now = 61_000 + SITE_LOCK_EXPIRY_GRACE_MS;
  const restartedProcess = new SiteLockManager(root, () => now);
  const recovered: string[] = [];
  const expired = await restartedProcess.sweepExpired(async (lock) => {
    recovered.push(lock.batchId);
  });

  assert.equal(expired.length, 1);
  assert.deepEqual(recovered, ["batch"]);
  await assert.rejects(
    access(join(root, "site", "locks", "active-lock.json")),
    /ENOENT/,
  );
});
