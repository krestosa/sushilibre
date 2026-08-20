import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('booking dock renders capacity as a real metadata field across breakpoints', async () => {
  const [main, feature, styles, scssMain] = await Promise.all([
    readSource('src/ts/main.ts'),
    readSource('src/ts/features/booking-dock-capacity.ts'),
    readSource('src/scss/_booking-dock-capacity.scss'),
    readSource('src/scss/main.scss')
  ]);

  const capacityImport = main.indexOf("import './features/booking-dock-capacity';");
  const applicationImport = main.indexOf("import './application';");

  assert.ok(capacityImport >= 0);
  assert.ok(applicationImport > capacityImport);
  assert.match(feature, /booking-dock__meta booking-dock__meta--capacity/);
  assert.match(feature, /label\.textContent = 'Cupos'/);
  assert.match(feature, /value\.textContent = 'LIMITADOS'/);
  assert.match(feature, /insertBefore\(capacity, countdown\)/);

  assert.match(styles, /\.booking-dock::after\s*\{[\s\S]*?content:\s*none\s*!important/);
  assert.match(styles, /@media \(min-width: 1101px\)/);
  assert.match(styles, /@media \(min-width: 841px\) and \(max-width: 1100px\)/);
  assert.match(styles, /@media \(max-width: 840px\)/);
  assert.match(styles, /\.booking-dock__meta--capacity\s*\{[\s\S]*?grid-column:\s*4\s*!important/);
  assert.match(styles, /\.booking-dock:not\(\.is-event-live\) \.booking-dock__meta--capacity\s*\{[\s\S]*?grid-column:\s*4 \/ 6\s*!important/);
  assert.match(styles, /\.booking-dock:not\(\.is-event-live\) \.countdown\s*\{[\s\S]*?grid-column:\s*1 \/ span 4\s*!important/);
  assert.match(scssMain, /@use "booking-dock-capacity";/);
});
