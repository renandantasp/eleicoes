import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // O GitHub Pages serve um site de projeto em /<repo>/, entao o build
  // precisa de um prefixo. O workflow de deploy define BASE_PATH; o dev
  // server e qualquer build local continuam na raiz.
  base: process.env.BASE_PATH ?? '/',
})
