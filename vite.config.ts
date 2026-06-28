import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const tauriHost = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: tauriHost || false,
    hmr: tauriHost
      ? {
          protocol: 'ws',
          host: tauriHost,
          port: 5174,
        }
      : undefined,
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
  plugins: [react(), viteSingleFile()],
})
