import {
  applyPagePatch,
  digestValue,
  validateSiteDocument,
  type PageDocument,
  type SharedRegion,
  type SiteDocument,
  type SiteDesignContract,
  type SiteEditTarget,
  type SiteNavigation,
  type ToolNode,
} from "@designer-agent/site-contract";
import { run } from "../agent.ts";
import type { UnimplementedRequirement } from "../reviewer/unimplementedRequirement.ts";

export type StagedSharedShell = {
  header: SharedRegion;
  footer: SharedRegion;
  headerDigest: string;
  footerDigest: string;
  unimplementedRequirements?: UnimplementedRequirement[];
};

export type SiteShellGenerator = (input: {
  site: SiteDocument;
  navigation: SiteNavigation;
  prompt: string;
  requirements: string[];
}) => Promise<{ header: SharedRegion; footer: SharedRegion }>;

export async function runSiteShellWorker(
  input: Parameters<SiteShellGenerator>[0],
  generate: SiteShellGenerator,
): Promise<StagedSharedShell> {
  const generated = await generate(input);
  const candidate: SiteDocument = {
    ...input.site,
    navigation: input.navigation,
    sharedShell: generated,
  };
  validateSiteDocument(candidate);
  return {
    ...generated,
    headerDigest: digestValue(generated.header),
    footerDigest: digestValue(generated.footer),
    unimplementedRequirements: [],
  };
}

export async function runDefaultSiteShellWorker(input: {
  batchId: string;
  site: SiteDocument;
  navigation: SiteNavigation;
  prompt: string;
  requirements: string[];
  designSystemId: number;
  designContract?: SiteDesignContract;
  target: SiteEditTarget;
  mode?: "fast-create" | "agent";
  reviewerCritiqueEnabled?: boolean;
  onProgress?: (status: string) => void;
  signal?: AbortSignal;
}): Promise<StagedSharedShell> {
  if (input.mode === "fast-create") {
    input.onProgress?.("Styling shared navigation");
    const shell = buildFastCreateShell(input);
    input.onProgress?.("Shared shell ready");
    return shell;
  }

  input.onProgress?.("Generating shared navigation and footer");
  const headerIds = new Set(input.site.sharedShell.header.sections.map((section) => section.id));
  const footerIds = new Set(input.site.sharedShell.footer.sections.map((section) => section.id));
  const shellPage: PageDocument = {
    id: `shell-${input.site.id}`,
    title: `${input.site.title} Shared Shell`,
    version: Math.max(input.site.sharedShell.header.version, input.site.sharedShell.footer.version),
    viewport: "desktop",
    sections: [
      ...input.site.sharedShell.header.sections,
      ...input.site.sharedShell.footer.sections,
    ],
  };
  const scopedRegion = getScopedRegion(input.target);
  const immutableShellSections = scopedRegion === "header"
    ? input.site.sharedShell.footer.sections
    : scopedRegion === "footer"
      ? input.site.sharedShell.header.sections
      : [];
  const targetSectionId = (input.target.kind === "section" || input.target.kind === "tool") && input.target.owner.kind === "shared-region"
    ? input.target.sectionId
    : undefined;
  const targetToolId = input.target.kind === "tool" && input.target.owner.kind === "shared-region"
    ? input.target.toolId
    : undefined;
  const result = await run({
    prompt: [
      input.prompt,
      ...input.requirements,
      scopedRegion ? `Edit the site's shared ${scopedRegion} only. Preserve the other shared region exactly.` : "Edit the site's shared Header and Footer only.",
      `Existing internal routes (the complete allowlist): ${JSON.stringify(input.site.pages.map((page) => page.route))}.`,
      "Never invent, guess, or synthesize an internal URL. Every href, url, link, route, or to value beginning with / must resolve to one of the existing internal routes listed above (query strings and fragments may be appended).",
      "If no existing route is a valid destination, omit the link property and keep the element non-navigational. Do not create a plausible-looking placeholder route. External absolute URLs and fragment-only links are not internal routes.",
      `Header Section ids (preserve exactly): ${[...headerIds].join(", ")}.`,
      `Footer Section ids (preserve exactly): ${[...footerIds].join(", ")}.`,
      "Do not add, remove, move, or rename these region Section ids.",
      "Header must contain exactly one Navbar. Footer must contain no Navbar.",
      "Navbar navigation items and actions are globally bound; do not hardcode items, hrefs, active state, or actions.",
    ].join("\n\n"),
    page: shellPage,
    operation: "modify",
    targetSectionId,
    targetToolId,
    reviewScope: {
      kind: "shared-shell",
      mutableRegions: scopedRegion ? [scopedRegion] : ["header", "footer"],
      immutableSectionIds: immutableShellSections.map((section) => section.id),
      immutableToolIds: immutableShellSections.flatMap((section) => section.tools.map((tool) => tool.id)),
    },
    reviewerCritiqueEnabled: input.reviewerCritiqueEnabled,
    designSystemId: input.designSystemId,
    persist: false,
    runtimeId: `site-${input.batchId}-shell`,
    signal: input.signal,
  });
  if (result.status !== "accepted") throw new Error(`site_shell_worker_${result.status}`);
  const edited = applyPagePatch(shellPage, result.patch);
  const expectedIds = new Set([...headerIds, ...footerIds]);
  if (edited.sections.length !== expectedIds.size || edited.sections.some((section) => !expectedIds.has(section.id))) {
    throw new Error("delivery_shared_region_boundary_modified");
  }
  const generatedHeader: SharedRegion = {
    ...input.site.sharedShell.header,
    sections: edited.sections.filter((section) => headerIds.has(section.id)).map((section) => ({
      ...section,
      tools: section.tools.map((tool) => tool.type === "navbar" ? {
        ...tool,
        siteBinding: { kind: "site-navigation" as const },
        props: stripNavigationData(tool.props),
      } : tool),
    })),
  };
  const generatedFooter: SharedRegion = {
    ...input.site.sharedShell.footer,
    sections: edited.sections.filter((section) => footerIds.has(section.id)),
  };
  const header = scopedRegion === "footer" ? input.site.sharedShell.header : generatedHeader;
  const footer = scopedRegion === "header" ? input.site.sharedShell.footer : generatedFooter;
  const candidate: SiteDocument = { ...input.site, navigation: input.navigation, sharedShell: { header, footer } };
  validateSiteDocument(candidate);
  input.onProgress?.("Shared shell verified");
  return {
    header,
    footer,
    headerDigest: digestValue(header),
    footerDigest: digestValue(footer),
    unimplementedRequirements: result.unimplementedRequirements ?? [],
  };
}

export function buildFastCreateShell(input: {
  site: SiteDocument;
  navigation: SiteNavigation;
  designSystemId: number;
  designContract?: SiteDesignContract;
}): StagedSharedShell {
  const brand = input.designContract?.brand.productName.trim() || input.site.title;
  const palette = shellPalette(input.designSystemId);
  const headerSection = input.site.sharedShell.header.sections[0];
  const footerSection = input.site.sharedShell.footer.sections[0];
  if (!headerSection || !footerSection) {
    const shell = input.site.sharedShell;
    return {
      ...shell,
      headerDigest: digestValue(shell.header),
      footerDigest: digestValue(shell.footer),
      unimplementedRequirements: [],
    };
  }

  const existingNavbar = input.site.sharedShell.header.sections
    .flatMap((section) => section.tools)
    .find((tool) => tool.type === "navbar");
  const navbar: ToolNode = {
    ...(existingNavbar ?? {
      id: `${headerSection.id}_navbar`,
      type: "navbar" as const,
      name: "Site Navbar",
      props: {},
    }),
    siteBinding: { kind: "site-navigation" },
    layout: responsiveLayout({ rowStart: 1, columnStart: 1, rowEnd: 2, columnEnd: 13 }),
    props: {
      ...stripNavigationData(existingNavbar?.props ?? {}),
      brand,
      sticky: true,
      showMobileMenu: true,
      classNames: {
        navbar: `border-b border-[${palette.border}] bg-[${palette.canvas}] text-[${palette.ink}]`,
        "navbar-inner": "mx-auto w-full max-w-6xl px-6 py-3 @max-[640px]:px-4",
        "navbar-brand": `${palette.displayFont} text-xl font-semibold tracking-[-0.02em] text-[${palette.ink}]`,
        "navbar-nav-list": "justify-center gap-1",
        "navbar-nav-item": `rounded-md px-3 py-2 text-sm font-medium text-[${palette.muted}] transition-colors hover:bg-[${palette.surface}] hover:text-[${palette.ink}]`,
        "navbar-active-nav-item": `bg-[${palette.surface}] text-[${palette.ink}]`,
        "navbar-actions": "gap-2",
        "navbar-primary-action": `rounded-md bg-[${palette.accent}] px-4 py-2 text-sm font-semibold text-[${palette.onAccent}] transition-opacity hover:opacity-90`,
        "navbar-secondary-action": `rounded-md px-4 py-2 text-sm font-medium text-[${palette.ink}] hover:bg-[${palette.surface}]`,
        "navbar-mobile-toggle": `border border-[${palette.border}] bg-[${palette.canvas}] text-[${palette.ink}]`,
        "navbar-mobile-panel": `border-t border-[${palette.border}] bg-[${palette.canvas}] px-4 py-4 shadow-lg`,
      },
    },
  };

  const summary = input.designContract?.sharedCopy.footerCopy?.trim()
    || `${brand} brings every page together with one clear, consistent experience.`;
  const footerTools: ToolNode[] = [
    {
      id: `${footerSection.id}_brand`,
      type: "text",
      name: "Footer Brand",
      layout: responsiveLayout(
        { rowStart: 1, columnStart: 1, rowEnd: 3, columnEnd: 7 },
        { rowStart: 1, columnStart: 1, rowEnd: 3, columnEnd: 7 },
        { rowStart: 1, columnStart: 1, rowEnd: 3, columnEnd: 5 },
      ),
      props: {
        content: brand,
        className: `${palette.displayFont} self-end text-3xl font-semibold tracking-[-0.03em] text-[${palette.onDark}] @max-[640px]:text-2xl`,
      },
    },
    {
      id: `${footerSection.id}_summary`,
      type: "text",
      name: "Footer Summary",
      layout: responsiveLayout(
        { rowStart: 3, columnStart: 1, rowEnd: 5, columnEnd: 7 },
        { rowStart: 3, columnStart: 1, rowEnd: 5, columnEnd: 8 },
        { rowStart: 3, columnStart: 1, rowEnd: 6, columnEnd: 5 },
      ),
      props: {
        content: summary,
        className: `max-w-xl text-sm leading-6 text-[${palette.onDarkMuted}]`,
      },
    },
    {
      id: `${footerSection.id}_navigation`,
      type: "text",
      name: "Footer Navigation",
      layout: responsiveLayout(
        { rowStart: 1, columnStart: 9, rowEnd: 4, columnEnd: 13 },
        { rowStart: 1, columnStart: 9, rowEnd: 4, columnEnd: 13 },
        { rowStart: 6, columnStart: 1, rowEnd: 8, columnEnd: 5 },
      ),
      props: {
        content: input.navigation.items.map((item) => item.label).join("  ·  ") || "Home",
        className: `self-center text-right text-sm font-medium leading-7 text-[${palette.onDark}] @max-[640px]:text-left`,
      },
    },
  ];

  const header: SharedRegion = {
    ...input.site.sharedShell.header,
    sections: input.site.sharedShell.header.sections.map((section, index) => ({
      ...section,
      ...(index === 0 ? {
        name: section.name || "Site Header",
        grid: {
          columns: 12, rows: 1, height: 72, columnGap: 12, rowGap: 12,
          responsive: { tablet: { height: 72 }, mobile: { height: 68 } },
        },
        props: { ...section.props, className: `bg-[${palette.canvas}]` },
        tools: [navbar],
      } : { tools: section.tools.filter((tool) => tool.type !== "navbar") }),
    })),
  };
  const footer: SharedRegion = {
    ...input.site.sharedShell.footer,
    sections: input.site.sharedShell.footer.sections.map((section, index) => index === 0 ? {
      ...section,
      name: section.name || "Site Footer",
      grid: {
        columns: 12, rows: 4, height: 260, columnGap: 12, rowGap: 12,
        responsive: {
          tablet: { rows: 4, height: 260 },
          mobile: { columns: 4, rows: 7, height: 360, columnGap: 10, rowGap: 10 },
        },
      },
      props: { ...section.props, className: `border-t border-[${palette.darkBorder}] bg-[${palette.dark}] px-6 py-8 @max-[640px]:px-4` },
      tools: footerTools,
    } : section),
  };
  const candidate: SiteDocument = {
    ...input.site,
    navigation: input.navigation,
    sharedShell: { header, footer },
  };
  validateSiteDocument(candidate);
  return {
    header,
    footer,
    headerDigest: digestValue(header),
    footerDigest: digestValue(footer),
    unimplementedRequirements: [],
  };
}

function responsiveLayout(
  desktop: ToolNode["layout"]["gridArea"],
  tablet = desktop,
  mobile = desktop,
): ToolNode["layout"] {
  return {
    gridArea: desktop,
    zIndex: 1,
    responsive: {
      tablet: { gridArea: tablet, zIndex: 1 },
      mobile: { gridArea: mobile, zIndex: 1 },
    },
  };
}

function shellPalette(designSystemId: number) {
  if (designSystemId === 5) return {
    canvas: "#faf9f5", surface: "#efe9de", border: "#e6dfd8", ink: "#141413", muted: "#6c6a64",
    accent: "#cc785c", onAccent: "#ffffff", dark: "#181715", darkBorder: "#2a2824", onDark: "#faf9f5",
    onDarkMuted: "#a09d96", displayFont: "font-['Cormorant_Garamond',serif]",
  };
  if (designSystemId === 1) return {
    canvas: "#ffffff", surface: "#f7f7f7", border: "#dddddd", ink: "#222222", muted: "#717171",
    accent: "#ff385c", onAccent: "#ffffff", dark: "#222222", darkBorder: "#3a3a3a", onDark: "#ffffff",
    onDarkMuted: "#b0b0b0", displayFont: "font-sans",
  };
  if (designSystemId === 2) return {
    canvas: "#ffffff", surface: "#f2f4f7", border: "#d8dbe2", ink: "#1f2937", muted: "#667085",
    accent: "#2d7ff9", onAccent: "#ffffff", dark: "#1f2937", darkBorder: "#344054", onDark: "#ffffff",
    onDarkMuted: "#d0d5dd", displayFont: "font-sans",
  };
  if (designSystemId === 4) return {
    canvas: "#000000", surface: "#272729", border: "#333333", ink: "#ffffff", muted: "#cccccc",
    accent: "#2997ff", onAccent: "#ffffff", dark: "#f5f5f7", darkBorder: "#e0e0e0", onDark: "#1d1d1f",
    onDarkMuted: "#7a7a7a", displayFont: "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display',sans-serif]",
  };
  return {
    canvas: "#ffffff", surface: "#f5f5f5", border: "#e5e5e5", ink: "#171717", muted: "#737373",
    accent: "#171717", onAccent: "#ffffff", dark: "#171717", darkBorder: "#404040", onDark: "#ffffff",
    onDarkMuted: "#a3a3a3", displayFont: "font-sans",
  };
}

function getScopedRegion(target: SiteEditTarget) {
  if (target.kind === "shared-region") return target.region;
  if ((target.kind === "section" || target.kind === "tool") && target.owner.kind === "shared-region") return target.owner.region;
  return undefined;
}

function stripNavigationData(props: Record<string, unknown>) {
  const persistent = { ...props };
  delete persistent.brandHref;
  delete persistent.items;
  delete persistent.primaryAction;
  delete persistent.secondaryAction;
  return persistent;
}
