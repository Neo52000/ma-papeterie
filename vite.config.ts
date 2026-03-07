/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

// Date du dernier commit git (ou now() en fallback)
function getBuildDate(): string {
  try {
    return execSync("git log -1 --format=%cI").toString().trim();
  } catch {
    return new Date().toISOString();
  }
}

// Plugin personnalisé pour ignorer exceljs warnings
const ignoreExcelJsPlugin = {
  name: 'ignore-exceljs-warnings',
  apply: 'build' as const,
  resolveId(id: string) {
    if (id === 'exceljs') {
      return path.resolve(__dirname, './src/lib/exceljs-stub.ts');
    }
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_DATE__: JSON.stringify(getBuildDate()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    ignoreExcelJsPlugin,
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      external: ['exceljs'],  // Mark exceljs as external to prevent resolution errors
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
