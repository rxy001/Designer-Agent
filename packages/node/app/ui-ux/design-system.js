import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { search, DATA_DIR, parseCsv } from "./core.js";
import { readFile } from "node:fs/promises";

const REASONING_FILE = "ui-reasoning.csv";
const SEARCH_CONFIG = {
  product: { maxResults: 1 },
  style: { maxResults: 3 },
  color: { maxResults: 2 },
  landing: { maxResults: 2 },
  typography: { maxResults: 2 },
};

const BOX_WIDTH = 90;

export class DesignSystemGenerator {
  constructor(reasoningData = []) {
    this.reasoningData = reasoningData;
  }

  static async create() {
    return new DesignSystemGenerator(await loadReasoning());
  }

  async multiDomainSearch(query, stylePriority = null) {
    const results = {};
    for (const [domain, config] of Object.entries(SEARCH_CONFIG)) {
      if (domain === "style" && stylePriority?.length) {
        const priorityQuery = stylePriority.slice(0, 2).join(" ");
        results[domain] = await search(
          `${query} ${priorityQuery}`,
          domain,
          config.maxResults,
        );
      } else {
        results[domain] = await search(query, domain, config.maxResults);
      }
    }
    return results;
  }

  findReasoningRule(category) {
    const categoryLower = category.toLowerCase();

    for (const rule of this.reasoningData) {
      if ((rule.UI_Category ?? "").toLowerCase() === categoryLower) return rule;
    }

    for (const rule of this.reasoningData) {
      const uiCategory = (rule.UI_Category ?? "").toLowerCase();
      if (
        uiCategory.includes(categoryLower) ||
        categoryLower.includes(uiCategory)
      )
        return rule;
    }

    for (const rule of this.reasoningData) {
      const keywords = (rule.UI_Category ?? "")
        .toLowerCase()
        .replace(/\//g, " ")
        .replace(/-/g, " ")
        .split(/\s+/);
      if (keywords.some((keyword) => categoryLower.includes(keyword)))
        return rule;
    }

    return {};
  }

  applyReasoning(category) {
    const rule = this.findReasoningRule(category);
    if (!Object.keys(rule).length) {
      return {
        pattern: "Hero + Features + CTA",
        stylePriority: ["Minimalism", "Flat Design"],
        colorMood: "Professional",
        typographyMood: "Clean",
        keyEffects: "Subtle hover transitions",
        antiPatterns: "",
        decisionRules: {},
        severity: "MEDIUM",
      };
    }

    let decisionRules = {};
    try {
      decisionRules = JSON.parse(rule.Decision_Rules || "{}");
    } catch {
      decisionRules = {};
    }

    return {
      pattern: rule.Recommended_Pattern ?? "",
      stylePriority: (rule.Style_Priority ?? "")
        .split("+")
        .map((item) => item.trim())
        .filter(Boolean),
      colorMood: rule.Color_Mood ?? "",
      typographyMood: rule.Typography_Mood ?? "",
      keyEffects: rule.Key_Effects ?? "",
      antiPatterns: rule.Anti_Patterns ?? "",
      decisionRules,
      severity: rule.Severity || "MEDIUM",
    };
  }

  selectBestMatch(results, priorityKeywords) {
    if (!results.length) return {};
    if (!priorityKeywords?.length) return results[0];

    for (const priority of priorityKeywords) {
      const priorityLower = priority.toLowerCase().trim();
      for (const result of results) {
        const styleName = (result["Style Category"] ?? "").toLowerCase();
        if (
          priorityLower.includes(styleName) ||
          styleName.includes(priorityLower)
        )
          return result;
      }
    }

    const scored = results.map((result) => {
      const resultText = JSON.stringify(result).toLowerCase();
      let score = 0;
      for (const keyword of priorityKeywords) {
        const keywordLower = keyword.toLowerCase().trim();
        if (
          (result["Style Category"] ?? "").toLowerCase().includes(keywordLower)
        )
          score += 10;
        else if ((result.Keywords ?? "").toLowerCase().includes(keywordLower))
          score += 3;
        else if (resultText.includes(keywordLower)) score += 1;
      }
      return [score, result];
    });

    scored.sort((a, b) => b[0] - a[0]);
    return scored[0]?.[0] > 0 ? scored[0][1] : results[0];
  }

  async generate(query, projectName = null) {
    const productResult = await search(query, "product", 1);
    const productResults = productResult.results ?? [];
    const category = productResults[0]?.["Product Type"] ?? "General";

    const reasoning = this.applyReasoning(category);
    const searchResults = await this.multiDomainSearch(
      query,
      reasoning.stylePriority,
    );
    searchResults.product = productResult;

    const styleResults = searchResults.style?.results ?? [];
    const colorResults = searchResults.color?.results ?? [];
    const typographyResults = searchResults.typography?.results ?? [];
    const landingResults = searchResults.landing?.results ?? [];

    const bestStyle = this.selectBestMatch(
      styleResults,
      reasoning.stylePriority,
    );
    const bestColor = colorResults[0] ?? {};
    const bestTypography = typographyResults[0] ?? {};
    const bestLanding = landingResults[0] ?? {};

    const styleEffects = bestStyle["Effects & Animation"] ?? "";
    const combinedEffects = styleEffects || reasoning.keyEffects;

    return {
      project_name: projectName || query.toUpperCase(),
      category,
      pattern: {
        name:
          bestLanding["Pattern Name"] ||
          reasoning.pattern ||
          "Hero + Features + CTA",
        sections: bestLanding["Section Order"] || "Hero > Features > CTA",
        cta_placement: bestLanding["Primary CTA Placement"] || "Above fold",
        color_strategy: bestLanding["Color Strategy"] || "",
        conversion: bestLanding["Conversion Optimization"] || "",
      },
      style: {
        name: bestStyle["Style Category"] || "Minimalism",
        type: bestStyle.Type || "General",
        effects: styleEffects,
        keywords: bestStyle.Keywords || "",
        best_for: bestStyle["Best For"] || "",
        performance: bestStyle.Performance || "",
        accessibility: bestStyle.Accessibility || "",
      },
      colors: {
        primary: bestColor["Primary (Hex)"] || "#2563EB",
        secondary: bestColor["Secondary (Hex)"] || "#3B82F6",
        cta: bestColor["CTA (Hex)"] || "#F97316",
        background: bestColor["Background (Hex)"] || "#F8FAFC",
        text: bestColor["Text (Hex)"] || "#1E293B",
        notes: bestColor.Notes || "",
      },
      typography: {
        heading: bestTypography["Heading Font"] || "Inter",
        body: bestTypography["Body Font"] || "Inter",
        mood:
          bestTypography["Mood/Style Keywords"] ||
          reasoning.typographyMood ||
          "",
        best_for: bestTypography["Best For"] || "",
        google_fonts_url: bestTypography["Google Fonts URL"] || "",
        css_import: bestTypography["CSS Import"] || "",
      },
      key_effects: combinedEffects,
      anti_patterns: reasoning.antiPatterns,
      decision_rules: reasoning.decisionRules,
      severity: reasoning.severity,
    };
  }
}

async function loadReasoning() {
  try {
    return parseCsv(await readFile(join(DATA_DIR, REASONING_FILE), "utf8"));
  } catch {
    return [];
  }
}

function wrapText(text, prefix, width) {
  if (!text) return [];
  const lines = [];
  let currentLine = prefix;
  for (const word of text.split(/\s+/)) {
    if (currentLine.length + word.length + 1 <= width - 2) {
      currentLine += `${currentLine === prefix ? "" : " "}${word}`;
    } else {
      if (currentLine !== prefix) lines.push(currentLine);
      currentLine = prefix + word;
    }
  }
  if (currentLine !== prefix) lines.push(currentLine);
  return lines;
}

function boxLine(content = "") {
  return content.padEnd(BOX_WIDTH, " ") + "|";
}

export function formatAsciiBox(designSystem) {
  const project = designSystem.project_name ?? "PROJECT";
  const pattern = designSystem.pattern ?? {};
  const style = designSystem.style ?? {};
  const colors = designSystem.colors ?? {};
  const typography = designSystem.typography ?? {};
  const effects = String(designSystem.key_effects ?? "");
  const antiPatterns = String(designSystem.anti_patterns ?? "");
  const sections = (pattern.sections ?? "")
    .split(">")
    .map((section) => section.trim())
    .filter(Boolean);
  const lines = [];
  const w = BOX_WIDTH - 1;

  lines.push(`+${"-".repeat(w)}+`);
  lines.push(boxLine(`|  TARGET: ${project} - RECOMMENDED DESIGN SYSTEM`));
  lines.push(`+${"-".repeat(w)}+`);
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);
  lines.push(boxLine(`|  PATTERN: ${pattern.name ?? ""}`));
  if (pattern.conversion)
    lines.push(boxLine(`|     Conversion: ${pattern.conversion}`));
  if (pattern.cta_placement)
    lines.push(boxLine(`|     CTA: ${pattern.cta_placement}`));
  lines.push(boxLine("|     Sections:"));
  sections.forEach((section, index) =>
    lines.push(boxLine(`|       ${index + 1}. ${section}`)),
  );
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);

  lines.push(boxLine(`|  STYLE: ${style.name ?? ""}`));
  if (style.keywords)
    wrapText(`Keywords: ${style.keywords}`, "|     ", BOX_WIDTH).forEach(
      (line) => lines.push(boxLine(line)),
    );
  if (style.best_for)
    wrapText(`Best For: ${style.best_for}`, "|     ", BOX_WIDTH).forEach(
      (line) => lines.push(boxLine(line)),
    );
  if (style.performance || style.accessibility) {
    lines.push(
      boxLine(
        `|     Performance: ${style.performance ?? ""} | Accessibility: ${style.accessibility ?? ""}`,
      ),
    );
  }
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);

  lines.push(boxLine("|  COLORS:"));
  lines.push(boxLine(`|     Primary:    ${colors.primary ?? ""}`));
  lines.push(boxLine(`|     Secondary:  ${colors.secondary ?? ""}`));
  lines.push(boxLine(`|     CTA:        ${colors.cta ?? ""}`));
  lines.push(boxLine(`|     Background: ${colors.background ?? ""}`));
  lines.push(boxLine(`|     Text:       ${colors.text ?? ""}`));
  if (colors.notes)
    wrapText(`Notes: ${colors.notes}`, "|     ", BOX_WIDTH).forEach((line) =>
      lines.push(boxLine(line)),
    );
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);

  lines.push(
    boxLine(
      `|  TYPOGRAPHY: ${typography.heading ?? ""} / ${typography.body ?? ""}`,
    ),
  );
  if (typography.mood)
    wrapText(`Mood: ${typography.mood}`, "|     ", BOX_WIDTH).forEach((line) =>
      lines.push(boxLine(line)),
    );
  if (typography.best_for)
    wrapText(`Best For: ${typography.best_for}`, "|     ", BOX_WIDTH).forEach(
      (line) => lines.push(boxLine(line)),
    );
  if (typography.google_fonts_url)
    lines.push(boxLine(`|     Google Fonts: ${typography.google_fonts_url}`));
  if (typography.css_import)
    lines.push(
      boxLine(`|     CSS Import: ${typography.css_import.slice(0, 70)}...`),
    );
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);

  if (effects) {
    lines.push(boxLine("|  KEY EFFECTS:"));
    wrapText(effects, "|     ", BOX_WIDTH).forEach((line) =>
      lines.push(boxLine(line)),
    );
    lines.push(`|${" ".repeat(BOX_WIDTH)}|`);
  }

  if (antiPatterns) {
    lines.push(boxLine("|  AVOID (Anti-patterns):"));
    wrapText(antiPatterns, "|     ", BOX_WIDTH).forEach((line) =>
      lines.push(boxLine(line)),
    );
    lines.push(`|${" ".repeat(BOX_WIDTH)}|`);
  }

  lines.push(boxLine("|  PRE-DELIVERY CHECKLIST:"));
  [
    "[ ] No emojis as icons (use SVG: Heroicons/Lucide)",
    "[ ] cursor-pointer on all clickable elements",
    "[ ] Hover states with smooth transitions (150-300ms)",
    "[ ] Light mode: text contrast 4.5:1 minimum",
    "[ ] Focus states visible for keyboard nav",
    "[ ] prefers-reduced-motion respected",
    "[ ] Responsive: 375px, 768px, 1024px, 1440px",
  ].forEach((item) => lines.push(boxLine(`|     ${item}`)));
  lines.push(`|${" ".repeat(BOX_WIDTH)}|`);
  lines.push(`+${"-".repeat(w)}+`);
  return lines.join("\n");
}

export function formatMarkdown(designSystem) {
  const project = designSystem.project_name ?? "PROJECT";
  const pattern = designSystem.pattern ?? {};
  const style = designSystem.style ?? {};
  const colors = designSystem.colors ?? {};
  const typography = designSystem.typography ?? {};
  const effects = String(designSystem.key_effects ?? "");
  const antiPatterns = String(designSystem.anti_patterns ?? "");
  const lines = [];

  lines.push(`## Design System: ${project}`, "");
  lines.push("### Pattern");
  lines.push(`- **Name:** ${pattern.name ?? ""}`);
  if (pattern.conversion)
    lines.push(`- **Conversion Focus:** ${pattern.conversion}`);
  if (pattern.cta_placement)
    lines.push(`- **CTA Placement:** ${pattern.cta_placement}`);
  if (pattern.color_strategy)
    lines.push(`- **Color Strategy:** ${pattern.color_strategy}`);
  lines.push(`- **Sections:** ${pattern.sections ?? ""}`, "");

  lines.push("### Style");
  lines.push(`- **Name:** ${style.name ?? ""}`);
  if (style.keywords) lines.push(`- **Keywords:** ${style.keywords}`);
  if (style.best_for) lines.push(`- **Best For:** ${style.best_for}`);
  if (style.performance || style.accessibility)
    lines.push(
      `- **Performance:** ${style.performance ?? ""} | **Accessibility:** ${style.accessibility ?? ""}`,
    );
  lines.push("");

  lines.push("### Colors", "| Role | Hex |", "|------|-----|");
  lines.push(`| Primary | ${colors.primary ?? ""} |`);
  lines.push(`| Secondary | ${colors.secondary ?? ""} |`);
  lines.push(`| CTA | ${colors.cta ?? ""} |`);
  lines.push(`| Background | ${colors.background ?? ""} |`);
  lines.push(`| Text | ${colors.text ?? ""} |`);
  if (colors.notes) lines.push("", `*Notes: ${colors.notes}*`);
  lines.push("");

  lines.push("### Typography");
  lines.push(`- **Heading:** ${typography.heading ?? ""}`);
  lines.push(`- **Body:** ${typography.body ?? ""}`);
  if (typography.mood) lines.push(`- **Mood:** ${typography.mood}`);
  if (typography.best_for) lines.push(`- **Best For:** ${typography.best_for}`);
  if (typography.google_fonts_url)
    lines.push(`- **Google Fonts:** ${typography.google_fonts_url}`);
  if (typography.css_import)
    lines.push("- **CSS Import:**", "```css", typography.css_import, "```");
  lines.push("");

  if (effects) lines.push("### Key Effects", effects, "");
  if (antiPatterns)
    lines.push(
      "### Avoid (Anti-patterns)",
      `- ${antiPatterns.split(" + ").join("\n- ")}`,
      "",
    );

  lines.push("### Pre-Delivery Checklist");
  [
    "- [ ] No emojis as icons (use SVG: Heroicons/Lucide)",
    "- [ ] cursor-pointer on all clickable elements",
    "- [ ] Hover states with smooth transitions (150-300ms)",
    "- [ ] Light mode: text contrast 4.5:1 minimum",
    "- [ ] Focus states visible for keyboard nav",
    "- [ ] prefers-reduced-motion respected",
    "- [ ] Responsive: 375px, 768px, 1024px, 1440px",
  ].forEach((item) => lines.push(item));
  lines.push("");

  return lines.join("\n");
}

export async function generateDesignSystem(
  query,
  projectName = null,
  outputFormat = "ascii",
  options = {},
) {
  const generator = await DesignSystemGenerator.create();
  const designSystem = await generator.generate(query, projectName);

  if (options.persist) {
    await persistDesignSystem(designSystem, {
      page: options.page,
      outputDir: options.outputDir,
      pageQuery: query,
    });
  }

  return outputFormat === "markdown"
    ? formatMarkdown(designSystem)
    : formatAsciiBox(designSystem);
}

export async function persistDesignSystem(
  designSystem,
  { page = null, outputDir = null, pageQuery = null } = {},
) {
  const baseDir = outputDir || process.cwd();
  const projectName = designSystem.project_name ?? "default";
  const projectSlug = projectName.toLowerCase().replace(/ /g, "-");
  const designSystemDir = join(baseDir, "design-system", projectSlug);
  const pagesDir = join(designSystemDir, "pages");
  const createdFiles = [];

  await mkdir(pagesDir, { recursive: true });

  const masterFile = join(designSystemDir, "MASTER.md");
  await writeFile(masterFile, formatMasterMd(designSystem), "utf8");
  createdFiles.push(masterFile);

  if (page) {
    const pageFile = join(
      pagesDir,
      `${page.toLowerCase().replace(/ /g, "-")}.md`,
    );
    await writeFile(
      pageFile,
      await formatPageOverrideMd(designSystem, page, pageQuery),
      "utf8",
    );
    createdFiles.push(pageFile);
  }

  return {
    status: "success",
    design_system_dir: designSystemDir,
    created_files: createdFiles,
  };
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function formatMasterMd(designSystem) {
  const project = designSystem.project_name ?? "PROJECT";
  const pattern = designSystem.pattern ?? {};
  const style = designSystem.style ?? {};
  const colors = designSystem.colors ?? {};
  const typography = designSystem.typography ?? {};
  const effects = String(designSystem.key_effects ?? "");
  const antiPatterns = String(designSystem.anti_patterns ?? "");
  const lines = [];

  lines.push("# Design System Master File", "");
  lines.push(
    "> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.",
  );
  lines.push("> If that file exists, its rules **override** this Master file.");
  lines.push("> If not, strictly follow the rules below.", "", "---", "");
  lines.push(`**Project:** ${project}`);
  lines.push(`**Generated:** ${timestamp()}`);
  lines.push(
    `**Category:** ${designSystem.category ?? "General"}`,
    "",
    "---",
    "",
  );

  lines.push("## Global Rules", "", "### Color Palette", "");
  lines.push("| Role | Hex | CSS Variable |", "|------|-----|--------------|");
  lines.push(
    `| Primary | \`${colors.primary ?? "#2563EB"}\` | \`--color-primary\` |`,
  );
  lines.push(
    `| Secondary | \`${colors.secondary ?? "#3B82F6"}\` | \`--color-secondary\` |`,
  );
  lines.push(
    `| CTA/Accent | \`${colors.cta ?? "#F97316"}\` | \`--color-cta\` |`,
  );
  lines.push(
    `| Background | \`${colors.background ?? "#F8FAFC"}\` | \`--color-background\` |`,
  );
  lines.push(
    `| Text | \`${colors.text ?? "#1E293B"}\` | \`--color-text\` |`,
    "",
  );
  if (colors.notes) lines.push(`**Color Notes:** ${colors.notes}`, "");

  lines.push("### Typography", "");
  lines.push(`- **Heading Font:** ${typography.heading ?? "Inter"}`);
  lines.push(`- **Body Font:** ${typography.body ?? "Inter"}`);
  if (typography.mood) lines.push(`- **Mood:** ${typography.mood}`);
  if (typography.google_fonts_url)
    lines.push(
      `- **Google Fonts:** [${typography.heading ?? ""} + ${typography.body ?? ""}](${typography.google_fonts_url})`,
    );
  lines.push("");
  if (typography.css_import)
    lines.push("**CSS Import:**", "```css", typography.css_import, "```", "");

  lines.push("### Spacing Variables", "");
  lines.push("| Token | Value | Usage |", "|-------|-------|-------|");
  lines.push("| `--space-xs` | `4px` / `0.25rem` | Tight gaps |");
  lines.push("| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |");
  lines.push("| `--space-md` | `16px` / `1rem` | Standard padding |");
  lines.push("| `--space-lg` | `24px` / `1.5rem` | Section padding |");
  lines.push("| `--space-xl` | `32px` / `2rem` | Large gaps |");
  lines.push("| `--space-2xl` | `48px` / `3rem` | Section margins |");
  lines.push("| `--space-3xl` | `64px` / `4rem` | Hero padding |", "");

  lines.push("### Shadow Depths", "");
  lines.push("| Level | Value | Usage |", "|-------|-------|-------|");
  lines.push("| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |");
  lines.push(
    "| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |",
  );
  lines.push(
    "| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |",
  );
  lines.push(
    "| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |",
    "",
  );
  lines.push(
    "---",
    "",
    "## Style Guidelines",
    "",
    `**Style:** ${style.name ?? "Minimalism"}`,
    "",
  );
  if (style.keywords) lines.push(`**Keywords:** ${style.keywords}`, "");
  if (style.best_for) lines.push(`**Best For:** ${style.best_for}`, "");
  if (effects) lines.push(`**Key Effects:** ${effects}`, "");

  lines.push(
    "### Page Pattern",
    "",
    `**Pattern Name:** ${pattern.name ?? ""}`,
    "",
  );
  if (pattern.conversion)
    lines.push(`- **Conversion Strategy:** ${pattern.conversion}`);
  if (pattern.cta_placement)
    lines.push(`- **CTA Placement:** ${pattern.cta_placement}`);
  lines.push(`- **Section Order:** ${pattern.sections ?? ""}`, "");

  lines.push("---", "", "## Anti-Patterns (Do NOT Use)", "");
  if (antiPatterns) {
    antiPatterns
      .split("+")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => lines.push(`- Do not use: ${item}`));
  }
  lines.push("", "### Additional Forbidden Patterns", "");
  lines.push(
    "- **Emojis as icons** - Use SVG icons (Heroicons, Lucide, Simple Icons)",
  );
  lines.push(
    "- **Missing cursor:pointer** - All clickable elements must have cursor:pointer",
  );
  lines.push(
    "- **Layout-shifting hovers** - Avoid scale transforms that shift layout",
  );
  lines.push("- **Low contrast text** - Maintain 4.5:1 minimum contrast ratio");
  lines.push(
    "- **Instant state changes** - Always use transitions (150-300ms)",
  );
  lines.push(
    "- **Invisible focus states** - Focus states must be visible for a11y",
    "",
  );

  lines.push(
    "---",
    "",
    "## Pre-Delivery Checklist",
    "",
    "Before delivering any UI code, verify:",
    "",
  );
  [
    "- [ ] No emojis used as icons (use SVG instead)",
    "- [ ] All icons from consistent icon set (Heroicons/Lucide)",
    "- [ ] `cursor-pointer` on all clickable elements",
    "- [ ] Hover states with smooth transitions (150-300ms)",
    "- [ ] Light mode: text contrast 4.5:1 minimum",
    "- [ ] Focus states visible for keyboard navigation",
    "- [ ] `prefers-reduced-motion` respected",
    "- [ ] Responsive: 375px, 768px, 1024px, 1440px",
    "- [ ] No content hidden behind fixed navbars",
    "- [ ] No horizontal scroll on mobile",
  ].forEach((item) => lines.push(item));
  lines.push("");

  return lines.join("\n");
}

export async function formatPageOverrideMd(
  designSystem,
  pageName,
  pageQuery = null,
) {
  const project = designSystem.project_name ?? "PROJECT";
  const pageTitle = pageName
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const pageOverrides = await generateIntelligentOverrides(pageName, pageQuery);
  const lines = [];

  lines.push(`# ${pageTitle} Page Overrides`, "");
  lines.push(`> **PROJECT:** ${project}`);
  lines.push(`> **Generated:** ${timestamp()}`);
  lines.push(`> **Page Type:** ${pageOverrides.page_type ?? "General"}`, "");
  lines.push(
    "> **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).",
  );
  lines.push(
    "> Only deviations from the Master are documented here. For all other rules, refer to the Master.",
    "",
    "---",
    "",
  );
  lines.push("## Page-Specific Rules", "");

  appendMapSection(
    lines,
    "Layout Overrides",
    pageOverrides.layout,
    "No overrides - use Master layout",
  );
  appendMapSection(
    lines,
    "Spacing Overrides",
    pageOverrides.spacing,
    "No overrides - use Master spacing",
  );
  appendMapSection(
    lines,
    "Typography Overrides",
    pageOverrides.typography,
    "No overrides - use Master typography",
  );
  appendMapSection(
    lines,
    "Color Overrides",
    pageOverrides.colors,
    "No overrides - use Master colors",
  );

  lines.push("### Component Overrides", "");
  appendList(
    lines,
    pageOverrides.components,
    "No overrides - use Master component specs",
  );
  lines.push("---", "", "## Page-Specific Components", "");
  appendList(
    lines,
    pageOverrides.unique_components,
    "No unique components for this page",
  );
  lines.push("---", "", "## Recommendations", "");
  appendList(
    lines,
    pageOverrides.recommendations,
    "Refer to MASTER.md for all design rules",
  );
  lines.push("");
  return lines.join("\n");
}

function appendMapSection(lines, title, values, fallback) {
  lines.push(`### ${title}`, "");
  const entries = Object.entries(values ?? {});
  if (entries.length)
    entries.forEach(([key, value]) => lines.push(`- **${key}:** ${value}`));
  else lines.push(`- ${fallback}`);
  lines.push("");
}

function appendList(lines, values, fallback) {
  if (values?.length) values.forEach((value) => lines.push(`- ${value}`));
  else lines.push(`- ${fallback}`);
  lines.push("");
}

async function generateIntelligentOverrides(pageName, pageQuery) {
  const pageLower = pageName.toLowerCase();
  const queryLower = (pageQuery ?? "").toLowerCase();
  const combinedContext = `${pageLower} ${queryLower}`;
  const [styleSearch, uxSearch, landingSearch] = await Promise.all([
    search(combinedContext, "style", 1),
    search(combinedContext, "ux", 3),
    search(combinedContext, "landing", 1),
  ]);

  const styleResults = styleSearch.results ?? [];
  const uxResults = uxSearch.results ?? [];
  const landingResults = landingSearch.results ?? [];
  const pageType = detectPageType(combinedContext, styleResults);
  const layout = {};
  const spacing = {};
  const typography = {};
  const colors = {};
  const components = [];
  const uniqueComponents = [];
  let recommendations = [];

  if (styleResults.length) {
    const style = styleResults[0];
    const keywords = (style.Keywords ?? "").toLowerCase();
    const effects = style["Effects & Animation"] ?? "";

    if (
      ["data", "dense", "dashboard", "grid"].some((keyword) =>
        keywords.includes(keyword),
      )
    ) {
      layout["Max Width"] = "1400px or full-width";
      layout.Grid = "12-column grid for data flexibility";
      spacing["Content Density"] = "High - optimize for information display";
    } else if (
      ["minimal", "simple", "clean", "single"].some((keyword) =>
        keywords.includes(keyword),
      )
    ) {
      layout["Max Width"] = "800px (narrow, focused)";
      layout.Layout = "Single column, centered";
      spacing["Content Density"] = "Low - focus on clarity";
    } else {
      layout["Max Width"] = "1200px (standard)";
      layout.Layout = "Full-width sections, centered content";
    }

    if (effects) recommendations.push(`Effects: ${effects}`);
  }

  for (const ux of uxResults) {
    if (ux.Do) recommendations.push(`${ux.Category ?? "UX"}: ${ux.Do}`);
    if (ux["Don't"]) components.push(`Avoid: ${ux["Don't"]}`);
  }

  if (landingResults.length) {
    const landing = landingResults[0];
    if (landing["Section Order"]) layout.Sections = landing["Section Order"];
    if (landing["Primary CTA Placement"])
      recommendations.push(
        `CTA Placement: ${landing["Primary CTA Placement"]}`,
      );
    if (landing["Color Strategy"]) colors.Strategy = landing["Color Strategy"];
  }

  if (!Object.keys(layout).length) {
    layout["Max Width"] = "1200px";
    layout.Layout = "Responsive grid";
  }

  if (!recommendations.length) {
    recommendations = [
      "Refer to MASTER.md for all design rules",
      "Add specific overrides as needed for this page",
    ];
  }

  return {
    page_type: pageType,
    layout,
    spacing,
    typography,
    colors,
    components,
    unique_components: uniqueComponents,
    recommendations,
  };
}

function detectPageType(context, styleResults) {
  const pagePatterns = [
    [
      [
        "dashboard",
        "admin",
        "analytics",
        "data",
        "metrics",
        "stats",
        "monitor",
        "overview",
      ],
      "Dashboard / Data View",
    ],
    [
      ["checkout", "payment", "cart", "purchase", "order", "billing"],
      "Checkout / Payment",
    ],
    [
      ["settings", "profile", "account", "preferences", "config"],
      "Settings / Profile",
    ],
    [
      ["landing", "marketing", "homepage", "hero", "home", "promo"],
      "Landing / Marketing",
    ],
    [
      ["login", "signin", "signup", "register", "auth", "password"],
      "Authentication",
    ],
    [
      ["pricing", "plans", "subscription", "tiers", "packages"],
      "Pricing / Plans",
    ],
    [["blog", "article", "post", "news", "content", "story"], "Blog / Article"],
    [["product", "item", "detail", "pdp", "shop", "store"], "Product Detail"],
    [
      ["search", "results", "browse", "filter", "catalog", "list"],
      "Search Results",
    ],
    [["empty", "404", "error", "not found", "zero"], "Empty State"],
  ];

  for (const [keywords, pageType] of pagePatterns) {
    if (keywords.some((keyword) => context.includes(keyword))) return pageType;
  }

  if (styleResults.length) {
    const bestFor = (styleResults[0]["Best For"] ?? "").toLowerCase();
    if (bestFor.includes("dashboard") || bestFor.includes("data"))
      return "Dashboard / Data View";
    if (bestFor.includes("landing") || bestFor.includes("marketing"))
      return "Landing / Marketing";
  }

  return "General";
}
