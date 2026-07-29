import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";

export type JsxArtifactSnapshot = Map<string, Buffer>;

export function getShellJsxMutationBlock(input: string) {
  let parsed: { cmd?: unknown; workdir?: unknown };
  try {
    parsed = JSON.parse(input) as { cmd?: unknown; workdir?: unknown };
  } catch {
    return undefined;
  }

  const cmd = typeof parsed.cmd === "string" ? parsed.cmd : "";
  const workdir = typeof parsed.workdir === "string" ? parsed.workdir : "";
  const scope = `${workdir}\n${cmd}`;
  const targetsOutput =
    /(?:^|[\s'"/])(?:\/workspace\/)?output(?:\/|[\s'"&;|]|$)/u.test(
      scope,
    ) || /\.[jt]sx\b/u.test(scope);

  if (!targetsOutput) {
    return undefined;
  }

  const mutatingCommand =
    /(?:^|[;&|]\s*|\b)(?:perl|python\d*|ruby)\b/u.test(cmd) ||
    /(?:^|[;&|]\s*|\b)(?:cp|mv|rm|touch|truncate|tee|dd|patch|install)\b/u.test(
      cmd,
    ) ||
    /\bsed\b[^\n]*(?:\s-i(?:\s|$)|--in-place)/u.test(cmd) ||
    /\s>{1,2}\s*\S/u.test(cmd);

  return mutatingCommand
    ? "Shell writes to JSX artifacts are disabled. Read the current fragment with a read-only command, then use apply_patch for every JSX change."
    : undefined;
}

export async function snapshotJsxArtifacts(
  root: string,
): Promise<JsxArtifactSnapshot> {
  const snapshot: JsxArtifactSnapshot = new Map();
  for (const path of await listJsxArtifacts(root)) {
    snapshot.set(relative(root, path), await readFile(path));
  }
  return snapshot;
}

export async function restoreJsxArtifacts(
  root: string,
  snapshot: JsxArtifactSnapshot,
) {
  const current = new Map<string, Buffer>();
  for (const path of await listJsxArtifacts(root)) {
    current.set(relative(root, path), await readFile(path));
  }

  const changed = new Set<string>();
  for (const [path, content] of current) {
    const previous = snapshot.get(path);
    if (!previous) {
      changed.add(path);
      await unlink(join(root, path));
    } else if (!previous.equals(content)) {
      changed.add(path);
      await writeFile(join(root, path), previous);
    }
  }
  for (const [path, content] of snapshot) {
    if (current.has(path)) continue;
    changed.add(path);
    const absolutePath = join(root, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }

  return [...changed].sort();
}

async function listJsxArtifacts(root: string) {
  const results: string[] = [];

  async function visit(directory: string) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && /\.[jt]sx$/u.test(entry.name)) {
        results.push(path);
      }
    }
  }

  await visit(root);
  return results.sort();
}
