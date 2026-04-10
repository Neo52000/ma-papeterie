/**
 * IslandErrorBoundary — Error Boundary dédié aux React Islands Astro.
 * Empêche qu'un crash dans un island ne laisse une page blanche.
 */
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class IslandErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const name = this.props.name ?? "Unknown Island";
    console.error(`[IslandErrorBoundary] Crash in "${name}":`, error, info.componentStack);
    if (typeof window !== "undefined") {
      import("@/lib/sentry-config")
        .then(({ captureException }) => captureException(error))
        .catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full py-4 text-center text-sm text-muted-foreground">
          <p>Un problème est survenu lors du chargement de cette section.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-primary underline hover:no-underline text-xs"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default IslandErrorBoundary;
