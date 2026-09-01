import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AiFloatingButton } from "./AiFloatingButton";
import { AiPopup } from "./AiPopup";
import { ArtifactStyle } from "./ArtifactStyle";
import { CanvasToolbar } from "./CanvasToolbar";
import { GridCanvas } from "./GridCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { PageNavigator } from "./PageNavigator";
import { OverlayCanvas } from "./OverlayCanvas";
import { SiteGenerationProgress } from "./SiteGenerationProgress";
import { isPristineSiteDocument } from "@designer-agent/site-contract";
import { SitePlanDialog } from "./SitePlanDialog";
import { TopBar } from "./TopBar";
import { useEditorStore } from "./editorStore";
import { findOverlay, findSection, findTool } from "./pageDocument";
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
  AiEditorSelection,
  ClientMessage,
  DeliveryPolicy,
  DesignSystemOption,
  EditorSelection,
  ServerMessage,
  SiteDocument,
  SiteEditTarget,
  WorkspaceSiteSummary,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ownerKey(owner: ReturnType<typeof getComposedSectionOwner>) {
  return owner.kind === "page-body"
    ? `page-body:${owner.pageId}`
    : owner.kind;
}

function broadTargetForSelection(selection: EditorSelection): SiteEditTarget {
  if (selection.kind === "site") return { kind: "site" };
  if (selection.kind === "page") {
    return { kind: "page", pageId: selection.pageId };
  }
  if (selection.kind === "page-body" || selection.kind === "overlay") {
    return { kind: "page", pageId: selection.pageId };
  }
  return { kind: "shared-region", region: selection.kind };
}

function aiSelectionToSiteEditTarget(
  site: SiteDocument,
  currentPageId: string,
  targets: AiEditorSelection[],
  fallback: EditorSelection,
): SiteEditTarget {
  if (targets.length === 0) return broadTargetForSelection(fallback);

  const resolved = targets.map((target) => ({
    target,
    owner: getComposedSectionOwner(site, currentPageId, target.sectionId),
  }));
  const first = resolved[0]!;
  if (resolved.length === 1) {
    const owner =
      first.owner.kind === "page-body"
        ? first.owner
        : { kind: "shared-region" as const, region: first.owner.kind };
    return first.target.kind === "tool"
      ? {
          kind: "tool",
          owner,
          sectionId: first.target.sectionId,
          toolId: first.target.toolId,
        }
      : { kind: "section", owner, sectionId: first.target.sectionId };
  }

  if (
    resolved.every(
      ({ owner, target }) =>
        ownerKey(owner) === ownerKey(first.owner) &&
        target.sectionId === first.target.sectionId,
    )
  ) {
    const owner =
      first.owner.kind === "page-body"
        ? first.owner
        : { kind: "shared-region" as const, region: first.owner.kind };
    return { kind: "section", owner, sectionId: first.target.sectionId };
  }

  if (resolved.every(({ owner }) => ownerKey(owner) === ownerKey(first.owner))) {
    return first.owner.kind === "page-body"
      ? { kind: "page", pageId: first.owner.pageId }
      : { kind: "shared-region", region: first.owner.kind };
  }

  return { kind: "site" };
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
  const pageBody = useMemo(
    () => site.pages.find((entry) => entry.id === currentPageId)?.body ?? page,
    [currentPageId, page, site.pages],
  );
  const selectedSectionId =
    "sectionId" in selection ? (selection.sectionId ?? "") : "";
  const selectedToolId = "toolId" in selection ? selection.toolId : undefined;
  const selectedOverlayId = selection.kind === "overlay" ? selection.overlayId : undefined;
  const viewport = useEditorStore((state) => state.viewport);
  const zoom = useEditorStore((state) => state.zoom);
  const aiOpen = useEditorStore((state) => state.aiOpen);
  const aiSelection = useEditorStore((state) => state.aiSelection);
  const aiMessages = useEditorStore((state) => state.aiMessages);
  const pendingRequestId = useEditorStore((state) => state.pendingRequestId);
  const pendingPlan = useEditorStore((state) => state.pendingPlan);
  const pendingReducedPlan = useEditorStore(
    (state) => state.pendingReducedPlan,
  );
  const siteLock = useEditorStore((state) => state.siteLock);
  const pageStatuses = useEditorStore((state) => state.pageStatuses);
  const pageTodos = useEditorStore((state) => state.pageTodos);
  const pageEvents = useEditorStore((state) => state.pageEvents);
  const shellStatus = useEditorStore((state) => state.shellStatus);
  const siteStatus = useEditorStore((state) => state.siteStatus);
  const designSystemId = useEditorStore((state) => state.designSystemId);
  const actions = useEditorStore(
    useShallow((state) => ({
      openWorkspaceSite: state.openWorkspaceSite,
      setCurrentPage: state.setCurrentPage,
      addPage: state.addPage,
      selectSite: state.selectSite,
      selectPage: state.selectPage,
      selectSharedRegion: state.selectSharedRegion,
      setSharedRegionMounted: state.setSharedRegionMounted,
      selectSection: state.selectSection,
      selectTool: state.selectTool,
      selectOverlay: state.selectOverlay,
      setViewport: state.setViewport,
      setZoom: state.setZoom,
      setAiOpen: state.setAiOpen,
      setPreviewURL: state.setPreviewURL,
      setDesignSystemId: state.setDesignSystemId,
      addAiMessage: state.addAiMessage,
      appendAssistantDelta: state.appendAssistantDelta,
      appendPageEvent: state.appendPageEvent,
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
      addOverlay: state.addOverlay,
      updateOverlay: state.updateOverlay,
      removeOverlay: state.removeOverlay,
      duplicateOverlay: state.duplicateOverlay,
      reorderOverlays: state.reorderOverlays,
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
          actions.appendPageEvent(message.batchId, message.pageId, message.text);
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
  const selectedOverlay = useMemo(
    () => findOverlay(page, selectedOverlayId),
    [page, selectedOverlayId],
  );
  const navbarAddableSectionIds = useMemo(() => {
    const headerSections = site.sharedShell.header.sections;
    const hasNavbar = headerSections.some((section) =>
      section.tools.some((tool) => tool.type === "navbar"),
    );
    return new Set(
      hasNavbar ? [] : headerSections.map((section) => section.id),
    );
  }, [site.sharedShell.header.sections]);
  const sectionDeleteDisabledReason = useMemo(() => {
    if (!selectedSection) return undefined;
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
    if (
      (owner.kind === "header" || owner.kind === "footer") &&
      site.sharedShell[owner.kind].sections.length === 1
    ) {
      return "A shared region must contain at least one source Section.";
    }
    return undefined;
  }, [currentPageId, selectedSection, site]);
  const selectedSectionIds = useMemo(
    () =>
      new Set(
        aiOpen
          ? aiSelection
              .filter((target) => target.kind === "section")
              .map((target) => target.sectionId)
          : selectedSectionId
            ? [selectedSectionId]
            : [],
      ),
    [aiOpen, aiSelection, selectedSectionId],
  );
  const selectedToolIds = useMemo(
    () =>
      new Set(
        aiOpen
          ? aiSelection.flatMap((target) =>
              target.kind === "tool" ? [target.toolId] : [],
            )
          : selectedToolId
            ? [selectedToolId]
            : [],
      ),
    [aiOpen, aiSelection, selectedToolId],
  );
  const selectedTargetCounts = useMemo(
    () => ({
      sections: aiOpen
        ? aiSelection.filter((target) => target.kind === "section").length
        : selectedSection && !selectedTool
          ? 1
          : 0,
      tools: aiOpen
        ? aiSelection.filter((target) => target.kind === "tool").length
        : selectedTool
          ? 1
          : 0,
    }),
    [aiOpen, aiSelection, selectedSection, selectedTool],
  );
  const editTarget = useMemo(
    () =>
      aiOpen
        ? aiSelectionToSiteEditTarget(
            site,
            currentPageId,
            aiSelection,
            selection,
          )
        : editorSelectionToSiteEditTarget(selection),
    [aiOpen, aiSelection, currentPageId, selection, site],
  );
  const aiSelectionDetails = useMemo(
    () =>
      aiSelection.flatMap((target) => {
        const section = findSection(page, target.sectionId);
        if (!section) return [];
        if (target.kind === "section") {
          return [`- Section "${section.name}" (id: ${section.id})`];
        }
        const tool = findTool(page, target.toolId);
        return tool
          ? [
              `- Tool "${tool.name}" (id: ${tool.id}) in Section "${section.name}" (id: ${section.id})`,
            ]
          : [];
      }),
    [aiSelection, page],
  );
  const targetLabel = useMemo(() => {
    if (aiOpen) {
      const count = selectedTargetCounts.sections + selectedTargetCounts.tools;
      if (count > 1) {
        const parts = [
          selectedTargetCounts.tools > 0
            ? `${selectedTargetCounts.tools} Tool${selectedTargetCounts.tools === 1 ? "" : "s"}`
            : "",
          selectedTargetCounts.sections > 0
            ? `${selectedTargetCounts.sections} Section${selectedTargetCounts.sections === 1 ? "" : "s"}`
            : "",
        ].filter(Boolean);
        return `Selected · ${parts.join(" + ")}`;
      }
      if (count === 0) {
        if (editTarget.kind === "page") {
          return `Page · ${site.pages.find((entry) => entry.id === editTarget.pageId)?.body.title ?? "Unknown page"}`;
        }
        if (editTarget.kind === "shared-region") {
          return `Shared region · ${editTarget.region === "header" ? "Header" : "Footer"}`;
        }
      }
      if (count === 1) {
        const target = aiSelection[0];
        if (target?.kind === "tool") {
          const tool = findTool(page, target.toolId);
          if (tool) return `Tool · ${tool.name}`;
        }
        if (target?.kind === "section") {
          const section = findSection(page, target.sectionId);
          if (section) return `Section · ${section.name}`;
        }
      }
    }
    if (selection.kind === "site") return `Site · ${site.title}`;
    if (selection.kind === "page")
      return `Page · ${site.pages.find((entry) => entry.id === selection.pageId)?.body.title ?? "Unknown page"}`;
    if (selection.kind === "overlay") return `Overlay · ${selectedOverlay?.name ?? "Unknown overlay"}`;
    if (selectedTool) return `Tool · ${selectedTool.name}`;
    if (selectedSection) return `Section · ${selectedSection.name}`;
    return `Shared region · ${selection.kind === "header" ? "Header" : selection.kind === "footer" ? "Footer" : "Page body"}`;
  }, [aiOpen, aiSelection, editTarget, page, selectedOverlay, selectedSection, selectedTargetCounts, selectedTool, selection, site.pages, site.title]);

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
      const requestPrompt =
        aiSelectionDetails.length > 1
          ? `AI Editor selected targets (edit only these targets):\n${aiSelectionDetails.join("\n")}\n\nUser request:\n${prompt}`
          : prompt;
      if (
        !sendMessage({
          type: "ai.site.plan.request",
          requestId,
          prompt: requestPrompt,
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
    [actions, aiSelectionDetails, designSystemId, editTarget, sendMessage, site, siteLock],
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
          selectedSectionIds={selectedSectionIds}
          selectedToolIds={selectedToolIds}
          editingDisabled={editingDisabled}
          onSelectSite={actions.selectSite}
          onSelectPage={actions.setCurrentPage}
          onSelectSharedRegion={actions.selectSharedRegion}
          onSharedRegionMountedChange={actions.setSharedRegionMounted}
          onAddPage={actions.addPage}
          onSelectSection={actions.selectSection}
          onSelectTool={actions.selectTool}
          onSelectOverlay={actions.selectOverlay}
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
          {selectedOverlay ? (
            <OverlayCanvas
              key={selectedOverlay.id}
              page={page}
              overlay={selectedOverlay}
              selectedSlot={selection.kind === "overlay" ? selection.slot : undefined}
              selectedSectionIds={selectedSectionIds}
              selectedToolIds={selectedToolIds}
              navbarAddableSectionIds={navbarAddableSectionIds}
              viewport={viewport}
              zoom={zoom}
              editingDisabled={editingDisabled}
              onSelectOverlay={actions.selectOverlay}
              onSelectPage={actions.selectPage}
              onSelectSection={actions.selectSection}
              onSelectTool={actions.selectTool}
              onAddSection={actions.addSection}
              onAddTool={actions.addTool}
              onAddOverlay={actions.addOverlay}
              onUpdateSection={actions.updateSection}
              onUpdateTool={actions.updateTool}
            />
          ) : (
            <GridCanvas
              page={page}
              selectedSectionIds={selectedSectionIds}
              selectedToolIds={selectedToolIds}
              navbarAddableSectionIds={navbarAddableSectionIds}
              viewport={viewport}
              zoom={zoom}
              editingDisabled={editingDisabled}
              onSelectPage={actions.selectPage}
              onSelectSection={actions.selectSection}
              onSelectTool={actions.selectTool}
              onAddSection={actions.addSection}
              onAddTool={actions.addTool}
              onAddOverlay={actions.addOverlay}
              onUpdateSection={actions.updateSection}
              onUpdateTool={actions.updateTool}
            />
          )}
        </section>
        {inspectorOpen ? (
          <InspectorPanel
            page={page}
            pageBody={pageBody}
            selectedSectionId={selectedSectionId}
            selectedToolId={selectedToolId}
            selectedOverlayId={selectedOverlayId}
            overlayBindingAllowed={selection.kind === "page-body"}
            viewport={viewport}
            editingDisabled={editingDisabled}
            sectionDeleteDisabledReason={sectionDeleteDisabledReason}
            onUpdateSection={actions.updateSection}
            onUpdateTool={actions.updateTool}
            onRemoveTool={actions.removeTool}
            onRemoveSection={actions.removeSection}
            onAddOverlay={actions.addOverlay}
            onUpdateOverlay={actions.updateOverlay}
            onRemoveOverlay={actions.removeOverlay}
            onDuplicateOverlay={actions.duplicateOverlay}
            onSelectOverlay={actions.selectOverlay}
            onSelectTool={actions.selectTool}
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
        selectedTargetCounts={selectedTargetCounts}
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
              events={siteLock ? pageEvents[siteLock.batchId] ?? {} : {}}
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
