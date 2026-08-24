export class OperationTimeoutError extends Error {
  readonly code: string;
  readonly timeoutMs: number;

  constructor(code: string, timeoutMs: number) {
    super(`${code}:${timeoutMs}`);
    this.name = "OperationTimeoutError";
    this.code = code;
    this.timeoutMs = timeoutMs;
  }
}

export async function runWithTimeout<T>(input: {
  timeoutMs: number;
  timeoutCode: string;
  signal?: AbortSignal;
}, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (input.signal?.aborted) throw abortReason(input.signal);
  if (!Number.isFinite(input.timeoutMs) || input.timeoutMs < 0) {
    throw new RangeError("timeoutMs must be a finite, non-negative number");
  }

  const controller = new AbortController();
  let rejectAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const abort = (reason: unknown) => {
    if (controller.signal.aborted) return;
    controller.abort(reason);
    rejectAbort(reason);
  };
  const onParentAbort = () => abort(abortReason(input.signal!));
  input.signal?.addEventListener("abort", onParentAbort, { once: true });
  if (input.signal?.aborted) onParentAbort();
  const timer = input.timeoutMs === 0
    ? undefined
    : setTimeout(
        () => abort(new OperationTimeoutError(input.timeoutCode, input.timeoutMs)),
        input.timeoutMs,
      );
  timer?.unref();

  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    if (timer) clearTimeout(timer);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}

export function isOperationTimeout(error: unknown, code?: string): error is OperationTimeoutError {
  return error instanceof OperationTimeoutError && (code === undefined || error.code === code);
}

export function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error(typeof signal.reason === "string" ? signal.reason : "operation_cancelled");
}
