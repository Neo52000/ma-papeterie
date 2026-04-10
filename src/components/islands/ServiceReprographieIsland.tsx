import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ServiceReprographie from "@/views/ServiceReprographie";

export default function ServiceReprographieIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ServiceReprographie">
        <Suspense fallback={null}>
          <ServiceReprographie />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
