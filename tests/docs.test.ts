// Owner rule: all player facing text and all text written for the owner uses no hyphens.
// This scans every markdown file in the repo root and in store/ (when it exists).
// Links, inline code and fenced code are skipped, because file names and URLs
// are not prose.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

function markdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (name === 'node_modules' || name.startsWith('.')) continue
    if (statSync(full).isDirectory()) {
      if (dir !== root) out.push(...markdownFiles(full))
    } else if (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.txt')) {
      out.push(full)
    }
  }
  return out
}

function prose(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
}

describe('text for people has no hyphens', () => {
  const files = [...markdownFiles(root), ...markdownFiles(join(root, 'store'))]

  it('finds the handover and balance files', () => {
    expect(files.some((f) => f.endsWith('SESSION_HANDOVER.md'))).toBe(true)
    expect(files.some((f) => f.endsWith('BALANCE.md'))).toBe(true)
  })

  for (const file of files) {
    it(`${file.slice(root.length + 1)} has no hyphen in prose`, () => {
      const lines = prose(readFileSync(file, 'utf8')).split('\n')
      const bad = lines.filter((l) => l.includes('-'))
      expect(bad).toEqual([])
    })
  }
})
