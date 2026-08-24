export class Semaphore {
  readonly capacity: number;
  #available: number;
  #waiters: Array<(release: () => void) => void> = [];

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Semaphore capacity must be a positive integer.");
    }
    this.capacity = capacity;
    this.#available = capacity;
  }

  async acquire() {
    if (this.#available > 0) {
      this.#available -= 1;
      return this.#createRelease();
    }
    return new Promise<() => void>((resolve) => this.#waiters.push(resolve));
  }

  async use<T>(action: () => Promise<T>) {
    const release = await this.acquire();
    try {
      return await action();
    } finally {
      release();
    }
  }

  #createRelease() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const waiter = this.#waiters.shift();
      if (waiter) waiter(this.#createRelease());
      else this.#available += 1;
    };
  }
}

