import {
  EyeIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import type {
  ConnectionStatus,
  Viewport,
  WorkspaceSiteSummary,
} from "./types";
import { WorkspaceSiteSelect } from "./WorkspaceSiteSelect";

type TopBarProps = {
  title: string;
  viewport: Viewport;
  connectionStatus: ConnectionStatus;
  previewLoading: boolean;
  previewError?: string;
  workspaceSites: WorkspaceSiteSummary[];
  currentSiteId: string;
  workspaceSiteLoading?: boolean;
  onPreview: () => void;
  onViewportChange: (viewport: Viewport) => void;
  onSiteChange: (siteId: string) => void;
  siteSwitchDisabled?: boolean;
};

const viewportItems: Array<{
  value: Viewport;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "desktop", label: "Desktop", icon: MonitorIcon },
  { value: "tablet", label: "Tablet", icon: TabletIcon },
  { value: "mobile", label: "Mobile", icon: SmartphoneIcon },
];

export function TopBar({
  title,
  viewport,
  connectionStatus,
  previewLoading,
  previewError,
  workspaceSites,
  currentSiteId,
  workspaceSiteLoading,
  onPreview,
  onViewportChange,
  onSiteChange,
  siteSwitchDisabled,
}: TopBarProps) {
  const connected = connectionStatus === "connected";

  return (
    <header className="x:flex x:h-14 x:shrink-0 x:items-center x:justify-between x:border-b x:border-neutral-200 x:bg-white x:px-4">
      <div className="x:flex x:min-w-0 x:items-center x:gap-3">
        <div className="x:flex x:h-8 x:w-8 x:items-center x:justify-center x:rounded-md x:bg-neutral-950 x:text-xs x:font-semibold x:text-white">
          AI
        </div>
        <div className="x:min-w-0">
          <h1 className="x:truncate x:text-sm x:font-semibold x:text-neutral-950">
            {title}
          </h1>
          <div className="x:flex x:items-center x:gap-1 x:text-xs x:text-neutral-500">
            {connected ? (
              <WifiIcon className="x:h-3.5 x:w-3.5 x:text-emerald-600" />
            ) : (
              <WifiOffIcon className="x:h-3.5 x:w-3.5 x:text-neutral-400" />
            )}
            <span>{connectionStatus}</span>
          </div>
        </div>
      </div>
      <div className="x:flex x:items-center x:gap-3">
        <WorkspaceSiteSelect
          sites={workspaceSites}
          currentSiteId={currentSiteId}
          loading={workspaceSiteLoading}
          disabled={siteSwitchDisabled}
          onChange={onSiteChange}
        />
        <div className="x:flex x:rounded-md x:border x:border-neutral-200 x:bg-neutral-50 x:p-1">
          {viewportItems.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                className={cn(
                  "x:h-7 x:px-2",
                  viewport === item.value &&
                    "x:bg-white x:text-neutral-950 x:shadow-sm",
                )}
                onClick={() => onViewportChange(item.value)}
              >
                <Icon className="x:h-4 x:w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={previewLoading}
          title={previewError}
          onClick={onPreview}
        >
          <EyeIcon className="x:h-4 x:w-4" />
          {previewLoading
            ? "Generating..."
            : previewError
              ? "Retry Preview"
              : "Preview"}
        </Button>
      </div>
    </header>
  );
}
