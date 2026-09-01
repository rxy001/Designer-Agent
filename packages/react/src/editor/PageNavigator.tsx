import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LayersIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { cn } from "../ui/cn";
import type { EditorSelection, PageDocument, SiteDocument } from "./types";

export function PageNavigator({
  site,
  page,
  currentPageId,
  selection,
  selectedSectionIds,
  selectedToolIds,
  onSelectPage,
  onSelectSite,
  onSelectSharedRegion,
  onSharedRegionMountedChange,
  onAddPage,
  onSelectSection,
  onSelectTool,
  onSelectOverlay,
  editingDisabled = false,
}: {
  site: SiteDocument;
  page: PageDocument;
  currentPageId: string;
  selection: EditorSelection;
  selectedSectionIds: ReadonlySet<string>;
  selectedToolIds: ReadonlySet<string>;
  onSelectPage: (pageId: string) => void;
  onSelectSite: () => void;
  onSelectSharedRegion: (region: "header" | "footer") => void;
  onSharedRegionMountedChange: (
    region: "header" | "footer",
    mounted: boolean,
  ) => void;
  onAddPage: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId: string) => void;
  onSelectOverlay: (overlayId: string) => void;
  editingDisabled?: boolean;
}) {
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [overlaysExpanded, setOverlaysExpanded] = useState(true);
  const bodyIds = new Set(site.pages.find((entry) => entry.id === currentPageId)?.body.sections.map((section) => section.id));
  const bodySections = page.sections.filter((section) => bodyIds.has(section.id));
  const overlays = page.overlays ?? [];
  const shared = [site.sharedShell.header, site.sharedShell.footer] as const;
  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };
  return (
    <aside className="x:flex x:w-72 x:shrink-0 x:flex-col x:border-r x:border-neutral-200 x:bg-white">
      <div className="x:border-b x:border-neutral-200 x:p-4">
        <button type="button" className={cn("x:flex x:w-full x:items-center x:gap-2 x:rounded-md x:px-2 x:py-2 x:text-left x:text-sm x:font-semibold", selection.kind === "site" ? "x:bg-neutral-950 x:text-white" : "x:hover:bg-neutral-100")} onClick={onSelectSite}><LayersIcon className="x:h-4 x:w-4" />{site.title}</button>
        <p className="x:mt-1 x:px-2 x:text-xs x:leading-5 x:text-neutral-500">Shared across every page.</p>
      </div>
      <div className="x:min-h-0 x:flex-1 x:overflow-y-auto">
        <div className="x:border-b x:border-neutral-200 x:p-3">
          <div className="x:mb-2 x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Shared</div>
          {shared.map((region) => {
            const mounted = region.mounted;
            return (
              <div
                key={region.id}
                className={cn(
                  "x:mb-1 x:flex x:items-center x:gap-2 x:rounded-md x:px-3 x:py-2",
                  selection.kind === region.kind
                    ? "x:bg-neutral-950 x:text-white"
                    : "x:hover:bg-neutral-50",
                )}
              >
                <button
                  type="button"
                  className="x:min-w-0 x:flex-1 x:text-left x:text-xs x:font-medium disabled:x:cursor-default disabled:x:opacity-50"
                  disabled={!mounted}
                  onClick={() => onSelectSharedRegion(region.kind)}
                >
                  {region.kind === "header" ? "Header" : "Footer"}
                </button>
                <Switch
                  checked={mounted}
                  disabled={editingDisabled}
                  aria-label={`${mounted ? "Remove" : "Add"} ${region.kind}`}
                  className={selection.kind === region.kind ? "x:ring-1 x:ring-white/50" : undefined}
                  onCheckedChange={(checked) =>
                    onSharedRegionMountedChange(region.kind, checked)
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="x:border-b x:border-neutral-200 x:p-3">
          <div className="x:mb-2 x:flex x:items-center x:justify-between">
            <span className="x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Pages</span>
            <Button size="sm" variant="ghost" className="x:h-7 x:px-2" disabled={editingDisabled} onClick={onAddPage}><PlusIcon className="x:h-3.5 x:w-3.5" />Page</Button>
          </div>
          {site.pages.map((entry) => (
            <button key={entry.id} type="button" className={cn("x:mb-1 x:flex x:w-full x:min-w-0 x:flex-col x:items-start x:rounded-md x:px-3 x:py-2 x:text-left", entry.id === currentPageId ? "x:bg-blue-50 x:text-blue-700" : "x:hover:bg-neutral-50")} onClick={() => onSelectPage(entry.id)}>
              <span className="x:w-full x:truncate x:text-xs x:font-medium">{entry.body.title}</span>
              <span className="x:mt-0.5 x:w-full x:truncate x:text-[10px] x:opacity-60">{entry.route}</span>
            </button>
          ))}
        </div>
        <div className="x:p-3">
          <div className="x:mb-2 x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Current page</div>
          {bodySections.map((section) => {
            const expanded = !collapsedSectionIds.has(section.id);
            const toolsPanelId = `section-tools-${section.id}`;
            return (
              <div key={section.id} className="x:mb-2">
                <div
                  className={cn(
                    "x:flex x:w-full x:items-center x:rounded-md x:text-sm x:font-medium",
                    selectedSectionIds.has(section.id)
                      ? "x:bg-neutral-950 x:text-white"
                      : "x:hover:bg-neutral-100",
                  )}
                >
                  <button
                    type="button"
                    className="x:flex x:min-w-0 x:flex-1 x:items-center x:justify-between x:px-3 x:py-2 x:text-left"
                    onClick={() => onSelectSection(section.id)}
                  >
                    <span className="x:min-w-0 x:truncate">{section.name}</span>
                    <span className="x:ml-2 x:text-[10px] x:opacity-60">
                      {section.tools.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="x:mr-1 x:rounded x:p-1 x:opacity-70 x:hover:bg-black/10 x:hover:opacity-100"
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${section.name} tools`}
                    aria-expanded={expanded}
                    aria-controls={toolsPanelId}
                    onClick={() => toggleSection(section.id)}
                  >
                    {expanded ? (
                      <ChevronDownIcon className="x:h-3.5 x:w-3.5" />
                    ) : (
                      <ChevronRightIcon className="x:h-3.5 x:w-3.5" />
                    )}
                  </button>
                </div>
                {expanded ? (
                  <div
                    id={toolsPanelId}
                    className="x:mt-1 x:space-y-1 x:pl-3"
                  >
                    {section.tools.map((tool) => (
                      <button key={tool.id} type="button" className={cn("x:w-full x:truncate x:rounded x:px-2 x:py-1.5 x:text-left x:text-xs", selectedToolIds.has(tool.id) ? "x:bg-blue-50 x:text-blue-700" : "x:text-neutral-600 x:hover:bg-neutral-50")} onClick={() => onSelectTool(tool.id)}>{tool.name}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {overlays.length > 0 ? (
          <div className="x:mt-2 x:mb-2">
            <div className="x:flex x:w-full x:items-center x:rounded-md x:text-sm x:font-medium x:hover:bg-neutral-100">
              <button
                type="button"
                className="x:flex x:min-w-0 x:flex-1 x:items-center x:justify-between x:px-3 x:py-2 x:text-left"
                aria-expanded={overlaysExpanded}
                onClick={() => setOverlaysExpanded((current) => !current)}
              >
                <span className="x:min-w-0 x:truncate">Overlays</span>
                <span className="x:ml-2 x:text-[10px] x:opacity-60">
                  {overlays.length}
                </span>
              </button>
              <button
                type="button"
                className="x:mr-1 x:rounded x:p-1 x:opacity-70 x:hover:bg-black/10 x:hover:opacity-100"
                aria-label={`${overlaysExpanded ? "Collapse" : "Expand"} overlays`}
                aria-expanded={overlaysExpanded}
                onClick={() => setOverlaysExpanded((current) => !current)}
              >
                {overlaysExpanded ? (
                  <ChevronDownIcon className="x:h-3.5 x:w-3.5" />
                ) : (
                  <ChevronRightIcon className="x:h-3.5 x:w-3.5" />
                )}
              </button>
            </div>
            {overlaysExpanded ? (
              <div className="x:mt-1 x:space-y-1 x:pl-3">
                {overlays.map((overlay) => {
                  const triggerCount = getOverlayTriggerCount(page, overlay.id, bodyIds);
                  return (
                    <button
                      key={overlay.id}
                      type="button"
                      className={cn(
                        "x:flex x:w-full x:items-center x:gap-2 x:rounded x:px-2 x:py-1.5 x:text-left x:text-xs",
                        selection.kind === "overlay" && selection.overlayId === overlay.id
                          ? "x:bg-blue-50 x:text-blue-700"
                          : "x:text-neutral-600 x:hover:bg-neutral-50",
                      )}
                      onClick={() => onSelectOverlay(overlay.id)}
                    >
                      <span className="x:min-w-0 x:flex-1 x:truncate">{overlay.name}</span>
                      <span className="x:capitalize x:opacity-60">{overlay.type.replace("-", " ")}</span>
                      <span className={cn("x:min-w-4 x:text-right", triggerCount === 0 ? "x:text-amber-600" : "x:opacity-60")} title={triggerCount === 0 ? "This overlay has no trigger" : `${triggerCount} trigger(s)`}>
                        {triggerCount === 0 ? "!" : triggerCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function getOverlayTriggerCount(page: PageDocument, overlayId: string, bodyIds: ReadonlySet<string>) {
  let count = 0;
  for (const section of page.sections) {
    if (!bodyIds.has(section.id)) continue;
    for (const tool of section.tools) {
      const action = tool.props.action as { type?: unknown; targetId?: unknown } | undefined;
      if (action?.type === "overlay" && action.targetId === overlayId) count += 1;
    }
  }
  return count;
}
