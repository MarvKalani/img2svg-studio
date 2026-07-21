import { defineConfig } from "vite";
import { versionedAssetFileNames } from "./src/release/app-version";

const webMcpHeaders = {
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy": "tools=(self)",
};
const versionedOutput = {
  assetFileNames: versionedAssetFileNames.asset,
  chunkFileNames: versionedAssetFileNames.chunk,
  entryFileNames: versionedAssetFileNames.entry,
};

export default defineConfig({
  build: {
    // The user-triggered ML runtime stays isolated from the initial application chunk.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: versionedOutput,
    },
  },
  preview: { headers: webMcpHeaders },
  server: { headers: webMcpHeaders },
  worker: {
    rollupOptions: {
      output: versionedOutput,
    },
  },
});
