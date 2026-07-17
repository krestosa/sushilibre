import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseMenuSource, renderStaticHtml } from '../scripts/menu-html.mjs';

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

const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

const assertStaticMenuMarkup = (html) => {
  assert.doesNotMatch(html, /id=["']menu-data["']/i);
  assert.doesNotMatch(html, /type=["']application\/json["']/i);
  assert.doesNotMatch(html, /<!--\s*MENU_SECTION\s*-->/);
  assert.equal(countMatches(html, /<article class="menu-group"/g), 5);
  assert.equal(countMatches(html, /<article class="menu-item(?:\s|\")/g), 35);
  assert.equal(countMatches(html, /class="menu-item__description"/g), 32);
  assert.equal(countMatches(html, /class="menu-group__exit-sentinel"/g), 5);
  assert.match(html, /<h4 class="menu-item__name">BUENOS AIRES<\/h4>/);
  assert.match(html, /<h4 class="menu-item__name">PALTA THAI<\/h4>/);
  assert.match(html, /<h4 class="menu-item__name">\+ CAFÉ NESPRESSO<\/h4>/);
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

test('build converts menu.json into normal HTML elements', async () => {
  const [template, rawMenu] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../menu.json', import.meta.url), 'utf8')
  ]);
  const generatedHtml = renderStaticHtml(template, parseMenuSource(rawMenu));

  assert.match(template, /<!--\s*MENU_SECTION\s*-->/);
  assert.doesNotMatch(template, /id=["']menu-data["']/i);
  assertStaticMenuMarkup(generatedHtml);
});

test('compiled distribution is standalone and contains no runtime menu source', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8')
  ]);

  assertStaticMenuMarkup(html);
  await assert.rejects(
    readFile(new URL('../dist/menu.json', import.meta.url), 'utf8'),
    (error) => error?.code === 'ENOENT'
  );
  assert.doesNotMatch(script, /menu\.json/i);
  assert.doesNotMatch(script, /menu-data/i);
  assert.doesNotMatch(script, /loadMenuData|renderMenu|createTextElement/);
  assert.doesNotMatch(script, /document\.createElement\(["']article["']\)/);
});
