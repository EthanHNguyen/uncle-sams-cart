import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('src/app/page.tsx', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');

assert.match(page, /const SHARE_HOOK\s*=\s*"[^"]+[.!?]";/, 'share hook should be a single sentence constant');
assert.doesNotMatch(page, /text:\s*`[\s\S]*\$\{receiptText\}/, 'native share text must not include the full receipt');
assert.doesNotMatch(page, /const receiptText\s*=\s*useMemo/, 'share path should not build/copy the full receipt text');
assert.match(page, /text:\s*SHARE_HOOK/, 'native share should use the concise hook');
assert.match(page, /shareTitle:\s*shareData\.title/, 'share analytics should capture exact shared title');
assert.match(page, /shareText:\s*shareData\.text/, 'share analytics should capture exact shared text');
assert.match(page, /shareUrl:\s*shareData\.url/, 'share analytics should capture exact shared URL');
assert.match(page, /shareItemTitles:/, 'share analytics should capture item titles used to tune future receipts');
assert.match(page, /Copy link/, 'page should include a copy-link fallback for desktop sharing');

assert.match(layout, /metadataBase:\s*new URL\("https:\/\/ethanhn\.com"\)/, 'metadata should use absolute ethanhn.com URLs');
assert.match(layout, /alternates:\s*{\s*canonical:\s*"\/uncle-sams-cart\/"/s, 'metadata should declare canonical URL');
assert.match(layout, /openGraph:[\s\S]*images:\s*\[/, 'openGraph should include preview image');
assert.match(layout, /twitter:[\s\S]*card:\s*"summary_large_image"/, 'Twitter/Android unfurlers should get large image card metadata');
assert.match(layout, /apple:\s*\[/, 'iOS should get apple touch icon metadata');

for (const asset of ['public/og-uncle-sams-cart.png', 'public/icon-192.png', 'public/icon-512.png', 'src/app/favicon.ico']) {
  assert.ok(fs.existsSync(asset), `${asset} should exist`);
  assert.ok(fs.statSync(asset).size > 1000, `${asset} should be non-empty`);
}

console.log('share metadata smoke test passed');
