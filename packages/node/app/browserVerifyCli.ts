import express from "express";
import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";

const viewportNames = ["desktop", "tablet", "mobile"] as const;
type ViewportName = (typeof viewportNames)[number];

export type BrowserVerifyCliOptions = {
  path?: string;
  viewports?: ViewportName[];
  repair: boolean;
  help: boolean;
};

export function parseBrowserVerifyArgs(argv: string[]): BrowserVerifyCliOptions {
  let path: string | undefined;
  let viewports: ViewportName[] | undefined;
  let repair = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--path") {
      path = readOptionValue(argv, ++index, "--path");
      continue;
    }
    if (argument === "--viewports") {
      const value = readOptionValue(argv, ++index, "--viewports");
      const requested = value.split(",").map((item) => item.trim()).filter(Boolean);
      const invalid = requested.filter(
        (item) => !viewportNames.includes(item as ViewportName),
      );
      if (invalid.length > 0) {
        throw new Error(
          `Invalid viewport(s): ${invalid.join(", ")}. Expected desktop, tablet, or mobile.`,
        );
      }
      viewports = [...new Set(requested as ViewportName[])];
      if (viewports.length === 0) {
        throw new Error("--viewports must include at least one viewport.");
      }
      continue;
    }
    if (argument === "--repair") {
      repair = true;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!help && !path) {
    throw new Error("--path is required.");
  }

  return { path, viewports, repair, help };
}

function readOptionValue(argv: string[], index: number, option: string) {
  const value = argv[index]?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

export function browserVerifyUsage() {
  return [
    "Usage:",
    "  npm run verify:browser -- --path /workspace/output/page.jsx [--viewports desktop,tablet,mobile] [--repair]",
    "",
    "Runs screenshot-free static and browser matrix checks without invoking the Agent model or visual reviewer.",
    "Pass --repair to apply the best verified deterministic Grid repair transactionally.",
  ].join("\n");
}

export async function runBrowserVerifyCli(argv = process.argv.slice(2)) {
  let options: BrowserVerifyCliOptions;
  try {
    options = parseBrowserVerifyArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n`);
    process.stderr.write(`${browserVerifyUsage()}\n`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(`${browserVerifyUsage()}\n`);
    return 0;
  }

  const app = express();
  const [agent, preview] =
    await Promise.all([import("./agent.ts"), import("./previewRenderer.ts")]);

  app.get("/preview-artifacts/:id", async (request, response) => {
    try {
      response.type("html").send(await preview.renderPreviewHtml(request.params.id));
    } catch (error) {
      response
        .status(500)
        .send(error instanceof Error ? error.message : String(error));
    }
  });

  let server: Server | undefined;
  try {
    await preview.installPreviewRenderer(app);
    server = await listenOnEphemeralPort(app);
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to determine preview server port.");
    }
    const result = await (options.repair
      ? agent.repairBrowserArtifact
      : agent.verifyBrowserArtifact)({
      path: options.path!,
      viewports: options.viewports,
      previewBaseUrl: `http://127.0.0.1:${address.port}`,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok === true ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `Browser verification failed to run: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  } finally {
    await agent.closeBrowserVerificationRuntime();
    await closeServer(server);
    await preview.closePreviewRenderer();
  }
}

function listenOnEphemeralPort(app: express.Express) {
  return new Promise<Server>((resolve, reject) => {
    const server = createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server: Server | undefined) {
  if (!server) return Promise.resolve();
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

const mainPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === mainPath) {
  process.exitCode = await runBrowserVerifyCli();
}
