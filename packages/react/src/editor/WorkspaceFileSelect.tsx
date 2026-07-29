import { FileCode2Icon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { Select } from "../ui/Select";
import type { WorkspaceJsxFile } from "./types";

type WorkspaceFileSelectProps = {
  files: WorkspaceJsxFile[];
  value?: string;
  loading: boolean;
  error?: string;
  onChange: (path: string) => void;
};

export function WorkspaceFileSelect({
  files,
  value,
  loading,
  error,
  onChange,
}: WorkspaceFileSelectProps) {
  return (
    <div className="x:flex x:items-center x:gap-2">
      {loading ? (
        <LoaderCircleIcon className="x:h-4 x:w-4 x:animate-spin x:text-neutral-500" />
      ) : (
        <FileCode2Icon className="x:h-4 x:w-4 x:text-neutral-500" />
      )}
      <Select
        aria-label="Workspace JSX file"
        className="x:h-9 x:w-56"
        value={value ?? ""}
        disabled={loading || files.length === 0}
        title={error}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          {files.length === 0 ? "No JSX files" : "Select JSX file"}
        </option>
        {files.map((file) => (
          <option key={file.path} value={file.path}>
            {file.path}
          </option>
        ))}
      </Select>
      {error ? (
        <TriangleAlertIcon
          aria-label={error}
          className="x:h-4 x:w-4 x:text-red-600"
        />
      ) : null}
    </div>
  );
}
