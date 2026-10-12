// Sert le build statique comme Vercel : fichiers prérendus, sinon repli SPA sur index.csr.html.
// Si API_ORIGIN est défini, `/api/*` est relayé vers l'API (comme la réécriture Vercel).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist', 'web', 'browser');
const port = Number(process.argv[2] ?? 4300);
const apiOrigin = process.env.API_ORIGIN ? new URL(process.env.API_ORIGIN) : null;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

const fileFor = (urlPath) => {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(root, safe), join(root, safe, 'index.html')];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
};

function proxy(req, res) {
  if (!apiOrigin) {
    res
      .writeHead(502, { 'Content-Type': 'application/json' })
      .end('{"error":{"code":"INTERNAL_ERROR","message":"API absente"}}');
    return;
  }
  const upstream = request(
    {
      hostname: apiOrigin.hostname,
      port: apiOrigin.port,
      method: req.method,
      path: req.url.replace(/^\/api/, ''),
      headers: { ...req.headers, host: apiOrigin.host },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => res.writeHead(502).end());
  req.pipe(upstream);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) return proxy(req, res);
  const file =
    fileFor(url.pathname) ?? (extname(url.pathname) ? undefined : join(root, 'index.csr.html'));
  if (!file || !existsSync(file)) {
    res.writeHead(404).end('Introuvable');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () =>
  console.warn(
    `Build statique servi sur http://localhost:${port}${apiOrigin ? ` (API : ${apiOrigin.origin})` : ''}`,
  ),
);
