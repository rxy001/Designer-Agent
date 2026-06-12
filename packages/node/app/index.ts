import express from "express";
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

app.post("/api/generate", async (req, res) => {
  const body = req.body;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (prompt.length === 0) {
    res.status(400).json({
      success: false,
      error: "`prompt` is required.",
    });
    return;
  }

  try {
    const response = await run({
      prompt,
      designSystemId: parseInt(body?.designSystemId, 10) || -1,
    });
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

app.get("/api/design-systems", (_, res) => {
  res.json({
    success: true,
    data: DESIGN_SYSTEM_LIST,
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
