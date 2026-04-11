/**
 * IslandProviders — Wrapper de providers pour les React Islands Astro.
 *
 * Chaque island Astro est un arbre React indépendant sans contexte partagé.
 * Ce composant fournit les providers nécessaires (QueryClient, Helmet, Tooltip)
 * pour que les hooks TanStack Query, react-helmet-async et shadcn fonctionnent.
 *
 * Il initialise aussi le store auth Zustand (onAuthStateChange listener) via
 * AuthInitializer — garantit que signIn() met bien à jour le store React.
 */
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/authStore";
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

/**
 * Initialise le listener Supabase auth (onAuthStateChange) depuis le cycle
 * de vie React. Sans cela, signIn() ne met pas à jour le store Zustand car
 * aucun listener n'est enregistré (AuthInit n'est que dans App.tsx / admin SPA).
 * La guard _initialized garantit une seule initialisation même si plusieurs
 * islands montent sur la même page.
 */
function AuthInitializer(): null {
  useEffect(() => {
    return useAuthStore.getState().init();
  }, []);
  return null;
}

interface IslandProvidersProps {
  children: ReactNode;
}

export default function IslandProviders({ children }: IslandProvidersProps) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthInitializer />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
