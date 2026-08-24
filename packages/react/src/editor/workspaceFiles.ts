import type {
  PageDocument,
  SiteDocument,
  WorkspaceJsxFile,
  WorkspaceSiteSummary,
} from "./types";

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

export async function createSitePreview(
  site: SiteDocument,
  currentPageId: string,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/editor/site-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site, currentPageId }),
    signal,
  });
  const result = (await response.json()) as ApiResponse<{
    previewUrl: string;
  }>;

  if (!response.ok || !result.success || !result.data?.previewUrl) {
    throw new Error(result.message ?? "Failed to generate the preview.");
  }

  return result.data.previewUrl;
}

export async function loadWorkspaceBootstrap(signal?: AbortSignal) {
  const response = await fetch("/api/sites/bootstrap", { signal });
  const result = (await response.json()) as ApiResponse<{
    site: SiteDocument;
    sites: WorkspaceSiteSummary[];
  }>;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? "Failed to load workspace sites.");
  }
  return result.data;
}

export async function loadWorkspaceSite(siteId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/sites/${encodeURIComponent(siteId)}`, {
    signal,
  });
  const result = (await response.json()) as ApiResponse<SiteDocument>;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? "Failed to load the workspace site.");
  }
  return result.data;
}
