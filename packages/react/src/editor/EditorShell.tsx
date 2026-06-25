import { useCallback, useEffect, useMemo, useState } from "react";
import { AiFloatingButton } from "./AiFloatingButton";
import { AiPopup } from "./AiPopup";
import { ArtifactStyle } from "./ArtifactStyle";
import { CanvasToolbar } from "./CanvasToolbar";
import { GridCanvas } from "./GridCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { PageNavigator } from "./PageNavigator";
import { TopBar } from "./TopBar";
import { useEditorStore } from "./editorStore";
import { findTool } from "./pageDocument";
import { useEditorSocket } from "./useEditorSocket";
import type {
  AiScope,
  DesignSystemOption,
  ServerMessage,
  ToolNode,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function EditorShell() {
  const [designSystemOptions, setDesignSystemOptions] = useState<
    DesignSystemOption[]
  >([{ id: -1, title: "Not Select" }]);
  const [inspectorOpen, setInspectorOpen] = useState(true);
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
  const previewURL = useEditorStore((state) => state.previewURL);
  const designSystemId = useEditorStore((state) => state.designSystemId);
  const setCurrentPage = useEditorStore((state) => state.setCurrentPage);
  const addPage = useEditorStore((state) => state.addPage);
  const selectSection = useEditorStore((state) => state.selectSection);
  const selectTool = useEditorStore((state) => state.selectTool);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setAiOpen = useEditorStore((state) => state.setAiOpen);
  const setPreviewURL = useEditorStore((state) => state.setPreviewURL);
  const setDesignSystemId = useEditorStore((state) => state.setDesignSystemId);
  const addAiMessage = useEditorStore((state) => state.addAiMessage);
  const appendAssistantDelta = useEditorStore(
    (state) => state.appendAssistantDelta,
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

  const handleSocketMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case "ai.delta":
          appendAssistantDelta(message.requestId, message.text);
          break;
        case "ai.done":
          finishAiMessage(message.requestId, message.message);
          break;
        case "page.patch":
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
      setPendingRequestId,
      setPreviewURL,
    ],
  );

  const { connectionStatus, sendMessage } = useEditorSocket({
    onMessage: handleSocketMessage,
  });

  const selectedTool = useMemo(
    () => findTool(page, selectedToolId),
    [page, selectedToolId],
  );

  const sendAiMessage = useCallback(
    (prompt: string, scope: AiScope) => {
      void prompt;
      void scope;
      if (!page) return;

      const requestId = createId("ai");
      const messageSent = sendMessage({
        type: "ai.message",
        requestId,
        prompt,
        scope,
        selectedToolId: scope === "selection" ? selectedToolId : undefined,
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
        previewURL={previewURL}
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
            onSelectSection={selectSection}
            onSelectTool={selectTool}
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
        selectedTool={selectedTool}
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
