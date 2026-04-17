import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Index from "@/views/Index";

/**
 * Homepage interactive island. Header and Footer are provided by MainLayout
 * (HeaderIsland / FooterIsland in the Astro layout) so they remain visible
 * even if this island fails to hydrate or a child component throws.
 */
export default function IndexIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Index">
        <Suspense fallback={<div className="min-h-screen" />}>
          <main id="main-content">
            <Index />
          </main>
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
