import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import OrderConfirmation from "@/views/OrderConfirmation";

export default function OrderConfirmationIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="OrderConfirmation">
        <Suspense fallback={null}>
          <OrderConfirmation />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
