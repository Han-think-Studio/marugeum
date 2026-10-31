import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: { target: ['es2021', 'chrome100', 'safari13'], outDir: 'dist' },
});
