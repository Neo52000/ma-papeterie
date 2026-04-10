import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Consommables from "@/views/Consommables";

export default function ConsommablesIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Consommables">
        <Suspense fallback={null}>
          <Consommables />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
