import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  createInitialPageDocument,
  createSection,
  createTool,
  findSection,
} from "./pageDocument";
import { applyPagePatch } from "./pagePatch";
import {
  getPageSelection,
  getSectionSelection,
  getToolSelection,
  reconcileEditorSelection,
} from "./selection";
import type {
  AiMessage,
  PageDocument,
  PagePatch,
  ToolNode,
  Viewport,
} from "./types";

type HistorySnapshot = {
  pages: PageDocument[];
  currentPageId: string;
  selectedSectionId: string;
  selectedToolId?: string;
  viewport: Viewport;
};

type HistoryEntry = {
  before: HistorySnapshot;
  after: HistorySnapshot;
};

export type EditorStore = {
  pages: PageDocument[];
  currentPageId: string;
  selectedSectionId: string;
  selectedToolId?: string;
  viewport: Viewport;
  zoom: number;
  aiOpen: boolean;
  aiMessages: AiMessage[];
  pendingRequestId?: string;
  previewURL?: string;
  workspaceFilePath?: string;
  designSystemId: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
  setCurrentPage: (pageId: string) => void;
  addPage: () => void;
  selectPage: () => void;
  selectSection: (sectionId: string) => void;
  selectTool: (toolId?: string) => void;
  setViewport: (viewport: Viewport) => void;
  setZoom: (zoom: number) => void;
  setAiOpen: (open: boolean) => void;
  setPreviewURL: (previewURL: string) => void;
  loadWorkspacePage: (
    path: string,
    page: PageDocument,
    previewURL: string,
  ) => void;
  setDesignSystemId: (designSystemId: number) => void;
  addAiMessage: (message: AiMessage) => void;
  appendAssistantDelta: (requestId: string, text: string) => void;
  finishAiMessage: (requestId: string, message: string) => void;
  setPendingRequestId: (requestId?: string) => void;
  updateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  updateSection: (sectionId: string, changes: Partial<PageDocument["sections"][number]>) => void;
  addTool: (type: ToolNode["type"]) => void;
  addSection: () => void;
  removeTool: (toolId: string) => void;
  applyPatch: (patch: PagePatch) => void;
  undo: () => void;
  redo: () => void;
};

const initialPage = createInitialPageDocument();

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clonePages(pages: PageDocument[]) {
  return pages.map((page) => ({
    ...page,
    props: page.props ? { ...page.props } : undefined,
    sections: page.sections.map((section) => ({
      ...section,
      props: section.props ? { ...section.props } : undefined,
      grid: {
        ...section.grid,
        ...(section.grid.responsive
          ? {
              responsive: {
                ...(section.grid.responsive.tablet
                  ? { tablet: { ...section.grid.responsive.tablet } }
                  : {}),
                ...(section.grid.responsive.mobile
                  ? { mobile: { ...section.grid.responsive.mobile } }
                  : {}),
              },
            }
          : {}),
      },
      tools: section.tools.map((tool) => {
        const props = tool.props as {
          classNames?: Record<string, string | undefined>;
        };

        return {
          ...tool,
          layout: {
            ...tool.layout,
            gridArea: { ...tool.layout.gridArea },
            ...(tool.layout.responsive
              ? {
                  responsive: {
                    ...(tool.layout.responsive.tablet
                      ? {
                          tablet: {
                            ...tool.layout.responsive.tablet,
                            ...(tool.layout.responsive.tablet.gridArea
                              ? {
                                  gridArea: {
                                    ...tool.layout.responsive.tablet.gridArea,
                                  },
                                }
                              : {}),
                          },
                        }
                      : {}),
                    ...(tool.layout.responsive.mobile
                      ? {
                          mobile: {
                            ...tool.layout.responsive.mobile,
                            ...(tool.layout.responsive.mobile.gridArea
                              ? {
                                  gridArea: {
                                    ...tool.layout.responsive.mobile.gridArea,
                                  },
                                }
                              : {}),
                          },
                        }
                      : {}),
                  },
                }
              : {}),
          },
          props: {
            ...tool.props,
            ...(props.classNames
              ? { classNames: { ...props.classNames } }
              : {}),
          } as ToolNode["props"],
        };
      }) as ToolNode[],
    })),
  }));
}

function snapshot(state: EditorStore): HistorySnapshot {
  return {
    pages: clonePages(state.pages),
    currentPageId: state.currentPageId,
    selectedSectionId: state.selectedSectionId,
    selectedToolId: state.selectedToolId,
    viewport: state.viewport,
  };
}

function restoreSnapshot(snapshotValue: HistorySnapshot) {
  return {
    pages: clonePages(snapshotValue.pages),
    currentPageId: snapshotValue.currentPageId,
    selectedSectionId: snapshotValue.selectedSectionId,
    selectedToolId: snapshotValue.selectedToolId,
    viewport: snapshotValue.viewport,
  };
}

function withHistory(
  state: EditorStore,
  changes: Pick<
    Partial<EditorStore>,
    | "pages"
    | "currentPageId"
    | "selectedSectionId"
    | "selectedToolId"
    | "viewport"
    | "workspaceFilePath"
    | "previewURL"
  >,
) {
  const before = snapshot(state);
  const after = snapshot({ ...state, ...changes });

  return {
    ...changes,
    past: [...state.past.slice(-49), { before, after }],
    future: [],
  };
}

function getCurrentPage(state: EditorStore) {
  return (
    state.pages.find((page) => page.id === state.currentPageId) ??
    state.pages[0]
  );
}

function updateCurrentPage(
  pages: PageDocument[],
  currentPageId: string,
  updater: (page: PageDocument) => PageDocument,
) {
  return pages.map((page) => (page.id === currentPageId ? updater(page) : page));
}

function mergeAssistantMessage(currentText: string, finalText: string) {
  const trimmedFinalText = finalText.trim();

  if (!trimmedFinalText) {
    return currentText;
  }

  if (!currentText.trim()) {
    return trimmedFinalText;
  }

  if (currentText.includes(trimmedFinalText)) {
    return currentText;
  }

  return `${currentText.trimEnd()}\n\n${trimmedFinalText}`;
}

export const editorStore = createStore<EditorStore>()((set) => ({
  pages: [initialPage],
  currentPageId: initialPage.id,
  selectedSectionId: "",
  selectedToolId: undefined,
  viewport: "desktop",
  zoom: 100,
  aiOpen: false,
  aiMessages: [],
  pendingRequestId: undefined,
  previewURL: undefined,
  workspaceFilePath: undefined,
  designSystemId: -1,
  past: [],
  future: [],
  setCurrentPage: (pageId) =>
    set((state) => {
      const page = state.pages.find((item) => item.id === pageId);

      if (!page) return state;

      return {
        currentPageId: pageId,
        selectedSectionId: "",
        selectedToolId: undefined,
        viewport: page.viewport,
      };
    }),
  addPage: () =>
    set((state) => {
      const nextPage = createInitialPageDocument();
      nextPage.id = createId("page");
      nextPage.title = `Page ${state.pages.length + 1}`;
      nextPage.sections = nextPage.sections.map((section, sectionIndex) => ({
        ...section,
        id: `${section.id}_${state.pages.length + 1}_${sectionIndex}`,
        tools: section.tools.map((tool) => ({
          ...tool,
          id: `${tool.id}_${state.pages.length + 1}`,
        })) as ToolNode[],
      }));

      return withHistory(state, {
        pages: [...state.pages, nextPage],
        currentPageId: nextPage.id,
        selectedSectionId: "",
        selectedToolId: undefined,
        viewport: nextPage.viewport,
        workspaceFilePath: undefined,
        previewURL: undefined,
      });
    }),
  selectPage: () => set(getPageSelection()),
  selectSection: (sectionId) =>
    set(getSectionSelection(sectionId)),
  selectTool: (toolId) =>
    set((state) => getToolSelection(getCurrentPage(state), toolId)),
  setViewport: (viewport) =>
    set((state) => ({
      viewport,
      pages: updateCurrentPage(state.pages, state.currentPageId, (page) => ({
        ...page,
        viewport,
      })),
    })),
  setZoom: (zoom) => set({ zoom }),
  setAiOpen: (open) => set({ aiOpen: open }),
  setPreviewURL: (previewURL) => set({ previewURL }),
  loadWorkspacePage: (path, page, previewURL) =>
    set((state) => {
      return {
        pages: state.pages.map((currentPage) =>
          currentPage.id === state.currentPageId ? page : currentPage,
        ),
        currentPageId: page.id,
        selectedSectionId: "",
        selectedToolId: undefined,
        viewport: page.viewport,
        previewURL,
        workspaceFilePath: path,
        past: [],
        future: [],
      };
    }),
  setDesignSystemId: (designSystemId) => set({ designSystemId }),
  addAiMessage: (message) =>
    set((state) => ({ aiMessages: [...state.aiMessages, message] })),
  appendAssistantDelta: (requestId, text) =>
    set((state) => {
      const last = state.aiMessages[state.aiMessages.length - 1];

      if (last?.role === "assistant" && last.id === requestId) {
        return {
          aiMessages: [
            ...state.aiMessages.slice(0, -1),
            { ...last, text: `${last.text}${text}` },
          ],
        };
      }

      return {
        aiMessages: [
          ...state.aiMessages,
          { id: requestId, role: "assistant", text },
        ],
      };
    }),
  finishAiMessage: (requestId, message) =>
    set((state) => {
      const messageIndex = state.aiMessages.findIndex(
        (item) => item.role === "assistant" && item.id === requestId,
      );

      if (messageIndex >= 0) {
        return {
          pendingRequestId: undefined,
          aiMessages: state.aiMessages.map((item, index) =>
            index === messageIndex
              ? { ...item, text: mergeAssistantMessage(item.text, message) }
              : item,
          ),
        };
      }

      return {
        pendingRequestId: undefined,
        aiMessages: [
          ...state.aiMessages,
          { id: requestId, role: "assistant", text: message },
        ],
      };
    }),
  setPendingRequestId: (requestId) => set({ pendingRequestId: requestId }),
  updateTool: (toolId, changes) =>
    set((state) =>
      withHistory(state, {
        pages: updateCurrentPage(state.pages, state.currentPageId, (page) =>
          applyPagePatch(page, [{ op: "updateTool", toolId, changes }]),
        ),
      }),
    ),
  updateSection: (sectionId, changes) =>
    set((state) =>
      withHistory(state, {
        pages: updateCurrentPage(state.pages, state.currentPageId, (page) =>
          applyPagePatch(page, [{ op: "updateSection", sectionId, changes }]),
        ),
      }),
    ),
  addTool: (type) =>
    set((state) => {
      const currentPage = getCurrentPage(state);
      const section =
        findSection(currentPage, state.selectedSectionId) ??
        currentPage.sections[0];

      if (!section) return state;

      const tool = createTool(type, section);

      return withHistory(state, {
        selectedToolId: tool.id,
        pages: updateCurrentPage(state.pages, state.currentPageId, (page) =>
          applyPagePatch(page, [{ op: "addTool", sectionId: section.id, tool }]),
        ),
      });
    }),
  addSection: () =>
    set((state) => {
      const currentPage = getCurrentPage(state);
      const section = createSection(currentPage.sections.length + 1);

      return withHistory(state, {
        selectedSectionId: section.id,
        selectedToolId: section.tools[0]?.id,
        pages: updateCurrentPage(state.pages, state.currentPageId, (page) =>
          applyPagePatch(page, [
            {
              op: "addSection",
              section,
              afterSectionId: state.selectedSectionId,
            },
          ]),
        ),
      });
    }),
  removeTool: (toolId) =>
    set((state) => {
      const currentPage = getCurrentPage(state);
      const containingSection = currentPage?.sections.find((section) =>
        section.tools.some((tool) => tool.id === toolId),
      );
      const nextTool = containingSection?.tools.find((tool) => tool.id !== toolId);

      return withHistory(state, {
        selectedToolId: nextTool?.id,
        pages: updateCurrentPage(state.pages, state.currentPageId, (page) =>
          applyPagePatch(page, [{ op: "removeTool", toolId }]),
        ),
      });
    }),
  applyPatch: (patch) =>
    set((state) => {
      const currentPage = getCurrentPage(state);
      const nextPage = applyPagePatch(currentPage, patch);
      const selection = reconcileEditorSelection(
        nextPage,
        state.selectedSectionId,
        state.selectedToolId,
      );

      return withHistory(state, {
        pages: state.pages.map((page) =>
          page.id === state.currentPageId ? nextPage : page,
        ),
        ...selection,
      });
    }),
  undo: () =>
    set((state) => {
      const entry = state.past[state.past.length - 1];

      if (!entry) return state;

      return {
        ...restoreSnapshot(entry.before),
        past: state.past.slice(0, -1),
        future: [entry, ...state.future],
      };
    }),
  redo: () =>
    set((state) => {
      const entry = state.future[0];

      if (!entry) return state;

      return {
        ...restoreSnapshot(entry.after),
        past: [...state.past, entry],
        future: state.future.slice(1),
      };
    }),
}));

export function useEditorStore<T>(selector: (state: EditorStore) => T) {
  return useStore(editorStore, selector);
}
