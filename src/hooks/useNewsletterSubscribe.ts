import { useState, useCallback } from "react";

export type NewsletterSource = "footer" | "exit_popup" | "checkout" | "liste_scolaire";

const STORAGE_KEY = "newsletter_subscribed";

interface UseNewsletterSubscribeReturn {
  subscribe: (email: string, source: NewsletterSource, attributes?: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  errorMessage: string | null;
  isAlreadySubscribed: boolean;
  reset: () => void;
}

export function useNewsletterSubscribe(): UseNewsletterSubscribeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setErrorMessage(null);
  }, []);

  const subscribe = useCallback(
    async (email: string, source: NewsletterSource, attributes?: Record<string, string>) => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);
      setIsSuccess(false);

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/newsletter-subscribe`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source, attributes }),
        });

        const data = await response.json();

        if (!response.ok) {
          setIsError(true);
          setErrorMessage(data?.error ?? "Une erreur est survenue");
          return;
        }

        setIsSuccess(true);
        localStorage.setItem(STORAGE_KEY, "true");
        setIsAlreadySubscribed(true);
      } catch {
        setIsError(true);
        setErrorMessage("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    subscribe,
    isLoading,
    isSuccess,
    isError,
    errorMessage,
    isAlreadySubscribed,
    reset,
  };
}
