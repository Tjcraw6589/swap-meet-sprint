// Builds the web targets and packs the portal zips into release/.
// Run with: npm run release

import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { zipDir, unzip } from './zip.ts'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
mkdirSync('release', { recursive: true })

const zips: Array<{ target: string; file: string }> = [
  { target: 'crazygames', file: `release/swap-meet-sprint-crazygames-${version}.zip` },
  { target: 'web', file: `release/swap-meet-sprint-itch-${version}.zip` },
]

for (const z of zips) {
  execSync('npx vite build --logLevel warn', { stdio: 'inherit', env: { ...process.env, TARGET: z.target } })
  const buf = zipDir(`dist/${z.target}`)
  const back = unzip(buf)
  if (!back.has('index.html')) throw new Error(`${z.file} has no index.html at its root`)
  writeFileSync(z.file, buf)
  console.log(`${z.file}  ${(buf.length / 1024).toFixed(1)} KB  ${back.size} files`)
}
