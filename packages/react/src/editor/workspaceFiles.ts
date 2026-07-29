import type { PageDocument, WorkspaceJsxFile } from "./types";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export async function listWorkspaceJsxFiles(signal?: AbortSignal) {
  const response = await fetch("/api/workspace/jsx-files", { signal });
  const result = (await response.json()) as ApiResponse<WorkspaceJsxFile[]>;

  if (!response.ok || !result.success || !Array.isArray(result.data)) {
    throw new Error(result.message ?? "Failed to load workspace JSX files.");
  }

  return result.data;
}

export async function loadWorkspacePage(
  path: string,
  previousPage: PageDocument,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/workspace/page-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, previousPage }),
    signal,
  });
  const result = (await response.json()) as ApiResponse<{
    path: string;
    page: PageDocument;
    previewUrl: string;
  }>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? `Failed to load ${path}.`);
  }

  return result.data;
}
