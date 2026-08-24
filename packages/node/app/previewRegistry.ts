import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { agentConfig } from "./agentConfig.ts";

export type PreviewArtifact = {
  id: string;
  hostPath: string;
  filePath: string;
  source?: string;
};

const previewRegistry = new Map<string, PreviewArtifact>();
const previewIdsByFilePath = new Map<string, string>();
const sandboxWorkspaceDir = "/workspace";
const sandboxOutputDir = `${sandboxWorkspaceDir}/output`;
const registryFile = agentConfig.artifacts.registryFile;

type PersistedPreviewArtifact = PreviewArtifact & {
  workspaceDir: string;
};

const persistedArtifacts = new Map<string, PersistedPreviewArtifact>();
const displacedArtifactsByWorkspace = new Map<
  string,
  Map<string, PersistedPreviewArtifact>
>();
const registryReady = loadPreviewRegistry();
let registryWriteQueue: Promise<void> = Promise.resolve();
let registryWriteCounter = 0;

export async function initializePreviewRegistry() {
  await registryReady;
}

export async function registerPreviewArtifact(
  filePath: string,
  workspaceDir: string,
) {
  await registryReady;
  const relativePath = toWorkspaceRelativePath(filePath, workspaceDir);
  const hostPath = join(workspaceDir, relativePath);
  const fileStat = await stat(hostPath);

  if (!fileStat.isFile()) {
    throw new Error(`Preview artifact is not a file: ${filePath}`);
  }

  const existingId = getPreviewArtifactId(filePath);
  const existingArtifact = existingId
    ? persistedArtifacts.get(existingId)
    : undefined;

  if (existingArtifact?.hostPath === hostPath) {
    return existingArtifact;
  }

  const artifact: PreviewArtifact = {
    id: createPreviewArtifactId(`${workspaceDir}\0${filePath}`),
    hostPath,
    filePath,
  };

  if (existingArtifact && existingArtifact.workspaceDir !== workspaceDir) {
    let displaced = displacedArtifactsByWorkspace.get(workspaceDir);
    if (!displaced) {
      displaced = new Map();
      displacedArtifactsByWorkspace.set(workspaceDir, displaced);
    }
    if (!displaced.has(existingArtifact.id)) {
      displaced.set(existingArtifact.id, existingArtifact);
    }
  }

  previewRegistry.set(artifact.id, artifact);
  previewIdsByFilePath.set(filePath, artifact.id);
  persistedArtifacts.set(artifact.id, { ...artifact, workspaceDir });
  await persistPreviewRegistry();
  return artifact;
}

export async function registerPreviewSource(source: string, key: string) {
  await registryReady;
  const filePath = `editor-preview:${key}`;
  const id = createPreviewArtifactId(`${filePath}\0${source}`);
  const artifact: PreviewArtifact = {
    id,
    filePath,
    hostPath: resolve(agentConfig.paths.workspaceDir, `.preview/${id}.jsx`),
    source,
  };

  previewRegistry.set(id, artifact);
  return artifact;
}

export function getPreviewArtifact(id: string) {
  return previewRegistry.get(id) ?? null;
}

export function getPreviewArtifactId(path: string) {
  return previewIdsByFilePath.get(path) ?? null;
}

export async function unregisterPreviewArtifact(filePath: string) {
  await registryReady;
  const artifactId = previewIdsByFilePath.get(filePath);
  if (!artifactId) {
    return;
  }

  previewIdsByFilePath.delete(filePath);
  previewRegistry.delete(artifactId);
  persistedArtifacts.delete(artifactId);
  await persistPreviewRegistry();
}

export async function unregisterPreviewArtifactsForWorkspace(
  workspaceDir: string,
) {
  await registryReady;
  let changed = false;

  for (const [artifactId, artifact] of persistedArtifacts) {
    if (artifact.workspaceDir !== workspaceDir) {
      continue;
    }

    persistedArtifacts.delete(artifactId);
    previewRegistry.delete(artifactId);
    if (previewIdsByFilePath.get(artifact.filePath) === artifactId) {
      previewIdsByFilePath.delete(artifact.filePath);
    }
    changed = true;
  }

  const displaced = displacedArtifactsByWorkspace.get(workspaceDir);
  if (displaced) {
    for (const artifact of displaced.values()) {
      if (!persistedArtifacts.has(artifact.id)) {
        continue;
      }
      previewRegistry.set(artifact.id, artifact);
      previewIdsByFilePath.set(artifact.filePath, artifact.id);
      persistedArtifacts.set(artifact.id, artifact);
    }
    displacedArtifactsByWorkspace.delete(workspaceDir);
    changed = true;
  }

  if (changed) {
    await persistPreviewRegistry();
  }
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

function createPreviewArtifactId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

async function loadPreviewRegistry() {
  let source: string;
  try {
    source = await readFile(registryFile, "utf8");
  } catch (error) {
    if (getErrorCode(error) === "ENOENT") {
      return;
    }
    throw error;
  }

  const parsed = JSON.parse(source) as unknown;
  if (!isPersistedRegistry(parsed)) {
    throw new Error(`Invalid preview Artifact registry: ${registryFile}`);
  }

  for (const record of parsed.artifacts) {
    if (record.id !== createPreviewArtifactId(`${record.workspaceDir}\0${record.filePath}`)) {
      continue;
    }

    const relativePath = toWorkspaceRelativePath(
      record.filePath,
      record.workspaceDir,
    );
    const hostPath = join(record.workspaceDir, relativePath);

    try {
      const fileStat = await stat(hostPath);
      if (!fileStat.isFile()) {
        continue;
      }
    } catch (error) {
      if (getErrorCode(error) === "ENOENT") {
        continue;
      }
      throw error;
    }

    const artifact: PreviewArtifact = {
      id: record.id,
      filePath: record.filePath,
      hostPath,
    };
    previewRegistry.set(artifact.id, artifact);
    previewIdsByFilePath.set(artifact.filePath, artifact.id);
    persistedArtifacts.set(artifact.id, {
      ...artifact,
      workspaceDir: record.workspaceDir,
    });
  }
}

function persistPreviewRegistry() {
  registryWriteQueue = registryWriteQueue.then(async () => {
    registryWriteCounter += 1;
    const temporaryFile = `${registryFile}.${process.pid}.${registryWriteCounter}.tmp`;
    const artifacts = [...persistedArtifacts.values()]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map(({ id, filePath, workspaceDir }) => ({
        id,
        filePath,
        workspaceDir,
      }));

    await mkdir(dirname(registryFile), { recursive: true });
    await writeFile(
      temporaryFile,
      `${JSON.stringify({ version: 1, artifacts }, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryFile, registryFile);
  });

  return registryWriteQueue;
}

function isPersistedRegistry(
  value: unknown,
): value is {
  version: 1;
  artifacts: Array<{
    id: string;
    filePath: string;
    workspaceDir: string;
  }>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    Array.isArray(record.artifacts) &&
    record.artifacts.every(
      (artifact) =>
        artifact !== null &&
        typeof artifact === "object" &&
        typeof (artifact as Record<string, unknown>).id === "string" &&
        typeof (artifact as Record<string, unknown>).filePath === "string" &&
        typeof (artifact as Record<string, unknown>).workspaceDir === "string",
    )
  );
}

function getErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;
}
