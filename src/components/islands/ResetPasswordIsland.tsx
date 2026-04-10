import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ResetPassword from "@/views/ResetPassword";

export default function ResetPasswordIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ResetPassword">
        <Suspense fallback={null}>
          <ResetPassword />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
