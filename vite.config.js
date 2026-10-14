import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base ensures assets load properly on GitHub Pages (https://<user>.github.io/<repo>/)
  base: './',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
