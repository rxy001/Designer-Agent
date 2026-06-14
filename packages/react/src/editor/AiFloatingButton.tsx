import { SparklesIcon } from "lucide-react";
import { Button } from "../ui/Button";

export function AiFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
      onClick={onClick}
      aria-label="Open AI assistant"
    >
      <SparklesIcon className="h-5 w-5" />
    </Button>
  );
}
