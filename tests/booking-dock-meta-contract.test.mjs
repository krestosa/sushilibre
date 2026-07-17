import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('booking dock exposes venue, date and start time as three metadata blocks', async () => {
  const [template, compiledHtml, layoutSource, compiledScript] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ts/features/booking-dock-layout.ts', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8')
  ]);

  for (const html of [template, compiledHtml]) {
    assert.equal([...html.matchAll(/class="booking-dock__meta(?:\s|\")/g)].length, 3);
    assert.match(html, /<span class="booking-dock__label">Desde<\/span>\s*<strong>20\.00HS<\/strong>/);
  }

  assert.match(layoutSource, /const \[venueMeta, dateMeta, timeMeta\] = metadata/);
  assert.match(layoutSource, /countdown\.style\.gridColumn = '1 \/ span 3'/);
  assert.match(layoutSource, /cta\.style\.gridColumn = '4'/);
  assert.match(layoutSource, /cta\.style\.gridColumn = '5'/);
  assert.match(compiledScript, /20\.00HS|timeMeta|gridColumn = "1 \/ span 3"/);
});
