import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Index from "@/views/Index";

export default function IndexIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Index">
        <Suspense fallback={null}>
          <Index />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
