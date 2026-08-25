import type { AccordionProps } from "../components/Accordion";
import type { AvatarProps } from "../components/Avatar";
import type { BadgeProps } from "../components/Badge";
import type { ButtonProps } from "../components/Button";
import type { CardProps } from "../components/Card";
import type { CarouselProps } from "../components/Carousel";
import type { ContactProps } from "../components/Contact";
import type { DividerProps } from "../components/Divider";
import type { ImageProps } from "../components/Image";
import type { IconProps } from "../components/Icon";
import type { InputProps } from "../components/Input";
import type { ListProps } from "../components/List";
import type { NavbarProps } from "../components/Navbar";
import type { NewsletterProps } from "../components/Newsletter";
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
  siteBinding?: { kind: "site-navigation" };
  props: TProps;
};

export type TextTool = BaseTool<"text", TextProps>;

export type InputTool = BaseTool<"input", InputProps>;

export type BadgeTool = BaseTool<"badge", BadgeProps>;

export type AvatarTool = BaseTool<"avatar", AvatarProps>;

export type ListTool = BaseTool<"list", ListProps>;

export type NewsletterTool = BaseTool<"newsletter", NewsletterProps>;

export type ImageTool = BaseTool<"image", ImageProps>;

export type IconTool = BaseTool<"icon", IconProps>;

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
  | InputTool
  | BadgeTool
  | AvatarTool
  | ListTool
  | NewsletterTool
  | ImageTool
  | IconTool
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

export type SiteNavigation = {
  brandTargetPageId: string;
  items: Array<{ id: string; label: string; targetPageId: string }>;
  primaryAction?: { label: string; targetPageId: string };
  secondaryAction?: { label: string; targetPageId: string };
};

export type SharedRegion = {
  id: string;
  kind: "header" | "footer";
  version: number;
  sections: SectionNode[];
};

export type SitePageEntry = {
  id: string;
  title: string;
  route: string;
  artifactPath: string;
  order: number;
  body: PageDocument;
};

export type SiteDocument = {
  id: string;
  title: string;
  version: number;
  navigation: SiteNavigation;
  sharedShell: { header: SharedRegion; footer: SharedRegion };
  pages: SitePageEntry[];
  props?: { className?: string };
};

export type EditorSelection =
  | { kind: "site" }
  | { kind: "header"; sectionId?: string; toolId?: string }
  | { kind: "page"; pageId: string }
  | { kind: "page-body"; pageId: string; sectionId?: string; toolId?: string }
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

export type DeliveryPolicy = "strict" | "best_effort";

export type PublicSitePlan = import("@designer-agent/site-contract").PublicSitePlan;
export type SitePatchBundle = import("@designer-agent/site-contract").SitePatchBundle;
export type SiteEditTarget = import("@designer-agent/site-contract").SiteEditTarget;

export type ClientMessage =
  | { type: "ai.site.plan.request"; requestId: string; prompt: string; designSystemId: number; site: SiteDocument; target: SiteEditTarget }
  | { type: "ai.site.plan.cancel"; requestId: string }
  | { type: "ai.site.plan.approve"; requestId: string; planId: string; planDigest: string; currentSiteVersion: number; currentSiteDigest: string; deliveryPolicy: DeliveryPolicy }
  | { type: "ai.site.plan.reject"; requestId: string; planId: string }
  | { type: "ai.site.reduced-plan.approve"; requestId: string; batchId: string; planDigest: string }
  | { type: "ai.site.reduced-plan.reject"; requestId: string; batchId: string }
  | { type: "site.patch.ready"; requestId: string; batchId: string; bundleDigest: string }
  | { type: "site.patch.reject"; requestId: string; batchId: string; reason: string }
  | { type: "ai.site.cancel"; requestId: string; batchId: string }
  | { type: "site.lock.heartbeat"; siteId: string; batchId: string; leaseId: string }
  | { type: "site.batch.resume"; siteId: string; batchId: string };

export type ServerMessage =
  | { type: "ai.delta"; requestId: string; text: string }
  | { type: "ai.site.plan.proposed"; requestId: string; plan: PublicSitePlan }
  | { type: "ai.site.plan.cancelled"; requestId: string }
  | { type: "site.lock.acquired"; requestId: string; batchId: string; leaseId: string }
  | { type: "site.lock.released"; requestId: string; batchId: string }
  | { type: "ai.page.status"; requestId: string; batchId: string; pageId: string; status: string }
  | { type: "ai.shell.status"; requestId: string; batchId: string; status: string }
  | { type: "ai.site.status"; requestId: string; batchId: string; status: string }
  | { type: "ai.page.message"; requestId: string; batchId: string; pageId: string; text: string }
  | { type: "ai.page.todos"; requestId: string; batchId: string; pageId: string; todos: AiTodo[] }
  | { type: "ai.site.reduced-plan.proposed"; requestId: string; batchId: string; plan: PublicSitePlan; expiresAt: number }
  | { type: "site.patch.prepare"; requestId: string; batch: SitePatchBundle; projectedSiteDigest: string }
  | { type: "site.patch.commit"; requestId: string; batchId: string; bundleDigest: string; siteVersion: number }
  | { type: "site.patch.abort"; requestId: string; batchId: string; reason: string }
  | { type: "preview.updated"; requestId: string; batchId: string; pageId: string; previewUrl: string }
  | { type: "error"; requestId?: string; code: string; message: string };

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
