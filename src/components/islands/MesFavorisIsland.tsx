import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import MesFavoris from "@/views/MesFavoris";

export default function MesFavorisIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="MesFavoris">
        <Suspense fallback={null}>
          <MesFavoris />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
