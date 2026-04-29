import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('src/app/page.tsx', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');

assert.match(page, /const SHARE_HOOK\s*=\s*"[^"]+[.!?]";/, 'share hook should be a single sentence constant');
assert.doesNotMatch(page, /text:\s*`[\s\S]*\$\{receiptText\}/, 'native share text must not include the full receipt');
assert.doesNotMatch(page, /const receiptText\s*=\s*useMemo/, 'share path should not build/copy the full receipt text');
assert.match(page, /text:\s*SHARE_HOOK/, 'native share should use the concise hook');

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
