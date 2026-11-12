import { defineConfig, type Plugin } from 'vite'

// One codebase, three targets. Pick with: TARGET=web|crazygames|ios vite build
const target = process.env.TARGET ?? 'web'

/** Only the CrazyGames build loads their SDK; every other build has no outside scripts. */
function crazyGamesSdk(): Plugin {
  return {
    name: 'crazygames-sdk',
    transformIndexHtml(html) {
      if (target !== 'crazygames') return html
      return html.replace('<title>', '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n    <title>')
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [crazyGamesSdk()],
  define: {
    __TARGET__: JSON.stringify(target),
  },
  build: {
    outDir: `dist/${target}`,
    emptyOutDir: true,
    target: 'es2022',
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
