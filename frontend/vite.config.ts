// project/frontend/alldone-task-list/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Force the host to 127.0.0.1 for consistency with backend
    host: "::", // MODIFIED
    port: 8080,
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
  plugins: [
    react(),
    // mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // NEW: Vitest Configuration
  test: {
    environment: 'jsdom',
    globals: true, // Allows using describe, it, expect directly without importing
    setupFiles: './src/setupTests.ts', // Path to setup file
    // Optional: Add coverage configuration
    // coverage: {
    //   provider: 'v8', // or 'istanbul'
    //   reporter: ['text', 'json', 'html'],
    // },
  },
}));