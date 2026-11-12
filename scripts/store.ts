// Renders covers, screenshots and preview videos into store/.
// Run with: npm run store

import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['playwright', 'test', 'e2e/store.spec.ts', 'e2e/store-ios.spec.ts', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, STORE: '1' },
})
process.exit(r.status ?? 1)
