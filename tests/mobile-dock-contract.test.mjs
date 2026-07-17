import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mobile booking dock tracks expanded and collapsed browser chrome', async () => {
  const [template, layoutSource, compiledHtml, compiledScript] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ts/features/booking-dock-layout.ts', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(template, /booking-dock[^>]+100dvh/i);
  assert.doesNotMatch(compiledHtml, /booking-dock[^>]+100dvh/i);
  assert.match(layoutSource, /createViewportProbe\('svh'\)/);
  assert.match(layoutSource, /createViewportProbe\('lvh'\)/);
  assert.match(layoutSource, /createViewportProbe\('dvh'\)/);
  assert.match(layoutSource, /window\.visualViewport/);
  assert.match(layoutSource, /handleScrollDirection/);
  assert.match(layoutSource, /handleTouchMove/);
  assert.match(layoutSource, /setChromeTarget\(1\)/);
  assert.match(layoutSource, /setChromeTarget\(0\)/);
  assert.match(layoutSource, /position = 'fixed'/);
  assert.match(layoutSource, /--dock-effective-bottom/);
  assert.match(compiledScript, /100svh/);
  assert.match(compiledScript, /100lvh/);
  assert.match(compiledScript, /--dock-effective-bottom/);
});
