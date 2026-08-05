import express from "express";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { run } from "./agent.ts";
import { agentConfig } from "./agentConfig.ts";
import { DESIGN_SYSTEM_LIST } from "./dataSource.ts";
import { paths } from "./paths.ts";
import { pageDocumentToJsx } from "./editor/pageDocumentToJsx.ts";
import { pageDocumentSchema } from "./editor/schema.ts";
import { resolveEditorRequestTarget } from "./editor/resolveEditorRequestTarget.ts";
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

const app = express();
const port = agentConfig.server.port;
const workspaceFilesRoute = agentConfig.server.workspaceFilesRoute;

function previewUrlForArtifact(artifactId: string) {
  return new URL(
    `/preview-artifacts/${artifactId}`,
    agentConfig.browser.previewBaseURL,
  ).href;
}

await initializePreviewRegistry();

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

await installPreviewRenderer(app);

app.get("/api/design-systems", (_, res) => {
  res.json({
    success: true,
    data: DESIGN_SYSTEM_LIST,
  });
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

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

const editorSocketServer = new WebSocketServer({
  server,
  path: "/ws/editor",
});

editorSocketServer.on("connection", (socket) => {
  socket.on("message", async (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid WebSocket message JSON.",
        }),
      );
      return;
    }

    if (message?.type !== "ai.message") {
      socket.send(
        JSON.stringify({
          type: "error",
          requestId: message?.requestId,
          message: "Unsupported WebSocket message type.",
        }),
      );
      return;
    }

    const requestId =
      typeof message.requestId === "string"
        ? message.requestId
        : `${Date.now()}`;
    const prompt =
      typeof message.prompt === "string" ? message.prompt.trim() : "";

    if (!prompt) {
      socket.send(
        JSON.stringify({
          type: "error",
          requestId,
          message: "`prompt` is required.",
        }),
      );
      return;
    }

    try {
      const page = pageDocumentSchema.parse(message.page);
      const requestTarget = resolveEditorRequestTarget({
        page,
        selectedToolId: message.selectedToolId,
        selectedSectionId: message.selectedSectionId,
      });
      const response = await run({
        prompt,
        ...requestTarget,
        designSystemId: parseInt(message.designSystemId, 10) || -1,
        page,
        onUserEvent: (event) => {
          if (event.type === "todos") {
            socket.send(
              JSON.stringify({
                type: "ai.todos",
                requestId,
                todos: event.todos,
              }),
            );
            return;
          }

          socket.send(
            JSON.stringify({
              type: "ai.delta",
              requestId,
              text: event.text,
            }),
          );
        },
      });

      if (response.status === "accepted") {
        socket.send(
          JSON.stringify({
            type: "page.patch",
            requestId,
            baseVersion: response.baseVersion,
            patch: response.patch,
          }),
        );
      }

      if (response.message) {
        socket.send(
          JSON.stringify({
            type: "ai.done",
            requestId,
            message: response.message,
            status: response.status,
          }),
        );
      }

      if (response.previewUrl) {
        socket.send(
          JSON.stringify({
            type: "preview.updated",
            requestId,
            previewUrl: response.previewUrl,
          }),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Agent request failed.", errorMessage);
      socket.send(
        JSON.stringify({
          type: "error",
          requestId,
          message: "暂时无法完成这次请求，请稍后重试。",
        }),
      );
    }
  });
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
