import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN_SYSTEM_LIST } from "../dataSource.ts";

export async function getDesignSystemPropmpt(designSystemId: number) {
  const designSystemInfo = DESIGN_SYSTEM_LIST.find(
    (item) => item.id === designSystemId,
  );

  if (!designSystemInfo) {
    return "";
  }

  const promptsDir = dirname(fileURLToPath(import.meta.url));

  const designSystemDir = join(
    promptsDir,
    "../../design-system",
    designSystemInfo.path,
  );

  const [designSystemBody, designSystemTokens, componentManifest] =
    await Promise.all([
      readFile(resolve(designSystemDir, "DESIGN.md"), {
        encoding: "utf-8",
      }),
      readFile(resolve(designSystemDir, "tokens.css"), {
        encoding: "utf-8",
      }),
      readFile(resolve(designSystemDir, "manifest.md"), {
        encoding: "utf-8",
      }),
    ]);

  return [
    `# How to use this design system - ${designSystemInfo.title}`,
    "\n\nRead DESIGN.md for visual principles, paste tokens.css verbatim into the first <style> when it is provided, and match component shapes from the reference component manifest or fixture when available. Treat any pull-layer index as optional context for deeper inspection; do not assume those files have already been loaded.",
    "\n\nTreat the following DESIGN.md as authoritative for color, typography, spacing, and component rules. Do not invent tokens outside this palette. When you generate any .html files, bind these tokens into its \`:root\` block before generating any layout.",
    `\n\n## Active design system${designSystemInfo.title ? ` — ${designSystemInfo.title}` : ""}\n\n${designSystemBody}`,
    `\n\n## Active design system tokens${designSystemInfo.title ? ` — ${designSystemInfo.title}` : ""}\n\n${designSystemTokens}`,
    `\n\n## Reference component manifest${designSystemInfo.title ? ` — ${designSystemInfo.title}` : ""}\n\n${componentManifest}`,
  ].join("");
}
