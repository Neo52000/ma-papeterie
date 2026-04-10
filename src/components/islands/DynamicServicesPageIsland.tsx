import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import DynamicServicesPage from "@/views/DynamicServicesPage";

export default function DynamicServicesPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="DynamicServicesPage">
        <Suspense fallback={null}>
          <DynamicServicesPage />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
