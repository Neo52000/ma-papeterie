import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import VerifyEmail from "@/views/VerifyEmail";

export default function VerifyEmailIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="VerifyEmail">
        <Suspense fallback={null}>
          <VerifyEmail />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
