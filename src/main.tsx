import React from "react";
import { createRoot } from "react-dom/client";
import { initSentry, captureException } from "./lib/sentry-config";
import App from "./App.tsx";
import "./index.css";

initSentry();

window.addEventListener('unhandledrejection', (event) => {
  captureException(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  );
});

// ── Core Web Vitals monitoring ─────────────────────────────────────────────
import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
  const report = (metric: { name: string; value: number; rating: string }) => {
    if (metric.rating === "poor") {
      captureException(new Error(`Poor CWV: ${metric.name} = ${metric.value}`));
    }
  };
  onCLS(report);
  onINP(report);
  onLCP(report);
});

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);