import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiFloatingButton } from "./AiFloatingButton";
import { AiPopup } from "./AiPopup";
import { ArtifactStyle } from "./ArtifactStyle";
import { CanvasToolbar } from "./CanvasToolbar";
import { GridCanvas } from "./GridCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { PageNavigator } from "./PageNavigator";
import { TopBar } from "./TopBar";
import { useEditorStore } from "./editorStore";
import { findSection, findTool } from "./pageDocument";
import { useEditorSocket } from "./useEditorSocket";
import {
  createPagePreview,
  listWorkspaceJsxFiles,
  loadWorkspacePage,
} from "./workspaceFiles";
import type {
  DesignSystemOption,
  ServerMessage,
  ToolNode,
  WorkspaceJsxFile,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function EditorShell() {
  const [designSystemOptions, setDesignSystemOptions] = useState<
    DesignSystemOption[]
  >([{ id: -1, title: "Not Select" }]);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceJsxFile[]>([]);
  const [workspaceFileLoading, setWorkspaceFileLoading] = useState(true);
  const [workspaceFileError, setWorkspaceFileError] = useState<string>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const workspacePageRequestRef = useRef<AbortController | undefined>(
    undefined,
  );
  const previewRequestRef = useRef<AbortController | undefined>(undefined);
  const pages = useEditorStore((state) => state.pages);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const page = useMemo(
    () => pages.find((item) => item.id === currentPageId) ?? pages[0],
    [currentPageId, pages],
  );
  const selectedSectionId = useEditorStore((state) => state.selectedSectionId);
  const selectedToolId = useEditorStore((state) => state.selectedToolId);
  const viewport = useEditorStore((state) => state.viewport);
  const zoom = useEditorStore((state) => state.zoom);
  const aiOpen = useEditorStore((state) => state.aiOpen);
  const aiMessages = useEditorStore((state) => state.aiMessages);
  const pendingRequestId = useEditorStore((state) => state.pendingRequestId);
  const workspaceFilePath = useEditorStore(
    (state) => state.workspaceFilePath,
  );
  const designSystemId = useEditorStore((state) => state.designSystemId);
  const setCurrentPage = useEditorStore((state) => state.setCurrentPage);
  const addPage = useEditorStore((state) => state.addPage);
  const selectPage = useEditorStore((state) => state.selectPage);
  const selectSection = useEditorStore((state) => state.selectSection);
  const selectTool = useEditorStore((state) => state.selectTool);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setAiOpen = useEditorStore((state) => state.setAiOpen);
  const setPreviewURL = useEditorStore((state) => state.setPreviewURL);
  const setWorkspacePage = useEditorStore((state) => state.loadWorkspacePage);
  const setDesignSystemId = useEditorStore((state) => state.setDesignSystemId);
  const addAiMessage = useEditorStore((state) => state.addAiMessage);
  const appendAssistantDelta = useEditorStore(
    (state) => state.appendAssistantDelta,
  );
  const updateAssistantTodos = useEditorStore(
    (state) => state.updateAssistantTodos,
  );
  const finishAiMessage = useEditorStore((state) => state.finishAiMessage);
  const setPendingRequestId = useEditorStore(
    (state) => state.setPendingRequestId,
  );
  const updateTool = useEditorStore((state) => state.updateTool);
  const updateSection = useEditorStore((state) => state.updateSection);
  const addTool = useEditorStore((state) => state.addTool);
  const addSection = useEditorStore((state) => state.addSection);
  const removeTool = useEditorStore((state) => state.removeTool);
  const applyPatch = useEditorStore((state) => state.applyPatch);

  useEffect(() => {
    async function loadDesignSystems() {
      try {
        const response = await fetch("/api/design-systems");
        const result = await response.json();
        const options = Array.isArray(result.data) ? result.data : [];

        setDesignSystemOptions([{ id: -1, title: "Not Select" }, ...options]);
      } catch {
        setDesignSystemOptions([{ id: -1, title: "Not Select" }]);
      }
    }

    loadDesignSystems();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    listWorkspaceJsxFiles(controller.signal)
      .then((files) => {
        setWorkspaceFiles(files);
        setWorkspaceFileError(undefined);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWorkspaceFileError(
          error instanceof Error ? error.message : "Failed to load JSX files.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setWorkspaceFileLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      workspacePageRequestRef.current?.abort();
      previewRequestRef.current?.abort();
    },
    [],
  );

  const handleSocketMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case "ai.delta":
          appendAssistantDelta(message.requestId, message.text);
          break;
        case "ai.todos":
          updateAssistantTodos(message.requestId, message.todos);
          break;
        case "ai.done":
          finishAiMessage(message.requestId, message.message);
          break;
        case "page.patch":
          if (!page || page.version !== message.baseVersion) {
            addAiMessage({
              id: createId("conflict"),
              role: "system",
              text: "The page changed while AI was working, so its patch was not applied. Send the request again from the current page.",
            });
            break;
          }
          applyPatch(message.patch);
          break;
        case "preview.updated":
          setPreviewURL(message.previewUrl);
          break;
        case "error":
          setPendingRequestId(undefined);
          addAiMessage({
            id: createId("error"),
            role: "system",
            text: message.message,
          });
          break;
        default:
          break;
      }
    },
    [
      addAiMessage,
      appendAssistantDelta,
      applyPatch,
      finishAiMessage,
      page,
      setPendingRequestId,
      setPreviewURL,
      updateAssistantTodos,
    ],
  );

  const { connectionStatus, sendMessage } = useEditorSocket({
    onMessage: handleSocketMessage,
  });

  const selectedTool = useMemo(
    () => findTool(page, selectedToolId),
    [page, selectedToolId],
  );
  const selectedSection = useMemo(
    () => findSection(page, selectedSectionId),
    [page, selectedSectionId],
  );

  const handleWorkspaceFileChange = useCallback(
    async (path: string) => {
      if (!page) return;

      workspacePageRequestRef.current?.abort();
      const controller = new AbortController();
      workspacePageRequestRef.current = controller;
      setWorkspaceFileLoading(true);
      setWorkspaceFileError(undefined);

      try {
        const result = await loadWorkspacePage(path, page, controller.signal);

        setWorkspacePage(result.path, result.page, result.previewUrl);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWorkspaceFileError(
          error instanceof Error ? error.message : `Failed to load ${path}.`,
        );
      } finally {
        if (workspacePageRequestRef.current === controller) {
          workspacePageRequestRef.current = undefined;
          setWorkspaceFileLoading(false);
        }
      }
    },
    [page, setWorkspacePage],
  );

  const handlePreview = useCallback(async () => {
    if (!page || previewRequestRef.current) return;

    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      setPreviewError(
        "The browser blocked the preview window. Allow popups and try again.",
      );
      return;
    }

    previewWindow.opener = null;
    previewWindow.document.title = "Generating preview...";
    previewWindow.document.body.textContent = "Generating preview...";

    const controller = new AbortController();
    previewRequestRef.current = controller;
    setPreviewLoading(true);
    setPreviewError(undefined);

    try {
      const nextPreviewURL = await createPagePreview(page, controller.signal);

      setPreviewURL(nextPreviewURL);
      if (!previewWindow.closed) {
        previewWindow.location.replace(nextPreviewURL);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        previewWindow.close();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate the preview.";
      setPreviewError(message);
      if (!previewWindow.closed) {
        previewWindow.document.title = "Preview failed";
        previewWindow.document.body.textContent = message;
      }
    } finally {
      if (previewRequestRef.current === controller) {
        previewRequestRef.current = undefined;
        setPreviewLoading(false);
      }
    }
  }, [page, setPreviewURL]);

  const sendAiMessage = useCallback(
    (prompt: string) => {
      if (!page) return;
      const requestId = createId("ai");
      const messageSent = sendMessage({
        type: "ai.message",
        requestId,
        prompt,
        selectedToolId,
        selectedSectionId: selectedToolId ? undefined : selectedSectionId || undefined,
        page,
        designSystemId,
      });
      addAiMessage({ id: createId("user"), role: "user", text: prompt });
      if (!messageSent) {
        addAiMessage({
          id: createId("error"),
          role: "system",
          text: "WebSocket is not connected yet. The editor kept your local page state.",
        });
        return;
      }
      setPendingRequestId(requestId);
    },
    [
      addAiMessage,
      designSystemId,
      page,
      selectedToolId,
      selectedSectionId,
      sendMessage,
      setPendingRequestId,
    ],
  );

  if (!page) {
    return (
      <div className="x:flex x:h-screen x:items-center x:justify-center x:bg-neutral-100 x:text-sm x:text-neutral-500">
        No page is available.
      </div>
    );
  }

  return (
    <div className="x:flex x:h-screen x:min-h-0 x:flex-col x:bg-neutral-100 x:text-neutral-950">
      <ArtifactStyle page={page} />
      <TopBar
        title={page.title}
        viewport={viewport}
        connectionStatus={connectionStatus}
        previewLoading={previewLoading}
        previewError={previewError}
        workspaceFiles={workspaceFiles}
        workspaceFilePath={workspaceFilePath}
        workspaceFileLoading={workspaceFileLoading}
        workspaceFileError={workspaceFileError}
        onPreview={handlePreview}
        onWorkspaceFileChange={handleWorkspaceFileChange}
        onViewportChange={(nextViewport) => {
          setViewport(nextViewport);
        }}
      />
      <main className="x:flex x:min-h-0 x:flex-1">
        <PageNavigator
          page={page}
          pages={pages}
          currentPageId={currentPageId}
          selectedSectionId={selectedSectionId}
          selectedToolId={selectedToolId}
          onSelectPage={setCurrentPage}
          onAddPage={addPage}
          onSelectSection={selectSection}
          onSelectTool={selectTool}
          onAddTool={addTool}
          onAddSection={addSection}
          onRenameTool={(toolId, name) =>
            updateTool(toolId, { name } as Partial<ToolNode>)
          }
        />
        <section className="x:flex x:min-w-0 x:flex-1 x:flex-col">
          <CanvasToolbar
            zoom={zoom}
            selectedToolId={selectedToolId}
            inspectorOpen={inspectorOpen}
            onZoomChange={setZoom}
            onInspectorOpenChange={setInspectorOpen}
          />
          <GridCanvas
            page={page}
            selectedSectionId={selectedSectionId}
            selectedToolId={selectedToolId}
            viewport={viewport}
            zoom={zoom}
            onSelectPage={selectPage}
            onSelectSection={selectSection}
            onSelectTool={selectTool}
            onUpdateSection={updateSection}
            onUpdateTool={updateTool}
          />
        </section>
        {inspectorOpen && (
          <InspectorPanel
            page={page}
            selectedSectionId={selectedSectionId}
            selectedToolId={selectedToolId}
            viewport={viewport}
            onUpdateSection={updateSection}
            onUpdateTool={updateTool}
            onRemoveTool={removeTool}
          />
        )}
      </main>
      {!aiOpen && <AiFloatingButton onClick={() => setAiOpen(true)} />}
      <AiPopup
        open={aiOpen}
        pageTitle={page.title}
        creating={page.sections.length === 0}
        selectedTool={selectedTool}
        selectedSection={selectedSection}
        messages={aiMessages}
        pending={Boolean(pendingRequestId)}
        connectionStatus={connectionStatus}
        designSystemId={designSystemId}
        designSystemOptions={designSystemOptions}
        onClose={() => setAiOpen(false)}
        onDesignSystemChange={setDesignSystemId}
        onSend={sendAiMessage}
      />
    </div>
  );
}
