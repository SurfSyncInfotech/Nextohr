import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Treat <iconify-icon> as a native custom element
  server: { port: 5173 },
});
