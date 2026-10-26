import { request } from 'node:http';
/** Exercise the production Nginx rules, including internal index/error redirects. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = await mkdtemp(path.join(tmpdir(), 'ncs-nginx-'));
const name = `ncs-nginx-test-${randomUUID().slice(0, 8)}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let running = false;
try {
  await chmod(fixtures, 0o755);
  for (const [file, text] of [['index.html', 'Homepage fixture'], ['cbam.html', 'CBAM fixture'], ['404.html', '404 fixture'], ['spa.html', 'Private shell fixture']]) {
    await writeFile(path.join(fixtures, file), `<h1>${text}</h1>`, { mode: 0o644 });
  }
  docker('run', '--detach', '--rm', '--name', name, '--add-host', 'api:127.0.0.1', '-p', '127.0.0.1::80', '-v', `${path.join(root, 'deploy/nginx/default.conf')}:/etc/nginx/conf.d/default.conf:ro`, '-v', `${fixtures}:/usr/share/nginx/html:ro`, 'nginx:1.27-alpine');
  running = true;
  const base = `http://${docker('port', name, '80/tcp').split('\n')[0]}`;
  const get = (route, host = 'carboscan.io', proto = 'https') => new Promise((resolve, reject) => {
    const req = request(base + route, { agent: false, headers: { Host: host, 'X-Forwarded-Proto': proto } }, response => {
      const parts = [];
      response.on('data', chunk => parts.push(chunk));
      response.on('end', () => resolve(new Response(Buffer.concat(parts), { status: response.statusCode, headers: Object.fromEntries(Object.entries(response.headers).filter(([, value]) => value !== undefined).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])) })));
    });
    req.on('error', reject); req.end();
  });
  let ready = false;
  for (let n = 0; n < 30; n++) {
    try { await get('/'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, 'Nginx did not start');
  for (const [route, status, text] of [['/', 200, 'Homepage fixture'], ['/cbam', 200, 'CBAM fixture'], ['/missing-page', 404, '404 fixture'], ['/app/dashboard', 200, 'Private shell fixture'], ['/auth', 200, 'Private shell fixture']]) {
    const response = await get(route);
    assert.equal(response.status, status, `${route}: unexpected status or redirect loop`);
    assert.ok((await response.text()).includes(text), route);
  }
  for (const [route, host, proto, location] of [['/', 'www.carboscan.io', 'https', 'https://carboscan.io/'], ['/cbam/', 'www.carboscan.io', 'https', 'https://carboscan.io/cbam'], ['/cbam/', 'carboscan.io', 'https', '/cbam'], ['/cbam/', 'carboscan.io', 'http', 'https://carboscan.io/cbam']]) {
    const response = await get(route, host, proto);
    assert.equal(response.status, 301); assert.equal(response.headers.get('location'), location);
  }
  console.log('Nginx SEO regression checks passed: home, static routes, real 404, private shell and canonical redirects.');
} catch (error) {
  if (running) process.stderr.write(docker('logs', name) + '\n');
  throw error;
} finally {
  if (running) docker('rm', '--force', name);
  await rm(fixtures, { recursive: true, force: true });
}
