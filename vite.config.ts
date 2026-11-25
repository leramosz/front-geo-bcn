import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /geo-bcn/v2 se redirige al back (ms-geo-bcn) para evitar CORS.
// La API key la añade el proxy, así no viaja en el bundle del navegador.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/geo-bcn/v2': {
      target: env.GEO_BCN_API_TARGET ?? 'http://localhost:8080',
      changeOrigin: true,
      headers: { 'X-Api-Key': env.GEO_BCN_API_KEY ?? 'dev-api-key' },
    },
  };
  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
