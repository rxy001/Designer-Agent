import assert from "node:assert/strict";
import test from "node:test";
import { getPreviewArtifact } from "../app/previewRegistry.ts";
import {
  SitePreviewRegistry,
  sitePreviewPath,
} from "../app/site/sitePreviewRegistry.ts";
import { body, siteFixture } from "./siteV2Fixtures.ts";

test("registers every Site route in one preview session", async () => {
  const site = siteFixture();
  site.navigation.items.push({
    id: "nav_about",
    label: "About",
    targetPageId: "about",
  });
  site.pages.push({
    id: "about",
    route: "/about",
    body: body("about"),
  });
  site.pages[0]!.body.sections[0]!.tools.push(
    {
      id: "about_cta",
      type: "button",
      name: "About CTA",
      layout: {
        gridArea: { rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 4 },
        zIndex: 1,
      },
      props: { label: "About", href: "/about?ref=hero#details" },
    },
    {
      id: "external_cta",
      type: "button",
      name: "External CTA",
      layout: {
        gridArea: { rowStart: 1, columnStart: 4, rowEnd: 2, columnEnd: 7 },
        zIndex: 1,
      },
      props: { label: "External", href: "https://example.com/about" },
    },
  );
  const registry = new SitePreviewRegistry();

  const preview = await registry.create({ site, currentPageId: "home" });
  const homeArtifactId = registry.getArtifactId(preview.sessionId, "/");
  const aboutArtifactId = registry.getArtifactId(preview.sessionId, "/about");

  assert.equal(preview.route, sitePreviewPath(preview.sessionId, "/"));
  assert.ok(homeArtifactId);
  assert.ok(aboutArtifactId);
  assert.notEqual(homeArtifactId, aboutArtifactId);
  const homeSource = getPreviewArtifact(homeArtifactId)?.source ?? "";
  assert.match(
    homeSource,
    new RegExp(`${sitePreviewPath(preview.sessionId, "/about").replaceAll("/", "\\/")}`),
  );
  assert.match(homeSource, /active: true/);
  assert.equal(
    homeSource.includes(
      `href="${sitePreviewPath(preview.sessionId, "/about")}?ref=hero#details"`,
    ),
    true,
  );
  assert.match(homeSource, /href="https:\/\/example\.com\/about"/);
  assert.equal(registry.getArtifactId(preview.sessionId, "/missing"), undefined);
});

test("expires old Site preview sessions", async () => {
  let now = 1_000;
  const registry = new SitePreviewRegistry({
    now: () => now,
    sessionTtlMs: 100,
  });
  const preview = await registry.create({
    site: siteFixture(),
    currentPageId: "home",
  });

  now = 1_101;
  assert.equal(registry.getArtifactId(preview.sessionId, "/"), undefined);
});
