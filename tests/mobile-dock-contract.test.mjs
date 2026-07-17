import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mobile booking dock follows the visual viewport during browser chrome transitions', async () => {
  const [template, layoutSource, compiledHtml, compiledScript] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ts/features/booking-dock-layout.ts', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(template, /booking-dock[^>]+100dvh/i);
  assert.doesNotMatch(compiledHtml, /booking-dock[^>]+100dvh/i);
  assert.match(layoutSource, /window\.visualViewport/);
  assert.match(layoutSource, /visualViewport\?\.addEventListener\('resize'/);
  assert.match(layoutSource, /visualViewport\?\.addEventListener\('scroll'/);
  assert.match(layoutSource, /window\.addEventListener\('scroll'/);
  assert.match(layoutSource, /requestAnimationFrame\(syncViewportDock\)/);
  assert.match(layoutSource, /position = 'fixed'/);
  assert.match(layoutSource, /--dock-visual-height/);
  assert.match(compiledScript, /visualViewport/);
  assert.match(compiledScript, /--dock-visual-height/);
});
