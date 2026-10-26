import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const root = new URL('../dist/', import.meta.url);
const report = JSON.parse(await readFile(new URL('seo-report.json', root), 'utf8'));
const titles = new Set();
const descriptions = new Set();
for (const page of report.pages.filter(p => p.path !== '/seo-not-found')) {
  const filename = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
  const { document } = new JSDOM(await readFile(new URL(filename, root), 'utf8')).window;
  assert.equal(document.querySelectorAll('h1').length, 1, `${page.path}: H1`);
  assert.equal(document.querySelectorAll('title').length, 1, `${page.path}: title count`);
  assert.ok(document.title, `${page.path}: empty title`);
  assert.ok(!titles.has(document.title), `${page.path}: duplicate title ${document.title}`);
  titles.add(document.title);
  const description = document.querySelector('meta[name="description"]')?.content;
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1, `${page.path}: description count`);
  assert.ok(description, `${page.path}: missing description`);
  assert.ok(!descriptions.has(description), `${page.path}: duplicate description`);
  descriptions.add(description);
  const canonical = `https://carboscan.io${page.path}`;
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1, `${page.path}: canonical count`);
  assert.equal(document.querySelector('link[rel="canonical"]').href, canonical);
  for (const [name, expected] of [['title', document.title], ['description', description], ['url', canonical]]) {
    assert.equal(document.querySelector(`meta[property="og:${name}"]`)?.content, expected, `${page.path}: og:${name}`);
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const schema = JSON.parse(script.textContent);
    if (schema['@type'] === 'FAQPage') for (const entry of schema.mainEntity) {
      const normalize = s => s.replace(/\s+/g, '');
      assert.ok(normalize(document.body.textContent).includes(normalize(entry.name)), `${page.path}: FAQ question absent`);
      assert.ok(normalize(document.body.textContent).includes(normalize(entry.acceptedAnswer.text)), `${page.path}: FAQ answer absent`);
    }
  }
}
const sitemap = new JSDOM(await readFile(new URL('sitemap.xml', root), 'utf8'), { contentType: 'text/xml' }).window.document;
assert.equal(sitemap.querySelectorAll('url').length, titles.size);
assert.ok(!sitemap.documentElement.textContent.includes('/calculateur-carbone'));
console.log(`Verified ${titles.size} static pages: unique metadata, one H1, canonical, Open Graph, FAQ parity and sitemap.`);
