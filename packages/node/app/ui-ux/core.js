import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = join(__dirname, "./data");
export const MAX_RESULTS = 3;

export const CSV_CONFIG = {
  style: {
    file: "styles.csv",
    searchCols: [
      "Style Category",
      "Keywords",
      "Best For",
      "Type",
      "AI Prompt Keywords",
    ],
    outputCols: [
      "Style Category",
      "Type",
      "Keywords",
      "Primary Colors",
      "Effects & Animation",
      "Best For",
      "Performance",
      "Accessibility",
      "Framework Compatibility",
      "Complexity",
      "AI Prompt Keywords",
      "CSS/Technical Keywords",
      "Implementation Checklist",
      "Design System Variables",
    ],
  },
  color: {
    file: "colors.csv",
    searchCols: ["Product Type", "Notes"],
    outputCols: [
      "Product Type",
      "Primary (Hex)",
      "Secondary (Hex)",
      "CTA (Hex)",
      "Background (Hex)",
      "Text (Hex)",
      "Notes",
    ],
  },
  chart: {
    file: "charts.csv",
    searchCols: [
      "Data Type",
      "Keywords",
      "Best Chart Type",
      "Accessibility Notes",
    ],
    outputCols: [
      "Data Type",
      "Keywords",
      "Best Chart Type",
      "Secondary Options",
      "Color Guidance",
      "Accessibility Notes",
      "Library Recommendation",
      "Interactive Level",
    ],
  },
  landing: {
    file: "landing.csv",
    searchCols: [
      "Pattern Name",
      "Keywords",
      "Conversion Optimization",
      "Section Order",
    ],
    outputCols: [
      "Pattern Name",
      "Keywords",
      "Section Order",
      "Primary CTA Placement",
      "Color Strategy",
      "Conversion Optimization",
    ],
  },
  product: {
    file: "products.csv",
    searchCols: [
      "Product Type",
      "Keywords",
      "Primary Style Recommendation",
      "Key Considerations",
    ],
    outputCols: [
      "Product Type",
      "Keywords",
      "Primary Style Recommendation",
      "Secondary Styles",
      "Landing Page Pattern",
      "Dashboard Style (if applicable)",
      "Color Palette Focus",
    ],
  },
  ux: {
    file: "ux-guidelines.csv",
    searchCols: ["Category", "Issue", "Description", "Platform"],
    outputCols: [
      "Category",
      "Issue",
      "Platform",
      "Description",
      "Do",
      "Don't",
      "Code Example Good",
      "Code Example Bad",
      "Severity",
    ],
  },
  typography: {
    file: "typography.csv",
    searchCols: [
      "Font Pairing Name",
      "Category",
      "Mood/Style Keywords",
      "Best For",
      "Heading Font",
      "Body Font",
    ],
    outputCols: [
      "Font Pairing Name",
      "Category",
      "Heading Font",
      "Body Font",
      "Mood/Style Keywords",
      "Best For",
      "Google Fonts URL",
      "CSS Import",
      "Tailwind Config",
      "Notes",
    ],
  },
  icons: {
    file: "icons.csv",
    searchCols: ["Category", "Icon Name", "Keywords", "Best For"],
    outputCols: [
      "Category",
      "Icon Name",
      "Keywords",
      "Library",
      "Import Code",
      "Usage",
      "Best For",
      "Style",
    ],
  },
};

export class BM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.corpus = [];
    this.docLengths = [];
    this.avgdl = 0;
    this.idf = new Map();
    this.docFreqs = new Map();
    this.N = 0;
  }

  tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  fit(documents) {
    this.corpus = documents.map((doc) => this.tokenize(doc));
    this.N = this.corpus.length;
    if (this.N === 0) return;

    this.docLengths = this.corpus.map((doc) => doc.length);
    this.avgdl =
      this.docLengths.reduce((sum, length) => sum + length, 0) / this.N;

    for (const doc of this.corpus) {
      const seen = new Set();
      for (const word of doc) {
        if (!seen.has(word)) {
          this.docFreqs.set(word, (this.docFreqs.get(word) ?? 0) + 1);
          seen.add(word);
        }
      }
    }

    for (const [word, freq] of this.docFreqs) {
      this.idf.set(word, Math.log((this.N - freq + 0.5) / (freq + 0.5) + 1));
    }
  }

  score(query) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    this.corpus.forEach((doc, idx) => {
      let score = 0;
      const docLen = this.docLengths[idx];
      const termFreqs = new Map();

      for (const word of doc) {
        termFreqs.set(word, (termFreqs.get(word) ?? 0) + 1);
      }

      for (const token of queryTokens) {
        if (!this.idf.has(token)) continue;
        const tf = termFreqs.get(token) ?? 0;
        const idf = this.idf.get(token);
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf + this.k1 * (1 - this.b + (this.b * docLen) / this.avgdl);
        score += (idf * numerator) / denominator;
      }

      scores.push([idx, score]);
    });

    return scores.sort((a, b) => b[1] - a[1]);
  }
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records
    .filter((record) => record.some((value) => value !== ""))
    .map((record) =>
      Object.fromEntries(
        headers.map((header, index) => [header, record[index] ?? ""]),
      ),
    );
}

async function loadCsv(filepath) {
  const text = await readFile(filepath, "utf8");
  return parseCsv(text);
}

async function searchCsv(filepath, searchCols, outputCols, query, maxResults) {
  let data;
  try {
    data = await loadCsv(filepath);
  } catch {
    return [];
  }

  const documents = data.map((row) =>
    searchCols.map((col) => String(row[col] ?? "")).join(" "),
  );
  const bm25 = new BM25();
  bm25.fit(documents);
  const ranked = bm25.score(query);

  const results = [];
  for (const [idx, score] of ranked.slice(0, maxResults)) {
    if (score > 0) {
      const row = data[idx];
      results.push(
        Object.fromEntries(
          outputCols
            .filter((col) => col in row)
            .map((col) => [col, row[col] ?? ""]),
        ),
      );
    }
  }
  return results;
}

export function detectDomain(query) {
  const queryLower = query.toLowerCase();
  const domainKeywords = {
    color: ["color", "palette", "hex", "#", "rgb"],
    chart: [
      "chart",
      "graph",
      "visualization",
      "trend",
      "bar",
      "pie",
      "scatter",
      "heatmap",
      "funnel",
    ],
    landing: [
      "landing",
      "page",
      "cta",
      "conversion",
      "hero",
      "testimonial",
      "pricing",
      "section",
    ],
    product: [
      "saas",
      "ecommerce",
      "e-commerce",
      "fintech",
      "healthcare",
      "gaming",
      "portfolio",
      "crypto",
      "dashboard",
    ],
    style: [
      "style",
      "design",
      "ui",
      "minimalism",
      "glassmorphism",
      "neumorphism",
      "brutalism",
      "dark mode",
      "flat",
      "aurora",
      "prompt",
      "css",
      "implementation",
      "variable",
      "checklist",
      "tailwind",
    ],
    ux: [
      "ux",
      "usability",
      "accessibility",
      "wcag",
      "touch",
      "scroll",
      "animation",
      "keyboard",
      "navigation",
      "mobile",
    ],
    typography: ["font", "typography", "heading", "serif", "sans"],
    icons: [
      "icon",
      "icons",
      "lucide",
      "heroicons",
      "symbol",
      "glyph",
      "pictogram",
      "svg icon",
    ],
  };

  const scores = Object.fromEntries(
    Object.entries(domainKeywords).map(([domain, keywords]) => [
      domain,
      keywords.filter((keyword) => queryLower.includes(keyword)).length,
    ]),
  );
  const best = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
  return scores[best] > 0 ? best : "style";
}

export async function search(query, domain = null, maxResults = MAX_RESULTS) {
  const resolvedDomain = domain ?? detectDomain(query);
  const config = CSV_CONFIG[resolvedDomain] ?? CSV_CONFIG.style;
  const filepath = join(DATA_DIR, config.file);
  const results = await searchCsv(
    filepath,
    config.searchCols,
    config.outputCols,
    query,
    maxResults,
  );

  if (results.length === 0) {
    try {
      await readFile(filepath);
    } catch {
      return { error: `File not found: ${filepath}`, domain: resolvedDomain };
    }
  }

  return {
    domain: resolvedDomain,
    query,
    file: config.file,
    count: results.length,
    results,
  };
}
