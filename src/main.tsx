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

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);