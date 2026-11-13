// Owner rule: the owner's real name appears nowhere in the repo. The name is
// built from character codes so this file does not contain it either.

import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

const NAME = String.fromCharCode(116, 121, 108, 101, 114)

describe('owner privacy', () => {
  it('no tracked file contains the owner name', () => {
    let hits = ''
    try {
      hits = execSync(`git grep -i -l ${NAME}`, { encoding: 'utf8' })
    } catch {
      hits = '' // git grep exits 1 when nothing matches
    }
    expect(hits.trim()).toBe('')
  })

  it('every commit is by Bal Tak', () => {
    const authors = execSync('git log --format=%an%n%cn', { encoding: 'utf8' }).split('\n').filter(Boolean)
    expect([...new Set(authors)]).toEqual(['Bal Tak'])
  })
})
