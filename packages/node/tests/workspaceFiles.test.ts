import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  listWorkspaceJsxFiles,
  loadWorkspacePage,
} from "../app/workspaceFiles.ts";

test("listWorkspaceJsxFiles recursively returns sorted JSX files", async (t) => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "workspace-files-"));
  t.after(() => rm(workspaceDir, { recursive: true, force: true }));

  await mkdir(join(workspaceDir, "nested"));
  await Promise.all([
    writeFile(join(workspaceDir, "z.jsx"), ""),
    writeFile(join(workspaceDir, "nested", "a.jsx"), ""),
    writeFile(join(workspaceDir, "ignored.tsx"), ""),
  ]);

  assert.deepEqual(await listWorkspaceJsxFiles(workspaceDir), [
    { path: "nested/a.jsx", name: "a.jsx" },
    { path: "z.jsx", name: "z.jsx" },
  ]);
});

test("loadWorkspacePage converts JSX into a validated PageDocument", async (t) => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "workspace-page-"));
  t.after(() => rm(workspaceDir, { recursive: true, force: true }));
  await writeFile(
    join(workspaceDir, "page.jsx"),
    `
      export default function Page() {
        return (
          <Root id="loaded-page">
            <Section id="hero" columns={12} rows={4} height={320}>
              <Text id="headline" content="Loaded" className="row-start-1 row-end-2 col-start-1 col-end-7" />
            </Section>
          </Root>
        );
      }
    `,
  );

  const result = await loadWorkspacePage({
    filePath: "page.jsx",
    workspaceDir,
    previousPage: {
      id: "previous-page",
      title: "Previous",
      version: 1,
      viewport: "desktop",
      sections: [],
    },
  });

  assert.equal(result.page.id, "loaded-page");
  assert.equal(result.page.sections[0]?.id, "hero");
  assert.equal(result.page.sections[0]?.tools[0]?.id, "headline");
  assert.equal(result.page.sections[0]?.tools[0]?.type, "text");
});
