import {
  EyeIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { cn } from "../ui/cn";
import type { ConnectionStatus, DesignSystemOption, Viewport } from "./types";

type TopBarProps = {
  title: string;
  viewport: Viewport;
  connectionStatus: ConnectionStatus;
  designSystemId: number;
  designSystemOptions: DesignSystemOption[];
  previewURL?: string;
  onViewportChange: (viewport: Viewport) => void;
  onDesignSystemChange: (id: number) => void;
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
  designSystemId,
  designSystemOptions,
  previewURL,
  onViewportChange,
  onDesignSystemChange,
}: TopBarProps) {
  const connected = connectionStatus === "connected";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950 text-xs font-semibold text-white">
          AI
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-neutral-950">
            {title}
          </h1>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            {connected ? (
              <WifiIcon className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <WifiOffIcon className="h-3.5 w-3.5 text-neutral-400" />
            )}
            <span>{connectionStatus}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Select
          className="w-48"
          aria-label="Design system"
          value={designSystemId}
          onChange={(event) => onDesignSystemChange(Number(event.target.value))}
        >
          {designSystemOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </Select>
        <div className="flex rounded-md border border-neutral-200 bg-neutral-50 p-1">
          {viewportItems.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2",
                  viewport === item.value && "bg-white text-neutral-950 shadow-sm",
                )}
                onClick={() => onViewportChange(item.value)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!previewURL}
          onClick={() => previewURL && window.open(previewURL, "_blank")}
        >
          <EyeIcon className="h-4 w-4" />
          Preview
        </Button>
      </div>
    </header>
  );
}
