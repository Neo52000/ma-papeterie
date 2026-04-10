import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ServiceDeveloppementPhoto from "@/views/ServiceDeveloppementPhoto";

export default function ServiceDeveloppementPhotoIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ServiceDeveloppementPhoto">
        <Suspense fallback={null}>
          <ServiceDeveloppementPhoto />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
