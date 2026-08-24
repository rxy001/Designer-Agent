import express from "express";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { join } from "node:path";
import { agentConfig } from "./agentConfig.ts";
import { DESIGN_SYSTEM_LIST } from "./dataSource.ts";
import { paths } from "./paths.ts";
import { pageDocumentToJsx } from "./editor/pageDocumentToJsx.ts";
import { pageDocumentSchema } from "./editor/schema.ts";
import {
  getPreviewArtifact,
  initializePreviewRegistry,
  registerPreviewSource,
} from "./previewRegistry.ts";
import {
  closePreviewRenderer,
  installPreviewRenderer,
  renderPreviewHtml,
} from "./previewRenderer.ts";
import { listWorkspaceJsxFiles, loadWorkspacePage } from "./workspaceFiles.ts";
import { SiteLockManager } from "./site/siteLockManager.ts";
import { installSiteProtocol } from "./site/siteProtocol.ts";
import { SiteRunCoordinator } from "./site/siteRunCoordinator.ts";
import { SiteVersionStore } from "./site/siteVersionStore.ts";
import { createSiteDocument } from "./site/createSiteDocument.ts";
import { recoverExpiredSiteRuns } from "./site/recoverInterruptedSiteRuns.ts";
import { SitePreviewRegistry } from "./site/sitePreviewRegistry.ts";
import { maintainLogRetention } from "./logging/logRetention.ts";
import { siteAuditLogger } from "./logging/siteAuditLogger.ts";

const app = express();
const port = agentConfig.server.port;
const workspaceFilesRoute = agentConfig.server.workspaceFilesRoute;
const sitesRoot = join(paths.workspaceDir, "sites");
const siteLockManager = new SiteLockManager(sitesRoot);
const siteVersionStore = new SiteVersionStore(sitesRoot);
const sitePreviewRegistry = new SitePreviewRegistry();
const siteCoordinator = new SiteRunCoordinator(
  siteLockManager,
  siteVersionStore,
);

function previewUrlForArtifact(artifactId: string) {
  return new URL(
    `/preview-artifacts/${artifactId}`,
    agentConfig.browser.previewBaseURL,
  ).href;
}

await initializePreviewRegistry();
await recoverExpiredSiteRuns({
  locks: siteLockManager,
  versions: siteVersionStore,
  auditLogger: siteAuditLogger,
  agentRunsRoot: join(paths.tmpDir, "agent-runs"),
  reason: "runtime_restart",
});

app.use(express.json());
app.use(workspaceFilesRoute, express.static(paths.workspaceDir));

app.get("/preview-artifacts/:id", async (req, res) => {
  const artifact = getPreviewArtifact(req.params.id);

  if (!artifact) {
    res.status(404).send("Preview artifact not found.");
    return;
  }

  try {
    res.type("html").send(await renderPreviewHtml(artifact.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).send(message);
  }
});

app.get(/^\/site-previews\/([^/]+)(\/.*)?$/, async (req, res) => {
  const sessionId = req.params[0];
  const route = req.params[1] || "/";
  const artifactId = sessionId
    ? sitePreviewRegistry.getArtifactId(sessionId, route)
    : undefined;

  if (!artifactId) {
    res.status(404).send("Site preview route not found.");
    return;
  }

  try {
    res.set("Cache-Control", "no-store");
    res.type("html").send(await renderPreviewHtml(artifactId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).send(message);
  }
});

await installPreviewRenderer(app);

app.get("/api/design-systems", (_, res) => {
  res.json({
    success: true,
    data: DESIGN_SYSTEM_LIST,
  });
});

app.get("/api/sites/bootstrap", async (_, res) => {
  try {
    const sites = await siteVersionStore.listActiveSites();
    const site = sites[0]
      ? await siteVersionStore.readActiveSite(sites[0].id)
      : createSiteDocument();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: { site, sites } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to load the active site.",
    });
  }
});

app.get("/api/sites/:siteId", async (req, res) => {
  try {
    const site = await siteVersionStore.readActiveSite(req.params.siteId);
    if (!site) {
      res.status(404).json({ success: false, message: "Workspace site not found." });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: site });
  } catch (error) {
    res.status(422).json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to load the workspace site.",
    });
  }
});

app.get("/api/workspace/jsx-files", async (_, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: await listWorkspaceJsxFiles(paths.workspaceDir),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/workspace/page-document", async (req, res) => {
  const filePath =
    typeof req.body?.path === "string" ? req.body.path.trim() : "";

  if (!filePath) {
    res.status(400).json({
      success: false,
      message: "`path` is required.",
    });
    return;
  }

  try {
    const result = await loadWorkspacePage({
      filePath,
      previousPage: req.body?.previousPage,
      workspaceDir: paths.workspaceDir,
    });

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        path: filePath,
        page: result.page,
        previewUrl: previewUrlForArtifact(result.artifact.id),
      },
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    const status = code === "ENOENT" ? 404 : 422;

    res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/editor/preview", async (req, res) => {
  try {
    const page = pageDocumentSchema.parse(req.body?.page);
    const artifact = await registerPreviewSource(
      pageDocumentToJsx(page),
      page.id,
    );

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        previewUrl: previewUrlForArtifact(artifact.id),
      },
    });
  } catch (error) {
    res.status(422).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/editor/site-preview", async (req, res) => {
  try {
    const preview = await sitePreviewRegistry.create({
      site: req.body?.site,
      currentPageId:
        typeof req.body?.currentPageId === "string"
          ? req.body.currentPageId
          : "",
    });
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        previewUrl: new URL(
          preview.route,
          agentConfig.browser.previewBaseURL,
        ).href,
      },
    });
  } catch (error) {
    res.status(422).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to preview the site.",
    });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

const editorSocketServer = new WebSocketServer({
  server,
  path: "/ws/editor",
});
installSiteProtocol(editorSocketServer, siteCoordinator);
const expiredLockSweep = setInterval(() => {
  void recoverExpiredSiteRuns({
    locks: siteLockManager,
    versions: siteVersionStore,
    auditLogger: siteAuditLogger,
    agentRunsRoot: join(paths.tmpDir, "agent-runs"),
    reason: "site_lock_expired",
    onExpired: (lock) => siteCoordinator.handleExpiredLock(lock.batchId),
  }).catch((error) => {
    siteAuditLogger.record(
      "site.runtime.recovery_failed",
      { error },
      { level: "error" },
    );
  });
}, 10_000);
expiredLockSweep.unref();
const logRetentionSweep = setInterval(() => {
  void maintainLogRetention({ logger: siteAuditLogger }).catch((error) => {
    siteAuditLogger.record("site.logs.retention_failed", { error }, { level: "warn" });
  });
}, 6 * 60 * 60 * 1_000);
logRetentionSweep.unref();
void maintainLogRetention({ logger: siteAuditLogger }).catch((error) => {
  siteAuditLogger.record("site.logs.retention_failed", { error }, { level: "warn" });
});

const shutdownSignals = ["SIGINT", "SIGTERM"] as const;
let isShuttingDown = false;

for (const signal of shutdownSignals) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    console.warn(`Received ${signal} again, forcing shutdown.`);
    process.exit(signalToExitCode(signal));
  }

  isShuttingDown = true;
  clearInterval(expiredLockSweep);
  clearInterval(logRetentionSweep);
  console.log(`Received ${signal}, shutting down...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit.");
    process.exit(signalToExitCode(signal));
  }, 5_000);
  forceExitTimer.unref();

  try {
    await Promise.all([
      closeWebSocketServer(),
      closeHttpServer(),
      closePreviewRenderer(),
    ]);
    console.log("Server shutdown complete.");
    process.exit(signalToExitCode(signal));
  } catch (error) {
    console.error("Server shutdown failed.", error);
    process.exit(1);
  } finally {
    clearTimeout(forceExitTimer);
  }
}

async function closeWebSocketServer() {
  for (const client of editorSocketServer.clients) {
    closeWebSocketClient(client);
  }

  await new Promise<void>((resolve, reject) => {
    editorSocketServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function closeWebSocketClient(client: WebSocket) {
  if (client.readyState === client.CLOSED) {
    return;
  }

  client.close(1001, "Server shutting down");

  const terminateTimer = setTimeout(() => {
    if (client.readyState !== client.CLOSED) {
      client.terminate();
    }
  }, 1_000);
  terminateTimer.unref();
}

async function closeHttpServer() {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function signalToExitCode(signal: NodeJS.Signals) {
  return signal === "SIGINT" ? 130 : 143;
}
