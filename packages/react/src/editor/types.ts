import type { AccordionProps } from "../components/Accordion";
import type { ButtonProps } from "../components/Button";
import type { CardProps } from "../components/Card";
import type { CarouselProps } from "../components/Carousel";
import type { ContactProps } from "../components/Contact";
import type { DividerProps } from "../components/Divider";
import type { ImageProps } from "../components/Image";
import type { NavbarProps } from "../components/Navbar";
import type { SocialProps } from "../components/Social";
import type { TabsProps } from "../components/Tabs";
import type { TextProps } from "../components/Text";

export type Viewport = "desktop" | "tablet" | "mobile";

export type GridArea = {
  rowStart: number;
  columnStart: number;
  rowEnd: number;
  columnEnd: number;
};

export type BaseTool<TType extends string, TProps> = {
  id: string;
  type: TType;
  name: string;
  locked?: boolean;
  hidden?: boolean;
  layout: {
    gridArea: GridArea;
    zIndex: number;
    responsive?: {
      tablet?: {
        gridArea?: GridArea;
        zIndex?: number;
      };
      mobile?: {
        gridArea?: GridArea;
        zIndex?: number;
      };
    };
  };
  props: TProps;
};

export type TextTool = BaseTool<"text", TextProps>;

export type ImageTool = BaseTool<"image", ImageProps>;

export type ButtonTool = BaseTool<"button", ButtonProps>;

export type CardTool = BaseTool<"card", CardProps>;

export type NavbarTool = BaseTool<"navbar", NavbarProps>;

export type DividerTool = BaseTool<"divider", DividerProps>;

export type AccordionTool = BaseTool<"accordion", AccordionProps>;

export type CarouselTool = BaseTool<"carousel", CarouselProps>;

export type ContactTool = BaseTool<"contact", ContactProps>;

export type SocialTool = BaseTool<"social", SocialProps>;

export type TabsTool = BaseTool<"tabs", TabsProps>;

export type CustomTool = BaseTool<
  "custom",
  {
    componentName: string;
    data: Record<string, unknown>;
  }
>;

export type ToolNode =
  | TextTool
  | ImageTool
  | ButtonTool
  | CardTool
  | NavbarTool
  | DividerTool
  | AccordionTool
  | CarouselTool
  | ContactTool
  | SocialTool
  | TabsTool
  | CustomTool;

export type SectionNode = {
  id: string;
  type: "section";
  name: string;
  props?: {
    className?: string;
  };
  grid: {
    columns: number;
    rows: number;
    height: number;
    columnGap: number;
    rowGap: number;
    responsive?: {
      tablet?: Partial<{
        columns: number;
        rows: number;
        height: number;
        columnGap: number;
        rowGap: number;
      }>;
      mobile?: Partial<{
        columns: number;
        rows: number;
        height: number;
        columnGap: number;
        rowGap: number;
      }>;
    };
  };
  tools: ToolNode[];
};

export type PageDocument = {
  id: string;
  title: string;
  version: number;
  viewport: Viewport;
  props?: {
    className?: string;
  };
  sections: SectionNode[];
};

export type PagePatch = Array<
  | { op: "replacePage"; page: PageDocument }
  | { op: "addTool"; sectionId: string; tool: ToolNode }
  | { op: "updateTool"; toolId: string; changes: Partial<ToolNode> }
  | { op: "removeTool"; toolId: string }
  | { op: "addSection"; section: SectionNode; afterSectionId?: string }
  | { op: "removeSection"; sectionId: string }
  | { op: "updateSection"; sectionId: string; changes: Partial<SectionNode> }
>;

export type AiScope = "selection" | "page";

export type AiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ClientMessage = {
  type: "ai.message";
  requestId: string;
  prompt: string;
  scope: AiScope;
  selectedToolId?: string;
  page: PageDocument;
  designSystemId: number;
};

export type ServerMessage =
  | { type: "ai.delta"; requestId: string; text: string }
  | { type: "ai.done"; requestId: string; message: string }
  | { type: "page.patch"; requestId: string; patch: PagePatch }
  | { type: "preview.updated"; requestId: string; previewUrl: string }
  | { type: "error"; requestId?: string; message: string };

export type DesignSystemOption = {
  id: number;
  title: string;
};
