import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://hogchamptv.github.io/old-school-runescape-tools/
export default defineConfig({
  base: '/old-school-runescape-tools/',
  plugins: [react()],
  server: {
    port: 3000,
  },
});
