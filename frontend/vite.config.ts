/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  // vue プラグインは csv-json feature の Vue 実装例（*.vue）のためだけに入れている。
  plugins: [react(), vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})
