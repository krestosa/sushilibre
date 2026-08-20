import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('proposal includes the Campari hospitality feature', async () => {
  const [template, styles, asset, main] = await Promise.all([
    readSource('src/static/index.html'),
    readSource('src/scss/_proposal-hospitality.scss'),
    readSource('src/static/assets/campari.svg'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(template, /class="proposal__hospitality[^\"]*proposal-reveal--hospitality/);
  assert.match(template, /src="assets\/campari\.svg"/);
  assert.match(template, /alt="Campari"/);
  assert.match(template, /TRAGO DE BIENVENIDA<br \/>\s*&amp; DJ SET SESSION/);
  assert.match(styles, /\.proposal__hospitality\s*\{[\s\S]*?display: flex;[\s\S]*?align-items: center;/);
  assert.match(styles, /\.proposal__hospitality-copy[\s\S]*?text-align: left;[\s\S]*?white-space: nowrap;/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(asset, /viewBox="0 0 244 55"/);
  assert.match(main, /@use "proposal-hospitality";/);
});
