import { chromium } from 'playwright';

const target = process.env.QA_URL || 'http://127.0.0.1:3002/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(target, { waitUntil: 'networkidle' });
const bodyBefore = await page.locator('body').innerText();
const sourceLinks = await page.locator('a', { hasText: 'Source' }).count();
const copyButtons = await page.locator('button', { hasText: 'Copy receipt' }).count();
const shareButtons = await page.locator('button', { hasText: 'Share receipt' }).count();
const addButtons = await page.locator('button', { hasText: 'Add to receipt' }).count();
const removeButtons = await page.locator('button', { hasText: 'Remove' }).count();
await page.locator('button', { hasText: 'Share receipt' }).click();
await page.waitForTimeout(300);
const bodyAfterShare = await page.locator('body').innerText();
const localStats = await page.evaluate(() => localStorage.getItem('uncle-sams-cart-share-stats'));
const result = {
  target,
  sourceLinks,
  copyButtons,
  shareButtons,
  addButtons,
  removeButtons,
  localStats,
  hasNoLocalStats: localStats === null,
  hasSimpleWittyDescription: bodyBefore.includes('Real government contract notices from SAM.gov, served as a receipt because public records deserve better jokes.'),
  hasNoFake: !/fake/i.test(bodyBefore + bodyAfterShare),
  hasTopFive: /today['’]s top 5/i.test(bodyBefore),
  hasPunchierTitles: [
    'Uncle Sam is building barracks for very good boys',
    'Add to cart: inflatable jet boat, motor, trailer, probably wetlands chaos',
    'Government seeks someone to process deer and geese, extremely calmly',
    'National fish food order, because the fish have a government meal plan',
    'Forest toilets require a contractor with courage and a pump truck',
  ].every((title) => bodyBefore.includes(title)),
};
console.log(JSON.stringify(result, null, 2));
if (
  result.sourceLinks !== 5 ||
  result.copyButtons !== 0 ||
  result.shareButtons !== 1 ||
  result.addButtons !== 0 ||
  result.removeButtons !== 0 ||
  !result.hasNoLocalStats ||
  !result.hasSimpleWittyDescription ||
  !result.hasNoFake ||
  !result.hasTopFive ||
  !result.hasPunchierTitles
) {
  process.exitCode = 1;
}
await browser.close();
