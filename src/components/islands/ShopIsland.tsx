import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Shop from "@/views/Shop";

export default function ShopIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Shop">
        <Suspense fallback={null}>
          <Shop />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
