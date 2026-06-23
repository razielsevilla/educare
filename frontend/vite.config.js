import { defineConfig } from 'vite'

export default defineConfig({
  // Expose dev server on local network so you can open on a real phone via WiFi
  server: {
    host: true,
    port: 5173,
  },
  // Build output goes to dist/ — this is what Capacitor packages into the APK
  build: {
    outDir: 'dist',
  },
  // Disable the Vite Dev Toolbar floating overlay
  devtools: {
    enabled: false,
  },
})
