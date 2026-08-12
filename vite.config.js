import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveRemoteEnvironment } from './src/config/remoteEnvironments.js';

const remoteEnvironment = resolveRemoteEnvironment(process.env.VERCEL_ENV);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __SIMULADOR_API_BASE_URL__: JSON.stringify(remoteEnvironment.apiBaseUrl),
    __SIMULADOR_SUPABASE_URL__: JSON.stringify(remoteEnvironment.supabaseUrl),
    __SIMULADOR_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(remoteEnvironment.supabasePublishableKey),
  },
});
