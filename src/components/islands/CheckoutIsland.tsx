import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Checkout from "@/views/Checkout";

export default function CheckoutIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Checkout">
        <Suspense fallback={null}>
          <Checkout />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
