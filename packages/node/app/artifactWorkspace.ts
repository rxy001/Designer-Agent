import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

export type WorkspaceFileSnapshot = Map<string, Buffer>;

export async function snapshotWorkspaceFiles(root: string) {
  const snapshot: WorkspaceFileSnapshot = new Map();
  for (const path of await listWorkspaceFiles(root)) {
    snapshot.set(relative(root, path), await readFile(path));
  }
  return snapshot;
}

export async function persistWorkspaceChanges({
  sourceDir,
  destinationDir,
  baseline,
}: {
  sourceDir: string;
  destinationDir: string;
  baseline: WorkspaceFileSnapshot;
}) {
  const persisted: string[] = [];

  for (const sourcePath of await listWorkspaceFiles(sourceDir)) {
    const relativePath = relative(sourceDir, sourcePath);
    const current = await readFile(sourcePath);
    const previous = baseline.get(relativePath);
    if (previous?.equals(current)) {
      continue;
    }

    const destinationPath = join(destinationDir, relativePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
    persisted.push(relativePath);
  }

  return persisted.sort();
}

async function listWorkspaceFiles(root: string) {
  const results: string[] = [];

  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        results.push(path);
      }
    }
  }

  await visit(root);
  return results.sort();
}
