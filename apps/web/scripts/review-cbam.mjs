import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const base = process.env.SEO_PREVIEW_URL || 'http://127.0.0.1:4187';
const artifacts = new URL('../../../docs/seo/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const content = JSON.parse(await readFile(new URL('../src/content/cbam.json', import.meta.url), 'utf8'));
const response = await fetch(base + '/cbam');
assert.equal(response.status, 200);
const html = await response.text();
const d = new JSDOM(html).window.document;
assert.equal(d.querySelector('h1').textContent, content.seo.h1);
assert.equal(d.title, content.seo.title);
assert.equal(d.querySelector('meta[name="description"]').content, content.seo.description);
assert.equal(d.querySelectorAll('section[aria-labelledby="cbam-faq"] h3').length, 12);
assert.equal(d.querySelectorAll('h1').length, 1);
const faqSchema = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)).find(s => s['@type'] === 'FAQPage');
assert.equal(faqSchema.mainEntity.length, 12);
for (const [index, faq] of content.faqs.entries()) {
  const item = d.querySelectorAll('section[aria-labelledby="cbam-faq"] article')[index];
  assert.equal(item.querySelector('h3').textContent, faq.question);
  assert.equal(item.querySelector('p').textContent, faq.answer);
  assert.equal(faqSchema.mainEntity[index].name, faq.question);
  assert.equal(faqSchema.mainEntity[index].acceptedAnswer.text, faq.answer);
}
assert.ok(!/[\[\]]/.test(d.body.textContent));
assert.ok(!d.body.textContent.includes('Objectifs du CBAM'));
assert.ok(!d.body.textContent.includes('Pages marketing dédiées'));
assert.ok(d.body.textContent.includes('82 €'));
assert.ok(d.body.textContent.includes('1,58 t'));
for (const target of ['/bilan-carbone-industrie', '/bilan-carbone', '/blog/guide-cbam-conformite-carbone-pme', '/cbam-calculator', '/demo']) {
  assert.ok(d.querySelector(`a[href="${target}"]`), `Missing link ${target}`);
  assert.equal((await fetch(base + target)).status, 200, target);
}
const headings = [...d.querySelectorAll('h2')].map(n => n.textContent);
assert.ok(headings.indexOf('Les données de 2026 comptent déjà') < headings.indexOf('Questions fréquentes sur le CBAM'));
assert.ok(headings.indexOf('Questions fréquentes sur le CBAM') < headings.indexOf('Votre secteur, vos enjeux'));
await writeFile(new URL('extrait-cbam-local.html', artifacts), '<!-- HTTP 200 : prévisualisation locale, aucun déploiement de production. -->\n' + d.querySelector('h1').outerHTML + '\n' + d.querySelector('section[aria-labelledby="cbam-faq"] article').outerHTML + '\n');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const [name, viewport] of [['ordinateur', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, javaScriptEnabled: false, deviceScaleFactor: 1 });
    await context.route('**/*', route => (new URL(route.request().url()).origin === base || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(route.request().url()).hostname)) ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(base + '/cbam', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    assert.ok(dimensions.scroll <= dimensions.width, `${name}: horizontal overflow ${JSON.stringify(dimensions)}`);
    await page.screenshot({ path: new URL(`cbam-${name}.png`, artifacts).pathname, fullPage: true });
    await page.screenshot({ path: new URL(`cbam-${name}-apercu.png`, artifacts).pathname });
    if (name === 'mobile') await page.locator('section[aria-labelledby="cbam-calendrier"]').screenshot({ path: new URL('cbam-mobile-calendrier.png', artifacts).pathname });
    await context.close();
  }
  // Use a non-local hostname mapped to localhost so production analytics helpers execute.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const productionBase = base.replace('127.0.0.1', 'carboscan-review.test');
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'carboscan-review.test') return route.abort();
    const upstream = base + url.pathname + url.search;
    const result = await fetch(upstream);
    await route.fulfill({ status: result.status, headers: { 'content-type': result.headers.get('content-type') || 'text/plain' }, body: Buffer.from(await result.arrayBuffer()) });
  });
  const page = await context.newPage();
  const results = [];
  for (const [label, event] of [['Estimer mon coût CBAM', 'cbam_calculator_click'], ['Parler à un expert', 'cbam_expert_click'], ['Contacter CarboScan sur WhatsApp', 'cbam_whatsapp_click']]) {
    await page.goto(productionBase + '/cbam', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: label, exact: true }).first().click();
    const found = await page.evaluate(expected => (window.dataLayer || []).some(entry => entry[0] === 'event' && entry[1] === expected), event);
    assert.ok(found, `Analytics event absent: ${event}`);
    results.push(event);
  }
  await context.close();
  await writeFile(new URL('verification-cbam.json', artifacts), JSON.stringify({ status: 200, faqCount: 12, exactFaqSchemaParity: true, rawHtmlVerified: true, desktopWidth: 1440, mobileWidth: 390, horizontalOverflow: false, analyticsEvents: results, productionDeployed: false }, null, 2) + '\n');
  console.log('CBAM verified: exact content/FAQ schema, internal links, raw HTML, desktop/mobile without JS, no horizontal overflow, three analytics CTA events.');
} finally { await browser.close(); }
