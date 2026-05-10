import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Proxy dev : si VITE_API_BASE_URL est vide, le client appelle `/api/...` sur le même hôte que Vite
// et Vite transmet vers le backend (évite CORS + erreur si le port ne correspond pas).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    (env.VITE_DEV_PROXY_TARGET && String(env.VITE_DEV_PROXY_TARGET).trim()) ||
    (env.VITE_API_BASE_URL && String(env.VITE_API_BASE_URL).trim()) ||
    'http://localhost:8082'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget.replace(/\/$/, ''),
          changeOrigin: true,
        },
      },
    },
  }
})
