import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mobile booking dock uses native fixed positioning and safe areas', async () => {
  const [template, layoutSource, mobileStyles, compiledHtml, compiledScript, compiledStyles] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ts/features/booking-dock-layout.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/scss/breakpoints/_mobile.scss', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.css', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(template, /booking-dock[^>]+100dvh/i);
  assert.doesNotMatch(compiledHtml, /booking-dock[^>]+100dvh/i);
  assert.doesNotMatch(layoutSource, /visualViewport|createViewportProbe|handleTouchMove|setChromeTarget/);
  assert.doesNotMatch(compiledScript, /createViewportProbe|--dock-effective-bottom|setChromeTarget/);
  assert.match(mobileStyles, /\.booking-dock\s*\{[\s\S]*position:\s*fixed;/);
  assert.match(mobileStyles, /bottom:\s*var\(--dock-bottom\)/);
  assert.match(mobileStyles, /safe-area-inset-bottom/);
  assert.match(mobileStyles, /safe-area-inset-left/);
  assert.match(mobileStyles, /safe-area-inset-right/);
  assert.match(compiledStyles, /position:\s*fixed;/);
  assert.match(compiledStyles, /safe-area-inset-bottom/);
});
