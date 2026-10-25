import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para Baúl Mágico 2 — Frontend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    host: true
  }
});
