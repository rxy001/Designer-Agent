import { compiler } from "@x1ngyu/tw-style";
import { useEffect, useMemo, useRef, useState } from "react";
import accordionSource from "../components/Accordion.tsx?raw";
import buttonSource from "../components/Button.tsx?raw";
import cardSource from "../components/Card.tsx?raw";
import carouselSource from "../components/Carousel.tsx?raw";
import contactSource from "../components/Contact.tsx?raw";
import dividerSource from "../components/Divider.tsx?raw";
import imageSource from "../components/Image.tsx?raw";
import navbarSource from "../components/Navbar.tsx?raw";
import rootSource from "../components/Root.tsx?raw";
import sectionSource from "../components/Section.tsx?raw";
import socialSource from "../components/Social.tsx?raw";
import tabsSource from "../components/Tabs.tsx?raw";
import textSource from "../components/Text.tsx?raw";
import type { GridArea, PageDocument, ToolNode } from "./types";

const componentSources = [
  accordionSource,
  buttonSource,
  cardSource,
  carouselSource,
  contactSource,
  dividerSource,
  imageSource,
  navbarSource,
  rootSource,
  sectionSource,
  socialSource,
  tabsSource,
  textSource,
];

const componentClassCandidates = extractClassCandidates(componentSources);
const buildArtifactCss = compiler({ useLayer: false, usePreflight: false });

export function ArtifactStyle({ page }: { page: PageDocument }) {
  const [css, setCss] = useState("");
  const cssChunksRef = useRef<string[]>([]);
  const classCandidates = useMemo(() => {
    const candidates = new Set(componentClassCandidates);

    collectPageClassCandidates(page, candidates);

    return Array.from(candidates).sort();
  }, [page]);

  useEffect(() => {
    let cancelled = false;

    async function updateCss() {
      const build = await buildArtifactCss;
      const nextCss = await build(classCandidates);

      if (cancelled || !nextCss) return;

      if (!cssChunksRef.current.includes(nextCss)) {
        cssChunksRef.current = [...cssChunksRef.current, nextCss];
      }

      setCss(cssChunksRef.current.join("\n"));
    }

    updateCss();

    return () => {
      cancelled = true;
    };
  }, [classCandidates]);

  if (!css) return null;

  return <style data-artifact-style>{css}</style>;
}

function collectPageClassCandidates(value: unknown, candidates: Set<string>) {
  if (isSectionNodeLike(value)) {
    addSectionGridClassCandidates(value, candidates);
  }

  if (isToolNodeLike(value)) {
    addToolLayoutClassCandidates(value, candidates);
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPageClassCandidates(item, candidates);
    }

    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      if (key === "className" || key === "classNames") {
        addClassList(child, candidates, { trusted: true });
      }

      continue;
    }

    if (key === "classNames" && isRecord(child)) {
      for (const className of Object.values(child)) {
        if (typeof className === "string") {
          addClassList(className, candidates, { trusted: true });
        }
      }
    }

    collectPageClassCandidates(child, candidates);
  }
}

function extractClassCandidates(sources: string[]) {
  const candidates = new Set<string>();
  const stringLiteralPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

  for (const source of sources) {
    for (const match of source.matchAll(stringLiteralPattern)) {
      if (match[2]?.includes("\n")) continue;

      addClassList(match[2] ?? "", candidates);
    }
  }

  return candidates;
}

function addClassList(
  value: string,
  candidates: Set<string>,
  options?: { trusted?: boolean },
) {
  for (const token of value.split(/\s+/)) {
    if (options?.trusted ? isClassToken(token) : isLikelyTailwindCandidate(token)) {
      candidates.add(token);
    }
  }
}

function isClassToken(value: string) {
  return (
    Boolean(value) &&
    !value.startsWith("x:") &&
    !value.includes("{") &&
    !value.includes("}")
  );
}

function isLikelyTailwindCandidate(value: string) {
  if (!isClassToken(value)) return false;
  if (!/^[\w!*@:[\]#%./(),'"&=*_-]+$/.test(value)) return false;

  const base = getUtilityBase(value).replace(/^!/, "").replace(/!$/, "");

  return (
    base.includes("-") ||
    base.includes("[") ||
    base.includes("/") ||
    base === "block" ||
    base === "flex" ||
    base === "grid" ||
    base === "group" ||
    base === "hidden" ||
    base === "inline" ||
    base === "inline-flex" ||
    base === "relative" ||
    base === "absolute" ||
    base === "@container" ||
    base === "truncate" ||
    base === "uppercase" ||
    base === "lowercase" ||
    base === "capitalize"
  );
}

function getUtilityBase(value: string) {
  let bracketDepth = 0;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index];

    if (char === "]") {
      bracketDepth += 1;
    } else if (char === "[") {
      bracketDepth -= 1;
    } else if (char === ":" && bracketDepth === 0) {
      return value.slice(index + 1);
    }
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addSectionGridClassCandidates(
  section: {
    grid: {
      columns: number;
      rows: number;
      responsive?: {
        tablet?: Partial<{ columns: number; rows: number }>;
        mobile?: Partial<{ columns: number; rows: number }>;
      };
    };
  },
  candidates: Set<string>,
) {
  const prefixes = ["", "@max-lg:", "@max-md:"];
  const rows = Math.max(
    section.grid.rows,
    section.grid.responsive?.tablet?.rows ?? 0,
    section.grid.responsive?.mobile?.rows ?? 0,
  );
  const columns = Math.max(
    section.grid.columns,
    section.grid.responsive?.tablet?.columns ?? 0,
    section.grid.responsive?.mobile?.columns ?? 0,
  );

  for (let row = 1; row <= rows + 1; row += 1) {
    for (const prefix of prefixes) {
      candidates.add(`${prefix}row-start-${row}`);
      candidates.add(`${prefix}row-end-${row}`);
    }
  }

  for (let column = 1; column <= columns + 1; column += 1) {
    for (const prefix of prefixes) {
      candidates.add(`${prefix}col-start-${column}`);
      candidates.add(`${prefix}col-end-${column}`);
    }
  }
}

function addToolLayoutClassCandidates(tool: ToolNode, candidates: Set<string>) {
  addGridAreaClassCandidates(tool.layout.gridArea, candidates);
  candidates.add(`z-${tool.layout.zIndex}`);

  if (tool.layout.responsive?.tablet?.gridArea) {
    addGridAreaClassCandidates(
      tool.layout.responsive.tablet.gridArea,
      candidates,
      "@max-lg",
    );
  }

  if (tool.layout.responsive?.tablet?.zIndex !== undefined) {
    candidates.add(`@max-lg:z-${tool.layout.responsive.tablet.zIndex}`);
  }

  if (tool.layout.responsive?.mobile?.gridArea) {
    addGridAreaClassCandidates(
      tool.layout.responsive.mobile.gridArea,
      candidates,
      "@max-md",
    );
  }

  if (tool.layout.responsive?.mobile?.zIndex !== undefined) {
    candidates.add(`@max-md:z-${tool.layout.responsive.mobile.zIndex}`);
  }
}

function addGridAreaClassCandidates(
  gridArea: GridArea,
  candidates: Set<string>,
  breakpoint?: "@max-lg" | "@max-md",
) {
  const prefix = breakpoint ? `${breakpoint}:` : "";

  candidates.add(`${prefix}row-start-${gridArea.rowStart}`);
  candidates.add(`${prefix}row-end-${gridArea.rowEnd}`);
  candidates.add(`${prefix}col-start-${gridArea.columnStart}`);
  candidates.add(`${prefix}col-end-${gridArea.columnEnd}`);
}

function isSectionNodeLike(
  value: unknown,
): value is { grid: { columns: number; rows: number } } {
  if (!isRecord(value) || !isRecord(value.grid)) return false;

  return (
    typeof value.grid.columns === "number" &&
    typeof value.grid.rows === "number"
  );
}

function isToolNodeLike(value: unknown): value is ToolNode {
  if (!isRecord(value) || !isRecord(value.layout)) return false;
  const { gridArea, zIndex } = value.layout;

  return (
    isRecord(gridArea) &&
    typeof gridArea.rowStart === "number" &&
    typeof gridArea.rowEnd === "number" &&
    typeof gridArea.columnStart === "number" &&
    typeof gridArea.columnEnd === "number" &&
    typeof zIndex === "number"
  );
}
