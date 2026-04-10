import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import tailwind from "@astrojs/tailwind"
import netlify from "@astrojs/netlify"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://ma-papeterie.fr",
  output: "server", // SSR default — react-router needs browser context, prerendering crashes
  adapter: netlify(),
  integrations: [
    react(), // React Islands support
    tailwind({
      applyBaseStyles: false, // Tailwind (base styles in global.css)
    }),
    sitemap({
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/pro/") &&
        !page.includes("/auth") &&
        !page.includes("/checkout") &&
        !page.includes("/mon-compte"),
    }),
  ],
  vite: {
    resolve: {
      alias: { "@": "/src" },
    },
    define: {
      // Injected at build time — used by AdminLayout to display last deploy date.
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      target: "esnext",
      cssCodeSplit: false,
    },
  },
});
