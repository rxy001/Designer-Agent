import { createHash } from "node:crypto";

const SECRET_KEY = /(?:api[-_]?key|authorization|cookie|password|secret|access[-_]?token|refresh[-_]?token|leaseId)/i;
const SOURCE_KEY = /^(?:source|canonicalSource|jsx|html|prompt)$/i;

export function redactAuditPayload(value: unknown, event: string, key?: string, ancestors = new WeakSet<object>()): unknown {
  if (key && SECRET_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return summarizeText(value, "image-data-url");
    if ((key && SOURCE_KEY.test(key)) || (event === "model.output" && key === "text") || value.length > 16_000) {
      return summarizeText(value, key ?? "large-text");
    }
    if ((key === "arguments" || key === "result") && looksLikeJson(value)) {
      try {
        return redactAuditPayload(JSON.parse(value), event, key, ancestors);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (value instanceof Uint8Array) return `[REDACTED binary, ${value.byteLength} bytes]`;
  if (value instanceof ArrayBuffer) return `[REDACTED binary, ${value.byteLength} bytes]`;
  if (typeof value !== "object" || value === null) return value;
  if (ancestors.has(value)) return "[Circular]";
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => redactAuditPayload(item, event, key, ancestors));
    const result: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      result[nestedKey] = redactAuditPayload(nestedValue, event, nestedKey, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function summarizeText(value: string, kind: string) {
  return {
    redacted: kind,
    chars: value.length,
    digest: createHash("sha256").update(value).digest("hex"),
  };
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}
