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

  const designSystemBody = await readFile(
    resolve(designSystemDir, "DESIGN.md"),
    {
      encoding: "utf-8",
    },
  );
  return [
    "\n\nTreat the following Design system as authoritative for color, typography, spacing, and component rules. Do not invent tokens outside this palette. When you generate any .html files, bind these tokens into its \`:root\` block before generating any layout.",
    `${designSystemBody}`,
  ].join("");
}
