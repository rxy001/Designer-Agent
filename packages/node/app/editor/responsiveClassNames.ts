import { agentConfig } from "../agentConfig.ts";

const breakpointNames = ["sm", "md", "lg", "xl", "2xl"] as const;

const viewportToContainerVariant = new Map<string, string>();
const containerToViewportVariant = new Map<string, string>();

for (const name of breakpointNames) {
  const value = agentConfig.responsive.breakpoints[name];

  registerVariant(name, `@min-[${value}]`);
  registerVariant(`max-${name}`, `@max-[${value}]`);
}

const viewportVariantPattern = new RegExp(
  `(^|:)(max-)?(${breakpointNames.join("|")})(?=:)`,
  "g",
);
const containerVariantPattern = new RegExp(
  `(^|:)(${Array.from(containerToViewportVariant.keys())
    .map(escapeRegExp)
    .join("|")})(?=:)`,
  "g",
);

export function toContainerClassName(className: string) {
  return className
    .split(/\s+/)
    .map((token) =>
      token.replace(
        viewportVariantPattern,
        (_match, prefix: string, max: string | undefined, name: string) => {
          const viewportVariant = `${max ?? ""}${name}`;
          return `${prefix}${viewportToContainerVariant.get(viewportVariant)}`;
        },
      ),
    )
    .join(" ");
}

export function toViewportClassName(value: unknown) {
  if (typeof value !== "string") return value;

  return value
    .split(/\s+/)
    .map((token) =>
      token.replace(
        containerVariantPattern,
        (_match, prefix: string, variant: string) =>
          `${prefix}${containerToViewportVariant.get(variant)}`,
      ),
    )
    .map((token) =>
      token.replace(
        /(^|:)@(max-)?(sm|md|lg|xl|2xl)(?=:)/g,
        (_match, prefix: string, max: string | undefined, name: string) =>
          `${prefix}${max ?? ""}${name}`,
      ),
    )
    .join(" ");
}

export function normalizeResponsiveVariant(variant: string) {
  return containerToViewportVariant.get(variant) ?? variant.replace(/^@/, "");
}

function registerVariant(viewportVariant: string, containerVariant: string) {
  viewportToContainerVariant.set(viewportVariant, containerVariant);
  containerToViewportVariant.set(containerVariant, viewportVariant);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
