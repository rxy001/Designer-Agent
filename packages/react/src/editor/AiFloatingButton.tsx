import { SparklesIcon } from "lucide-react";
import { Button } from "../ui/Button";

export function AiFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon"
      className="x:fixed x:bottom-6 x:right-6 x:z-50 x:h-12 x:w-12 x:rounded-full x:shadow-lg"
      onClick={onClick}
      aria-label="Open AI assistant"
    >
      <SparklesIcon className="x:h-5 x:w-5" />
    </Button>
  );
}
