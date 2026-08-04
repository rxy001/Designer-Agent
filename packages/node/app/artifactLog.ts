import { createHash } from "node:crypto";
import { basename, extname, join } from "node:path";

export function getArtifactLogFile(logsDir: string, artifactId: string) {
  return join(logsDir, `${toSafeLogStem(artifactId)}.log`);
}

export function getArtifactLogIdForPath(artifactPath: string) {
  const fileName = basename(artifactPath, extname(artifactPath)) || "artifact";
  const digest = createHash("sha256")
    .update(artifactPath)
    .digest("hex")
    .slice(0, 12);

  return `${fileName}-${digest}`;
}

function toSafeLogStem(artifactId: string) {
  const normalized = artifactId.trim();
  const safe = normalized
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);

  if (
    safe &&
    safe !== "." &&
    safe !== ".." &&
    safe === normalized
  ) {
    return safe;
  }

  const digest = createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 12);
  return `${safe || "artifact"}-${digest}`;
}
