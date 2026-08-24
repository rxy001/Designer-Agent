import { computeBundleDigest } from "./digest.ts";
import type { PageDocument, PagePatch, SectionNode, ToolNode } from "./page.ts";
import { sitePatchBundleSchema, type SitePatchBundle } from "./sitePatch.ts";
import { SiteContractError, type SiteDocument } from "./site.ts";
import { normalizeRoute, validateSiteDocument } from "./validation.ts";

export function applySitePatch(
  previousSiteInput: SiteDocument,
  bundleInput: SitePatchBundle,
) {
  const previousSite = validateSiteDocument(previousSiteInput);
  const bundle = sitePatchBundleSchema.parse(bundleInput);
  if (bundle.siteId !== previousSite.id)
    fail("site_id_mismatch", "Patch targets another site.");
  if (bundle.baseSiteVersion !== previousSite.version)
    fail("site_version_stale", "Site version is stale.");
  if (bundle.nextSiteVersion !== previousSite.version + 1)
    fail("invalid_next_site_version", "nextSiteVersion must increment once.");
  if (computeBundleDigest(bundle) !== bundle.bundleDigest)
    fail("bundle_digest_mismatch", "Bundle digest is invalid.");

  let site = structuredClone(previousSite);
  for (const operation of bundle.operations) {
    switch (operation.op) {
      case "replaceSharedRegion": {
        const current = site.sharedShell[operation.region];
        if (current.version !== operation.baseRegionVersion)
          fail("region_version_stale", `${operation.region} version is stale.`);
        if (operation.value.kind !== operation.region)
          fail(
            "region_kind_mismatch",
            "Shared region kind does not match operation.",
          );
        site.sharedShell[operation.region] = {
          ...structuredClone(operation.value),
          version: current.version + 1,
        };
        break;
      }
      case "updateNavigation":
        site.navigation = structuredClone(operation.value);
        break;
      case "createPage":
        if (site.pages.some((page) => page.id === operation.page.id))
          fail(
            "duplicate_page_id",
            `Page ${operation.page.id} already exists.`,
          );
        if (operation.page.body.version !== 0)
          fail(
            "invalid_new_page_version",
            "New pages must start at version 0.",
          );
        site.pages.push({
          ...structuredClone(operation.page),
          route: normalizeRoute(operation.page.route),
        });
        break;
      case "updatePage": {
        const index = site.pages.findIndex(
          (page) => page.id === operation.pageId,
        );
        if (index < 0)
          fail("page_not_found", `Page ${operation.pageId} was not found.`);
        const current = site.pages[index]!;
        if (current.body.version !== operation.basePageVersion)
          fail(
            "page_version_stale",
            `Page ${operation.pageId} version is stale.`,
          );
        const body = applyPagePatch(current.body, operation.patch);
        if (body.id !== current.id)
          fail("page_id_mismatch", "Page patch changed its stable id.");
        site.pages[index] = {
          ...current,
          ...operation.metadata,
          ...(operation.metadata?.route
            ? { route: normalizeRoute(operation.metadata.route) }
            : {}),
          body: { ...body, version: current.body.version + 1 },
        };
        break;
      }
      case "removePage": {
        const current = site.pages.find((page) => page.id === operation.pageId);
        if (!current)
          fail("page_not_found", `Page ${operation.pageId} was not found.`);
        if (current.body.version !== operation.basePageVersion)
          fail(
            "page_version_stale",
            `Page ${operation.pageId} version is stale.`,
          );
        site.pages = site.pages.filter((page) => page.id !== operation.pageId);
        break;
      }
      case "reorderPages": {
        if (
          operation.pageIds.length !== site.pages.length ||
          new Set(operation.pageIds).size !== site.pages.length
        ) {
          fail(
            "invalid_page_order",
            "Reorder operation must name every page exactly once.",
          );
        }
        const pagesById = new Map(site.pages.map((page) => [page.id, page]));
        site.pages = operation.pageIds.map((pageId, order) => {
          const page = pagesById.get(pageId);
          if (!page) fail("page_not_found", `Page ${pageId} was not found.`);
          return { ...page, order };
        });
        break;
      }
    }
  }

  site = { ...site, version: bundle.nextSiteVersion };
  return validateSiteDocument(site);
}

export function applyPagePatch(
  page: PageDocument,
  patch: PagePatch,
): PageDocument {
  return patch.reduce<PageDocument>((current, operation) => {
    switch (operation.op) {
      case "replacePage":
        return structuredClone(operation.page);
      case "addTool":
        return updateSectionById(current, operation.sectionId, (section) => ({
          ...section,
          tools: [...section.tools, structuredClone(operation.tool)],
        }));
      case "updateTool": {
        let found = false;
        const sections = current.sections.map((section) => ({
          ...section,
          tools: section.tools.map((tool) => {
            if (tool.id !== operation.toolId) return tool;
            found = true;
            return mergeTool(tool, operation.changes);
          }),
        }));
        if (!found)
          fail("tool_not_found", `Tool ${operation.toolId} was not found.`);
        return { ...current, sections };
      }
      case "removeTool": {
        const count = current.sections.reduce(
          (total, section) =>
            total +
            section.tools.filter((tool) => tool.id === operation.toolId).length,
          0,
        );
        if (count !== 1)
          fail(
            "tool_not_found",
            `Tool ${operation.toolId} was not found exactly once.`,
          );
        return {
          ...current,
          sections: current.sections.map((section) => ({
            ...section,
            tools: section.tools.filter((tool) => tool.id !== operation.toolId),
          })),
        };
      }
      case "addSection": {
        if (
          current.sections.some(
            (section) => section.id === operation.section.id,
          )
        )
          fail(
            "duplicate_section_id",
            `Section ${operation.section.id} already exists.`,
          );
        const sections = [...current.sections];
        if (!operation.afterSectionId)
          sections.push(structuredClone(operation.section));
        else {
          const index = sections.findIndex(
            (section) => section.id === operation.afterSectionId,
          );
          if (index < 0)
            fail(
              "section_not_found",
              `Section ${operation.afterSectionId} was not found.`,
            );
          sections.splice(index + 1, 0, structuredClone(operation.section));
        }
        return { ...current, sections };
      }
      case "removeSection": {
        if (
          !current.sections.some(
            (section) => section.id === operation.sectionId,
          )
        )
          fail(
            "section_not_found",
            `Section ${operation.sectionId} was not found.`,
          );
        return {
          ...current,
          sections: current.sections.filter(
            (section) => section.id !== operation.sectionId,
          ),
        };
      }
      case "updateSection":
        return updateSectionById(current, operation.sectionId, (section) =>
          mergeSection(section, operation.changes),
        );
    }
  }, structuredClone(page));
}

function updateSectionById(
  page: PageDocument,
  sectionId: string,
  update: (section: SectionNode) => SectionNode,
) {
  let found = false;
  const sections = page.sections.map((section) => {
    if (section.id !== sectionId) return section;
    found = true;
    return update(section);
  });
  if (!found) fail("section_not_found", `Section ${sectionId} was not found.`);
  return { ...page, sections };
}

function mergeTool(tool: ToolNode, changes: Partial<ToolNode>): ToolNode {
  return {
    ...tool,
    ...changes,
    layout: {
      ...tool.layout,
      ...changes.layout,
      gridArea: { ...tool.layout.gridArea, ...changes.layout?.gridArea },
      responsive: { ...tool.layout.responsive, ...changes.layout?.responsive },
    },
    props: { ...tool.props, ...changes.props },
  } as ToolNode;
}

function mergeSection(
  section: SectionNode,
  changes: Partial<SectionNode>,
): SectionNode {
  return {
    ...section,
    ...changes,
    props: { ...section.props, ...changes.props },
    grid: {
      ...section.grid,
      ...changes.grid,
      responsive: { ...section.grid.responsive, ...changes.grid?.responsive },
    },
    tools: changes.tools ?? section.tools,
  };
}

function fail(code: string, message: string): never {
  throw new SiteContractError(code, message);
}
