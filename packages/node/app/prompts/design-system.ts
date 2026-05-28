import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pathMap: Record<string, string> = {
  Agentic: "agentic",
  Airbnb: "airbnb",
  Airtable: "airtable",
  Ant: "ant",
  Apple: "apple",
  "Claude (Anthropic)": "claude",
};

export async function getDesignSystemPropmpt(designSystemTitle: string) {
  if (!pathMap[designSystemTitle]) {
    return "";
  }

  const promptsDir = dirname(fileURLToPath(import.meta.url));

  const designSystemDir = join(promptsDir, "../../design-system");

  const designSystemBody = await readFile(
    resolve(designSystemDir, pathMap[designSystemTitle]),
    {
      encoding: "utf-8",
    },
  );

  return [
    `# How to use this design system - ${designSystemTitle}`,
    "\n\nRead DESIGN.md for visual principles, paste tokens.css verbatim into the first <style> when it is provided, and match component shapes from the reference component manifest or fixture when available. Treat any pull-layer index as optional context for deeper inspection; do not assume those files have already been loaded.",
    "\n\nTreat the following DESIGN.md as authoritative for color, typography, spacing, and component rules. Do not invent tokens outside this palette. When you copy the active skill's seed template, bind these tokens into its \`:root\` block before generating any layout.",
    `\n\n${designSystemBody}`,
  ].join("");
}
