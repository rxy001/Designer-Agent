import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { isPristineSiteDocument, validateSiteDocument } from "@designer-agent/site-contract";
import {
  createInitialPageDocument,
  createOverlay,
  createSection,
  createTool,
  findOverlayTriggers,
  findSection,
} from "./pageDocument";
import { applyPagePatch } from "./pagePatch";
import {
  applySitePatch,
  composeSitePage,
  createInitialSite,
  getComposedSectionOwner,
  requireSitePage,
  siteDigest,
} from "./siteDocument";
import type {
  AiMessage,
  AiPageEvent,
  AiTodo,
  AiEditorSelection,
  EditorSelection,
  PageDocument,
  PagePatch,
  OverlayNode,
  PublicSitePlan,
  SiteDocument,
  SitePatchBundle,
  ToolNode,
  Viewport,
} from "./types";

type HistorySnapshot = {
  site: SiteDocument;
  currentPageId: string;
  selection: EditorSelection;
};

type HistoryEntry = { before: HistorySnapshot; after: HistorySnapshot };

export class SiteLockedError extends Error {
  constructor() {
    super("The site is read-only while generation is in progress.");
    this.name = "SiteLockedError";
  }
}

export type EditorStore = {
  site: SiteDocument;
  currentPageId: string;
  selection: EditorSelection;
  siteLock?: { batchId: string; leaseId: string; state: "locked" | "disconnect_grace" };
  pendingPlan?: PublicSitePlan;
  pendingReducedPlan?: { batchId: string; plan: PublicSitePlan; expiresAt: number };
  pendingBundle?: SitePatchBundle;
  pendingSite?: SiteDocument;
  viewport: Viewport;
  zoom: number;
  aiOpen: boolean;
  aiSelection: AiEditorSelection[];
  aiMessages: AiMessage[];
  pendingRequestId?: string;
  previewURL?: string;
  workspaceFilePath?: string;
  designSystemId: number;
  pageStatuses: Record<string, string>;
  pageTodos: Record<string, AiTodo[]>;
  pageEvents: Record<string, Record<string, AiPageEvent[]>>;
  shellStatus?: string;
  siteStatus?: string;
  past: HistoryEntry[];
  future: HistoryEntry[];
  initializeSite: (site: SiteDocument) => void;
  openWorkspaceSite: (site: SiteDocument) => void;
  setCurrentPage: (pageId: string) => void;
  addPage: () => void;
  duplicatePage: (pageId: string) => string | undefined;
  removePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  updatePageMetadata: (pageId: string, changes: { title?: string; route?: string }) => void;
  updateNavigation: (navigation: SiteDocument["navigation"]) => void;
  selectSite: () => void;
  selectPage: () => void;
  selectSharedRegion: (region: "header" | "footer") => void;
  setSharedRegionMounted: (region: "header" | "footer", mounted: boolean) => void;
  selectSection: (sectionId: string) => void;
  selectTool: (toolId?: string) => void;
  selectOverlay: (overlayId: string, slot?: string) => void;
  setViewport: (viewport: Viewport) => void;
  setZoom: (zoom: number) => void;
  setAiOpen: (open: boolean) => void;
  setPreviewURL: (previewURL: string) => void;
  loadWorkspacePage: (path: string, page: PageDocument, previewURL: string) => void;
  setDesignSystemId: (designSystemId: number) => void;
  addAiMessage: (message: AiMessage) => void;
  appendAssistantDelta: (requestId: string, text: string) => void;
  appendPageEvent: (batchId: string, pageId: string, text: string) => void;
  setPendingRequestId: (requestId?: string) => void;
  setPendingPlan: (plan?: PublicSitePlan) => void;
  setPendingReducedPlan: (value?: { batchId: string; plan: PublicSitePlan; expiresAt: number }) => void;
  acquireSiteLock: (batchId: string, leaseId: string) => void;
  setDisconnectGrace: () => void;
  releaseSiteLock: (batchId: string) => void;
  setPageStatus: (pageId: string, status: string) => void;
  setPageTodos: (pageId: string, todos: AiTodo[]) => void;
  setShellStatus: (status?: string) => void;
  setSiteStatus: (status?: string) => void;
  prepareSiteBundle: (bundle: SitePatchBundle, projectedSiteDigest: string) => SiteDocument;
  commitSiteBundle: (batchId: string, bundleDigest: string) => void;
  abortSiteBundle: (batchId: string) => void;
  updateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  updateSection: (sectionId: string, changes: Partial<PageDocument["sections"][number]>) => void;
  addTool: (type: ToolNode["type"], sectionId?: string) => void;
  addSection: (afterSectionId?: string) => void;
  removeTool: (toolId: string) => void;
  removeSection: (sectionId: string) => void;
  addOverlay: (type: OverlayNode["type"], triggerToolId?: string) => string;
  updateOverlay: (overlayId: string, changes: Partial<OverlayNode>) => void;
  removeOverlay: (overlayId: string) => ToolNode[];
  duplicateOverlay: (overlayId: string) => string | undefined;
  reorderOverlays: (overlayIds: string[]) => void;
  applyPatch: (patch: PagePatch) => void;
  undo: () => void;
  redo: () => void;
};

const initialPage = createInitialPageDocument();
initialPage.version = 0;
const initialSite = createInitialSite(initialPage);

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ensurePageBodySection(page: PageDocument): PageDocument {
  if (page.sections.length > 0) return page;

  return {
    ...page,
    sections: [
      {
        ...createSection(1),
        id: createId(`section_${page.id}`),
      },
    ],
  };
}

function ensureSitePageSections(site: SiteDocument): SiteDocument {
  let changed = false;
  const pages = site.pages.map((entry) => {
    const body = ensurePageBodySection(entry.body);
    if (body === entry.body) return entry;
    changed = true;
    return { ...entry, body };
  });

  return changed ? { ...site, pages } : site;
}

function assertSitePageSections(site: SiteDocument) {
  const emptyPage = site.pages.find((entry) => entry.body.sections.length === 0);
  if (emptyPage) {
    throw new Error(`Page ${emptyPage.body.title} must contain at least one Section.`);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function snapshot(state: EditorStore): HistorySnapshot {
  return {
    site: clone(state.site),
    currentPageId: state.currentPageId,
    selection: clone(state.selection),
  };
}

function withHistory(state: EditorStore, changes: Partial<Pick<EditorStore, "site" | "currentPageId" | "selection" | "workspaceFilePath" | "previewURL">>) {
  const before = snapshot(state);
  const after = snapshot({ ...state, ...changes } as EditorStore);
  return { ...changes, past: [...state.past.slice(-49), { before, after }], future: [] };
}

export function assertSiteWritable(
  state: Pick<EditorStore, "siteLock" | "pendingRequestId">,
) {
  if (state.siteLock || state.pendingRequestId) throw new SiteLockedError();
}

function selectedIds(selection: EditorSelection) {
  return "sectionId" in selection
    ? { sectionId: selection.sectionId, toolId: selection.toolId }
    : {};
}

function selectionForSection(
  state: EditorStore,
  sectionId: string,
): EditorSelection {
  const owner = getComposedSectionOwner(
    state.site,
    state.currentPageId,
    sectionId,
  );
  return owner.kind === "page-body"
    ? { ...owner, sectionId }
    : { kind: owner.kind, sectionId };
}

function toggleAiSelection(
  selection: AiEditorSelection[],
  target: AiEditorSelection,
) {
  const index = selection.findIndex((candidate) =>
    target.kind === "tool"
      ? candidate.kind === "tool" && candidate.toolId === target.toolId
      : candidate.kind === "section" &&
        candidate.sectionId === target.sectionId,
  );
  if (index < 0) return [...selection, target];
  return [...selection.slice(0, index), ...selection.slice(index + 1)];
}

function aiSelectionFromEditorSelection(
  selection: EditorSelection,
): AiEditorSelection[] {
  if (!("sectionId" in selection) || !selection.sectionId) return [];
  return selection.toolId
    ? [{ kind: "tool", sectionId: selection.sectionId, toolId: selection.toolId }]
    : [{ kind: "section", sectionId: selection.sectionId }];
}

function updateBody(site: SiteDocument, pageId: string, update: (page: PageDocument) => PageDocument) {
  return {
    ...site,
    pages: site.pages.map((entry) => entry.id === pageId ? { ...entry, body: update(entry.body) } : entry),
  };
}

function updateOwnedPage(
  state: EditorStore,
  sectionId: string,
  update: (page: PageDocument) => PageDocument,
) {
  const owner = getComposedSectionOwner(state.site, state.currentPageId, sectionId);
  if (owner.kind === "page-body") return updateBody(state.site, owner.pageId, update);
  const region = state.site.sharedShell[owner.kind];
  const regionPage: PageDocument = { id: region.id, title: owner.kind, version: region.version, viewport: state.viewport, sections: region.sections };
  const updated = update(regionPage);
  return {
    ...state.site,
    sharedShell: { ...state.site.sharedShell, [owner.kind]: { ...region, sections: updated.sections } },
  };
}

function currentComposedPage(state: EditorStore) {
  return composeSitePage(state.site, state.currentPageId);
}

function normalizeRoute(route: string) {
  const value = route.trim().replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!value || value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "").toLowerCase().replace(/[^a-z0-9/-]+/g, "-")}`;
}

export const editorStore = createStore<EditorStore>()((set, get) => ({
  site: initialSite,
  currentPageId: initialPage.id,
  selection: { kind: "site" },
  viewport: "desktop",
  zoom: 100,
  aiOpen: false,
  aiSelection: [],
  aiMessages: [],
  designSystemId: -1,
  pageStatuses: {},
  pageTodos: {},
  pageEvents: {},
  past: [],
  future: [],
  initializeSite: (site) => set((state) => {
    if (state.siteLock || state.past.length > 0 || state.pendingRequestId) return state;
    const pristine = isPristineSiteDocument(site);
    const nextSite = ensureSitePageSections(site);
    const first = nextSite.pages[0];
    if (!first) return state;
    return {
      site: nextSite,
      currentPageId: first.id,
      selection: pristine ? { kind: "site" } : { kind: "page", pageId: first.id },
      aiSelection: [],
      viewport: first.body.viewport,
      past: [],
      future: [],
    };
  }),
  openWorkspaceSite: (site) => set((state) => {
    assertSiteWritable(state);
    validateSiteDocument(site);
    const nextSite = ensureSitePageSections(site);
    const first = nextSite.pages[0];
    if (!first) return state;
    return {
      site: nextSite,
      currentPageId: first.id,
      selection: { kind: "page", pageId: first.id },
      aiSelection: [],
      viewport: first.body.viewport,
      previewURL: undefined,
      workspaceFilePath: undefined,
      aiMessages: [],
      pageStatuses: {},
      pageTodos: {},
      pageEvents: {},
      shellStatus: undefined,
      siteStatus: undefined,
      past: [],
      future: [],
    };
  }),
  setCurrentPage: (pageId) => set((state) => {
    const page = state.site.pages.find((entry) => entry.id === pageId);
    return page
      ? {
          currentPageId: pageId,
          selection: { kind: "page", pageId },
          aiSelection: [],
        }
      : state;
  }),
  addPage: () => set((state) => {
    assertSiteWritable(state);
    if (state.site.pages.length >= 5) throw new Error("A site can contain at most five pages.");
    const body = createInitialPageDocument();
    body.id = createId("page");
    body.version = 0;
    body.title = `Page ${state.site.pages.length + 1}`;
    const nextBody = ensurePageBodySection(body);
    const route = `/page-${state.site.pages.length + 1}`;
    const site = { ...state.site, pages: [...state.site.pages, { id: nextBody.id, route, body: nextBody }] };
    return withHistory(state, { site, currentPageId: nextBody.id, selection: { kind: "page-body", pageId: nextBody.id, sectionId: nextBody.sections[0]!.id }, workspaceFilePath: undefined, previewURL: undefined });
  }),
  duplicatePage: (pageId) => {
    let duplicateId: string | undefined;
    set((state) => {
      assertSiteWritable(state);
      if (state.site.pages.length >= 5) throw new Error("A site can contain at most five pages.");
      const source = state.site.pages.find((entry) => entry.id === pageId);
      if (!source) return state;
      const body = clonePageWithRemappedIds(source.body);
      duplicateId = body.id;
      const usedRoutes = new Set(state.site.pages.map((entry) => entry.route));
      const route = uniqueCopyRoute(source.route, usedRoutes);
      const sourceIndex = state.site.pages.indexOf(source);
      const pages = [...state.site.pages];
      pages.splice(sourceIndex + 1, 0, { id: body.id, route, body });
      return withHistory(state, {
        site: { ...state.site, pages },
        currentPageId: body.id,
        selection: { kind: "page", pageId: body.id },
        workspaceFilePath: undefined,
        previewURL: undefined,
      });
    });
    return duplicateId;
  },
  removePage: (pageId) => set((state) => {
    assertSiteWritable(state);
    if (state.site.pages.length === 1) throw new Error("The home page cannot be removed.");
    if (state.site.pages.find((page) => page.id === pageId)?.route === "/") throw new Error("Assign another home page before removing the / route.");
    const pages = state.site.pages.filter((page) => page.id !== pageId);
    if (pages.length === state.site.pages.length) return state;
    const fallback = pages[0]!;
    const navigation = {
      ...state.site.navigation,
      brandTargetPageId: state.site.navigation.brandTargetPageId === pageId ? fallback.id : state.site.navigation.brandTargetPageId,
      items: state.site.navigation.items.filter((item) => item.targetPageId !== pageId),
      primaryAction: state.site.navigation.primaryAction?.targetPageId === pageId ? undefined : state.site.navigation.primaryAction,
      secondaryAction: state.site.navigation.secondaryAction?.targetPageId === pageId ? undefined : state.site.navigation.secondaryAction,
    };
    return withHistory(state, { site: { ...state.site, pages, navigation }, currentPageId: state.currentPageId === pageId ? fallback.id : state.currentPageId, selection: { kind: "page", pageId: fallback.id } });
  }),
  reorderPages: (pageIds) => set((state) => {
    assertSiteWritable(state);
    if (pageIds.length !== state.site.pages.length || new Set(pageIds).size !== pageIds.length) throw new Error("Every page must appear once.");
    const byId = new Map(state.site.pages.map((page) => [page.id, page]));
    return withHistory(state, { site: { ...state.site, pages: pageIds.map((id) => requireValue(byId.get(id), `Page ${id} was not found.`)) } });
  }),
  updatePageMetadata: (pageId, changes) => set((state) => {
    assertSiteWritable(state);
    const route = changes.route === undefined ? undefined : normalizeRoute(changes.route);
    const current = state.site.pages.find((page) => page.id === pageId);
    if (current?.route === "/" && route && route !== "/") throw new Error("Assign another home page before changing the / route.");
    if (route && state.site.pages.some((page) => page.id !== pageId && page.route === route)) throw new Error(`Route ${route} already exists.`);
    const site = { ...state.site, pages: state.site.pages.map((page) => page.id === pageId ? { ...page, ...(route ? { route } : {}), body: { ...page.body, ...(changes.title !== undefined ? { title: changes.title } : {}) } } : page) };
    validateSiteDocument(site);
    return withHistory(state, { site });
  }),
  updateNavigation: (navigation) => set((state) => {
    assertSiteWritable(state);
    const site = { ...state.site, navigation };
    validateSiteDocument(site);
    return withHistory(state, { site });
  }),
  selectSite: () => set({ selection: { kind: "site" }, aiSelection: [] }),
  selectPage: () => set((state) => ({ selection: { kind: "page", pageId: state.currentPageId }, aiSelection: [] })),
  selectSharedRegion: (region) => set({ selection: { kind: region }, aiSelection: [] }),
  setSharedRegionMounted: (region, mounted) => set((state) => {
    assertSiteWritable(state);
    const current = state.site.sharedShell[region];
    if (current.mounted === mounted) return state;

    const site = {
      ...state.site,
      sharedShell: {
        ...state.site.sharedShell,
        [region]: {
          ...current,
          mounted,
        },
      },
    };
    validateSiteDocument(site);
    return withHistory(state, {
      site,
      selection:
        !mounted && state.selection.kind === region
          ? { kind: "site" }
          : state.selection,
    });
  }),
  selectSection: (sectionId) => set((state) => {
    const selection = selectionForSection(state, sectionId);
    return {
      selection,
      ...(state.aiOpen
        ? {
            aiSelection: toggleAiSelection(state.aiSelection, {
              kind: "section",
              sectionId,
            }),
          }
        : {}),
    };
  }),
  selectTool: (toolId) => set((state) => {
    if (!toolId) return { selection: { kind: "page", pageId: state.currentPageId }, aiSelection: [] };
    const section = currentComposedPage(state).sections.find((candidate) => candidate.tools.some((tool) => tool.id === toolId));
    if (!section) return state;
    const owner = getComposedSectionOwner(state.site, state.currentPageId, section.id);
    const selection: EditorSelection = owner.kind === "page-body" ? { ...owner, sectionId: section.id, toolId } : { kind: owner.kind, sectionId: section.id, toolId };
    return {
      selection,
      ...(state.aiOpen
        ? {
            aiSelection: toggleAiSelection(state.aiSelection, {
              kind: "tool",
              sectionId: section.id,
              toolId,
            }),
          }
        : {}),
    };
  }),
  selectOverlay: (overlayId, slot) => set((state) => {
    const page = requireSitePage(state.site, state.currentPageId).body;
    return (page.overlays ?? []).some((overlay) => overlay.id === overlayId)
      ? {
          selection: {
            kind: "overlay",
            pageId: state.currentPageId,
            overlayId,
            ...(slot ? { slot } : {}),
          },
          aiSelection: [],
        }
      : state;
  }),
  setViewport: (viewport) => set({ viewport }),
  setZoom: (zoom) => set({ zoom }),
  setAiOpen: (aiOpen) => set((state) => ({
    aiOpen,
    aiSelection: aiOpen
      ? aiSelectionFromEditorSelection(state.selection)
      : [],
  })),
  setPreviewURL: (previewURL) => set({ previewURL }),
  loadWorkspacePage: (path, page, previewURL) => set((state) => {
    assertSiteWritable(state);
    const entry = requireSitePage(state.site, state.currentPageId);
    const body = ensurePageBodySection({ ...page, id: entry.id, sections: page.sections.filter((section) => !section.tools.some((tool) => tool.type === "navbar")) });
    const updated = updateBody(state.site, state.currentPageId, () => body);
    validateSiteDocument(updated);
    return { site: updated, currentPageId: entry.id, selection: { kind: "page", pageId: entry.id }, aiSelection: [], previewURL, workspaceFilePath: path, past: [], future: [] };
  }),
  setDesignSystemId: (designSystemId) => set({ designSystemId }),
  addAiMessage: (message) => set((state) => ({ aiMessages: [...state.aiMessages, message] })),
  appendAssistantDelta: (requestId, text) => set((state) => {
    const last = state.aiMessages.at(-1);
    return last?.role === "assistant" && last.id === requestId
      ? { aiMessages: [...state.aiMessages.slice(0, -1), { ...last, text: `${last.text}${text}` }] }
      : { aiMessages: [...state.aiMessages, { id: requestId, role: "assistant", text }] };
  }),
  appendPageEvent: (batchId, pageId, text) => set((state) => {
    const nextText = text.trim();
    if (!nextText) return state;
    const batchEvents = state.pageEvents[batchId] ?? {};
    const events = batchEvents[pageId] ?? [];
    return {
      pageEvents: {
        ...state.pageEvents,
        [batchId]: {
          ...batchEvents,
          [pageId]: [
            ...events,
            {
              id: `${batchId}-${pageId}-${events.length}`,
              text: nextText,
            },
          ],
        },
      },
    };
  }),
  setPendingRequestId: (pendingRequestId) => set({ pendingRequestId, ...(pendingRequestId ? { shellStatus: undefined, siteStatus: undefined } : {}) }),
  setPendingPlan: (pendingPlan) => set({ pendingPlan }),
  setPendingReducedPlan: (pendingReducedPlan) => set({ pendingReducedPlan }),
  acquireSiteLock: (batchId, leaseId) => set({ siteLock: { batchId, leaseId, state: "locked" } }),
  setDisconnectGrace: () => set((state) => state.siteLock ? { siteLock: { ...state.siteLock, state: "disconnect_grace" } } : state),
  releaseSiteLock: (batchId) => set((state) => state.siteLock?.batchId === batchId ? { siteLock: undefined, pendingRequestId: undefined, pendingPlan: undefined, pendingReducedPlan: undefined, pageStatuses: {}, pageTodos: {}, pageEvents: {}, shellStatus: undefined, siteStatus: undefined } : state),
  setPageStatus: (pageId, status) => set((state) => ({ pageStatuses: { ...state.pageStatuses, [pageId]: status } })),
  setPageTodos: (pageId, todos) => set((state) => ({ pageTodos: { ...state.pageTodos, [pageId]: todos } })),
  setShellStatus: (shellStatus) => set({ shellStatus }),
  setSiteStatus: (siteStatus) => set({ siteStatus }),
  prepareSiteBundle: (bundle, projectedSiteDigest) => {
    const state = get();
    if (!state.siteLock || state.siteLock.batchId !== bundle.batchId) throw new Error("site_lock_mismatch");
    const pendingSite = applySitePatch(state.site, bundle);
    assertSitePageSections(pendingSite);
    if (siteDigest(pendingSite) !== projectedSiteDigest) throw new Error("projected_site_digest_mismatch");
    set({ pendingBundle: bundle, pendingSite });
    return pendingSite;
  },
  commitSiteBundle: (batchId, bundleDigest) => set((state) => {
    if (!state.pendingBundle || !state.pendingSite || state.pendingBundle.batchId !== batchId || state.pendingBundle.bundleDigest !== bundleDigest) {
      throw new Error("site_commit_without_matching_prepare");
    }
    const changes = withHistory(state, { site: state.pendingSite, currentPageId: state.pendingSite.pages.some((page) => page.id === state.currentPageId) ? state.currentPageId : state.pendingSite.pages[0]!.id, selection: { kind: "site" } });
    return { ...changes, pendingBundle: undefined, pendingSite: undefined, siteLock: undefined, pendingRequestId: undefined, pendingPlan: undefined, pageStatuses: {}, pageTodos: {}, pageEvents: {}, shellStatus: undefined, siteStatus: undefined };
  }),
  abortSiteBundle: (batchId) => set((state) => state.siteLock?.batchId === batchId ? { pendingBundle: undefined, pendingSite: undefined, pendingRequestId: undefined, pendingPlan: undefined, pendingReducedPlan: undefined, siteLock: undefined, pageStatuses: {}, pageTodos: {}, pageEvents: {}, shellStatus: undefined, siteStatus: undefined } : state),
  updateTool: (toolId, changes) => set((state) => {
    assertSiteWritable(state);
    const page = currentComposedPage(state);
    const section = page.sections.find((candidate) => candidate.tools.some((tool) => tool.id === toolId));
    if (!section) return state;
    const tool = section.tools.find((candidate) => candidate.id === toolId)!;
    const safeChanges = tool.siteBinding?.kind === "site-navigation" ? stripResolvedNavigationProps(changes) : changes;
    return withHistory(state, { site: updateOwnedPage(state, section.id, (owned) => applyPagePatch(owned, [{ op: "updateTool", toolId, changes: safeChanges }])) });
  }),
  updateSection: (sectionId, changes) => set((state) => { assertSiteWritable(state); return withHistory(state, { site: updateOwnedPage(state, sectionId, (owned) => applyPagePatch(owned, [{ op: "updateSection", sectionId, changes }])) }); }),
  addTool: (type, targetSectionId) => set((state) => {
    assertSiteWritable(state);
    const ids = selectedIds(state.selection);
    const page = currentComposedPage(state);
    const section = findSection(page, targetSectionId ?? ids.sectionId) ?? requireSitePage(state.site, state.currentPageId).body.sections[0];
    if (!section) return state;
    const owner = getComposedSectionOwner(state.site, state.currentPageId, section.id);
    if (
      type === "navbar" &&
      (owner.kind !== "header" ||
        state.site.sharedShell.header.sections.some((candidate) =>
          candidate.tools.some((tool) => tool.type === "navbar"),
        ))
    ) {
      return state;
    }
    const tool = createTool(type, section);
    return withHistory(state, { site: updateOwnedPage(state, section.id, (owned) => applyPagePatch(owned, [{ op: "addTool", sectionId: section.id, tool }])), selection: { kind: owner.kind === "page-body" ? "page-body" : owner.kind, pageId: state.currentPageId, sectionId: section.id, toolId: tool.id } as EditorSelection });
  }),
  addSection: (afterSectionId) => set((state) => {
    assertSiteWritable(state);
    const selectedSectionId = afterSectionId ?? ("sectionId" in state.selection ? state.selection.sectionId : undefined);
    const selectedOwner = selectedSectionId
      ? getComposedSectionOwner(state.site, state.currentPageId, selectedSectionId)
      : undefined;
    const owner = selectedOwner?.kind === "header" || selectedOwner?.kind === "footer"
      ? selectedOwner.kind
      : state.selection.kind === "header" || state.selection.kind === "footer"
        ? state.selection.kind
        : "page-body";
    const sections = owner === "page-body" ? requireSitePage(state.site, state.currentPageId).body.sections : state.site.sharedShell[owner].sections;
    const section = createSection(sections.length + 1);
    const site = owner === "page-body"
      ? updateBody(state.site, state.currentPageId, (page) => applyPagePatch(page, [{ op: "addSection", section, afterSectionId: selectedOwner?.kind === "page-body" ? selectedSectionId : undefined }]))
      : { ...state.site, sharedShell: { ...state.site.sharedShell, [owner]: { ...state.site.sharedShell[owner], sections: selectedSectionId ? applyPagePatch({ id: owner, title: owner, version: 0, viewport: state.viewport, sections }, [{ op: "addSection", section, afterSectionId: selectedSectionId }]).sections : [...sections, section] } } };
    return withHistory(state, { site, selection: owner === "page-body" ? { kind: "page-body", pageId: state.currentPageId, sectionId: section.id } : { kind: owner, sectionId: section.id } });
  }),
  removeTool: (toolId) => set((state) => {
    assertSiteWritable(state);
    const page = currentComposedPage(state);
    const section = page.sections.find((candidate) => candidate.tools.some((tool) => tool.id === toolId));
    if (!section) return state;
    return withHistory(state, { site: updateOwnedPage(state, section.id, (owned) => applyPagePatch(owned, [{ op: "removeTool", toolId }])), selection: { kind: "page", pageId: state.currentPageId } });
  }),
  removeSection: (sectionId) => set((state) => {
    assertSiteWritable(state);
    const section = currentComposedPage(state).sections.find(
      (candidate) => candidate.id === sectionId,
    );
    if (!section) return state;
    const owner = getComposedSectionOwner(
      state.site,
      state.currentPageId,
      sectionId,
    );
    if (
      owner.kind === "page-body" &&
      requireSitePage(state.site, owner.pageId).body.sections.length <= 1
    ) {
      throw new Error("A page must contain at least one Section.");
    }
    if (
      (owner.kind === "header" || owner.kind === "footer") &&
      state.site.sharedShell[owner.kind].sections.length <= 1
    ) {
      throw new Error("A shared region must contain at least one source Section.");
    }
    return withHistory(state, {
      site: updateOwnedPage(state, sectionId, (owned) =>
        applyPagePatch(owned, [{ op: "removeSection", sectionId }]),
      ),
      selection:
        owner.kind === "page-body"
          ? { kind: "page", pageId: state.currentPageId }
          : { kind: owner.kind },
    });
  }),
  addOverlay: (type, triggerToolId) => {
    let overlayId = "";
    set((state) => {
      assertSiteWritable(state);
      const page = requireSitePage(state.site, state.currentPageId).body;
      const overlay = createOverlay(type, (page.overlays ?? []).length + 1);
      overlayId = overlay.id;
      let nextPage = applyPagePatch(page, [{ op: "addOverlay", overlay }]);
      if (triggerToolId) {
        const trigger = findOverlayTriggerCandidate(nextPage, triggerToolId);
        if (!trigger) throw new Error(`Button ${triggerToolId} was not found in the current page.`);
        nextPage = applyPagePatch(nextPage, [{
          op: "updateTool",
          toolId: triggerToolId,
          changes: {
            props: {
              ...trigger.props,
              href: undefined,
              action: { type: "overlay", targetId: overlay.id },
            },
          } as Partial<ToolNode>,
        }]);
      }
      return withHistory(state, {
        site: updateBody(state.site, state.currentPageId, () => nextPage),
        selection: { kind: "overlay", pageId: state.currentPageId, overlayId: overlay.id },
      });
    });
    return overlayId;
  },
  updateOverlay: (overlayId, changes) => set((state) => {
    assertSiteWritable(state);
    const safeChanges = { ...changes };
    delete safeChanges.id;
    return withHistory(state, {
      site: updateBody(state.site, state.currentPageId, (page) =>
        applyPagePatch(page, [{ op: "updateOverlay", overlayId, changes: safeChanges }]),
      ),
    });
  }),
  removeOverlay: (overlayId) => {
    let references: ToolNode[] = [];
    set((state) => {
      assertSiteWritable(state);
      const page = requireSitePage(state.site, state.currentPageId).body;
      references = findOverlayTriggers(page, overlayId);
      let nextPage = page;
      for (const tool of references) {
        nextPage = applyPagePatch(nextPage, [{
          op: "updateTool",
          toolId: tool.id,
          changes: {
            props: { ...tool.props, action: { type: "none" } },
          } as Partial<ToolNode>,
        }]);
      }
      nextPage = applyPagePatch(nextPage, [{ op: "removeOverlay", overlayId }]);
      return withHistory(state, {
        site: updateBody(state.site, state.currentPageId, () => nextPage),
        selection: { kind: "page", pageId: state.currentPageId },
      });
    });
    return references;
  },
  duplicateOverlay: (overlayId) => {
    let duplicateId: string | undefined;
    set((state) => {
      assertSiteWritable(state);
      const page = requireSitePage(state.site, state.currentPageId).body;
      const source = (page.overlays ?? []).find((overlay) => overlay.id === overlayId);
      if (!source) return state;
      const duplicate = {
        ...clone(source),
        id: createId(`overlay_${source.type}`),
        name: `${source.name} copy`,
      };
      duplicateId = duplicate.id;
      return withHistory(state, {
        site: updateBody(state.site, state.currentPageId, (body) =>
          applyPagePatch(body, [{ op: "addOverlay", overlay: duplicate, afterOverlayId: overlayId }]),
        ),
        selection: { kind: "overlay", pageId: state.currentPageId, overlayId: duplicate.id },
      });
    });
    return duplicateId;
  },
  reorderOverlays: (overlayIds) => set((state) => {
    assertSiteWritable(state);
    return withHistory(state, {
      site: updateBody(state.site, state.currentPageId, (page) =>
        applyPagePatch(page, [{ op: "reorderOverlays", overlayIds }]),
      ),
    });
  }),
  applyPatch: (patch) => set((state) => {
    assertSiteWritable(state);
    const site = updateBody(state.site, state.currentPageId, (page) =>
      applyPagePatch(page, patch),
    );
    assertSitePageSections(site);
    return withHistory(state, { site });
  }),
  undo: () => set((state) => {
    assertSiteWritable(state);
    const entry = state.past.at(-1);
    return entry ? { ...clone(entry.before), past: state.past.slice(0, -1), future: [entry, ...state.future] } : state;
  }),
  redo: () => set((state) => {
    assertSiteWritable(state);
    const entry = state.future[0];
    return entry ? { ...clone(entry.after), past: [...state.past, entry], future: state.future.slice(1) } : state;
  }),
}));

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function findOverlayTriggerCandidate(page: PageDocument, toolId: string) {
  for (const section of page.sections) {
    const tool = section.tools.find((candidate) => candidate.id === toolId);
    if (tool?.type === "button") return tool;
  }
  return undefined;
}

function clonePageWithRemappedIds(source: PageDocument): PageDocument {
  const pageId = createId("page");
  const overlayIds = new Map(
    (source.overlays ?? []).map((overlay) => [overlay.id, createId(`overlay_${overlay.type}`)]),
  );
  return {
    ...clone(source),
    id: pageId,
    title: `${source.title} copy`,
    version: 0,
    sections: source.sections.map((section) => ({
      ...clone(section),
      id: createId(`section_${pageId}`),
      tools: section.tools.map((tool) => {
        const nextTool = { ...clone(tool), id: createId(`tool_${tool.type}`) };
        const action = nextTool.props.action as { type?: unknown; targetId?: unknown } | undefined;
        if (action?.type === "overlay" && typeof action.targetId === "string") {
          const targetId = overlayIds.get(action.targetId);
          nextTool.props = {
            ...nextTool.props,
            action: targetId ? { ...action, targetId } : { type: "none" },
          };
        }
        return nextTool;
      }),
    })),
    overlays: (source.overlays ?? []).map((overlay) => ({
      ...clone(overlay),
      id: overlayIds.get(overlay.id)!,
    })),
  };
}

function uniqueCopyRoute(route: string, usedRoutes: ReadonlySet<string>) {
  const base = route === "/" ? "/home-copy" : `${route}-copy`;
  if (!usedRoutes.has(base)) return base;
  let index = 2;
  while (usedRoutes.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function stripResolvedNavigationProps(changes: Partial<ToolNode>): Partial<ToolNode> {
  if (!changes.props) return changes;
  const persistentProps = { ...changes.props } as Record<string, unknown>;
  delete persistentProps.brandHref;
  delete persistentProps.items;
  delete persistentProps.primaryAction;
  delete persistentProps.secondaryAction;
  return { ...changes, props: persistentProps } as Partial<ToolNode>;
}

export function useEditorStore<T>(selector: (state: EditorStore) => T) {
  return useStore(editorStore, selector);
}
