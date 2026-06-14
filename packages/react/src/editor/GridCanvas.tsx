import { SectionCanvas } from "./SectionCanvas";
import type { PageDocument, ToolNode, Viewport } from "./types";

type GridCanvasProps = {
  page: PageDocument;
  selectedSectionId: string;
  selectedToolId?: string;
  viewport: Viewport;
  zoom: number;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId?: string) => void;
  onUpdateSection: (sectionId: string, changes: Partial<PageDocument["sections"][number]>) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
};

const viewportWidths: Record<Viewport, string> = {
  desktop: "min(100%, 1120px)",
  tablet: "760px",
  mobile: "390px",
};

export function GridCanvas({
  page,
  selectedSectionId,
  selectedToolId,
  viewport,
  zoom,
  onSelectSection,
  onSelectTool,
  onUpdateSection,
  onUpdateTool,
}: GridCanvasProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto bg-neutral-100 p-8">
      <div
        className="mx-auto origin-top transition-transform"
        style={{
          width: viewportWidths[viewport],
          transform: `scale(${zoom / 100})`,
        }}
      >
        <div className="flex flex-col gap-0">
          {page.sections.map((section) => (
            <div
              key={section.id}
              className="relative block w-full text-left"
              onClick={() => {
                onSelectSection(section.id);
                onSelectTool(undefined);
              }}
            >
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/85 px-2 py-1 text-xs font-medium text-neutral-500 shadow-sm">
                <span>{section.name}</span>
                <span>{selectedSectionId === section.id ? "Selected section" : "Section"}</span>
              </div>
              <SectionCanvas
                section={section}
                selectedToolId={selectedToolId}
                viewport={viewport}
                zoom={zoom}
                onSelectTool={onSelectTool}
                onClearToolSelection={() => onSelectTool(undefined)}
                onResizeSection={(height) =>
                  onUpdateSection(section.id, {
                    layout: { ...section.layout, height },
                  })
                }
                onUpdateTool={onUpdateTool}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
