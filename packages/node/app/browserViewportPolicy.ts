export type BrowserViewportExpectation = {
  name: string;
  width: number;
  height: number;
  emulateViewport?: string;
};

export type BrowserActualViewport = {
  innerWidth: number;
  innerHeight: number;
  clientWidth: number;
  clientHeight: number;
  visualViewportWidth?: number;
  visualViewportHeight?: number;
  devicePixelRatio: number;
};

export function selectRepairViewportNames<T extends string>({
  all,
  requested,
  affected,
  pending,
  forceAll = false,
}: {
  all: readonly T[];
  requested?: readonly T[];
  affected?: readonly T[];
  pending?: readonly T[];
  forceAll?: boolean;
}) {
  const selectKnown = (values: readonly T[] | undefined) => {
    const selected = new Set(values ?? []);
    return all.filter((name) => selected.has(name));
  };

  if (forceAll) return [...all];

  const pendingNames = selectKnown(pending);
  if (pendingNames.length > 0) return pendingNames;

  const requestedNames = selectKnown(requested);
  if (requestedNames.length > 0 && requestedNames.length < all.length) {
    return requestedNames;
  }

  const affectedNames = selectKnown(affected);
  if (affectedNames.length > 0 && affectedNames.length < all.length) {
    return affectedNames;
  }

  return requestedNames.length > 0 ? requestedNames : [...all];
}

export function buildViewportSizeIssues(
  actualViewport: BrowserActualViewport | undefined,
  viewport: BrowserViewportExpectation,
) {
  if (!actualViewport) {
    return [
      {
        code: "browser_viewport_size_unknown",
        message:
          "Could not read the browser viewport size after applying the requested viewport.",
      },
    ];
  }

  if (doesActualViewportMatch(actualViewport, viewport)) return [];

  const reportedViewport = viewport.emulateViewport
    ? `${actualViewport.clientWidth}x${actualViewport.clientHeight} client, ${actualViewport.visualViewportWidth ?? "unknown"}x${actualViewport.visualViewportHeight ?? "unknown"} visual, DPR ${actualViewport.devicePixelRatio}`
    : `${actualViewport.innerWidth}x${actualViewport.innerHeight}`;

  return [
    {
      code: viewport.emulateViewport
        ? "browser_mobile_emulation_failed"
        : "browser_viewport_size_mismatch",
      message: `Requested ${viewport.width}x${viewport.height}, but the browser reported ${reportedViewport}. The browser evidence is not valid for this viewport.`,
      requested: { width: viewport.width, height: viewport.height },
      actual: actualViewport,
    },
  ];
}

export function doesActualViewportMatch(
  actualViewport: BrowserActualViewport,
  viewport: BrowserViewportExpectation,
) {
  const innerMatches =
    actualViewport.innerWidth === viewport.width &&
    actualViewport.innerHeight === viewport.height;
  if (!viewport.emulateViewport) return innerMatches;

  const expectedDpr = readExpectedDevicePixelRatio(viewport.emulateViewport);
  return (
    actualViewport.clientWidth === viewport.width &&
    actualViewport.clientHeight === viewport.height &&
    actualViewport.visualViewportWidth === viewport.width &&
    actualViewport.visualViewportHeight === viewport.height &&
    actualViewport.devicePixelRatio === expectedDpr
  );
}

function readExpectedDevicePixelRatio(value: string) {
  const match = value.match(/^\d+x\d+x([\d.]+)/);
  return match ? Number(match[1]) : 1;
}
