import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { embedMenuData } from '../scripts/build-core.mjs';

const EXPECTED_MENU_HASH = 'ebf71e1b6fd04c2eb19f219fc201631a51c6fa1683f2be50d3e59fbdf01d9695';

const sortValue = (value) => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)])
  );
};

const hashMenu = (menu) => createHash('sha256')
  .update(JSON.stringify(sortValue(menu)))
  .digest('hex');

const readEmbeddedMenu = (html) => {
  const embedded = html.match(/<script id="menu-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded?.[1], 'Embedded menu JSON was not found');
  return JSON.parse(embedded[1]);
};

test('menu values and categories remain unchanged', async () => {
  const rawMenu = await readFile(new URL('../menu.json', import.meta.url), 'utf8');
  const menu = JSON.parse(rawMenu);

  assert.equal(hashMenu(menu), EXPECTED_MENU_HASH);
  assert.deepEqual(menu.sections.map(({ id, title, quantity, items }) => ({
    id,
    title,
    quantity,
    count: items.length
  })), [
    { id: 'piezas', title: 'PIEZAS', quantity: '4U', count: 19 },
    { id: 'niguiris', title: 'NIGUIRIS', quantity: '3U', count: 8 },
    { id: 'sashimis', title: 'SASHIMIS', quantity: '5U', count: 4 },
    { id: 'geisha', title: 'GEISHA', quantity: '4U', count: 1 },
    { id: 'bebidas', title: 'BEBIDAS', quantity: '', count: 3 }
  ]);
});

test('build injects menu.json into the static HTML template', async () => {
  const [template, rawMenu] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../menu.json', import.meta.url), 'utf8')
  ]);
  const menu = JSON.parse(rawMenu);
  const generatedHtml = embedMenuData(template, menu);

  assert.deepEqual(readEmbeddedMenu(generatedHtml), menu);
  assert.deepEqual(readEmbeddedMenu(template), {});
});

test('compiled distribution embeds the same menu as dist/menu.json', async () => {
  const [html, rawMenu] = await Promise.all([
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/menu.json', import.meta.url), 'utf8')
  ]);

  assert.deepEqual(readEmbeddedMenu(html), JSON.parse(rawMenu));
});
