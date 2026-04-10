import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ListesScolaires from "@/views/ListesScolaires";

export default function ListesScolairesIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ListesScolaires">
        <Suspense fallback={null}>
          <ListesScolaires />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
