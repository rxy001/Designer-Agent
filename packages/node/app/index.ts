import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./agent.ts";

const app = express();
const port = 3333;
const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(appDir, "../workspace");
const workspaceFilesRoute = "/workspace";

app.use(express.json());
app.use(workspaceFilesRoute, express.static(workspaceDir));

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
      designSystemId: body.designSystemId,
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

app.get("/api/getDesignSystemList");

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
