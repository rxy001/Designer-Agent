import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applySitePatch,
  artifactPathForPageId,
  composeSitePage,
  computeBundleDigest,
  digestValue,
  validateSiteDocument,
  type PublicSitePlan,
  type SiteDocument,
  type SitePatchBundle,
} from "@designer-agent/site-contract";
import { SiteAuditLogger, siteAuditLogger } from "../logging/siteAuditLogger.ts";
import { pageDocumentToJsx } from "../editor/pageDocumentToJsx.ts";

export type SiteVersionManifest = {
  siteId: string;
  batchId: string;
  bundleDigest: string;
  planDigest: string;
  siteVersion: number;
  createdAt: number;
  plan: PublicSitePlan;
  files: Record<string, string>;
  siteReviewStatus: "accepted" | "review_unavailable";
  auditDigest?: string;
  auditEventCount?: number;
  terminalStatus?: "accepted" | "aborted" | "rejected";
};

export type WorkspaceSiteSummary = {
  id: string;
  title: string;
  version: number;
  pageCount: number;
  activatedAt: number;
};

export type StageSiteVersionInput = {
  previousSite: SiteDocument;
  site: SiteDocument;
  bundle: SitePatchBundle;
  plan: PublicSitePlan;
  siteReviewStatus?: "accepted" | "review_unavailable";
};

export class SiteVersionStore {
  readonly sitesRoot: string;
  readonly keepAcceptedVersions: number;
  readonly auditLogger: SiteAuditLogger;

  constructor(sitesRoot: string, keepAcceptedVersions = 10, auditLogger = siteAuditLogger) {
    this.sitesRoot = sitesRoot;
    this.keepAcceptedVersions = keepAcceptedVersions;
    this.auditLogger = auditLogger;
  }

  async stage(input: StageSiteVersionInput) {
    if (computeBundleDigest(input.bundle) !== input.bundle.bundleDigest) throw new Error("bundle_digest_mismatch");
    if (input.plan.planDigest !== input.bundle.planDigest) throw new Error("plan_digest_mismatch");
    const projected = applySitePatch(input.previousSite, input.bundle);
    if (digestValue(projected) !== digestValue(input.site)) throw new Error("site_projection_mismatch");
    const site = validateSiteDocument(input.site);
    const siteRoot = this.#siteRoot(site.id);
    const staging = join(siteRoot, "staging", input.bundle.batchId);
    await rm(staging, { recursive: true, force: true });
    await Promise.all([
      mkdir(join(staging, "shared"), { recursive: true }),
      mkdir(join(staging, "bodies"), { recursive: true }),
      mkdir(join(staging, "rendered"), { recursive: true }),
    ]);

    const files: Record<string, string> = {};
    const writes: Array<Promise<void>> = [];
    const addFile = (relativePath: string, content: string) => {
      files[relativePath] = digestValue(content);
      writes.push(writeFile(join(staging, relativePath), content, "utf8"));
    };
    const canonicalSources = canonicalArtifactSources(site);
    addFile("site.json", canonicalSources["site.json"]!);
    addFile("shared/header.jsx", canonicalSources["shared/header.jsx"]!);
    addFile("shared/footer.jsx", canonicalSources["shared/footer.jsx"]!);
    for (const page of site.pages) {
      const artifactPath = artifactPathForPageId(page.id);
      addFile(artifactPath, canonicalSources[artifactPath]!);
      addFile(`rendered/${page.id}.jsx`, canonicalSources[`rendered/${page.id}.jsx`]!);
    }
    await Promise.all(writes);
    const manifest: SiteVersionManifest = {
      siteId: site.id,
      batchId: input.bundle.batchId,
      bundleDigest: input.bundle.bundleDigest,
      planDigest: input.bundle.planDigest,
      siteVersion: site.version,
      createdAt: Date.now(),
      plan: input.plan,
      files,
      siteReviewStatus: input.siteReviewStatus ?? "review_unavailable",
    };
    await writeFile(join(staging, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    await this.#verifyDirectory(staging, manifest);
    await this.auditLogger.write("site.version.staged", {
      bundleDigest: input.bundle.bundleDigest,
      siteVersion: site.version,
      fileCount: Object.keys(files).length,
      siteReviewStatus: manifest.siteReviewStatus,
    }, { context: { siteId: site.id, batchId: input.bundle.batchId, planId: input.plan.id } });
    return { stagingPath: staging, manifest };
  }

  async commit(siteId: string, batchId: string, bundleDigest: string) {
    const siteRoot = this.#siteRoot(siteId);
    const staging = join(siteRoot, "staging", batchId);
    const versionPath = join(siteRoot, "versions", bundleDigest);
    const existingActive = await this.readActive(siteId);
    if (existingActive?.bundleDigest === bundleDigest) return existingActive;
    const manifest = JSON.parse(await readFile(join(staging, "manifest.json"), "utf8")) as SiteVersionManifest;
    if (manifest.siteId !== siteId || manifest.batchId !== batchId || manifest.bundleDigest !== bundleDigest) {
      throw new Error("staged_version_mismatch");
    }
    await this.#verifyDirectory(staging, manifest);
    await this.auditLogger.write("site.version.commit_started", { bundleDigest, siteVersion: manifest.siteVersion }, { context: { siteId, batchId, planId: manifest.plan.id } });
    await this.auditLogger.write("site.audit.acceptance_ready", { bundleDigest, siteVersion: manifest.siteVersion, terminalStatus: "accepted" }, { context: { siteId, batchId, planId: manifest.plan.id } });
    const audit = await this.auditLogger.snapshotBatchAudit(siteId, batchId, join(staging, "audit.ndjson"));
    manifest.auditDigest = audit.auditDigest;
    manifest.auditEventCount = audit.eventCount;
    manifest.terminalStatus = "accepted";
    manifest.files["audit.ndjson"] = digestValue(audit.content);
    await writeFile(join(staging, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    await this.#verifyDirectory(staging, manifest);
    await mkdir(join(siteRoot, "versions"), { recursive: true });
    try {
      await rename(staging, versionPath);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
    const active = {
      siteId,
      batchId,
      bundleDigest,
      siteVersion: manifest.siteVersion,
      activatedAt: Date.now(),
    };
    const activePath = join(siteRoot, "active.json");
    const temporary = `${activePath}.tmp`;
    await writeFile(temporary, JSON.stringify(active, null, 2), "utf8");
    await rename(temporary, activePath);
    this.auditLogger.record("site.active.switched", { bundleDigest, siteVersion: manifest.siteVersion }, { context: { siteId, batchId, planId: manifest.plan.id } });
    await this.prune(siteId);
    return active;
  }

  async readActive(siteId: string) {
    try {
      return JSON.parse(await readFile(join(this.#siteRoot(siteId), "active.json"), "utf8")) as {
        siteId: string;
        batchId: string;
        bundleDigest: string;
        siteVersion: number;
        activatedAt: number;
      };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async readActiveSite(siteId: string) {
    const active = await this.readActive(siteId);
    if (!active) return undefined;
    const source = await readFile(join(this.#siteRoot(siteId), "versions", active.bundleDigest, "site.json"), "utf8");
    return validateSiteDocument(JSON.parse(source));
  }

  async readLatestActiveSite() {
    const sites = await this.listActiveSites();
    return sites[0] ? this.readActiveSite(sites[0].id) : undefined;
  }

  async listActiveSites(): Promise<WorkspaceSiteSummary[]> {
    let entries;
    try {
      entries = await readdir(this.sitesRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
    const activeVersions = (
      await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
        const active = await this.readActive(entry.name);
        if (!active) return undefined;
        const site = await this.readActiveSite(entry.name);
        return site ? {
          id: site.id,
          title: site.title,
          version: site.version,
          pageCount: site.pages.length,
          activatedAt: active.activatedAt,
        } : undefined;
      }))
    ).filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
    activeVersions.sort((left, right) => right.activatedAt - left.activatedAt);
    return activeVersions;
  }

  async restore(siteId: string, bundleDigest: string) {
    const manifest = JSON.parse(
      await readFile(join(this.#siteRoot(siteId), "versions", bundleDigest, "manifest.json"), "utf8"),
    ) as SiteVersionManifest;
    if (manifest.siteId !== siteId || manifest.bundleDigest !== bundleDigest) throw new Error("version_manifest_mismatch");
    const active = {
      siteId,
      batchId: manifest.batchId,
      bundleDigest,
      siteVersion: manifest.siteVersion,
      activatedAt: Date.now(),
    };
    const activePath = join(this.#siteRoot(siteId), "active.json");
    const temporary = `${activePath}.tmp`;
    await writeFile(temporary, JSON.stringify(active, null, 2), "utf8");
    await rename(temporary, activePath);
    this.auditLogger.record("site.version.restored", { bundleDigest, siteVersion: manifest.siteVersion }, { context: { siteId, batchId: manifest.batchId, planId: manifest.plan.id } });
    return active;
  }

  async prune(siteId: string) {
    const versionsRoot = join(this.#siteRoot(siteId), "versions");
    let entries;
    try {
      entries = await readdir(versionsRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
    const versions = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => ({
      name: entry.name,
      modifiedAt: (await stat(join(versionsRoot, entry.name))).mtimeMs,
    })));
    versions.sort((left, right) => right.modifiedAt - left.modifiedAt);
    for (const version of versions.slice(this.keepAcceptedVersions)) {
      await rm(join(versionsRoot, version.name), { recursive: true, force: true });
      this.auditLogger.record("site.version.pruned", { bundleDigest: version.name }, { context: { siteId } });
    }
  }

  async cleanupFailedStaging(siteId: string, olderThan = Date.now() - 24 * 60 * 60 * 1000) {
    const stagingRoot = join(this.#siteRoot(siteId), "staging");
    let entries;
    try {
      entries = await readdir(stagingRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const path = join(stagingRoot, entry.name);
      if ((await stat(path)).mtimeMs < olderThan) await rm(path, { recursive: true, force: true });
    }
  }

  async discardStaging(siteId: string, batchId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(batchId)) throw new Error("invalid_batch_id");
    await rm(join(this.#siteRoot(siteId), "staging", batchId), {
      recursive: true,
      force: true,
    });
  }

  #siteRoot(siteId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(siteId)) throw new Error("invalid_site_id");
    return join(this.sitesRoot, siteId);
  }

  async #verifyDirectory(root: string, manifest: SiteVersionManifest) {
    for (const [relativePath, expected] of Object.entries(manifest.files)) {
      const actual = digestValue(await readFile(join(root, relativePath), "utf8"));
      if (actual !== expected) throw new Error(`artifact_digest_mismatch:${relativePath}`);
    }
    const site = validateSiteDocument(JSON.parse(await readFile(join(root, "site.json"), "utf8")));
    if (site.id !== manifest.siteId || site.version !== manifest.siteVersion) {
      throw new Error("site_manifest_mismatch");
    }
    for (const [relativePath, expected] of Object.entries(canonicalArtifactSources(site))) {
      const actual = await readFile(join(root, relativePath), "utf8");
      if (actual !== expected) throw new Error(`artifact_semantic_mismatch:${relativePath}`);
    }
  }
}

function canonicalArtifactSources(site: SiteDocument): Record<string, string> {
  const sources: Record<string, string> = {
    "site.json": JSON.stringify(site, null, 2),
    "shared/header.jsx": pageDocumentToJsx({
      id: site.sharedShell.header.id,
      title: "Header",
      version: site.sharedShell.header.version,
      viewport: "desktop",
      sections: site.sharedShell.header.sections,
    }),
    "shared/footer.jsx": pageDocumentToJsx({
      id: site.sharedShell.footer.id,
      title: "Footer",
      version: site.sharedShell.footer.version,
      viewport: "desktop",
      sections: site.sharedShell.footer.sections,
    }),
  };
  for (const page of site.pages) {
    sources[artifactPathForPageId(page.id)] = pageDocumentToJsx(page.body);
    sources[`rendered/${page.id}.jsx`] = pageDocumentToJsx(composeSitePage(site, page.id));
  }
  return sources;
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error.code === "EEXIST" || error.code === "ENOTEMPTY");
}
