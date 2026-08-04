export function getBrokenImageUrls(inspection: {
  blockingIssues: Array<Record<string, unknown>>;
}) {
  const urls = new Set<string>();

  for (const issue of inspection.blockingIssues) {
    if (issue.code !== "layout_image_issue") {
      continue;
    }
    const image = asRecord(issue.image);
    const imageIssues = Array.isArray(image?.issues) ? image.issues : [];
    if (!imageIssues.includes("broken-image")) {
      continue;
    }
    if (typeof image?.src === "string" && image.src.length > 0) {
      urls.add(image.src);
    }
  }

  return [...urls].sort();
}

export function replaceBrokenImageUrls(
  source: string,
  brokenUrls: string[],
  placeholderSrc: string,
) {
  let nextSource = source;
  const replacedUrls: string[] = [];

  for (const url of brokenUrls) {
    if (url === placeholderSrc || !nextSource.includes(url)) {
      continue;
    }
    nextSource = nextSource.split(url).join(placeholderSrc);
    replacedUrls.push(url);
  }

  return {
    source: nextSource,
    replacedUrls,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}
