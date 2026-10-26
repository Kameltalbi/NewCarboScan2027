import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1440, height: 1000 } });
  await page.goto('https://search.google.com/test/rich-results', { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('tab', { name: /code/i }).click();
  await page.locator('#fmefR').getByText(/tester le code/i).waitFor({ timeout: 15000 });
  const html = await readFile(new URL('../dist/cbam.html', import.meta.url), 'utf8');
  console.log('Code input fields:', await page.locator('textarea').evaluateAll(nodes => nodes.map(n => ({ class: n.className, visible: !!n.getClientRects().length }))));
  const codeMirror = page.locator('#fmefR .CodeMirror').first();
  if (await codeMirror.count()) await codeMirror.evaluate((node, value) => node.CodeMirror.setValue(value), html);
  else await page.locator('#fmefR textarea').last().fill(html);
  await page.locator('#fmefR').getByText(/tester le code/i).click();
  const navigated = await page.waitForURL(/\/result[?\/]/, { timeout: 30000 }).then(() => true).catch(() => false);
  if (!navigated) console.log('No Google result page was returned; screenshot documents the interface only.');
  const result = await page.locator('body').innerText();
  await writeFile(new URL('../../../docs/seo/rich-results-cbam.txt', import.meta.url), result + '\n\n' + page.url() + '\n');
  await page.screenshot({ path: new URL('../../../docs/seo/rich-results-cbam.png', import.meta.url).pathname, fullPage: true });
  console.log(result.slice(0, 9000));
  console.log(page.url());
} finally { await browser.close(); }
