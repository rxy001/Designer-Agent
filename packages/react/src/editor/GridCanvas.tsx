import { Root } from "../components/Root";
import { SectionCanvas } from "./SectionCanvas";
import type { PageDocument, ToolNode, Viewport } from "./types";

type GridCanvasProps = {
  page: PageDocument;
  selectedToolId?: string;
  viewport: Viewport;
  zoom: number;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId?: string) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
};

const viewportWidths: Record<Viewport, string> = {
  desktop: "min(100%, 1120px)",
  tablet: "768px",
  mobile: "390px",
};

export function GridCanvas({
  page,
  selectedToolId,
  viewport,
  zoom,
  onSelectSection,
  onSelectTool,
  onUpdateTool,
}: GridCanvasProps) {
  return (
    <div className="x:flex x:min-h-0 x:flex-1 x:overflow-auto x:bg-neutral-100 x:p-8">
      <div
        className="x:mx-auto x:origin-top x:transition-transform"
        style={{
          width: viewportWidths[viewport],
          transform: `scale(${zoom / 100})`,
        }}
      >
        <Root id={page.id} className={page.props?.className}>
          {page.sections.map((section) => (
            <SectionCanvas
              key={section.id}
              section={section}
              selectedToolId={selectedToolId}
              viewport={viewport}
              onSelectSection={onSelectSection}
              onSelectTool={onSelectTool}
              onClearToolSelection={() => onSelectTool(undefined)}
              onUpdateTool={onUpdateTool}
            />
          ))}
        </Root>
      </div>
    </div>
  );
}
