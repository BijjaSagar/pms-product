import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'

// Two apps, two pages: the hotel app at `/` and the platform console at `/admin`. Vite only falls
// back to index.html, so send the console's addresses to admin.html. (Production hosting needs the
// same rewrite: `/admin` and `/admin/*` to /admin.html.)
function platformConsoleFallback(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && /^\/admin(\/|\?|$)/.test(req.url)) req.url = '/admin.html'
    next()
  }
  return {
    name: 'platform-console-fallback',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    platformConsoleFallback(),
  ],
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html') },
    },
  },
  server: {
    // Forward API calls to the Nest backend so the browser stays same-origin
    // (the backend does not enable CORS).
    proxy: { '/api': process.env.API_TARGET ?? 'http://localhost:3000' },
  },
})
