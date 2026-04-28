import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:3002/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
const beforeAddButtons = await page.locator('button', { hasText: 'Add to receipt' }).count();
await page.locator('button', { hasText: 'Add to receipt' }).first().click();
await page.locator('button', { hasText: 'Copy receipt' }).click();
await page.waitForTimeout(500);
const removeButtonsAfterAdd = await page.locator('button', { hasText: 'Remove' }).count();
const stats = await page.evaluate(() => localStorage.getItem('uncle-sams-cart-share-stats'));
const text = await page.locator('body').innerText();
console.log(JSON.stringify({
  beforeAddButtons,
  removeButtonsAfterAdd,
  stats,
  hasFooter: text.includes('SOURCE: SAM.gov'),
  hasNoPrices: text.includes('no fabricated prices'),
}, null, 2));
await browser.close();
