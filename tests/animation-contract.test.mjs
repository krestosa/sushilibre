import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('menu reveal motion is restrained, one-time and viewport driven', async () => {
  const [feature, bootstrap, motion] = await Promise.all([
    readSource('src/ts/features/menu-reveal.ts'),
    readSource('src/ts/menu-bootstrap.ts'),
    readSource('src/scss/_motion.scss')
  ]);

  assert.match(feature, /IntersectionObserver/);
  assert.match(feature, /observer\.unobserve\(element\)/);
  assert.match(feature, /ITEM_STAGGER_MS = 40/);
  assert.match(feature, /MAX_ITEM_STAGGER_MS = 120/);
  assert.match(bootstrap, /setupMenuReveal\(menuRoot, groups\)/);
  assert.match(motion, /\.menu-reveal\s*\{/);
  assert.match(motion, /opacity 360ms var\(--ease-out\)/);
  assert.match(motion, /translate 420ms var\(--ease-out\)/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test('piece viewer animates open and close without immediate dismissal', async () => {
  const [feature, styles] = await Promise.all([
    readSource('src/ts/features/piece-viewer.ts'),
    readSource('src/scss/components/_piece-viewer.scss')
  ]);

  assert.match(feature, /classList\.add\('is-open'\)/);
  assert.match(feature, /classList\.add\('is-closing'\)/);
  assert.match(feature, /transitionend/);
  assert.match(feature, /event\.preventDefault\(\)/);
  assert.match(feature, /REDUCED_CLOSE_FALLBACK_MS/);
  assert.match(styles, /&\.is-open/);
  assert.match(styles, /&\.is-closing/);
  assert.match(styles, /scale: 0\.97/);
  assert.match(styles, /opacity 220ms ease-out/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('compiled distribution contains the motion hooks', async () => {
  const [script, styles] = await Promise.all([
    readSource('dist/app.js'),
    readSource('dist/app.css')
  ]);

  assert.match(script, /menu-reveal/);
  assert.match(script, /is-closing/);
  assert.match(styles, /\.menu-reveal/);
  assert.match(styles, /\.piece-viewer\.is-open/);
  assert.match(styles, /\.piece-viewer\.is-closing/);
});
