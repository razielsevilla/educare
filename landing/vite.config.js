import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this app at razielsevilla.github.io/educare/, so it
  // needs the /educare/ base; Vercel serves it at the domain root, so it
  // needs '/'. Vercel sets the VERCEL env var during its build.
  base: process.env.VERCEL ? '/' : '/educare/',
  plugins: [react()],
})
