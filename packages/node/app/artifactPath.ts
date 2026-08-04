import { posix } from "node:path";

const sandboxOutputDir = "/workspace/output";

/**
 * Convert every user-facing Artifact path form to the canonical sandbox path.
 * The returned path is always contained by /workspace/output.
 */
export function normalizeArtifactPath(filePath: string) {
  const candidate = filePath.startsWith(`${sandboxOutputDir}/`)
    ? filePath
    : filePath.startsWith("output/")
      ? `/workspace/${filePath}`
      : filePath.startsWith("/")
        ? filePath
        : `${sandboxOutputDir}/${filePath}`;
  const normalizedPath = posix.normalize(candidate);
  const outputFilePrefix = `${sandboxOutputDir}/`;

  if (
    !normalizedPath.startsWith(outputFilePrefix) ||
    normalizedPath.length === outputFilePrefix.length
  ) {
    throw new Error(
      `Artifact path must identify a file under ${sandboxOutputDir}: ${filePath}`,
    );
  }

  return normalizedPath;
}
