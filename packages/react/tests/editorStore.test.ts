import assert from "node:assert/strict";
import test from "node:test";
import { editorStore } from "../src/editor/editorStore.ts";
import {
  createInitialPageDocument,
  createSection,
  createTool,
  defaultToolClassNames,
} from "../src/editor/pageDocument.ts";
import { createInitialSite } from "../src/editor/siteDocument.ts";

function siteFixture() {
  const home = createInitialPageDocument();
  home.id = "home";
  home.title = "Home";
  home.sections = [{ ...createSection(1), id: "home_section" }];
  const site = createInitialSite(home);
  site.id = "site_test";
  site.pages.push({
    id: "about",
    route: "/about",
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
    aiOpen: false,
    aiSelection: [],
    pageStatuses: {},
    pageTodos: {},
    pageEvents: {},
    shellStatus: undefined,
    siteStatus: undefined,
    past: [],
    future: [],
  });
  return site;
}

test("creates an initial page with one empty Section", () => {
  const page = createInitialPageDocument();

  assert.equal(page.sections.length, 1);
  assert.deepEqual(page.sections[0]?.tools, []);
});

test("creates tools from the centralized default style map", () => {
  const section = createSection(1);
  const classNamesTypes = [
    "accordion",
    "avatar",
    "card",
    "carousel",
    "contact",
    "input",
    "list",
    "navbar",
    "newsletter",
    "social",
    "tabs",
  ] as const;

  for (const type of classNamesTypes) {
    assert.strictEqual(
      createTool(type, section).props.classNames,
      defaultToolClassNames[type],
    );
  }

  assert.equal(
    createTool("badge", section).props.className,
    defaultToolClassNames.badge.badge,
  );
  assert.equal(
    createTool("button", section).props.className,
    defaultToolClassNames.button.button,
  );
  assert.equal(
    createTool("divider", section).props.className,
    defaultToolClassNames.divider.divider,
  );
  assert.equal(
    createTool("image", section).props.className,
    defaultToolClassNames.image.image,
  );
  assert.equal(
    createTool("icon", section).props.className,
    defaultToolClassNames.icon.icon,
  );
  assert.equal(
    createTool("text", section).props.className,
    defaultToolClassNames.text.text,
  );
});

test("starts with shared Header and Footer sources mounted", () => {
  const page = createInitialPageDocument();
  const site = createInitialSite(page);

  assert.equal(site.sharedShell.header.mounted, true);
  assert.equal(site.sharedShell.footer.mounted, true);
  assert.equal(site.sharedShell.header.sections.length, 1);
  assert.equal(site.sharedShell.footer.sections.length, 1);
  assert.deepEqual(site.sharedShell.header.sections[0]?.tools, []);
  assert.deepEqual(site.sharedShell.footer.sections[0]?.tools, []);
});

test("mounts and unmounts shared regions without losing their sources", () => {
  reset();
  const originalFooter = structuredClone(editorStore.getState().site.sharedShell.footer.sections);
  const originalHeader = structuredClone(editorStore.getState().site.sharedShell.header.sections);

  editorStore.getState().setSharedRegionMounted("footer", false);
  assert.equal(editorStore.getState().site.sharedShell.footer.mounted, false);
  assert.deepEqual(editorStore.getState().site.sharedShell.footer.sections, originalFooter);

  editorStore.getState().setSharedRegionMounted("footer", true);
  assert.equal(editorStore.getState().site.sharedShell.footer.mounted, true);
  assert.equal(editorStore.getState().site.sharedShell.footer.sections.length, 1);
  assert.deepEqual(editorStore.getState().site.sharedShell.footer.sections, originalFooter);

  editorStore.getState().setSharedRegionMounted("header", false);
  assert.equal(editorStore.getState().site.sharedShell.header.mounted, false);
  assert.deepEqual(editorStore.getState().site.sharedShell.header.sections, originalHeader);

  editorStore.getState().setSharedRegionMounted("header", true);
  assert.equal(editorStore.getState().site.sharedShell.header.mounted, true);
  assert.deepEqual(
    editorStore.getState().site.sharedShell.header.sections[0]?.tools,
    [],
  );
});

test("keeps a home route during local page changes", () => {
  reset();
  assert.throws(() => editorStore.getState().removePage("home"), /home page|home/i);
  assert.throws(() => editorStore.getState().updatePageMetadata("home", { route: "/welcome" }), /home page|home/i);
  assert.equal(editorStore.getState().site.pages.find((page) => page.id === "home")?.route, "/");
});

test("selects multiple Tools only while AI Editor is open", () => {
  reset();
  const section = editorStore.getState().site.pages[0]!.body.sections[0]!;
  editorStore.getState().addTool("badge", section.id);
  const firstToolId = editorStore
    .getState()
    .site.pages[0]!.body.sections[0]!.tools.at(-1)!.id;
  editorStore.getState().addTool("text", section.id);
  const secondToolId = editorStore
    .getState()
    .site.pages[0]!.body.sections[0]!.tools.at(-1)!.id;

  editorStore.getState().selectTool(firstToolId);
  editorStore.getState().selectTool(secondToolId);
  assert.deepEqual(editorStore.getState().aiSelection, []);
  assert.equal(
    "toolId" in editorStore.getState().selection
      ? editorStore.getState().selection.toolId
      : undefined,
    secondToolId,
  );

  editorStore.getState().setAiOpen(true);
  editorStore.getState().selectTool(firstToolId);
  assert.deepEqual(editorStore.getState().aiSelection, [
    { kind: "tool", sectionId: section.id, toolId: secondToolId },
    { kind: "tool", sectionId: section.id, toolId: firstToolId },
  ]);

  editorStore.getState().setAiOpen(false);
  assert.deepEqual(editorStore.getState().aiSelection, []);
});

test("toggles multiple Sections while AI Editor is open", () => {
  reset();
  editorStore.getState().addSection();
  const sections = editorStore.getState().site.pages[0]!.body.sections;

  editorStore.getState().setAiOpen(true);
  editorStore.getState().selectSection(sections[0]!.id);
  assert.deepEqual(editorStore.getState().aiSelection, [
    { kind: "section", sectionId: sections[1]!.id },
    { kind: "section", sectionId: sections[0]!.id },
  ]);

  editorStore.getState().selectSection(sections[1]!.id);
  assert.deepEqual(editorStore.getState().aiSelection, [
    { kind: "section", sectionId: sections[0]!.id },
  ]);
});

test("adds Navbar only to Header and allows removing it", () => {
  reset();
  editorStore.getState().addTool("navbar", "home_section");
  editorStore.getState().addTool("navbar", "site_footer_section");
  assert.equal(editorStore.getState().site.pages[0]!.body.sections[0]!.tools.length, 0);
  assert.equal(editorStore.getState().site.sharedShell.footer.sections[0]!.tools.length, 0);

  editorStore.getState().addTool("navbar", "site_header_section");
  const navbar = editorStore.getState().site.sharedShell.header.sections[0]!.tools[0];
  assert.equal(navbar?.type, "navbar");
  assert.deepEqual(navbar?.siteBinding, { kind: "site-navigation" });

  editorStore.getState().addTool("navbar", "site_header_section");
  assert.equal(editorStore.getState().site.sharedShell.header.sections[0]!.tools.length, 1);

  editorStore.getState().removeTool(navbar!.id);
  assert.equal(
    editorStore.getState().site.sharedShell.header.sections[0]!.tools.length,
    0,
  );
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

test("removes an additional Header Section containing Navbar", () => {
  reset();
  editorStore.getState().addSection("site_header_section");
  const addedSection = editorStore.getState().site.sharedShell.header.sections[1]!;
  editorStore.getState().addTool("navbar", addedSection.id);
  editorStore.getState().removeSection(addedSection.id);

  assert.equal(editorStore.getState().site.sharedShell.header.sections.length, 1);
  assert.deepEqual(editorStore.getState().site.sharedShell.header.sections[0]?.tools, []);
});

test("keeps at least one source Section in every shared region", () => {
  reset();
  assert.throws(
    () => editorStore.getState().removeSection("site_footer_section"),
    /at least one source Section/,
  );
  assert.equal(editorStore.getState().site.sharedShell.footer.sections.length, 1);
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
  assert.equal(editorStore.getState().site.pages[0]?.body.title, "Home");
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

test("adds, selects, updates, reorders, and duplicates all Overlay types", () => {
  reset();
  const ids = (["dialog", "alert-dialog", "toast", "drawer"] as const).map(
    (type) => editorStore.getState().addOverlay(type),
  );
  const state = editorStore.getState();
  assert.deepEqual(state.site.pages[0]!.body.overlays?.map((overlay) => overlay.type), [
    "dialog",
    "alert-dialog",
    "toast",
    "drawer",
  ]);
  assert.deepEqual(state.selection, {
    kind: "overlay",
    pageId: "home",
    overlayId: ids[3],
  });

  editorStore.getState().updateOverlay(ids[0]!, {
    name: "Welcome dialog",
    props: { title: "Welcome" },
  });
  assert.equal(editorStore.getState().site.pages[0]!.body.overlays?.[0]?.name, "Welcome dialog");
  assert.equal(editorStore.getState().site.pages[0]!.body.overlays?.[0]?.props.title, "Welcome");

  editorStore.getState().reorderOverlays(ids.toReversed());
  assert.deepEqual(editorStore.getState().site.pages[0]!.body.overlays?.map((overlay) => overlay.id), ids.toReversed());

  const duplicateId = editorStore.getState().duplicateOverlay(ids[0]!);
  const duplicate = editorStore.getState().site.pages[0]!.body.overlays?.find((overlay) => overlay.id === duplicateId);
  assert.ok(duplicateId && duplicate);
  assert.equal(duplicate.name, "Welcome dialog copy");
});

test("creates and binds an Overlay in one history entry and restores it with undo/redo", () => {
  reset();
  editorStore.getState().addTool("button", "home_section");
  const button = editorStore.getState().site.pages[0]!.body.sections[0]!.tools[0]!;
  const overlayId = editorStore.getState().addOverlay("dialog", button.id);

  assert.deepEqual(
    editorStore.getState().site.pages[0]!.body.sections[0]!.tools[0]!.props.action,
    { type: "overlay", targetId: overlayId },
  );
  assert.equal(editorStore.getState().past.length, 2);

  editorStore.getState().undo();
  assert.deepEqual(editorStore.getState().site.pages[0]!.body.overlays, []);
  assert.equal(editorStore.getState().site.pages[0]!.body.sections[0]!.tools[0]!.props.action, undefined);

  editorStore.getState().redo();
  assert.equal(editorStore.getState().site.pages[0]!.body.overlays?.[0]?.id, overlayId);
});

test("removes an Overlay and clears every Button binding atomically", () => {
  reset();
  editorStore.getState().addTool("button", "home_section");
  const firstButton = editorStore.getState().site.pages[0]!.body.sections[0]!.tools[0]!;
  const overlayId = editorStore.getState().addOverlay("drawer", firstButton.id);
  editorStore.getState().addTool("button", "home_section");
  const secondButton = editorStore.getState().site.pages[0]!.body.sections[0]!.tools[1]!;
  editorStore.getState().updateTool(secondButton.id, {
    props: { ...secondButton.props, action: { type: "overlay", targetId: overlayId } },
  });

  const references = editorStore.getState().removeOverlay(overlayId);
  assert.deepEqual(references.map((tool) => tool.id), [firstButton.id, secondButton.id]);
  assert.equal(editorStore.getState().site.pages[0]!.body.overlays?.length, 0);
  assert.deepEqual(
    editorStore.getState().site.pages[0]!.body.sections[0]!.tools.map((tool) => tool.props.action),
    [{ type: "none" }, { type: "none" }],
  );
});

test("clears Overlay selection when switching pages", () => {
  reset();
  const overlayId = editorStore.getState().addOverlay("toast");
  editorStore.getState().selectOverlay(overlayId, "toast");
  editorStore.getState().setCurrentPage("about");
  assert.deepEqual(editorStore.getState().selection, { kind: "page", pageId: "about" });
});

test("duplicates a page with closed internal Overlay references", () => {
  reset();
  editorStore.getState().addTool("button", "home_section");
  const sourceButton = editorStore.getState().site.pages[0]!.body.sections[0]!.tools[0]!;
  const sourceOverlayId = editorStore.getState().addOverlay("alert-dialog", sourceButton.id);
  const duplicatePageId = editorStore.getState().duplicatePage("home");
  const duplicate = editorStore.getState().site.pages.find((entry) => entry.id === duplicatePageId)!;
  const duplicateButton = duplicate.body.sections[0]!.tools[0]!;
  const duplicateOverlay = duplicate.body.overlays![0]!;

  assert.notEqual(duplicate.id, "home");
  assert.notEqual(duplicateButton.id, sourceButton.id);
  assert.notEqual(duplicateOverlay.id, sourceOverlayId);
  assert.deepEqual(duplicateButton.props.action, {
    type: "overlay",
    targetId: duplicateOverlay.id,
  });
});

test("stores page Agent output as separate batch and page events", () => {
  reset();
  const store = editorStore.getState();
  store.appendPageEvent("batch", "home", "\n\n正在优化移动端。\n");
  store.appendPageEvent("batch", "home", "\n\n正在检查内容间距。\n\n");
  store.appendPageEvent("batch", "about", "正在生成 About 页面。");

  assert.deepEqual(editorStore.getState().aiMessages, []);
  assert.deepEqual(editorStore.getState().pageEvents, {
    batch: {
      home: [
        { id: "batch-home-0", text: "正在优化移动端。" },
        { id: "batch-home-1", text: "正在检查内容间距。" },
      ],
      about: [
        { id: "batch-about-0", text: "正在生成 About 页面。" },
      ],
    },
  });
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
