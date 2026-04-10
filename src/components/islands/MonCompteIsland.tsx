import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import MonCompte from "@/views/MonCompte";

export default function MonCompteIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="MonCompte">
        <Suspense fallback={null}>
          <MonCompte />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
