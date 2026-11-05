import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward API calls to the Nest backend so the browser stays same-origin
    // (the backend does not enable CORS).
    proxy: { '/api': 'http://localhost:3000' },
  },
})
