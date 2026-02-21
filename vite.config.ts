import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      server: {
        port: 3000,
        host: 'localhost',
        proxy: {
          '/api/voice-token': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/voice-token-lens': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/daily-log': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/analyze-checkin': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/clinical': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/coach': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/api/followup': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
