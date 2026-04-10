import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ServiceOrderConfirmationPage from "@/views/ServiceOrderConfirmationPage";

export default function ServiceOrderConfirmationPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ServiceOrderConfirmationPage">
        <Suspense fallback={null}>
          <ServiceOrderConfirmationPage />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
