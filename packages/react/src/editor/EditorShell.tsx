import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AiFloatingButton } from "./AiFloatingButton";
import { AiPopup } from "./AiPopup";
import { ArtifactStyle } from "./ArtifactStyle";
import { CanvasToolbar } from "./CanvasToolbar";
import { GridCanvas } from "./GridCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { PageNavigator } from "./PageNavigator";
import { SiteGenerationProgress } from "./SiteGenerationProgress";
import { isPristineSiteDocument } from "@designer-agent/site-contract";
import { SitePlanDialog } from "./SitePlanDialog";
import { TopBar } from "./TopBar";
import { useEditorStore } from "./editorStore";
import { findSection, findTool } from "./pageDocument";
import {
  composeSitePage,
  getComposedSectionOwner,
  siteDigest,
} from "./siteDocument";
import { editorSelectionToSiteEditTarget } from "./selection";
import { useEditorSocket } from "./useEditorSocket";
import {
  createSitePreview,
  loadWorkspaceBootstrap,
  loadWorkspaceSite,
} from "./workspaceFiles";
import type {
  ClientMessage,
  DeliveryPolicy,
  DesignSystemOption,
  ServerMessage,
  WorkspaceSiteSummary,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function EditorShell() {
  const [designSystemOptions, setDesignSystemOptions] = useState<
    DesignSystemOption[]
  >([{ id: -1, title: "Not Select" }]);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceSites, setWorkspaceSites] = useState<WorkspaceSiteSummary[]>([]);
  const [workspaceSiteLoading, setWorkspaceSiteLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const previewRequestRef = useRef<AbortController | undefined>(undefined);
  const sendMessageRef = useRef<(message: ClientMessage) => boolean>(
    () => false,
  );

  const site = useEditorStore((state) => state.site);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const selection = useEditorStore((state) => state.selection);
  const page = useMemo(
    () => composeSitePage(site, currentPageId),
    [currentPageId, site],
  );
  const selectedSectionId =
    "sectionId" in selection ? (selection.sectionId ?? "") : "";
  const selectedToolId = "toolId" in selection ? selection.toolId : undefined;
  const viewport = useEditorStore((state) => state.viewport);
  const zoom = useEditorStore((state) => state.zoom);
  const aiOpen = useEditorStore((state) => state.aiOpen);
  const aiMessages = useEditorStore((state) => state.aiMessages);
  const pendingRequestId = useEditorStore((state) => state.pendingRequestId);
  const pendingPlan = useEditorStore((state) => state.pendingPlan);
  const pendingReducedPlan = useEditorStore(
    (state) => state.pendingReducedPlan,
  );
  const siteLock = useEditorStore((state) => state.siteLock);
  const pageStatuses = useEditorStore((state) => state.pageStatuses);
  const pageTodos = useEditorStore((state) => state.pageTodos);
  const shellStatus = useEditorStore((state) => state.shellStatus);
  const siteStatus = useEditorStore((state) => state.siteStatus);
  const designSystemId = useEditorStore((state) => state.designSystemId);
  const actions = useEditorStore(
    useShallow((state) => ({
      initializeSite: state.initializeSite,
      openWorkspaceSite: state.openWorkspaceSite,
      setCurrentPage: state.setCurrentPage,
      addPage: state.addPage,
      selectSite: state.selectSite,
      selectPage: state.selectPage,
      selectSharedRegion: state.selectSharedRegion,
      selectSection: state.selectSection,
      selectTool: state.selectTool,
      setViewport: state.setViewport,
      setZoom: state.setZoom,
      setAiOpen: state.setAiOpen,
      setPreviewURL: state.setPreviewURL,
      setDesignSystemId: state.setDesignSystemId,
      addAiMessage: state.addAiMessage,
      appendAssistantDelta: state.appendAssistantDelta,
      appendPageAssistantText: state.appendPageAssistantText,
      setPendingRequestId: state.setPendingRequestId,
      setPendingPlan: state.setPendingPlan,
      setPendingReducedPlan: state.setPendingReducedPlan,
      acquireSiteLock: state.acquireSiteLock,
      setDisconnectGrace: state.setDisconnectGrace,
      releaseSiteLock: state.releaseSiteLock,
      setPageStatus: state.setPageStatus,
      setPageTodos: state.setPageTodos,
      setShellStatus: state.setShellStatus,
      setSiteStatus: state.setSiteStatus,
      prepareSiteBundle: state.prepareSiteBundle,
      commitSiteBundle: state.commitSiteBundle,
      abortSiteBundle: state.abortSiteBundle,
      updateTool: state.updateTool,
      updateSection: state.updateSection,
      addTool: state.addTool,
      addSection: state.addSection,
      removeTool: state.removeTool,
      removeSection: state.removeSection,
    })),
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/design-systems", { signal: controller.signal }).then(
        (response) => response.json(),
      ),
      loadWorkspaceBootstrap(controller.signal),
    ])
      .then(([systems, bootstrap]) => {
        setDesignSystemOptions([
          { id: -1, title: "Not Select" },
          ...(Array.isArray(systems.data) ? systems.data : []),
        ]);
        setWorkspaceSites(bootstrap.sites);
        actions.initializeSite(bootstrap.site);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        console.error(
          error instanceof Error
            ? error.message
            : "Failed to load editor resources.",
        );
      });
    return () => controller.abort();
  }, [actions]);

  useEffect(
    () => () => {
      previewRequestRef.current?.abort();
    },
    [],
  );

  const handleSocketMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case "ai.delta":
          actions.appendAssistantDelta(message.requestId, message.text);
          break;
        case "ai.site.plan.proposed":
          actions.setPendingPlan(message.plan);
          break;
        case "ai.site.plan.cancelled":
          actions.setPendingPlan(undefined);
          actions.setPendingRequestId(undefined);
          break;
        case "site.lock.acquired":
          actions.acquireSiteLock(message.batchId, message.leaseId);
          break;
        case "site.lock.released":
          actions.releaseSiteLock(message.batchId);
          break;
        case "ai.page.status":
          actions.setPageStatus(message.pageId, message.status);
          break;
        case "ai.shell.status":
          actions.setShellStatus(message.status);
          break;
        case "ai.site.status":
          actions.setSiteStatus(message.status);
          break;
        case "ai.page.message":
          actions.appendPageAssistantText(
            `page-${message.batchId}-${message.pageId}`,
            message.text,
          );
          break;
        case "ai.page.todos":
          actions.setPageTodos(message.pageId, message.todos);
          break;
        case "ai.site.reduced-plan.proposed":
          actions.setPendingReducedPlan({
            batchId: message.batchId,
            plan: message.plan,
            expiresAt: message.expiresAt,
          });
          break;
        case "site.patch.prepare":
          try {
            actions.prepareSiteBundle(
              message.batch,
              message.projectedSiteDigest,
            );
            sendMessageRef.current({
              type: "site.patch.ready",
              requestId: message.requestId,
              batchId: message.batch.batchId,
              bundleDigest: message.batch.bundleDigest,
            });
          } catch (error) {
            sendMessageRef.current({
              type: "site.patch.reject",
              requestId: message.requestId,
              batchId: message.batch.batchId,
              reason: error instanceof Error ? error.message : String(error),
            });
          }
          break;
        case "site.patch.commit":
          try {
            actions.commitSiteBundle(message.batchId, message.bundleDigest);
            void loadWorkspaceBootstrap()
              .then((bootstrap) => setWorkspaceSites(bootstrap.sites))
              .catch(() => undefined);
            actions.addAiMessage({
              id: createId("done"),
              role: "assistant",
              text: `Site version ${message.siteVersion} was committed.`,
            });
          } catch (error) {
            actions.abortSiteBundle(message.batchId);
            actions.addAiMessage({
              id: createId("error"),
              role: "system",
              text:
                error instanceof Error
                  ? error.message
                  : "Commit could not be applied.",
            });
          }
          break;
        case "site.patch.abort":
          actions.abortSiteBundle(message.batchId);
          actions.addAiMessage({
            id: createId("abort"),
            role: "system",
            text: message.reason,
          });
          break;
        case "preview.updated":
          if (message.pageId === currentPageId)
            actions.setPreviewURL(message.previewUrl);
          break;
        case "error":
          actions.setPendingRequestId(undefined);
          if (!siteLock) {
            actions.setPendingPlan(undefined);
            actions.setPendingReducedPlan(undefined);
          }
          actions.addAiMessage({
            id: createId("error"),
            role: "system",
            text: `${message.code}: ${message.message}`,
          });
          break;
      }
    },
    [actions, currentPageId, siteLock],
  );

  const { connectionStatus, sendMessage } = useEditorSocket({
    onMessage: handleSocketMessage,
  });
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (!siteLock) return;
    if (connectionStatus === "disconnected" || connectionStatus === "error") {
      actions.setDisconnectGrace();
      return;
    }
    if (
      connectionStatus === "connected" &&
      siteLock.state === "disconnect_grace"
    ) {
      sendMessage({
        type: "site.batch.resume",
        siteId: site.id,
        batchId: siteLock.batchId,
      });
    }
  }, [actions, connectionStatus, sendMessage, site.id, siteLock]);

  useEffect(() => {
    if (!siteLock || connectionStatus !== "connected") return;
    const heartbeat = () =>
      sendMessage({
        type: "site.lock.heartbeat",
        siteId: site.id,
        batchId: siteLock.batchId,
        leaseId: siteLock.leaseId,
      });
    heartbeat();
    const timer = window.setInterval(heartbeat, 20_000);
    return () => window.clearInterval(timer);
  }, [connectionStatus, sendMessage, site.id, siteLock]);

  const selectedTool = useMemo(
    () => findTool(page, selectedToolId),
    [page, selectedToolId],
  );
  const selectedSection = useMemo(
    () => findSection(page, selectedSectionId),
    [page, selectedSectionId],
  );
  const sectionDeleteDisabledReason = useMemo(() => {
    if (!selectedSection) return undefined;
    if (
      selectedSection.tools.some(
        (tool) =>
          tool.type === "navbar" &&
          tool.siteBinding?.kind === "site-navigation",
      )
    ) {
      return "The Section containing the shared Navbar cannot be removed.";
    }
    const owner = getComposedSectionOwner(
      site,
      currentPageId,
      selectedSection.id,
    );
    if (
      owner.kind === "page-body" &&
      site.pages.find((entry) => entry.id === owner.pageId)?.body.sections
        .length === 1
    ) {
      return "A page must contain at least one Section.";
    }
    return undefined;
  }, [currentPageId, selectedSection, site]);
  const editTarget = useMemo(
    () => editorSelectionToSiteEditTarget(selection),
    [selection],
  );
  const targetLabel = useMemo(() => {
    if (selection.kind === "site") return `Site · ${site.title}`;
    if (selection.kind === "page")
      return `Page · ${site.pages.find((entry) => entry.id === selection.pageId)?.title ?? "Unknown page"}`;
    if (selectedTool) return `Tool · ${selectedTool.name}`;
    if (selectedSection) return `Section · ${selectedSection.name}`;
    return `Shared region · ${selection.kind === "header" ? "Header" : selection.kind === "footer" ? "Footer" : "Page body"}`;
  }, [selectedSection, selectedTool, selection, site.pages, site.title]);

  const handlePreview = useCallback(async () => {
    if (previewRequestRef.current) return;
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      setPreviewError("Allow popups and try again.");
      return;
    }
    const controller = new AbortController();
    previewRequestRef.current = controller;
    setPreviewLoading(true);
    try {
      const url = await createSitePreview(
        site,
        currentPageId,
        controller.signal,
      );
      actions.setPreviewURL(url);
      previewWindow.location.replace(url);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setPreviewError(
          error instanceof Error ? error.message : "Preview failed.",
        );
      else previewWindow.close();
    } finally {
      if (previewRequestRef.current === controller) {
        previewRequestRef.current = undefined;
        setPreviewLoading(false);
      }
    }
  }, [actions, currentPageId, site]);

  const handleWorkspaceSiteChange = useCallback(
    async (siteId: string) => {
      if (siteId === site.id || workspaceSiteLoading || pendingRequestId) return;
      setWorkspaceSiteLoading(true);
      try {
        actions.openWorkspaceSite(await loadWorkspaceSite(siteId));
      } catch (error) {
        actions.addAiMessage({
          id: createId("site-load-error"),
          role: "system",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load the workspace site.",
        });
      } finally {
        setWorkspaceSiteLoading(false);
      }
    },
    [actions, pendingRequestId, site.id, workspaceSiteLoading],
  );

  const sendAiMessage = useCallback(
    (prompt: string) => {
      if (siteLock) return;
      const requestId = createId("site");
      actions.addAiMessage({
        id: createId("user"),
        role: "user",
        text: prompt,
      });
      if (
        !sendMessage({
          type: "ai.site.plan.request",
          requestId,
          prompt,
          designSystemId,
          site,
          target: editTarget,
        })
      ) {
        actions.addAiMessage({
          id: createId("error"),
          role: "system",
          text: "WebSocket is not connected yet.",
        });
        return;
      }
      actions.setPendingRequestId(requestId);
    },
    [actions, designSystemId, editTarget, sendMessage, site, siteLock],
  );

  const approvePlan = (policy: DeliveryPolicy) => {
    if (!pendingPlan || !pendingRequestId) return;
    sendMessage({
      type: "ai.site.plan.approve",
      requestId: pendingRequestId,
      planId: pendingPlan.id,
      planDigest: pendingPlan.planDigest,
      currentSiteVersion: site.version,
      currentSiteDigest: siteDigest(site),
      deliveryPolicy: policy,
    });
  };
  const rejectPlan = () => {
    if (!pendingPlan || !pendingRequestId) return;
    sendMessage({
      type: "ai.site.plan.reject",
      requestId: pendingRequestId,
      planId: pendingPlan.id,
    });
    actions.setPendingPlan(undefined);
    actions.setPendingRequestId(undefined);
  };
  const cancelGeneration = () => {
    if (!pendingRequestId) return;
    if (siteLock) {
      sendMessage({
        type: "ai.site.cancel",
        requestId: pendingRequestId,
        batchId: siteLock.batchId,
      });
      return;
    }
    if (pendingPlan) {
      rejectPlan();
      return;
    }
    sendMessage({ type: "ai.site.plan.cancel", requestId: pendingRequestId });
  };
  const editingDisabled = Boolean(pendingRequestId);
  const progressPhase = siteLock
    ? siteLock.state === "disconnect_grace"
      ? ("reconnecting" as const)
      : ("generating" as const)
    : pendingPlan
      ? ("awaiting_approval" as const)
      : ("planning" as const);

  return (
    <div className="x:flex x:h-screen x:min-h-0 x:flex-col x:bg-neutral-100 x:text-neutral-950">
      <ArtifactStyle page={page} />
      <TopBar
        title={page.title}
        viewport={viewport}
        connectionStatus={connectionStatus}
        previewLoading={previewLoading}
        previewError={previewError}
        workspaceSites={workspaceSites}
        currentSiteId={site.id}
        workspaceSiteLoading={workspaceSiteLoading}
        siteSwitchDisabled={Boolean(pendingRequestId)}
        onPreview={handlePreview}
        onSiteChange={handleWorkspaceSiteChange}
        onViewportChange={actions.setViewport}
      />
      <main className="x:flex x:min-h-0 x:flex-1">
        <PageNavigator
          site={site}
          page={page}
          currentPageId={currentPageId}
          selection={selection}
          editingDisabled={editingDisabled}
          onSelectSite={actions.selectSite}
          onSelectPage={actions.setCurrentPage}
          onSelectSharedRegion={actions.selectSharedRegion}
          onAddPage={actions.addPage}
          onSelectSection={actions.selectSection}
          onSelectTool={actions.selectTool}
        />
        <section className="x:flex x:min-w-0 x:flex-1 x:flex-col">
          <CanvasToolbar
            zoom={zoom}
            selectedToolId={selectedToolId}
            inspectorOpen={inspectorOpen}
            editingDisabled={editingDisabled}
            onZoomChange={actions.setZoom}
            onInspectorOpenChange={setInspectorOpen}
          />
          <GridCanvas
            page={page}
            selectedSectionId={selectedSectionId}
            selectedToolId={selectedToolId}
            viewport={viewport}
            zoom={zoom}
            editingDisabled={editingDisabled}
            onSelectPage={actions.selectPage}
            onSelectSection={actions.selectSection}
            onSelectTool={actions.selectTool}
            onAddSection={actions.addSection}
            onAddTool={actions.addTool}
            onUpdateSection={actions.updateSection}
            onUpdateTool={actions.updateTool}
          />
        </section>
        {inspectorOpen ? (
          <InspectorPanel
            page={page}
            selectedSectionId={selectedSectionId}
            selectedToolId={selectedToolId}
            viewport={viewport}
            editingDisabled={editingDisabled}
            sectionDeleteDisabledReason={sectionDeleteDisabledReason}
            onUpdateSection={actions.updateSection}
            onUpdateTool={actions.updateTool}
            onRemoveTool={actions.removeTool}
            onRemoveSection={actions.removeSection}
          />
        ) : null}
      </main>
      {!aiOpen ? (
        <AiFloatingButton onClick={() => actions.setAiOpen(true)} />
      ) : null}
      <AiPopup
        open={aiOpen}
        targetLabel={targetLabel}
        creating={isPristineSiteDocument(site)}
        selectedTool={selectedTool}
        selectedSection={selectedSection}
        messages={aiMessages}
        pending={Boolean(pendingRequestId)}
        connectionStatus={connectionStatus}
        designSystemId={designSystemId}
        designSystemOptions={designSystemOptions}
        onClose={() => actions.setAiOpen(false)}
        onDesignSystemChange={actions.setDesignSystemId}
        onSend={sendAiMessage}
        progress={
          pendingRequestId ? (
            <SiteGenerationProgress
              embedded
              phase={progressPhase}
              plan={pendingPlan}
              siteStatus={siteStatus}
              shellStatus={shellStatus}
              statuses={pageStatuses}
              todos={pageTodos}
              onCancel={cancelGeneration}
            />
          ) : null
        }
      />
      {pendingPlan && !siteLock ? (
        <SitePlanDialog
          plan={pendingPlan}
          onApprove={approvePlan}
          onReject={rejectPlan}
        />
      ) : null}
      {pendingReducedPlan ? (
        <SitePlanDialog
          reduced
          plan={pendingReducedPlan.plan}
          onApprove={() => {
            if (!pendingRequestId) return;
            sendMessage({
              type: "ai.site.reduced-plan.approve",
              requestId: pendingRequestId,
              batchId: pendingReducedPlan.batchId,
              planDigest: pendingReducedPlan.plan.planDigest,
            });
            actions.setPendingPlan(pendingReducedPlan.plan);
            actions.setPendingReducedPlan(undefined);
          }}
          onReject={() => {
            if (!pendingRequestId) return;
            sendMessage({
              type: "ai.site.reduced-plan.reject",
              requestId: pendingRequestId,
              batchId: pendingReducedPlan.batchId,
            });
            actions.setPendingReducedPlan(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
