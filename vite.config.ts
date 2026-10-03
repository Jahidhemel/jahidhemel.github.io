import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [tailwindcss()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
