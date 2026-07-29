import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildLineDiff,
  createAutomaticGridRepairDevRunKey,
  discoverAutomaticGridRepairFixtures,
  parseAutomaticGridRepairDevArgs,
  renderDevelopmentReportHtml,
  selectDevelopmentReportViewport,
} from "../app/automaticGridRepairDevCli.ts";

test("invalidates the development run key when source content changes", () => {
  const first = createAutomaticGridRepairDevRunKey({
    source: "export default function App() { return <div>first</div>; }",
    viewports: ["mobile", "desktop"],
  });
  const unchanged = createAutomaticGridRepairDevRunKey({
    source: "export default function App() { return <div>first</div>; }",
    viewports: ["desktop", "mobile"],
  });
  const changed = createAutomaticGridRepairDevRunKey({
    source: "export default function App() { return <div>second</div>; }",
    viewports: ["desktop", "mobile"],
  });

  assert.equal(first, unchanged);
  assert.notEqual(first, changed);
});

test("discovers JSX and TSX fixtures directly from a directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "auto-repair-fixtures-"));
  try {
    await writeFile(join(directory, "alpha.jsx"), "export default 1;", "utf8");
    await writeFile(join(directory, "beta.tsx"), "export default 2;", "utf8");
    await writeFile(join(directory, "README.md"), "ignored", "utf8");
    await mkdir(join(directory, "nested"));
    assert.deepEqual(discoverAutomaticGridRepairFixtures(directory), [
      { name: "alpha", fileName: "alpha.jsx" },
      { name: "beta", fileName: "beta.tsx" },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("parses an isolated fixture development run", () => {
  const options = parseAutomaticGridRepairDevArgs([
    "--fixture",
    "in-place-span-overflow",
    "--viewports",
    "mobile",
  ]);
  assert.equal(options.fixture, "in-place-span-overflow");
  assert.deepEqual(options.viewports, ["mobile"]);
  assert.match(options.outputDirectory, /auto-repair-dev\/latest$/);
  assert.equal(
    discoverAutomaticGridRepairFixtures().some(
      (fixture) => fixture.name === "real-artfact",
    ),
    true,
  );
  assert.throws(
    () =>
      parseAutomaticGridRepairDevArgs([
        "--fixture",
        "../automaticGridRepairDevCli",
      ]),
    /Unknown fixture/,
  );
});

test("selects the viewport that was actually committed for report screenshots", () => {
  const viewport = selectDevelopmentReportViewport({
    decisions: [
      {
        type: "candidate_committed",
        viewport: "tablet",
        kind: "expand-tool-span-in-place",
      },
    ],
    applied: [{ viewport: "tablet" }],
    beforeInspection: {
      viewports: {
        desktop: {
          layout: { ok: true },
          runtime: { ok: true },
          screenshotDataUrl: "desktop",
        },
        tablet: {
          layout: { ok: false },
          runtime: { ok: true },
          screenshotDataUrl: "tablet",
        },
        mobile: {
          layout: { ok: true },
          runtime: { ok: true },
          screenshotDataUrl: "mobile",
        },
      },
    },
  });
  assert.equal(viewport, "tablet");
});

test("requires exactly one development input", () => {
  assert.throws(() => parseAutomaticGridRepairDevArgs([]), /exactly one/);
  assert.throws(
    () =>
      parseAutomaticGridRepairDevArgs([
        "--fixture",
        "vertical-overflow",
        "--path",
        "/workspace/output/page.jsx",
      ]),
    /exactly one/,
  );
});

test("renders escaped JSX and a readable line diff", () => {
  const diff = buildLineDiff("<Text rowEnd={4} />", "<Text rowEnd={5} />");
  assert.match(diff, /- <Text rowEnd=\{4\}/);
  assert.match(diff, /\+ <Text rowEnd=\{5\}/);
  const html = renderDevelopmentReportHtml({
    sourceLabel: "fixture<script>",
    status: "repaired",
    ok: true,
    originalSource: "<Text />",
    repairedSource: "<Text rowEnd={5} />",
    diff,
    decisions: [{ type: "candidate_verify", estimatedCost: 1 }],
    screenshotViewport: "tablet",
  });
  assert.doesNotMatch(html, /fixture<script>/);
  assert.match(html, /fixture&lt;script&gt;/);
  assert.match(html, /cost=1/);
  assert.match(html, /浏览器截图（tablet）/);
});
