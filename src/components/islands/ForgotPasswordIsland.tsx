import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ForgotPassword from "@/views/ForgotPassword";

export default function ForgotPasswordIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ForgotPassword">
        <Suspense fallback={null}>
          <ForgotPassword />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
