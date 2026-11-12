// A plain static file server, for checking that a release zip runs as is.

import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, normalize, extname } from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
}

export function serveDir(dir: string, port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    let path = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    if (path === '' || path.endsWith('/')) path += 'index.html'
    path = normalize(path)
    if (path.includes('..')) {
      res.writeHead(403).end()
      return
    }
    try {
      const body = await readFile(join(dir, path))
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}
