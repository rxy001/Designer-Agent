#!/usr/bin/env node
import { CSV_CONFIG, MAX_RESULTS, search } from "./core.js";
import { generateDesignSystem } from "./design-system.js";

function printHelp() {
  console.log(`UI/UX Pro Max Search - Node.js BM25 search engine for UI/UX style guides

Usage:
  node src/cli.js "<query>" [--domain <domain>] [--max-results 3]
  node src/cli.js "<query>" --design-system [-p "Project Name"]
  node src/cli.js "<query>" --design-system --persist [-p "Project Name"] [--page "dashboard"]

Domains: ${Object.keys(CSV_CONFIG).join(", ")}
`);
}

function parseArgs(argv) {
  const args = {
    query: null,
    domain: null,
    maxResults: MAX_RESULTS,
    json: false,
    designSystem: false,
    projectName: null,
    format: "ascii",
    persist: false,
    page: null,
    outputDir: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];

    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--domain" || arg === "-d") args.domain = next();
    else if (arg === "--max-results" || arg === "-n")
      args.maxResults = Number.parseInt(next(), 10);
    else if (arg === "--json") args.json = true;
    else if (arg === "--design-system" || arg === "-ds")
      args.designSystem = true;
    else if (arg === "--project-name" || arg === "-p")
      args.projectName = next();
    else if (arg === "--format" || arg === "-f") args.format = next();
    else if (arg === "--persist") args.persist = true;
    else if (arg === "--page") args.page = next();
    else if (arg === "--output-dir" || arg === "-o") args.outputDir = next();
    else if (!args.query) args.query = arg;
    else args.query += ` ${arg}`;
  }

  return args;
}

function validateArgs(args) {
  if (args.help) return null;
  if (!args.query) return "Missing query. Run with --help for usage.";
  if (args.domain && !(args.domain in CSV_CONFIG)) {
    return `Unknown domain: ${args.domain}. Available: ${Object.keys(CSV_CONFIG).join(", ")}`;
  }
  if (!Number.isFinite(args.maxResults) || args.maxResults < 1) {
    return "--max-results must be a positive integer.";
  }
  if (!["ascii", "markdown"].includes(args.format)) {
    return "--format must be ascii or markdown.";
  }
  return null;
}

export function formatOutput(result) {
  if (result.error) return `Error: ${result.error}`;

  const output = [];
  output.push("## UI Pro Max Search Results");
  output.push(`**Domain:** ${result.domain} | **Query:** ${result.query}`);
  output.push(
    `**Source:** ${result.file} | **Found:** ${result.count} results\n`,
  );

  result.results.forEach((row, index) => {
    output.push(`### Result ${index + 1}`);
    for (const [key, value] of Object.entries(row)) {
      const valueString =
        String(value).length > 300
          ? `${String(value).slice(0, 300)}...`
          : String(value);
      output.push(`- **${key}:** ${valueString}`);
    }
    output.push("");
  });

  return output.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const error = validateArgs(args);

  if (args.help) {
    printHelp();
    return;
  }

  if (error) {
    console.error(`Error: ${error}`);
    process.exitCode = 1;
    return;
  }

  if (args.designSystem) {
    const result = await generateDesignSystem(
      args.query,
      args.projectName,
      args.format,
      {
        persist: args.persist,
        page: args.page,
        outputDir: args.outputDir,
      },
    );
    console.log(result);

    if (args.persist) {
      const projectSlug = args.projectName
        ? args.projectName.toLowerCase().replace(/ /g, "-")
        : args.query.toLowerCase().replace(/ /g, "-");
      console.log("\n" + "=".repeat(60));
      console.log(`Design system persisted to design-system/${projectSlug}/`);
      console.log(
        `   design-system/${projectSlug}/MASTER.md (Global Source of Truth)`,
      );
      if (args.page) {
        const pageFilename = args.page.toLowerCase().replace(/ /g, "-");
        console.log(
          `   design-system/${projectSlug}/pages/${pageFilename}.md (Page Overrides)`,
        );
      }
      console.log("");
      console.log(
        `Usage: When building a page, check design-system/${projectSlug}/pages/[page].md first.`,
      );
      console.log(
        "   If exists, its rules override MASTER.md. Otherwise, use MASTER.md.",
      );
      console.log("=".repeat(60));
    }
    return;
  }

  const result = await search(args.query, args.domain, args.maxResults);

  console.log(
    args.json ? JSON.stringify(result, null, 2) : formatOutput(result),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
