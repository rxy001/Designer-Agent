import type express from "express";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getPreviewArtifact } from "./previewRegistry.ts";
import { paths } from "./paths.ts";

type ViteModuleNode = object;

type ViteServer = {
  middlewares: express.RequestHandler;
  close(): Promise<void>;
  moduleGraph: {
    getModuleById(id: string): ViteModuleNode | undefined;
    invalidateModule(module: ViteModuleNode): void;
  };
};

type ViteModule = {
  createServer(options: unknown): Promise<ViteServer>;
  transformWithOxc(
    code: string,
    filename: string,
    options: unknown,
  ): Promise<{ code: string }>;
};

type VitePluginModule = {
  default: (options?: unknown) => unknown;
};

const reactPackageDir = resolve(paths.appDir, "../../react");
const previewCacheDir = resolve(paths.appDir, "../.vite-preview-cache");
const reactNodeModulesDir = resolve(reactPackageDir, "node_modules");
const virtualEntryPrefix = "virtual:preview-entry/";
const virtualArtifactPrefix = "virtual:preview-artifact/";
const resolvedVirtualEntryPrefix = "\0virtual:preview-entry:";
const resolvedVirtualArtifactPrefix = "\0virtual:preview-artifact:";
const resolvedVirtualTailwindMergeId = "\0virtual:preview-tailwind-merge";

let viteServerPromise: Promise<ViteServer> | null = null;

export async function installPreviewRenderer(app: express.Express) {
  const vite = await getPreviewViteServer();
  app.use(vite.middlewares);
}

export async function renderPreviewHtml(artifactId: string) {
  const vite = await getPreviewViteServer();
  const artifact = getPreviewArtifact(artifactId);

  if (artifact) {
    invalidatePreviewModules(vite, artifact.id);
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview ${escapeHtml(artifactId)}</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/@id/__x00__virtual:preview-entry:${encodeURIComponent(artifactId)}"></script>
  </body>
</html>`;

  // The preview runs in middleware mode with HMR disabled. Calling
  // transformIndexHtml() still injects Vite's HMR client, which then produces
  // a development-only WebSocket connection error that browser verification
  // incorrectly reports as an artifact runtime failure. Module requests still
  // pass through Vite's middleware and receive the required transforms.
  return html;
}

function getPreviewViteServer() {
  if (!viteServerPromise) {
    viteServerPromise = createPreviewViteServer();
  }

  return viteServerPromise;
}

export async function closePreviewRenderer() {
  const viteServer = viteServerPromise;
  viteServerPromise = null;

  if (!viteServer) {
    return;
  }

  const vite = await viteServer;
  await vite.close();
}

async function createPreviewViteServer() {
  const [{ createServer, transformWithOxc }, react] = await Promise.all([
    importFromReactNodeModules<ViteModule>("vite/dist/node/index.js"),
    importFromReactNodeModules<VitePluginModule>(
      "@vitejs/plugin-react/dist/index.js",
    ),
  ]);

  return createServer({
    root: reactPackageDir,
    configFile: false,
    cacheDir: previewCacheDir,
    appType: "custom",
    plugins: [react.default(), generatedPreviewPlugin(transformWithOxc)],
    resolve: {
      alias: {
        "@": resolve(reactPackageDir, "src"),
      },
    },
    server: {
      hmr: false,
      ws: false,
      middlewareMode: true,
      fs: {
        allow: [reactPackageDir, paths.workspaceDir],
      },
    },
  });
}

function generatedPreviewPlugin(
  transformWithOxc: ViteModule["transformWithOxc"],
) {
  return {
    name: "generated-preview",
    enforce: "pre",
    resolveId(id: string, importer?: string) {
      if (id.startsWith(virtualEntryPrefix)) {
        return `${resolvedVirtualEntryPrefix}${decodeURIComponent(id.slice(virtualEntryPrefix.length))}`;
      }

      if (id.startsWith(virtualArtifactPrefix)) {
        return `${resolvedVirtualArtifactPrefix}${decodeURIComponent(id.slice(virtualArtifactPrefix.length))}.jsx`;
      }

      if (id === "tailwind-merge") {
        return resolvedVirtualTailwindMergeId;
      }

      if (
        importer?.startsWith(resolvedVirtualArtifactPrefix) &&
        isRelativeImport(id)
      ) {
        const artifactId = importer
          .slice(resolvedVirtualArtifactPrefix.length)
          .replace(/\.jsx$/, "");
        const artifact = getPreviewArtifact(artifactId);

        if (artifact) {
          return resolve(dirname(artifact.hostPath), id);
        }
      }

      return null;
    },
    async load(id: string) {
      if (id.startsWith(resolvedVirtualEntryPrefix)) {
        const artifactId = id.slice(resolvedVirtualEntryPrefix.length);

        return `
import React from "react";
import { createRoot } from "react-dom/client";
import GeneratedApp from "${virtualArtifactPrefix}${encodeURIComponent(artifactId)}";

createRoot(document.getElementById("root")).render(
  React.createElement(GeneratedApp)
);
`;
      }

      if (id.startsWith(resolvedVirtualArtifactPrefix)) {
        const artifactId = id
          .slice(resolvedVirtualArtifactPrefix.length)
          .replace(/\.jsx$/, "");
        const artifact = getPreviewArtifact(artifactId);

        if (!artifact) {
          throw new Error(`Preview artifact not found: ${artifactId}`);
        }

        const source = normalizeEscapedNewlinesInJsxAttributes(
          await readFile(artifact.hostPath, "utf8"),
        );
        const result = await transformWithOxc(source, artifact.hostPath, {});

        return result.code;
      }

      if (id === resolvedVirtualTailwindMergeId) {
        return createPreviewTailwindMergeModule();
      }

      return null;
    },
  };
}

function createPreviewTailwindMergeModule() {
  const modulePath = resolve(
    reactNodeModulesDir,
    "tailwind-merge/dist/bundle-mjs.mjs",
  );
  const moduleId = `/@fs${modulePath}`;

  return `
import {
  extendTailwindMerge as baseExtendTailwindMerge,
  fromTheme,
  validators,
} from ${JSON.stringify(moduleId)};
export * from ${JSON.stringify(moduleId)};

const isArbitraryNumericFontWeight = (value) =>
  /^\\[(?:[1-9]\\d{0,2}|1000|var\\(--[\\w-]*weight[\\w-]*\\))\\]$/i.test(value);

export const twMerge = baseExtendTailwindMerge({
  override: {
    classGroups: {
      "font-weight": [
        {
          font: [
            fromTheme("font-weight"),
            validators.isArbitraryVariableWeight,
            isArbitraryNumericFontWeight,
          ],
        },
      ],
    },
  },
});
`;
}

function invalidatePreviewModules(vite: ViteServer, artifactId: string) {
  const moduleIds = [
    `${resolvedVirtualEntryPrefix}${artifactId}`,
    `${resolvedVirtualArtifactPrefix}${artifactId}.jsx`,
  ];

  for (const moduleId of moduleIds) {
    const module = vite.moduleGraph.getModuleById(moduleId);

    if (module) {
      vite.moduleGraph.invalidateModule(module);
    }
  }
}

async function importFromReactNodeModules<T>(specifier: string) {
  const moduleUrl = pathToFileURL(resolve(reactNodeModulesDir, specifier)).href;
  return import(moduleUrl) as Promise<T>;
}

function isRelativeImport(value: string) {
  return (
    value.startsWith("./") ||
    value.startsWith("../") ||
    value === "." ||
    value === ".."
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function normalizeEscapedNewlinesInJsxAttributes(source: string) {
  return source.replace(
    /(\s[\w:-]+)=("([^"\\]*(?:\\.[^"\\]*)*)")/g,
    (match, attributeName: string, _quotedValue: string, rawValue: string) => {
      if (!rawValue.includes("\\n") && !rawValue.includes("\\r")) {
        return match;
      }

      const normalizedValue = rawValue
        .replaceAll("\\r\\n", "\n")
        .replaceAll("\\n", "\n")
        .replaceAll("\\r", "\n");

      return `${attributeName}={${JSON.stringify(normalizedValue)}}`;
    },
  );
}
