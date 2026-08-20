import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('phone hero uses structural rows so title and copy cannot overlap', async () => {
  const [mobile, mobileHero, layout, main] = await Promise.all([
    readSource('src/scss/breakpoints/_mobile.scss'),
    readSource('src/scss/_mobile-hero-layout.scss'),
    readSource('src/ts/features/hero-title-layout.ts'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(mobile, /@media \(max-width: 620px\)[\s\S]*?\.hero\s*\{[\s\S]*?height: 100svh;[\s\S]*?min-height: 0;/);
  assert.doesNotMatch(mobile, /@media \(max-width: 620px\)[\s\S]{0,160}min-height:\s*640px/);

  assert.match(main, /@use "mobile-hero-layout";/);
  assert.match(mobileHero, /grid-template-rows:[\s\S]*var\(--hero-mobile-masthead-end\)[\s\S]*minmax\(0, 1fr\)[\s\S]*auto[\s\S]*var\(--dock-height\)/);
  assert.match(mobileHero, /\.hero \.title-lockup,[\s\S]*grid-row:\s*2;[\s\S]*align-self:\s*center;/);
  assert.match(mobileHero, /\.hero \.hero-copy\s*\{[\s\S]*position:\s*relative;[\s\S]*grid-row:\s*3;/);
  assert.match(mobileHero, /animation-name:\s*stage-copy-in/);

  assert.match(layout, /MOBILE_VERTICAL_QUERY = '\(max-width: 620px\)'/);
  assert.match(layout, /hero\.style\.setProperty\('--hero-mobile-masthead-end'/);
  assert.match(layout, /mastheadRect\.bottom - heroRect\.top/);
  assert.match(layout, /copyRect\.top - \(heroRect\.top \+ mastheadEnd\)/);
  assert.match(layout, /maxTitleHeight = Math\.max\(0, availableHeight - MOBILE_MIN_GAP_PX \* 2\)/);
  assert.match(layout, /lockup\.style\.scale = String\(scale\)/);
  assert.match(layout, /const shouldStack = mobileVertical\.matches \|\| required \+ buffer > available/);
  assert.doesNotMatch(layout, /lockup\.style\.top/);
  assert.doesNotMatch(layout, /style\.fontSize/);
  assert.doesNotMatch(layout, /addEventListener\(['"]scroll['"]/);
});

test('compiled CSS keeps the mobile title and copy in separate grid rows', async () => {
  const css = await readSource('dist/app.css');

  assert.match(css, /--hero-mobile-masthead-end:\s*74px/);
  assert.match(css, /grid-template-rows:\s*var\(--hero-mobile-masthead-end\) minmax\(0, 1fr\) auto calc\(var\(--dock-height\)/);
  assert.match(css, /\.hero \.title-lockup[^}]*grid-row:\s*2/);
  assert.match(css, /\.hero \.hero-copy[^}]*position:\s*relative[^}]*grid-row:\s*3/);
});
