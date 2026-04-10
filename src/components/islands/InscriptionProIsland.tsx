import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import InscriptionPro from "@/views/InscriptionPro";

export default function InscriptionProIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="InscriptionPro">
        <Suspense fallback={null}>
          <InscriptionPro />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
