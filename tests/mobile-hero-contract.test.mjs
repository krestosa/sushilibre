import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('phone hero centers the title inside the real vertical space', async () => {
  const [tablet, mobile, layout] = await Promise.all([
    readSource('src/scss/breakpoints/_tablet.scss'),
    readSource('src/scss/breakpoints/_mobile.scss'),
    readSource('src/ts/features/hero-title-layout.ts')
  ]);

  assert.match(tablet, /@media \(max-width: 820px\)[\s\S]*?\.hero\s*\{[\s\S]*?height: 100svh;/);
  assert.doesNotMatch(tablet, /@media \(max-width: 820px\), \(max-aspect-ratio: 4\/3\)/);
  assert.match(tablet, /\.hero-copy\s*\{[\s\S]*?top: auto;[\s\S]*?bottom: calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 28px\);/);

  assert.match(mobile, /@media \(max-width: 620px\)[\s\S]*?\.hero\s*\{[\s\S]*?height: 100svh;[\s\S]*?min-height: 0;/);
  assert.match(mobile, /\.hero-copy\s*\{[\s\S]*?top: auto;[\s\S]*?bottom: calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 12px\);/);
  assert.doesNotMatch(mobile, /@media \(max-width: 620px\)[\s\S]{0,160}min-height:\s*640px/);

  assert.match(layout, /MOBILE_VERTICAL_QUERY = '\(max-width: 620px\)'/);
  assert.match(layout, /masthead\.offsetTop \+ masthead\.offsetHeight/);
  assert.match(layout, /heroCopy\.offsetTop/);
  assert.match(layout, /availableHeight = Math\.max\(0, lowerBoundary - upperBoundary\)/);
  assert.match(layout, /MOBILE_TARGET_GAP_PX = 12/);
  assert.match(layout, /const scaledHeight = lockup\.offsetHeight/);
  assert.match(layout, /const equalGap = Math\.max\(0, \(availableHeight - scaledHeight\) \/ 2\)/);
  assert.match(layout, /lockup\.style\.top = `\$\{upperBoundary \+ equalGap\}px`/);
  assert.match(layout, /sushi\.style\.fontSize = `\$\{baseSushiSize \* scale\}px`/);
  assert.match(layout, /kicker\.style\.fontSize = `\$\{baseKickerSize \* scale\}px`/);
  assert.match(layout, /libre\.style\.fontSize = `\$\{baseLibreSize \* scale\}px`/);
  assert.doesNotMatch(layout, /addEventListener\(['"]scroll['"]/);
});

test('compiled CSS allows the phone hero to fit short viewports', async () => {
  const css = await readSource('dist/app.css');

  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.hero\s*\{[^}]*height:\s*100svh;[^}]*min-height:\s*0/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.hero-copy\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 12px\)/);
  assert.doesNotMatch(css, /@media \(max-width: 620px\)[\s\S]{0,300}min-height:\s*640px/);
});
