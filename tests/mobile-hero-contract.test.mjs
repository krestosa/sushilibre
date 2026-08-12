import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('phone hero uses a stable viewport and keeps copy above the fixed dock', async () => {
  const [tablet, mobile] = await Promise.all([
    readSource('src/scss/breakpoints/_tablet.scss'),
    readSource('src/scss/breakpoints/_mobile.scss')
  ]);

  assert.match(tablet, /@media \(max-width: 820px\)[\s\S]*?\.hero\s*\{[\s\S]*?height: 100svh;[\s\S]*?min-height: 680px;/);
  assert.doesNotMatch(tablet, /@media \(max-width: 820px\), \(max-aspect-ratio: 4\/3\)/);
  assert.match(tablet, /\.hero-copy\s*\{[\s\S]*?top: auto;[\s\S]*?bottom: calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 28px\);/);

  assert.match(mobile, /@media \(max-width: 620px\)[\s\S]*?\.hero\s*\{[\s\S]*?height: 100svh;[\s\S]*?min-height: 640px;/);
  assert.match(mobile, /\.title-lockup\s*\{[\s\S]*?top: clamp\(124px, 47vw, 170px\);/);
  assert.match(mobile, /\.title-kicker\s*\{[\s\S]*?justify-self: start;/);
  assert.match(mobile, /\.hero-copy\s*\{[\s\S]*?top: auto;[\s\S]*?bottom: calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 30px\);/);
  assert.doesNotMatch(mobile, /min-height:\s*820px/);
  assert.doesNotMatch(tablet, /min-height:\s*860px/);
});

test('compiled CSS preserves the normalized phone composition', async () => {
  const css = await readSource('dist/app.css');

  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.hero\s*\{[^}]*height:\s*100svh;[^}]*min-height:\s*640px/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.title-lockup\s*\{[^}]*top:\s*clamp\(124px, 47vw, 170px\)/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.hero-copy\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 30px\)/);
  assert.doesNotMatch(css, /@media \(max-width: 620px\)[\s\S]{0,300}min-height:\s*820px/);
});
