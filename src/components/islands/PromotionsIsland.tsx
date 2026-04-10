import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Promotions from "@/views/Promotions";

export default function PromotionsIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Promotions">
        <Suspense fallback={null}>
          <Promotions />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
