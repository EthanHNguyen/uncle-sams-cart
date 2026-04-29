import { chromium } from 'playwright';

const target = process.env.QA_URL || 'http://127.0.0.1:3002/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(target, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
const bodyBefore = await page.locator('body').innerText();
const sourceLinks = await page.locator('a', { hasText: 'Source' }).count();
const addButtons = await page.locator('button', { hasText: 'Add to receipt' }).count();
const removeButtons = await page.locator('button', { hasText: 'Remove' }).count();
await page.locator('button', { hasText: 'Copy receipt' }).click();
await page.waitForTimeout(500);
const stats = await page.evaluate(() => localStorage.getItem('uncle-sams-cart-share-stats'));
console.log(JSON.stringify({
  target,
  sourceLinks,
  addButtons,
  removeButtons,
  stats,
  statsIncremented: stats === '{\"copyReceipt\":1,\"shareReceipt\":0,\"sourceClicks\":0}',
  hasWording: bodyBefore.includes('See the weirdest things Uncle Sam is shopping for — all backed by real open contracts on SAM.gov.'),
  hasNoFake: !/\bfake\b/i.test(bodyBefore),
  hasTopFive: /today['’]s top 5/i.test(bodyBefore),
  hasFunnyTitles: [
    'Army airfield needs a working-dog kennel',
    'Inflatable shallow-water jet boat bundle',
    'Deer and goose processing',
    'National fish food purchase',
    'National forest vault toilet pumping',
  ].every((title) => bodyBefore.includes(title)),
}, null, 2));
await browser.close();
