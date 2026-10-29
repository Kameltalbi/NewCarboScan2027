/** Snapshot the real React pages, with no authenticated session or external scripts. */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_SITEMAP_ROUTES } from './generate-seo-files.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const shell = await readFile(path.join(root, 'index.html'), 'utf8');
await writeFile(path.join(root, 'spa.html'), shell.replace('name="robots" content="index, follow"', 'name="robots" content="noindex, nofollow"'));
// A JSON export of published posts makes builds reproducible without production credentials.
const snapshotPath = process.env.SEO_BLOG_SNAPSHOT || fileURLToPath(new URL('../content/blog-snapshot.json', import.meta.url));
const posts = JSON.parse(await readFile(snapshotPath, 'utf8'));
if (!Array.isArray(posts) || posts.some(p => !/^[a-z0-9-]+$/.test(p.slug) || !p.title || !p.content || p.status !== 'published')) {
  throw new Error('SEO_BLOG_SNAPSHOT must be an array of published posts (slug, title, content, status).');
}
const routes = [...PUBLIC_SITEMAP_ROUTES.map(r => r.path), ...posts.map(p => `/blog/${p.slug}`)];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/v1/public/blog') {
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ items: posts })); return;
    }
    if (url.pathname.startsWith('/v1/public/blog/')) {
      const post = posts.find(p => p.slug === decodeURIComponent(url.pathname.split('/').pop()));
      res.statusCode = post ? 200 : 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ post })); return;
    }
    if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/auth/')) {
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end('{}'); return;
    }
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + '/') && target !== root) { res.statusCode = 403; res.end(); return; }
    const isAsset = /\.[a-z0-9]+$/i.test(url.pathname);
    const data = isAsset ? await readFile(target) : shell;
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' })[path.extname(target)] || (isAsset ? 'application/octet-stream' : 'text/html'));
    res.end(data);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const report = [];
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ locale: 'fr-FR', serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  for (const route of [...routes, '/seo-not-found']) {
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    // The public shell already has enough text to pass a length check before a lazy page paints its title.
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1')?.textContent?.trim() ?? '';
      return heading.length > 0;
    });
    await page.evaluate(async () => { await document.fonts.ready; });
    const checks = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      h1: [...document.querySelectorAll('h1')].map(n => n.textContent.trim()),
      textLength: document.querySelector('#root').textContent.length,
    }));
    if (route !== '/seo-not-found' && checks.h1.length !== 1) throw new Error(`${route}: expected one H1, got ${JSON.stringify(checks.h1)}`);
    if (route !== '/seo-not-found' && checks.canonical !== `https://carboscan.io${route}`) throw new Error(`${route}: wrong canonical ${checks.canonical}`);
    // Do not serialize browser-injected state or resolved localhost URLs.
    await page.evaluate(() => {
      // Keep the original GA loader for real visitors; requests are blocked only during build.
      document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(n => n.remove());
      if (document.querySelector('h1')?.textContent === '404') {
        document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow');
      }
    });
    const target = route === '/' ? 'index.html' : route === '/seo-not-found' ? '404.html' : `${route.slice(1)}.html`;
    await mkdir(path.dirname(path.join(root, target)), { recursive: true });
    await writeFile(path.join(root, target), await page.content());
    report.push({ path: route, ...checks });
    await page.close();
    console.log(`Prerendered ${route}`);
  }
  // Include only generated pages, including published blog articles supplied to the build.
  const lastmod = process.env.SEO_LASTMOD || new Date().toISOString().slice(0, 10);
  await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `<url><loc>https://carboscan.io${route}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(root, 'seo-report.json'), JSON.stringify({ blogSnapshotProvided: true, pages: report }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
