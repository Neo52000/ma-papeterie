/**
 * IslandProviders — Wrapper de providers pour les React Islands Astro.
 *
 * Chaque island Astro est un arbre React indépendant sans contexte partagé.
 * Ce composant fournit les providers nécessaires (QueryClient, Helmet, Tooltip)
 * pour que les hooks TanStack Query, react-helmet-async et shadcn fonctionnent.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface IslandProvidersProps {
  children: ReactNode;
}

export default function IslandProviders({ children }: IslandProvidersProps) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
