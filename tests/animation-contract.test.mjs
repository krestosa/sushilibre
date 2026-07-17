import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('menu reveal motion is prepaint-safe, one-time and viewport driven', async () => {
  const [feature, bootstrap, motion, template, generator] = await Promise.all([
    readSource('src/ts/features/menu-reveal.ts'),
    readSource('src/ts/menu-bootstrap.ts'),
    readSource('src/scss/_motion.scss'),
    readSource('src/static/index.html'),
    readSource('scripts/menu-html.mjs')
  ]);

  assert.match(template, /classList\.add\('has-menu-reveal'\)/);
  assert.match(template, /data-menu-reveal-ready/);
  assert.match(generator, /data-menu-reveal/);
  assert.match(generator, /ITEM_REVEAL_STAGGER_MS = 45/);
  assert.match(generator, /MAX_ITEM_REVEAL_STAGGER_MS = 90/);
  assert.match(feature, /IntersectionObserver/);
  assert.match(feature, /observer\.unobserve\(element\)/);
  assert.match(feature, /isInitiallyVisible/);
  assert.match(feature, /requestAnimationFrame/);
  assert.match(feature, /setAttribute\('data-menu-reveal-ready'/);
  assert.match(bootstrap, /setupMenuReveal\(menuRoot, groups\)/);
  assert.match(motion, /html\.has-menu-reveal \.menu-reveal/);
  assert.match(motion, /animation: menu-reveal-in/);
  assert.match(motion, /menu-reveal-fallback/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test('piece viewer separates loading, ready and error states', async () => {
  const [feature, styles, generator] = await Promise.all([
    readSource('src/ts/features/piece-viewer.ts'),
    readSource('src/scss/components/_piece-viewer.scss'),
    readSource('scripts/menu-html.mjs')
  ]);

  assert.match(feature, /data-piece-viewer-status-text/);
  assert.match(feature, /dialog\.dataset\.state = 'loading'/);
  assert.match(feature, /dialog\.dataset\.state = 'ready'/);
  assert.match(feature, /dialog\.dataset\.state = 'error'/);
  assert.match(feature, /classList\.add\('is-open'\)/);
  assert.match(feature, /classList\.add\('is-closing'\)/);
  assert.match(feature, /transitionend/);
  assert.match(feature, /event\.preventDefault\(\)/);
  assert.match(generator, /piece-viewer__loader/);
  assert.match(generator, /piece-viewer__close-icon/);
  assert.match(styles, /\.piece-viewer__close[\s\S]*display: none/);
  assert.match(styles, /data-state="ready"\] \.piece-viewer__close/);
  assert.match(styles, /data-state="error"\] \.piece-viewer__close/);
  assert.match(styles, /\.piece-viewer__disclaimer[\s\S]*display: none/);
  assert.match(styles, /data-state="ready"\] \.piece-viewer__disclaimer/);
  assert.match(styles, /@keyframes piece-viewer-loader/);
  assert.match(styles, /rotate\(45deg\)/);
  assert.match(styles, /rotate\(-45deg\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('short desktop categories end with their final product divider', async () => {
  const tablet = await readSource('src/scss/breakpoints/_tablet.scss');

  assert.match(tablet, /\.menu-group\s*\{[\s\S]*?min-height: auto/);
  assert.match(tablet, /\.menu-item:last-of-type\s*\{[\s\S]*?margin-bottom: 0/);
  assert.doesNotMatch(tablet, /var\(--menu-item-count[^\n]*11\.5vh/);
});

test('compiled distribution contains synchronized animation and popup hooks', async () => {
  const [script, styles, html] = await Promise.all([
    readSource('dist/app.js'),
    readSource('dist/app.css'),
    readSource('dist/index.html')
  ]);

  const cssVersion = /app\.css\?v=([a-f0-9]{12})/.exec(html)?.[1];
  const scriptVersion = /app\.js\?v=([a-f0-9]{12})/.exec(html)?.[1];

  assert.ok(cssVersion);
  assert.equal(scriptVersion, cssVersion);
  assert.doesNotMatch(html, /__ASSET_VERSION__/);
  assert.match(script, /data-menu-reveal/);
  assert.match(script, /is-closing/);
  assert.match(script, /data-piece-viewer-status-text/);
  assert.match(styles, /html\.has-menu-reveal \.menu-reveal/);
  assert.match(styles, /@keyframes menu-reveal-in/);
  assert.match(styles, /@keyframes piece-viewer-loader/);
  assert.match(styles, /\.piece-viewer\.is-open/);
  assert.match(styles, /\.piece-viewer\.is-closing/);
  assert.match(html, /piece-viewer__loader/);
  assert.match(html, /piece-viewer__close-icon/);
});
