import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,   // force Vite to use 5173
    open: true,   // auto-open browser
  },
  build: {
    outDir: 'dist',   // default output folder
  },
  resolve: {
    alias: {
      '@': '/src',    // allows imports like "@/components/Button"
    },
  },
  preview: {
    port: 5173,
  },
})
