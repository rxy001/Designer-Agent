import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DESIGN_SYSTEM_LIST } from "../dataSource.ts";
import { paths } from "../paths.ts";

export async function getDesignSystemPropmpt(designSystemId: number) {
  const designSystemInfo = DESIGN_SYSTEM_LIST.find(
    (item) => item.id === designSystemId,
  );

  if (!designSystemInfo) {
    return "";
  }

  const designSystemDir = join(paths.designSystemDir, designSystemInfo.path);

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
