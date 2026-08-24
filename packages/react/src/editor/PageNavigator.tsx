import { LayersIcon, PlusIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import type { EditorSelection, PageDocument, SiteDocument } from "./types";

export function PageNavigator({
  site,
  page,
  currentPageId,
  selection,
  onSelectPage,
  onSelectSite,
  onSelectSharedRegion,
  onAddPage,
  onSelectSection,
  onSelectTool,
  editingDisabled = false,
}: {
  site: SiteDocument;
  page: PageDocument;
  currentPageId: string;
  selection: EditorSelection;
  onSelectPage: (pageId: string) => void;
  onSelectSite: () => void;
  onSelectSharedRegion: (region: "header" | "footer") => void;
  onAddPage: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId: string) => void;
  editingDisabled?: boolean;
}) {
  const selectedSectionId = "sectionId" in selection ? selection.sectionId : undefined;
  const selectedToolId = "toolId" in selection ? selection.toolId : undefined;
  const bodyIds = new Set(site.pages.find((entry) => entry.id === currentPageId)?.body.sections.map((section) => section.id));
  const bodySections = page.sections.filter((section) => bodyIds.has(section.id));
  const shared = [site.sharedShell.header, site.sharedShell.footer] as const;
  return (
    <aside className="x:flex x:w-72 x:shrink-0 x:flex-col x:border-r x:border-neutral-200 x:bg-white">
      <div className="x:border-b x:border-neutral-200 x:p-4">
        <button type="button" className={cn("x:flex x:w-full x:items-center x:gap-2 x:rounded-md x:px-2 x:py-2 x:text-left x:text-sm x:font-semibold", selection.kind === "site" ? "x:bg-neutral-950 x:text-white" : "x:hover:bg-neutral-100")} onClick={onSelectSite}><LayersIcon className="x:h-4 x:w-4" />{site.title}</button>
        <p className="x:mt-1 x:px-2 x:text-xs x:leading-5 x:text-neutral-500">Shared across every page.</p>
      </div>
      <div className="x:min-h-0 x:flex-1 x:overflow-y-auto">
        <div className="x:border-b x:border-neutral-200 x:p-3">
          <div className="x:mb-2 x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Shared</div>
          {shared.map((region) => (
            <button key={region.id} type="button" className={cn("x:mb-1 x:w-full x:rounded-md x:px-3 x:py-2 x:text-left x:text-xs x:font-medium", selection.kind === region.kind ? "x:bg-neutral-950 x:text-white" : "x:hover:bg-neutral-50")} onClick={() => onSelectSharedRegion(region.kind)}>
              {region.kind === "header" ? "Header · Navbar" : "Footer"}
            </button>
          ))}
        </div>
        <div className="x:border-b x:border-neutral-200 x:p-3">
          <div className="x:mb-2 x:flex x:items-center x:justify-between">
            <span className="x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Pages</span>
            <Button size="sm" variant="ghost" className="x:h-7 x:px-2" disabled={editingDisabled} onClick={onAddPage}><PlusIcon className="x:h-3.5 x:w-3.5" />Page</Button>
          </div>
          {site.pages.toSorted((a, b) => a.order - b.order).map((entry) => (
            <button key={entry.id} type="button" className={cn("x:mb-1 x:flex x:w-full x:min-w-0 x:flex-col x:items-start x:rounded-md x:px-3 x:py-2 x:text-left", entry.id === currentPageId ? "x:bg-blue-50 x:text-blue-700" : "x:hover:bg-neutral-50")} onClick={() => onSelectPage(entry.id)}>
              <span className="x:w-full x:truncate x:text-xs x:font-medium">{entry.title}</span>
              <span className="x:mt-0.5 x:w-full x:truncate x:text-[10px] x:opacity-60">{entry.route}</span>
            </button>
          ))}
        </div>
        <div className="x:p-3">
          <div className="x:mb-2 x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Current page</div>
          {bodySections.map((section) => (
            <div key={section.id} className="x:mb-2">
              <button type="button" className={cn("x:flex x:w-full x:items-center x:justify-between x:rounded-md x:px-3 x:py-2 x:text-left x:text-sm x:font-medium", selectedSectionId === section.id ? "x:bg-neutral-950 x:text-white" : "x:hover:bg-neutral-100")} onClick={() => onSelectSection(section.id)}>
                <span className="x:min-w-0 x:truncate">{section.name}</span>
                <span className="x:ml-2 x:text-[10px] x:opacity-60">{section.tools.length}</span>
              </button>
              <div className="x:mt-1 x:space-y-1 x:pl-3">
                {section.tools.map((tool) => (
                  <button key={tool.id} type="button" className={cn("x:w-full x:truncate x:rounded x:px-2 x:py-1.5 x:text-left x:text-xs", selectedToolId === tool.id ? "x:bg-blue-50 x:text-blue-700" : "x:text-neutral-600 x:hover:bg-neutral-50")} onClick={() => onSelectTool(tool.id)}>{tool.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
