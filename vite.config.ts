import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const customLogger = createLogger()
const originalError = customLogger.error.bind(customLogger)

customLogger.error = (msg, options) => {
  // Suppress harmless WebSocket disconnect / abort errors during hot-reload and tab close
  if (
    typeof msg === 'string' &&
    msg.includes('ws proxy') &&
    (msg.includes('ECONNABORTED') || msg.includes('ECONNRESET') || msg.includes('EPIPE') || msg.includes('ECONNREFUSED'))
  ) {
    return
  }
  originalError(msg, options)
}

// https://vite.dev/config/
export default defineConfig({
  customLogger,
  plugins: [
    react(), 
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET' || err?.code === 'EPIPE' || err?.code === 'ECONNREFUSED') {
              return;
            }
            console.error('[vite ws proxy error]', err?.message || err);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket: any) => {
            socket?.on('error', (err: any) => {
              if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET' || err?.code === 'EPIPE') {
                return;
              }
            });
          });
        }
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET') return;
            console.error('[vite api proxy error]', err?.message || err);
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    watch: {
      ignored: [
        '**/messages.json',
        '**/messages.json.tmp',
        '**/messages.json.*',
        '**/uploads/**',
        '**/*.tmp',
        '**/*.log',
        '**/.git/**'
      ]
    }
  }
})
