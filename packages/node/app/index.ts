import express from "express";
import { WebSocketServer } from "ws";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./agent.ts";
import { DESIGN_SYSTEM_LIST } from "./dataSource.ts";
import { getPreviewArtifact } from "./previewRegistry.ts";
import {
  installPreviewRenderer,
  renderPreviewHtml,
} from "./previewRenderer.ts";

const app = express();
const port = 3333;
const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(appDir, "../workspace");
const workspaceFilesRoute = "/workspace";

app.use(express.json());
app.use(workspaceFilesRoute, express.static(workspaceDir));

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
      socket.send(
        JSON.stringify({
          type: "ai.delta",
          requestId,
          text: "开始处理请求...\n",
        }),
      );

      const response = await run({
        prompt,
        designSystemId: parseInt(message.designSystemId, 10) || -1,
        page: message.page,
        scope: message.scope === "selection" ? "selection" : "page",
        selectedToolId:
          typeof message.selectedToolId === "string"
            ? message.selectedToolId
            : undefined,
        onProgress: (text) => {
          socket.send(
            JSON.stringify({
              type: "ai.delta",
              requestId,
              text,
            }),
          );
        },
      });

      socket.send(
        JSON.stringify({
          type: "page.patch",
          requestId,
          patch: response.patch,
        }),
      );

      if (response.message) {
        socket.send(
          JSON.stringify({
            type: "ai.done",
            requestId,
            message: response.message,
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
      socket.send(
        JSON.stringify({
          type: "error",
          requestId,
          message: errorMessage,
        }),
      );
    }
  });
});
