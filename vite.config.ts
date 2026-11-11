import { defineConfig } from 'vite'

// One codebase, three targets. Pick with: TARGET=web|crazygames|ios vite build
const target = process.env.TARGET ?? 'web'

export default defineConfig({
  base: './',
  define: {
    __TARGET__: JSON.stringify(target),
  },
  build: {
    outDir: `dist/${target}`,
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
