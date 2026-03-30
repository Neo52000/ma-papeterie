import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorRetry({
  message = "Une erreur est survenue lors du chargement.",
  onRetry,
}: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3" role="alert">
      <AlertTriangle className="h-10 w-10 text-destructive/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}
