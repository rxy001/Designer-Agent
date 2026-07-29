function omitUndefinedProperties(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
  );
}

export function summarizeValueForLog(value: unknown, _maxChars?: number) {
  let serialized: string | undefined;
  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return { type: typeof value, unreadable: true };
  }

  if (serialized === undefined) {
    return { type: typeof value, serializable: false };
  }

  return value;
}

export function safeStringify(value: unknown): string {
  try {
    const serialized = JSON.stringify(sanitizeForLog(value), null, 2);
    return (
      serialized ??
      JSON.stringify({ type: typeof value, serializable: false }, null, 2)
    );
  } catch (error) {
    return JSON.stringify(
      {
        serializationError:
          error instanceof Error ? error.message : String(error),
        payloadType: typeof value,
      },
      null,
      2,
    );
  }
}

function sanitizeForLog(
  value: unknown,
  ancestors = new WeakSet<object>(),
  key?: string,
): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      return `[redacted image data URL, ${value.length} chars]`;
    }

    const parsedValue = parseJsonLogField(key, value);
    if (parsedValue !== undefined) {
      return sanitizeForLog(parsedValue, ancestors, key);
    }

    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Uint8Array) {
    return `[redacted binary, ${value.byteLength} bytes]`;
  }

  if (value instanceof ArrayBuffer) {
    return `[redacted binary, ${value.byteLength} bytes]`;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if (ancestors.has(value)) {
    return "[Circular]";
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeForLog(item, ancestors));
    }

    if (
      "type" in value &&
      "data" in value &&
      (value as { type?: unknown }).type === "Buffer" &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return `[redacted buffer, ${(value as { data: unknown[] }).data.length} bytes]`;
    }

    const result: Record<string, unknown> = {};

    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      result[nestedKey] = sanitizeForLog(nestedValue, ancestors, nestedKey);
    }

    return result;
  } finally {
    ancestors.delete(value);
  }
}

function parseJsonLogField(key: string | undefined, value: string) {
  if (key !== "arguments" && key !== "result") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (
    (!trimmedValue.startsWith("{") || !trimmedValue.endsWith("}")) &&
    (!trimmedValue.startsWith("[") || !trimmedValue.endsWith("]"))
  ) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return undefined;
  }
}

function summarizeApplyPatchOperation(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return summarizeValueForLog(value);
  }

  const operation = value as Record<string, unknown>;
  return omitUndefinedProperties({
    type: operation.type,
    path: operation.path,
    moveTo: operation.moveTo,
    diff:
      operation.diff === undefined
        ? undefined
        : summarizeValueForLog(operation.diff),
  });
}

export function summarizeToolCallForLog(toolCall: unknown) {
  if (typeof toolCall !== "object" || toolCall === null) {
    return toolCall;
  }

  const record = toolCall as Record<string, unknown>;
  const summary = omitUndefinedProperties({
    type: record.type,
    callId: record.callId ?? record.id,
    name: record.name,
    status: record.status,
  });

  if (record.arguments !== undefined) {
    summary.arguments = summarizeValueForLog(record.arguments);
  } else if (record.operation !== undefined) {
    summary.operation = summarizeApplyPatchOperation(record.operation);
  } else if (record.action !== undefined) {
    summary.action = summarizeValueForLog(record.action);
  } else if (record.actions !== undefined) {
    summary.actions = summarizeValueForLog(record.actions);
  }

  return summary;
}
