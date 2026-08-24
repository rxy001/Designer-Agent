import assert from "node:assert/strict";
import test from "node:test";
import { artifactPathForPageId } from "@designer-agent/site-contract";
import { editorStore } from "../src/editor/editorStore.ts";
import { createInitialPageDocument, createSection } from "../src/editor/pageDocument.ts";
import { createInitialSite } from "../src/editor/siteDocument.ts";

function siteFixture() {
  const home = createInitialPageDocument();
  home.id = "home";
  home.title = "Home";
  home.sections = [{ ...createSection(1), id: "home_section" }];
  const site = createInitialSite(home);
  site.id = "site_test";
  site.sharedShell.header.sections[0]!.tools[0]!.id = "server_generated_navbar_uuid";
  site.pages.push({
    id: "about",
    title: "About",
    route: "/about",
    artifactPath: artifactPathForPageId("about"),
    order: 1,
    body: { id: "about", title: "About", version: 0, viewport: "desktop", sections: [{ ...createSection(1), id: "about_section" }] },
  });
  return site;
}

function reset() {
  const site = siteFixture();
  editorStore.setState({
    site,
    currentPageId: "home",
    selection: { kind: "page", pageId: "home" },
    siteLock: undefined,
    pendingPlan: undefined,
    pendingReducedPlan: undefined,
    pendingBundle: undefined,
    pendingSite: undefined,
    pendingRequestId: undefined,
    aiMessages: [],
    pageStatuses: {},
    pageTodos: {},
    shellStatus: undefined,
    siteStatus: undefined,
    past: [],
    future: [],
  });
  return site;
}

test("keeps a home route during local page changes", () => {
  reset();
  assert.throws(() => editorStore.getState().removePage("home"), /home page|home/i);
  assert.throws(() => editorStore.getState().updatePageMetadata("home", { route: "/welcome" }), /home page|home/i);
  assert.equal(editorStore.getState().site.pages.find((page) => page.id === "home")?.route, "/");
});

test("protects the bound Navbar regardless of its generated id", () => {
  reset();
  assert.throws(
    () => editorStore.getState().removeTool("server_generated_navbar_uuid"),
    /Navbar cannot be removed/,
  );
  assert.equal(editorStore.getState().site.sharedShell.header.sections[0]!.tools.length, 1);
});

test("removes a selected body Section and selects its page", () => {
  reset();
  editorStore.getState().addSection();
  const selection = editorStore.getState().selection;
  assert.ok("sectionId" in selection && selection.sectionId);

  editorStore.getState().removeSection(selection.sectionId);

  const state = editorStore.getState();
  assert.equal(state.site.pages[0]!.body.sections.length, 1);
  assert.deepEqual(state.selection, { kind: "page", pageId: "home" });
});

test("keeps at least one Section in every page body", () => {
  reset();
  assert.throws(
    () => editorStore.getState().removeSection("home_section"),
    /at least one Section/,
  );
  assert.equal(editorStore.getState().site.pages[0]!.body.sections.length, 1);
  assert.throws(
    () =>
      editorStore
        .getState()
        .applyPatch([{ op: "removeSection", sectionId: "home_section" }]),
    /at least one Section/,
  );
});

test("creates and selects a default Section for a new page", () => {
  reset();
  editorStore.getState().addPage();

  const state = editorStore.getState();
  const page = state.site.pages.find(
    (entry) => entry.id === state.currentPageId,
  );
  assert.equal(page?.body.sections.length, 1);
  assert.deepEqual(state.selection, {
    kind: "page-body",
    pageId: page?.id,
    sectionId: page?.body.sections[0]?.id,
  });
});

test("protects the Section containing the bound Navbar", () => {
  reset();
  assert.throws(
    () => editorStore.getState().removeSection("site_header_section"),
    /Navbar cannot be removed/,
  );
  assert.equal(editorStore.getState().site.sharedShell.header.sections.length, 1);
});

test("rejects invalid navigation targets before storing them", () => {
  const site = reset();
  assert.throws(
    () => editorStore.getState().updateNavigation({
      ...site.navigation,
      items: [{ id: "missing", label: "Missing", targetPageId: "missing" }],
    }),
    /missing page/,
  );
});

test("allows selecting the whole Site as the AI target", () => {
  reset();
  editorStore.getState().selectSite();
  assert.deepEqual(editorStore.getState().selection, { kind: "site" });
});

test("selects the whole Site when initializing a pristine creation document", () => {
  const home = createInitialPageDocument();
  home.id = "pristine_home";
  home.version = 0;
  home.sections = [];
  const pristine = createInitialSite(home);
  editorStore.setState({
    ...editorStore.getState(),
    siteLock: undefined,
    pendingRequestId: undefined,
    past: [],
  });
  editorStore.getState().initializeSite(pristine);
  assert.deepEqual(editorStore.getState().selection, { kind: "site" });
  assert.equal(editorStore.getState().site.pages[0]!.body.sections.length, 1);
});

test("blocks document edits while an AI request is active", () => {
  reset();
  editorStore.getState().setPendingRequestId("request_1");

  assert.throws(() => editorStore.getState().addPage(), /read-only/i);
  assert.throws(() => editorStore.getState().addSection(), /read-only/i);
  assert.throws(() => editorStore.getState().addTool("text"), /read-only/i);
  assert.throws(
    () => editorStore.getState().updatePageMetadata("home", { title: "Changed" }),
    /read-only/i,
  );
  assert.throws(() => editorStore.getState().removePage("about"), /read-only/i);
  assert.throws(
    () => editorStore.getState().removeSection("site_footer_section"),
    /read-only/i,
  );
  assert.equal(editorStore.getState().site.pages.length, 2);
  assert.equal(editorStore.getState().site.pages[0]?.title, "Home");
});

test("keeps navigation and viewing controls available while AI is active", () => {
  reset();
  editorStore.getState().setPendingRequestId("request_1");
  editorStore.getState().setCurrentPage("about");
  editorStore.getState().setViewport("mobile");
  editorStore.getState().setZoom(80);
  editorStore.getState().setAiOpen(true);

  const state = editorStore.getState();
  assert.equal(state.currentPageId, "about");
  assert.equal(state.viewport, "mobile");
  assert.equal(state.site.pages.find((page) => page.id === "about")?.body.viewport, "desktop");
  assert.equal(state.zoom, 80);
  assert.equal(state.aiOpen, true);
});

test("keeps the current viewport when switching pages", () => {
  const site = reset();
  site.pages.find((page) => page.id === "about")!.body.viewport = "mobile";
  editorStore.setState({ site, viewport: "tablet" });

  editorStore.getState().setCurrentPage("about");

  const state = editorStore.getState();
  assert.equal(state.currentPageId, "about");
  assert.equal(state.viewport, "tablet");
  assert.equal(
    state.site.pages.find((page) => page.id === "about")?.body.viewport,
    "mobile",
  );
});

test("treats viewport changes as session state instead of page content", () => {
  reset();

  editorStore.getState().setViewport("mobile");
  editorStore.getState().addPage();

  const state = editorStore.getState();
  assert.equal(state.viewport, "mobile");
  assert.ok(state.site.pages.every((page) => page.body.viewport === "desktop"));
});

test("does not change the current viewport during undo and redo", () => {
  reset();
  editorStore.getState().addSection();
  editorStore.getState().setViewport("tablet");

  editorStore.getState().undo();
  assert.equal(editorStore.getState().viewport, "tablet");

  editorStore.getState().setViewport("mobile");
  editorStore.getState().redo();
  assert.equal(editorStore.getState().viewport, "mobile");
});

test("merges page Agent output without leading blank lines", () => {
  reset();
  const store = editorStore.getState();
  store.appendPageAssistantText("page-batch-home", "\n\n正在优化移动端。\n");
  store.appendPageAssistantText("page-batch-home", "\n\n正在检查内容间距。\n\n");

  assert.deepEqual(editorStore.getState().aiMessages, [
    {
      id: "page-batch-home",
      role: "assistant",
      text: "正在优化移动端。 正在检查内容间距。",
    },
  ]);
});

test("opens a selected workspace Site and resets local editor history", () => {
  reset();
  editorStore.getState().addSection();
  const selected = siteFixture();
  selected.id = "another_site";
  selected.title = "Another Site";

  editorStore.getState().openWorkspaceSite(selected);

  const state = editorStore.getState();
  assert.equal(state.site.id, "another_site");
  assert.equal(state.currentPageId, "home");
  assert.deepEqual(state.past, []);
  assert.deepEqual(state.future, []);
});
