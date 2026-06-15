import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      origin: 'http://localhost:5173',
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
