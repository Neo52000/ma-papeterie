import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ShopifyProductPage from "@/components/shopify/ShopifyProductPage";

export default function ShopifyProductPageIsland({ handle }: { handle: string }) {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ShopifyProductPage">
        <Suspense fallback={null}>
          <ShopifyProductPage handle={handle} />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
