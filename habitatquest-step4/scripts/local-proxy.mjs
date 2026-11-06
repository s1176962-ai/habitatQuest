/**
 * HabitatQuest Step 4 — optional localhost CORS relay.
 *
 *   HQ_TARGET_BASE_URL="https://api.openai.com/v1" \
 *   HQ_API_KEY="sk-..." \
 *   node scripts/local-proxy.mjs
 *
 * Guarantees:
 *  - listens on 127.0.0.1:8787 only (never 0.0.0.0)
 *  - forwards ONLY to HQ_TARGET_BASE_URL; every other host is refused
 *  - the key lives in this process' environment only: never written to disk,
 *    never logged, never reflected in a response
 *  - no request/response logging, no telemetry, no dependencies
 *
 * The browser never sees a key in this mode — it calls http://127.0.0.1:8787
 * and the relay injects the Authorization header from memory.
 */
import http from 'node:http';
import https from 'node:https';

const HOST = '127.0.0.1';
const PORT = 8787;
const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

const targetRaw = process.env.HQ_TARGET_BASE_URL;
const key = process.env.HQ_API_KEY || '';

if (!targetRaw) {
  console.error('Missing HQ_TARGET_BASE_URL. Example:');
  console.error('  HQ_TARGET_BASE_URL="https://api.openai.com/v1" HQ_API_KEY="sk-..." node scripts/local-proxy.mjs');
  process.exit(1);
}

let target;
try {
  target = new URL(targetRaw);
} catch {
  console.error('HQ_TARGET_BASE_URL is not a valid URL.');
  process.exit(1);
}
if (!/^https?:$/.test(target.protocol)) {
  console.error('Only http(s) targets are supported.');
  process.exit(1);
}

const base = target.href.replace(/\/+$/, '') + '/';

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405);
    res.end('method not allowed');
    return;
  }

  // Whitelist check: reconstruct the destination and compare origins.
  let dest;
  try {
    const incoming = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    // Strip the leading slash so a base path such as /v1 is preserved.
    const rel = incoming.pathname.replace(/^\/+/, '') + incoming.search;
    dest = new URL(rel, base);
  } catch {
    res.writeHead(400);
    res.end('bad request');
    return;
  }
  if (dest.origin !== target.origin) {
    res.writeHead(403);
    res.end('target not allowed');
    return;
  }

  const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('error', () => res.destroy());
  req.on('end', () => {
    const transport = dest.protocol === 'https:' ? https : http;
    const upstream = transport.request(
      dest,
      { method: req.method, headers, timeout: 20000 },
      (ur) => {
        res.writeHead(ur.statusCode || 502, {
          'Content-Type': ur.headers['content-type'] || 'application/json',
          'Cache-Control': 'no-store',
        });
        ur.pipe(res);
      },
    );
    upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('upstream unavailable');
    });
    if (chunks.length) upstream.write(Buffer.concat(chunks));
    upstream.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Local relay ready on http://${HOST}:${PORT}`);
  console.log(`Forwarding exclusively to: ${target.origin}${target.pathname.replace(/\/$/, '')}`);
  console.log('Key is held in process memory only. Stop with Ctrl+C.');
});
