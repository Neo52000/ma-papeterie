import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import DynamicPage from "@/views/DynamicPage";

export default function DynamicPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="DynamicPage">
        <Suspense fallback={null}>
          <DynamicPage />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
