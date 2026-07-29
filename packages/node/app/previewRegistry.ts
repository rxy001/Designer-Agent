import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

export type PreviewArtifact = {
  id: string;
  hostPath: string;
  filePath: string;
};

const previewRegistry = new Map<string, PreviewArtifact>();
const previewIdsByFilePath = new Map<string, string>();
const sandboxWorkspaceDir = "/workspace";
const sandboxOutputDir = `${sandboxWorkspaceDir}/output`;

export async function registerPreviewArtifact(
  filePath: string,
  workspaceDir: string,
) {
  const existingId = getPreviewArtifactId(filePath);

  if (existingId) {
    const existingArtifact = previewRegistry.get(existingId);

    if (existingArtifact) {
      return existingArtifact;
    }
  }

  const relativePath = toWorkspaceRelativePath(filePath, workspaceDir);
  const hostPath = join(workspaceDir, relativePath);
  const fileStat = await stat(hostPath);

  if (!fileStat.isFile()) {
    throw new Error(`Preview artifact is not a file: ${filePath}`);
  }

  const artifact: PreviewArtifact = {
    id: createPreviewArtifactId(filePath),
    hostPath,
    filePath,
  };

  previewRegistry.set(artifact.id, artifact);
  previewIdsByFilePath.set(filePath, artifact.id);
  return artifact;
}

export function getPreviewArtifact(id: string) {
  return previewRegistry.get(id) ?? null;
}

export function getPreviewArtifactId(path: string) {
  return previewIdsByFilePath.get(path) ?? null;
}

export function unregisterPreviewArtifact(filePath: string) {
  const artifactId = previewIdsByFilePath.get(filePath);
  if (!artifactId) {
    return;
  }

  previewIdsByFilePath.delete(filePath);
  previewRegistry.delete(artifactId);
}

export function toWorkspaceRelativePath(
  filePath: string,
  workspaceDir: string,
) {
  if (
    filePath === sandboxOutputDir ||
    filePath.startsWith(`${sandboxOutputDir}/`)
  ) {
    return filePath.slice(sandboxOutputDir.length + 1);
  }

  if (
    filePath === sandboxWorkspaceDir ||
    filePath.startsWith(`${sandboxWorkspaceDir}/`)
  ) {
    return filePath.slice(sandboxWorkspaceDir.length + 1);
  }

  const absolutePath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(workspaceDir, filePath);
  const relativePath = relative(workspaceDir, absolutePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path is outside workspace: ${filePath}`);
  }

  return relativePath;
}

function createPreviewArtifactId(hostPath: string) {
  return createHash("sha256").update(hostPath).digest("hex").slice(0, 24);
}
