import { defineConfig } from "vite";

const webMcpHeaders = {
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy": "tools=(self)",
};

export default defineConfig({
  build: {
    // The user-triggered ML runtime stays isolated from the initial application chunk.
    chunkSizeWarningLimit: 900,
  },
  preview: { headers: webMcpHeaders },
  server: { headers: webMcpHeaders },
});
