import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Auth from "@/views/Auth";

export default function AuthIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Auth">
        <Suspense fallback={null}>
          <Auth />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
