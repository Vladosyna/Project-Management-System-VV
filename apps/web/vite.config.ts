// Vite dev/preview server. /api is proxied to the API (OCS_API_URL), so the browser sees one origin —
// cookies stay SameSite=Strict and passkeys bind to this host.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = process.env.OCS_API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.PORT ?? '5173'), strictPort: true, proxy: { '/api': api } },
  preview: { port: Number(process.env.PORT ?? '5173'), strictPort: true, proxy: { '/api': api } },
});
