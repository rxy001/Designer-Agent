import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

export const paths = {
  appDir,
  skillDir: join(appDir, "../skills"),
  componentsDir: join(appDir, "../components"),
  workspaceDir: join(appDir, "../workspace"),
  logsDir: join(appDir, "../logs"),
};
