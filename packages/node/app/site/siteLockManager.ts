import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { KeyedMutationQueue } from "../runtime/keyedMutationQueue.ts";

export type SiteWriteLock = {
  siteId: string;
  batchId: string;
  leaseId: string;
  ownerConnectionId: string;
  state: "active" | "disconnect_grace" | "reduced_plan_confirmation" | "releasing";
  acquiredAt: number;
  heartbeatAt: number;
  expiresAt: number;
};

const ACTIVE_LEASE_MS = 60_000;
export const SITE_LOCK_EXPIRY_GRACE_MS = 15_000;
const REDUCED_PLAN_LEASE_MS = 10 * 60_000;

export class SiteLockManager {
  #locks = new Map<string, SiteWriteLock>();
  #mutations = new KeyedMutationQueue();
  readonly sitesRoot: string;
  readonly now: () => number;

  constructor(sitesRoot: string, now = () => Date.now()) {
    this.sitesRoot = sitesRoot;
    this.now = now;
  }

  async acquire(siteId: string, batchId: string, ownerConnectionId: string) {
    return this.#mutations.run(siteId, async () => {
      const existing = await this.get(siteId);
      const now = this.now();
      if (
        existing &&
        existing.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS > now &&
        existing.batchId !== batchId
      ) {
        throw new Error("site_locked");
      }
      const lock: SiteWriteLock = {
        siteId,
        batchId,
        leaseId: randomUUID(),
        ownerConnectionId,
        state: "active",
        acquiredAt: now,
        heartbeatAt: now,
        expiresAt: now + ACTIVE_LEASE_MS,
      };
      await this.#persist(lock);
      this.#locks.set(siteId, lock);
      return lock;
    });
  }

  async get(siteId: string) {
    const inMemory = this.#locks.get(siteId);
    if (inMemory) return inMemory;
    try {
      const parsed = JSON.parse(await readFile(this.#path(siteId), "utf8")) as SiteWriteLock;
      this.#locks.set(siteId, parsed);
      return parsed;
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async assertWritable(siteId: string) {
    const lock = await this.get(siteId);
    if (
      lock &&
      lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS > this.now()
    ) {
      throw new Error("site_locked");
    }
  }

  async heartbeat(siteId: string, batchId: string, leaseId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId, leaseId);
      const now = this.now();
      if (lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS <= now) {
        throw new Error("site_lock_expired");
      }
      if (lock.state === "disconnect_grace") return lock;
      const waitingForReducedPlan = lock.state === "reduced_plan_confirmation";
      const next = {
        ...lock,
        state: waitingForReducedPlan ? "reduced_plan_confirmation" as const : "active" as const,
        heartbeatAt: now,
        expiresAt: waitingForReducedPlan ? lock.expiresAt : now + ACTIVE_LEASE_MS,
      };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async refreshActiveLease(siteId: string, batchId: string, leaseId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId, leaseId);
      if (lock.state !== "active") return lock;
      if (lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS <= this.now()) {
        throw new Error("site_lock_expired");
      }
      const next = {
        ...lock,
        expiresAt: this.now() + ACTIVE_LEASE_MS,
      };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async markDisconnected(siteId: string, batchId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId);
      const next = { ...lock, state: "disconnect_grace" as const, expiresAt: this.now() + ACTIVE_LEASE_MS };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async awaitReducedPlan(siteId: string, batchId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId);
      const next = { ...lock, state: "reduced_plan_confirmation" as const, expiresAt: this.now() + REDUCED_PLAN_LEASE_MS };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async activate(siteId: string, batchId: string, leaseId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId, leaseId);
      const now = this.now();
      if (lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS <= now) {
        throw new Error("site_lock_expired");
      }
      const next = {
        ...lock,
        state: "active" as const,
        heartbeatAt: now,
        expiresAt: now + ACTIVE_LEASE_MS,
      };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async resume(siteId: string, batchId: string, ownerConnectionId: string) {
    return this.#mutations.run(siteId, async () => {
      const lock = await this.#require(siteId, batchId);
      if (
        lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS <= this.now()
      ) {
        throw new Error("site_lock_expired");
      }
      const waitingForReducedPlan = lock.state === "reduced_plan_confirmation";
      const next = {
        ...lock,
        ownerConnectionId,
        state: waitingForReducedPlan ? "reduced_plan_confirmation" as const : "active" as const,
        heartbeatAt: this.now(),
        expiresAt: waitingForReducedPlan ? lock.expiresAt : this.now() + ACTIVE_LEASE_MS,
      };
      await this.#persist(next);
      this.#locks.set(siteId, next);
      return next;
    });
  }

  async release(siteId: string, batchId: string, leaseId?: string) {
    return this.#mutations.run(siteId, () => this.#release(siteId, batchId, leaseId));
  }

  async #release(siteId: string, batchId: string, leaseId?: string) {
    const lock = await this.get(siteId);
    if (!lock) return false;
    if (lock.batchId !== batchId || (leaseId && lock.leaseId !== leaseId)) throw new Error("site_lock_mismatch");
    this.#locks.delete(siteId);
    try {
      await unlink(this.#path(siteId));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    return true;
  }

  async sweepExpired(onExpired?: (lock: SiteWriteLock) => Promise<void>) {
    await this.#hydratePersistedLocks();
    const now = this.now();
    const expired = [...this.#locks.values()].filter(
      (lock) => lock.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS <= now,
    );
    const releasedLocks: SiteWriteLock[] = [];
    for (const lock of expired) {
      const released = await this.#mutations.run(lock.siteId, async () => {
        const current = await this.get(lock.siteId);
        if (
          !current ||
          current.batchId !== lock.batchId ||
          current.leaseId !== lock.leaseId ||
          current.expiresAt + SITE_LOCK_EXPIRY_GRACE_MS > this.now()
        ) {
          return undefined;
        }
        await this.#release(current.siteId, current.batchId, current.leaseId);
        return current;
      });
      if (released) {
        releasedLocks.push(released);
        await onExpired?.(released);
      }
    }
    return releasedLocks;
  }

  async #hydratePersistedLocks() {
    let sites;
    try {
      sites = await readdir(this.sitesRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }

    for (const site of sites) {
      if (!site.isDirectory() || this.#locks.has(site.name)) continue;
      const lock = await this.get(site.name);
      if (lock && lock.siteId !== site.name) {
        throw new Error(`site_lock_identity_mismatch:${site.name}`);
      }
    }
  }

  async #require(siteId: string, batchId: string, leaseId?: string) {
    const lock = await this.get(siteId);
    if (!lock || lock.batchId !== batchId || (leaseId && lock.leaseId !== leaseId)) throw new Error("site_lock_mismatch");
    return lock;
  }

  #path(siteId: string) {
    return join(this.sitesRoot, siteId, "locks", "active-lock.json");
  }

  async #persist(lock: SiteWriteLock) {
    const path = this.#path(lock.siteId);
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await writeFile(temporary, JSON.stringify(lock, null, 2), "utf8");
    await rename(temporary, path);
  }
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
