import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { browserslistToTargets } from 'lightningcss'
import { VitePWA } from 'vite-plugin-pwa'



// 🚀 BALANCED PRODUCTION CONFIG: < 20s Build & < 5MB Payload
export default defineConfig({
  logLevel: 'info',
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'recharts'],
    alias: {
      'react': 'react',
      'react-dom': 'react-dom',
      'react/jsx-runtime': 'react/jsx-runtime',
      'react-dom/client': 'react-dom/client'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'zustand',
      'recharts',
      'react-is',
      '@supabase/supabase-js'
    ],
  },
  css: {
    devSourcemap: false,
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(['> 1%', 'not dead', 'not ie 11']),
    },
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo.svg'],
      // ⚡ CRITICAL: skipWaiting + clientsClaim ensure the new SW activates immediately
      // on deployment instead of waiting for all tabs to close. Without this, users
      // stay on the old SW (and old chunk hashes) until they manually close every tab.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Ensure navigation requests always get fresh HTML from the network,
        // never a stale cached version that references old chunk hashes.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /\.xml$/, /\.txt$/],
        navigateFallbackAllowlist: [/^\/($|organizer|planner|groups|settings|auth|profile|admin|welcome|login|signup|forgot-password|terms|privacy|dev-team)/],
        runtimeCaching: [
          {
            // App shell HTML: NetworkFirst so a new deployment is always detected
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nemesis-html-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // JS/CSS chunks: CacheFirst (they're content-hashed, so stale = wrong hash = 404)
            urlPattern: /\/assets\/.+\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nemesis-assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Nemesis',
        short_name: 'Nemesis',
        description: 'Nemesis Academic Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    {
      name: 'dev-sitemap-proxy',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/sitemap.xml') {
            res.setHeader('Content-Type', 'application/xml');
            const routes = [
              '/welcome', '/login', '/signup', '/forgot-password',
              '/terms', '/privacy', '/dev-team'
            ];
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes.map(route => `
  <url>
    <loc>https://nemesiss.in${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`;
            res.end(xml);
            return;
          }
          
          if (req.url && req.url.endsWith('.map')) {
            res.statusCode = 404;
            res.end();
            return;
          }
          
          next();
        });
      }
    }
  ],
  build: {
    target: 'esnext',
    minify: 'terser', // 🚀 QUALITY: Terser for smallest possible production payload
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    cssMinify: 'lightningcss',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: true,
    reportCompressedSize: true,
    modulePreload: true, // ✅ ENABLE to allow browser to discover and preload chunks efficiently
    sourcemap: false,
    assetsInlineLimit: 4096,
    // ✅ ENHANCED FOR CORE WEB VITALS
    rollupOptions: {
      treeshake: true,
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
          return;
        }
        warn(warning);
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // 1. Bundle local UI components together to reduce tiny chunk load failures
          if (id.includes('src/components/ui/')) return 'vendor-ui-shared';

          // 2. Vendor dependencies
          if (id.includes('node_modules')) {
            if (
              /node_modules\/react($|\/)/.test(id) ||
              /node_modules\/react-dom($|\/)/.test(id) ||
              /node_modules\/react-is($|\/)/.test(id) ||
              /node_modules\/scheduler($|\/)/.test(id)
            ) {
              return 'vendor-react-core';
            }
            if (
              id.includes('react/') || 
              id.includes('react-dom/') || 
              id.includes('react-is/') ||
              id.includes('scheduler/')
            ) {
              return 'vendor-react-core';
            }
            if (id.includes('react-router') || id.includes('remix-run')) return 'vendor-router';
            if (id.includes('dexie') || id.includes('swr')) return 'vendor-db';
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('date-fns') || id.includes('zustand') || id.includes('clsx')) return 'vendor-utils';
            if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'vendor-markdown';
            if (id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('video.js') || id.includes('@ffmpeg')) return 'vendor-video';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('konva') || id.includes('react-konva')) return 'vendor-canvas';
          }
        }
      }
    }
  }
})
