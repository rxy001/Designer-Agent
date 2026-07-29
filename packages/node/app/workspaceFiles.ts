import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { jsxToPageDocument } from "./editor/jsxToPageDocument.ts";
import { pageDocumentSchema } from "./editor/schema.ts";
import type { PageDocument } from "./editor/schema.ts";
import { registerPreviewArtifact } from "./previewRegistry.ts";

export type WorkspaceJsxFile = {
  path: string;
  name: string;
};

export async function listWorkspaceJsxFiles(workspaceDir: string) {
  const files: WorkspaceJsxFile[] = [];

  await collectWorkspaceJsxFiles(workspaceDir, workspaceDir, files);

  return files.sort((first, second) => first.path.localeCompare(second.path));
}

export async function loadWorkspacePage({
  filePath,
  previousPage,
  workspaceDir,
}: {
  filePath: string;
  previousPage: PageDocument;
  workspaceDir: string;
}) {
  if (extname(filePath).toLowerCase() !== ".jsx") {
    throw new Error("Workspace file must have a .jsx extension.");
  }

  const parsedPreviousPage = pageDocumentSchema.parse(previousPage);
  const artifact = await registerPreviewArtifact(filePath, workspaceDir);
  const source = await readFile(artifact.hostPath, "utf8");
  const page = jsxToPageDocument(source, {
    previousPage: parsedPreviousPage,
  });

  return {
    page: pageDocumentSchema.parse(page),
    artifact,
  };
}

async function collectWorkspaceJsxFiles(
  workspaceDir: string,
  currentDir: string,
  files: WorkspaceJsxFile[],
) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const hostPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await collectWorkspaceJsxFiles(workspaceDir, hostPath, files);
      continue;
    }

    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".jsx") {
      continue;
    }

    files.push({
      path: relative(workspaceDir, hostPath).split(sep).join("/"),
      name: basename(entry.name),
    });
  }
}
