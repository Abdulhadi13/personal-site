import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://127.0.0.1:8080';
const expectedSha = process.argv[3];
const paths = ['/', '/projects/', '/blogs/', '/about/', '/ar/', '/ar/projects/', '/ar/blogs/', '/ar/about/'];
const assets = new Set();
for (const path of paths) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('cache-control') ?? '', /no-cache/, path);
  const html = await response.text();
  const arabic = path.startsWith('/ar/');
  assert.match(html, arabic ? /lang="ar"/ : /lang="en"/, path);
  assert.match(html, arabic ? /dir="rtl"/ : /dir="ltr"/, path);
  for (const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)[^"]*"/g)) assets.add(match[1]);
}
assert.equal((await fetch(new URL('/missing-page-for-smoke-test/', base))).status, 404);
assert.equal((await fetch(new URL('/healthz', base))).status, 200);
assert.ok(assets.size > 0, 'Built page must reference bundled assets');
let fontFound = false;
for (const path of assets) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('cache-control') ?? '', /immutable/, path);
  if (path.endsWith('.css')) {
    const css = await response.text();
    for (const match of css.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
      const font = await fetch(new URL(match[1], new URL(path, base)));
      assert.equal(font.status, 200, match[1]);
      fontFound = true;
    }
  }
}
assert.ok(fontFound, 'Local fonts must be referenced and load');
if (expectedSha) {
  const response = await fetch(new URL('/release.txt', base), { cache: 'no-store' });
  assert.equal(response.status, 200);
  assert.equal((await response.text()).trim(), expectedSha, 'Release identifier');
}
console.log(`Smoke checks passed: ${paths.length} pages, assets, fonts, health and 404.`);
