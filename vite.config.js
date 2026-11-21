import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    minify: 'terser',
    chunkSizeWarningLimit: 1500, // the Phaser bundle is about 1.25 MB
  },
  server: {
    port: 8080,
  },
});
