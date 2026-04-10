import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Catalogue from "@/views/Catalogue";

export default function CatalogueIsland(props: Record<string, unknown>) {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Catalogue">
        <Suspense fallback={null}>
          <Catalogue {...(props as any)} />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
