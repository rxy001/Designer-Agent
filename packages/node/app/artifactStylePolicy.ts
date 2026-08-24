export type ArtifactStyleIssue = {
  code: string;
  message: string;
};

const viewportRelativeFontSizePattern =
  /\btext-\[[^\]\r\n]*(?:d|s|l)?v(?:w|h|min|max)\b[^\]\r\n]*\]/i;

/**
 * Viewport units resolve against the editor application's viewport, not the
 * fixed-width Artifact canvas. They therefore produce different font sizes in
 * the editor and in the standalone preview.
 */
export function inspectViewportRelativeFontSizing(
  source: string,
): ArtifactStyleIssue[] {
  if (!viewportRelativeFontSizePattern.test(source)) {
    return [];
  }

  return [
    {
      code: "viewport_relative_font_size",
      message:
        "Font sizes must not use viewport-relative units (vw, vh, vmin, vmax, or their dynamic variants), including inside clamp(). Use explicit desktop, tablet, and mobile Tailwind text-size utilities instead, for example text-[76px] sm:max-lg:text-[56px] max-sm:text-[42px].",
    },
  ];
}
