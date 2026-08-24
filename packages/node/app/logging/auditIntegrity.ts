import { createHash } from "node:crypto";

export function hashAuditValue(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function verifyAuditChain(events: Array<Record<string, unknown>>) {
  let previousEventHash: string | undefined;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const { eventHash, ...unsigned } = event;
    if (event.sequence !== index + 1) return false;
    if (event.previousEventHash !== previousEventHash) return false;
    if (eventHash !== hashAuditValue(unsigned)) return false;
    previousEventHash = eventHash as string;
  }
  return true;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
