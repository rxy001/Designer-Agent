import { PanelsTopLeftIcon } from "lucide-react";
import { Select } from "../ui/Select";
import type { WorkspaceSiteSummary } from "./types";

type WorkspaceSiteSelectProps = {
  sites: WorkspaceSiteSummary[];
  currentSiteId: string;
  loading?: boolean;
  onChange: (siteId: string) => void;
  disabled?: boolean;
};

export function WorkspaceSiteSelect({
  sites,
  currentSiteId,
  loading = false,
  onChange,
  disabled = false,
}: WorkspaceSiteSelectProps) {
  const hasCurrentSite = sites.some((site) => site.id === currentSiteId);

  return (
    <div className="x:flex x:items-center x:gap-2">
      <PanelsTopLeftIcon className="x:h-4 x:w-4 x:text-neutral-500" />
      <Select
        aria-label="Workspace site"
        className="x:h-9 x:w-56"
        value={hasCurrentSite ? currentSiteId : ""}
        disabled={disabled || loading || sites.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {!hasCurrentSite ? (
          <option value="" disabled>
            {sites.length === 0 ? "No workspace sites" : "Select a workspace site"}
          </option>
        ) : null}
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
