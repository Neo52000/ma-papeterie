import { useState, useEffect, useCallback, useRef } from "react";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

const COOKIE_NAME = "exit_popup_shown";
const STORAGE_KEY = "newsletter_subscribed";
const ACTIVATION_DELAY_MS = 10_000;

interface UseExitIntentReturn {
  shouldShow: boolean;
  dismiss: () => void;
}

export function useExitIntent(): UseExitIntentReturn {
  const [shouldShow, setShouldShow] = useState(false);
  const triggeredRef = useRef(false);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    setCookie(COOKIE_NAME, "1", 7);
  }, []);

  useEffect(() => {
    const canTrigger = (): boolean => {
      if (triggeredRef.current) return false;
      if (getCookie(COOKIE_NAME)) return false;
      if (localStorage.getItem(STORAGE_KEY) === "true") return false;
      const path = window.location.pathname;
      if (path.includes("/checkout") || path.includes("/commande")) return false;
      if (document.hidden) return false;
      return true;
    };

    const trigger = () => {
      if (!canTrigger()) return;
      triggeredRef.current = true;
      setShouldShow(true);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) {
        trigger();
      }
    };

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const threshold = document.body.scrollHeight * 0.7;
      if (scrollPosition >= threshold) {
        trigger();
      }
    };

    // Don't set up listeners if already blocked
    if (getCookie(COOKIE_NAME) || localStorage.getItem(STORAGE_KEY) === "true") {
      return;
    }

    const timer = setTimeout(() => {
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, ACTIVATION_DELAY_MS);

    return () => {
      clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { shouldShow, dismiss };
}
