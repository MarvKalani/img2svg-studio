import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // The user-triggered ML runtime stays isolated from the initial application chunk.
    chunkSizeWarningLimit: 900,
  },
});
