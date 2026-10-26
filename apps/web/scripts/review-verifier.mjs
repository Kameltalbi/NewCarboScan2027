/** Real browser + real Fastify route, with an in-memory repository and no real email delivery. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import Fastify from 'fastify';
import { JSDOM } from 'jsdom';
import { verifierConfig as c, evaluateVerifier, labelledVerifierAnswers } from '../../../packages/carbon-engine/dist/cbam-verifier/index.js';
import { registerCbamVerifierRoutes } from '../../api/dist/routes/cbamVerifier.js';
import { buildVerifierEmails } from '../../api/dist/services/cbamVerifier/emails.js';
const upstream = process.env.SEO_PREVIEW_URL || 'http://127.0.0.1:4187';
const origin = 'https://carboscan-review.test';
const out = new URL('../../../docs/cbam-verifier/', import.meta.url);
await mkdir(out, { recursive: true });
const records = [];
const server = Fastify();
server.decorate('requireSuperAdmin', async (request, reply) => { if (request.headers['x-review-admin'] !== 'yes') return reply.code(403).send({ error: 'Forbidden' }); });
await registerCbamVerifierRoutes(server, { worker: false, repository: {
  async save(lead, result) {
    const row = { id: lead.requestId, created_at: new Date().toISOString(), full_name: lead.fullName, company_name: lead.companyName, email: lead.email, phone: lead.phone, payload: { country: lead.country, answers: lead.answers, customsCode: lead.customsCode, result, source: c.path, consentAt: new Date().toISOString() }, delivery: 'preview-only' };
    records.push(row);
    const emails = buildVerifierEmails(lead, result, row.created_at);
    await writeFile(new URL('exemple-email-prospect.html', out), emails.prospect.html);
    await writeFile(new URL('exemple-notification-interne.html', out), emails.internal.html);
    return { id: row.id, createdAt: row.created_at };
  }, async list() { return records; },
} });
const publishedPosts = JSON.parse(await readFile(new URL('../content/blog-snapshot.json', import.meta.url), 'utf8'));
server.get('/v1/public/blog', async () => ({ items: publishedPosts }));
server.get('/v1/public/blog/:slug', async (request, reply) => {
  const post = publishedPosts.find(p => p.slug === request.params.slug);
  return post ? { post } : reply.code(404).send({ error: 'Not found' });
});
await server.ready();
const raw = await (await fetch(upstream + c.path)).text();
const doc = new JSDOM(raw).window.document;
assert.equal(doc.querySelector('h1').textContent, c.seo.h1);
assert.equal(doc.title, c.seo.title);
for (const faq of c.faqs) { assert.ok(doc.body.textContent.includes(faq.question)); assert.ok(doc.body.textContent.includes(faq.answer)); }
const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(n => JSON.parse(n.textContent));
assert.equal(schemas.find(s => s['@type'] === 'FAQPage').mainEntity.length, 4);
assert.equal(schemas.find(s => s['@type'] === 'WebApplication').offers.price, 0);
await writeFile(new URL('extrait-html.html', out), doc.querySelector('h1').outerHTML + '\n' + doc.querySelector('section[aria-labelledby="verifier-faq"]').outerHTML + '\n');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const report = { rawHtml: true, faqCount: 4, questionnaire: [], promotions: {}, finalForm: {}, analytics: {}, productionDeployed: false, emailDelivery: 'Transport simulated; example emails only', database: 'In-memory repository; migration not applied' };
async function context(viewport) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('carboscan_cookie_consent', 'essential');
    window.__reviewShifts = [];
    try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__reviewShifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  });
  await ctx.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin !== origin) {
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      return route.abort();
    }
    if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/auth/')) {
      const response = await server.inject({ method: request.method(), url: url.pathname + url.search, payload: request.postData() || undefined, headers: { 'content-type': 'application/json' } });
      return route.fulfill({ status: response.statusCode, contentType: response.headers['content-type'] || 'application/json', body: response.body });
    }
    const response = await fetch(upstream + url.pathname + url.search);
    return route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'text/plain', body: Buffer.from(await response.arrayBuffer()) });
  });
  return ctx;
}
async function screenshot(page, name, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
  if (await page.locator('.cbam-slideout').count()) await page.locator('.cbam-slideout').evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
  await page.screenshot({ path: new URL(name + '.png', out).pathname, fullPage });
}
const basic = { exports: 'yes', family: 'steel', threshold: 'yes', emissions: 'no', collection: 'no', verifier: 'no', requested: 'no' };
async function flow(page, answers, { capture, code, keyboard = false } = {}) {
  await page.goto(origin + c.path, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.cbam-announcement').count(), 0);
  if (capture) await screenshot(page, capture + '-00-introduction', true);
  await page.getByRole('button', { name: c.intro.start, exact: true }).click();
  let seen = [];
  for (const q of c.questions) {
    if (q.id === 'threshold' && ['hydrogen', 'electricity'].includes(answers.family)) continue;
    seen.push(q.id);
    await page.getByRole('heading', { name: q.title, exact: true }).waitFor();
    if (q.id === 'family' && code) {
      await page.getByLabel(c.customs.label, { exact: true }).fill(code);
      assert.equal(await page.getByRole('radio', { name: q.options.find(o => o.value === 'steel').label, exact: true }).isChecked(), true);
    } else {
      const option = page.getByRole('radio', { name: q.options.find(o => o.value === answers[q.id]).label, exact: true });
      if (keyboard) { await option.focus(); await option.press('Space'); } else await option.check();
    }
    if (capture) await screenshot(page, `${capture}-${String(seen.length).padStart(2, '0')}-${q.id}`, true);
    const button = page.getByRole('button', { name: q.id === 'requested' ? c.ui.seeResult : c.ui.next, exact: true });
    if (keyboard) { await button.focus(); await button.press('Enter'); } else await button.click();
  }
  await page.getByTestId('cbam-verifier-result').waitFor();
  const expected = evaluateVerifier(answers, code || '');
  assert.equal(await page.getByTestId('verdict').textContent(), c.verdicts[expected.verdict].label);
  assert.equal(await page.getByTestId('score').textContent(), String(expected.score));
  if (capture) await screenshot(page, capture + '-08-resultat', true);
  report.questionnaire.push({ family: answers.family, threshold: answers.threshold, code: code || null, verdict: expected.verdict, score: expected.score, shownQuestions: seen.length });
  return seen;
}
try {
  if (process.argv.includes('--slideout-only')) {
    const ctx = await context({ width: 1440, height: 1000 });
    const page = await ctx.newPage();
    await page.goto(origin + '/cbam', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.51));
    await page.locator('.cbam-slideout').waitFor({ state: 'visible' });
    await screenshot(page, 'mise-en-avant-encart-ordinateur');
    await ctx.close();
    console.log('Captured the slideout after its entrance animation.');
  } else {
  for (const [name, viewport] of [['ordinateur', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await context(viewport); const page = await ctx.newPage();
    const before = records.length;
    await flow(page, basic, { capture: name, keyboard: name === 'ordinateur' });
    assert.equal(records.length, before, 'No answer/contact may be saved before the final form');
    const consent = page.getByRole('checkbox'); assert.equal(await consent.isChecked(), false);
    for (const [field, value] of [['Prénom et nom', 'Sana Exemple'], ['Entreprise', 'Export Démonstration'], ['E-mail professionnel', 'sana@example.invalid'], ['Pays', 'Tunisie']]) await page.getByLabel(field, { exact: true }).fill(value);
    await consent.check(); await page.getByRole('button', { name: c.form.submit, exact: true }).click();
    await page.getByRole('status').filter({ hasText: c.form.success }).waitFor();
    assert.equal(records.length, before + 1);
    await screenshot(page, name + '-09-rapport-demande', true);
    const events = await page.evaluate(() => (window.dataLayer || []).filter(e => e[0] === 'event').map(e => ({ name: e[1], parameters: e[2] })));
    assert.equal(events.filter(e => e.name === 'cbam_verifier_question_validated').length, 7);
    assert.ok(events.some(e => e.name === 'cbam_verifier_lead_submitted'));
    report.analytics[name] = events.filter(e => e.name.startsWith('cbam_verifier')).map(e => e.name);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width); report.finalForm[name] = { consentInitiallyUnchecked: true, submitted: true, noPreFormPersistence: true, noHorizontalOverflow: true };
    await ctx.close();
  }
  const ctx = await context({ width: 1440, height: 1000 }); const page = await ctx.newPage();
  for (const [answers, options] of [[{ ...basic, family: 'cement', threshold: 'unknown' }, {}], [{ ...basic, family: 'electricity', threshold: undefined }, {}], [{ ...basic, family: 'other' }, {}], [basic, { code: '7318' }], [{ ...basic, emissions: 'cbam', collection: 'yes', verifier: 'yes', requested: 'yes' }, {}]]) await flow(page, answers, options);
  await page.getByRole('link', { name: c.ui.whatsapp, exact: true }).click();
  assert.ok(await page.evaluate(() => window.dataLayer.some(e => e[1] === 'cbam_verifier_whatsapp_click')));
  await page.getByRole('link', { name: c.ui.demo, exact: true }).click();
  assert.ok(await page.evaluate(() => window.dataLayer.some(e => e[1] === 'cbam_verifier_demo_click')));
  report.analytics.resultCtas = ['cbam_verifier_whatsapp_click', 'cbam_verifier_demo_click'];
  // Back navigation retains values and announces the previous question.
  await page.goto(origin + c.path, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: c.intro.start }).click();
  await page.getByRole('radio', { name: 'Oui', exact: true }).check(); await page.getByRole('button', { name: c.ui.next, exact: true }).click();
  await page.getByRole('button', { name: c.ui.back, exact: true }).click(); assert.equal(await page.getByRole('radio', { name: 'Oui', exact: true }).isChecked(), true);
  await page.getByRole('button', { name: c.ui.next, exact: true }).click();
  await page.locator('[data-public-header] a[href="/"]').first().click();
  await page.waitForFunction(() => window.dataLayer.some(e => e[1] === 'cbam_verifier_abandoned' && e[2].question_id === 'family'), null, { timeout: 10000 });
  report.analytics.abandonmentQuestion = 'family';
  console.log('Questionnaire, forms, keyboard/back navigation and abandonment verified.');
  // The four requested placements report distinct placement values.
  for (const [placement, label] of [['header', c.promotions.header], ['banner', c.promotions.banner], ['section', c.promotions.button]]) {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: label, exact: true }).click();
    assert.ok(await page.evaluate(expected => window.dataLayer.some(e => e[1] === 'cbam_verifier_promotion_click' && e[2].placement === expected), placement));
  }
  await page.goto(origin + '/cbam', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.51));
  await page.locator('.cbam-slideout').waitFor({ state: 'visible' });
  const rail = await page.locator('.cbam-slideout').boundingBox(); const main = await page.locator('#main-content').boundingBox();
  assert.ok(rail.x >= main.x + main.width, 'Slideout must not cover article content');
  await screenshot(page, 'mise-en-avant-encart-ordinateur');
  await page.locator('.cbam-slideout a').click();
  assert.ok(await page.evaluate(() => window.dataLayer.some(e => e[1] === 'cbam_verifier_promotion_click' && e[2].placement === 'slideout')));
  report.promotions.placements = ['header', 'banner', 'section', 'slideout']; report.promotions.slideoutDoesNotCoverContent = true;
  console.log('Four promotion click placements and non-overlapping slideout verified.');
  // Both dismissals are persisted independently for 30 days.
  await page.goto(origin + '/cbam', { waitUntil: 'networkidle' });
  const initialHeader = await page.locator('[data-public-header]').boundingBox(); assert.equal(initialHeader.y, 40);
  await page.getByRole('button', { name: c.promotions.closeBanner }).click();
  assert.ok(await page.evaluate(() => Number(localStorage.getItem('carboscan_cbam_banner_until')) - Date.now() > 29.99 * 86400000));
  await page.reload({ waitUntil: 'domcontentloaded' });
  const firstHeader = await page.locator('[data-public-header]').boundingBox();
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.cbam-announcement').isVisible().catch(() => false), false);
  const closedHeader = await page.locator('[data-public-header]').boundingBox(); assert.equal(closedHeader.y, 0); assert.equal(firstHeader.y, closedHeader.y);
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.51));
  await page.locator('.cbam-slideout').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: c.promotions.closeSlide }).click();
  assert.ok(await page.evaluate(() => Number(localStorage.getItem('carboscan_cbam_slide_until')) - Date.now() > 29.99 * 86400000));
  await page.reload({ waitUntil: 'networkidle' }); await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.6));
  assert.equal(await page.locator('.cbam-slideout').count(), 0);
  await page.evaluate(() => { localStorage.setItem('carboscan_cbam_banner_until', String(Date.now() - 1)); localStorage.setItem('carboscan_cbam_slide_until', String(Date.now() - 1)); });
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(await page.locator('.cbam-announcement').isVisible(), true);
  report.promotions.dismissalDays = 30; report.promotions.expiredDismissalReappears = true; report.promotions.bannerHeaderOffset = { open: initialHeader.y, closed: closedHeader.y, dismissedBeforeHydration: firstHeader.y };
  // Auth routes and non-CBAM articles do not receive the campaign slideout.
  for (const route of ['/auth', '/app/dashboard']) {
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.cbam-announcement').count(), 0);
  }
  await page.goto(origin + '/blog/pourquoi-la-gouvernance-est-indispensable-a-une-strategie-carbone-efficace', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.6)); assert.equal(await page.locator('.cbam-slideout').count(), 0);
  await page.goto(origin + '/blog/guide-cbam-conformite-carbone-pme', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.51)); await page.locator('.cbam-slideout').waitFor({ state: 'visible' });
  report.promotions.routeExclusionsVerified = true;
  await page.goto(origin + '/', { waitUntil: 'networkidle' }); await screenshot(page, 'mise-en-avant-accueil-ordinateur');
  await ctx.close();
  const mobile = await context({ width: 390, height: 844 }); const phone = await mobile.newPage();
  await phone.goto(origin + '/cbam', { waitUntil: 'networkidle' }); await phone.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.6));
  assert.equal(await phone.locator('.cbam-slideout').count(), 0); report.promotions.noMobileSlideout = true;
  await phone.goto(origin + '/', { waitUntil: 'networkidle' }); await screenshot(phone, 'mise-en-avant-accueil-mobile');
  await mobile.close();
  const csv = await server.inject({ url: '/v1/admin/cbam-verifier/leads.csv', headers: { 'x-review-admin': 'yes' } }); assert.equal(csv.statusCode, 200);
  await writeFile(new URL('exemple-contacts.csv', out), csv.body);
  await writeFile(new URL('verification.json', out), JSON.stringify(report, null, 2) + '\n');
  console.log('Verified full desktop/mobile questionnaire, six required cases, form + real API validation (in memory), four promotion placements, dismissals, route exclusions, non-overlap and analytics.');
  }
} finally { await browser.close(); await server.close(); }
