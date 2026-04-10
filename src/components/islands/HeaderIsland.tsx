import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Header from "@/components/layout/Header";

export default function HeaderIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Header">
        <Header />
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
