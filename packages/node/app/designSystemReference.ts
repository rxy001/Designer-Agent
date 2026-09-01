import { realpath, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { DESIGN_SYSTEM_LIST } from "./dataSource.ts";
import { paths } from "./paths.ts";

export type DesignSystemReference = {
  id: number;
  title: string;
  sourceDir: string;
  documentPath: string;
};

export async function resolveDesignSystemReference(
  designSystemId: number,
): Promise<DesignSystemReference | undefined> {
  if (designSystemId === -1) return undefined;

  const info = DESIGN_SYSTEM_LIST.find((item) => item.id === designSystemId);
  if (!info) throw new Error(`design_system_not_found:${designSystemId}`);

  const baseDir = await realpath(paths.designSystemDir);
  const sourceDir = await realpath(resolve(baseDir, info.path));
  const documentPath = await realpath(join(sourceDir, "DESIGN.md"));
  const relativeSource = relative(baseDir, sourceDir);

  if (
    relativeSource.startsWith("..") ||
    relativeSource === "" ||
    relativeSource.includes("\0")
  ) {
    throw new Error(`design_system_path_invalid:${designSystemId}`);
  }

  return { id: info.id, title: info.title, sourceDir, documentPath };
}

export function readDesignSystemReference(reference: DesignSystemReference) {
  return readFile(reference.documentPath, "utf8");
}
