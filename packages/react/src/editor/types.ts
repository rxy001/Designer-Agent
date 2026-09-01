import type { AccordionProps } from "../components/Accordion";
import type { AvatarProps } from "../components/Avatar";
import type { BadgeProps } from "../components/Badge";
import type { ButtonProps } from "../components/Button";
import type { CardProps } from "../components/Card";
import type { CarouselProps } from "../components/Carousel";
import type { ContactProps } from "../components/Contact";
import type { DividerProps } from "../components/Divider";
import type { IconProps } from "../components/Icon";
import type { ImageProps } from "../components/Image";
import type { InputProps } from "../components/Input";
import type { ListProps } from "../components/List";
import type { NavbarProps } from "../components/Navbar";
import type { NewsletterProps } from "../components/Newsletter";
import type { SocialProps } from "../components/Social";
import type { TabsProps } from "../components/Tabs";
import type { TextProps } from "../components/Text";
import type {
  PageDocument as ContractPageDocument,
  ToolNode as ContractToolNode,
} from "@designer-agent/site-contract";

export type {
  ClientMessage,
  DeliveryPolicy,
  GridArea,
  OverlayNode,
  PageDocument,
  PagePatch,
  PublicSitePlan,
  SectionNode,
  ServerMessage,
  SharedRegion,
  SiteDocument,
  SiteEditTarget,
  SiteNavigation,
  SitePageEntry,
  SitePatchBundle,
  ToolNode,
} from "@designer-agent/site-contract";

export type Viewport = ContractPageDocument["viewport"];

type EditorTool<TType extends ContractToolNode["type"], TProps> = Omit<
  ContractToolNode,
  "type" | "props"
> & {
  type: TType;
  props: TProps & Record<string, unknown>;
};

/** Component-aware view used only at editor rendering and property-editing boundaries. */
export type EditorToolNode =
  | EditorTool<"accordion", AccordionProps>
  | EditorTool<"avatar", AvatarProps>
  | EditorTool<"badge", BadgeProps>
  | EditorTool<"button", ButtonProps>
  | EditorTool<"card", CardProps>
  | EditorTool<"carousel", CarouselProps>
  | EditorTool<"contact", ContactProps>
  | EditorTool<"divider", DividerProps>
  | EditorTool<"icon", IconProps>
  | EditorTool<"image", ImageProps>
  | EditorTool<"input", InputProps>
  | EditorTool<"list", ListProps>
  | EditorTool<"navbar", NavbarProps>
  | EditorTool<"newsletter", NewsletterProps>
  | EditorTool<"social", SocialProps>
  | EditorTool<"tabs", TabsProps>
  | EditorTool<"text", TextProps>
  | EditorTool<
      "custom",
      { componentName: string; data: Record<string, unknown> }
    >;

export function asEditorTool(tool: ContractToolNode): EditorToolNode {
  return tool as EditorToolNode;
}

export type EditorSelection =
  | { kind: "site" }
  | { kind: "header"; sectionId?: string; toolId?: string }
  | { kind: "page"; pageId: string }
  | { kind: "page-body"; pageId: string; sectionId?: string; toolId?: string }
  | { kind: "overlay"; pageId: string; overlayId: string; slot?: string }
  | { kind: "footer"; sectionId?: string; toolId?: string };

export type AiEditorSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "tool"; sectionId: string; toolId: string };

export type ComposedSectionOwner =
  | { kind: "header" }
  | { kind: "page-body"; pageId: string }
  | { kind: "footer" };

export type AiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  todos?: AiTodo[];
};

export type AiTodo = {
  name: string;
  status: "pending" | "in_progress" | "completed";
};

export type AiPageEvent = {
  id: string;
  text: string;
};

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type DesignSystemOption = {
  id: number;
  title: string;
};

export type WorkspaceJsxFile = {
  path: string;
  name: string;
};

export type WorkspaceSiteSummary = {
  id: string;
  title: string;
  version: number;
  pageCount: number;
  activatedAt: number;
};
