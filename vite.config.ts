import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Lets several checkouts run side by side: API_PROXY_TARGET=http://localhost:3001 npx vite --port 5174
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000'

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
  resolve: {
    alias: [
      // The full lottie player evaluates After Effects expressions with `eval`,
      // which our CSP (no 'unsafe-eval') forbids. TGS stickers render with the
      // SVG-only light build, which has no expression engine.
      { find: /^lottie-web$/, replacement: 'lottie-web/build/player/lottie_light.js' },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: apiTarget,
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
        target: apiTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET') return;
            console.error('[vite api proxy error]', err?.message || err);
          });
        }
      },
      '/uploads': {
        target: apiTarget,
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
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@tabler/icons-react/') || id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/gsap/') || id.includes('node_modules/lottie-web/')) {
            return 'animation-vendor';
          }
        },
      },
    },
  },
})
