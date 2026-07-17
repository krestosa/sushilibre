import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseMenuSource, renderStaticHtml } from '../scripts/menu-html.mjs';

const EXPECTED_MENU_HASH = '48137eb7a88b06080576f11ae7e55a48da5b7ef4c15040d8d1e5c6b35f9b3379';
const PIECE_IMAGE_PATTERN = /^assets\/piezas\/[a-z0-9_\/-]+\.webp$/;

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
  assert.equal(countMatches(html, /<article class="menu-item(?:\s|\")/g), 36);
  assert.equal(countMatches(html, /class="menu-item__description"/g), 33);
  assert.equal(countMatches(html, /class="menu-group__exit-sentinel"/g), 5);
  assert.equal(countMatches(html, /data-menu-reveal(?:\s|>)/g), 42);
  assert.equal(countMatches(html, /data-piece-viewer-open/g), 33);
  assert.equal(countMatches(html, /class="menu-item__badge menu-item__view"/g), 33);
  assert.equal(countMatches(html, /<dialog class="piece-viewer"/g), 1);
  assert.equal(countMatches(html, /data-piece-viewer-image/g), 1);
  assert.equal(countMatches(html, /class="piece-viewer__loader"/g), 1);
  assert.equal(countMatches(html, /data-piece-viewer-status-text/g), 1);
  assert.equal(countMatches(html, /class="piece-viewer__disclaimer"/g), 1);
  assert.match(html, /<div class="menu-item__badges">[^<]*(?:<[^>]+>[^<]*<\/[^>]+>)*<button class="menu-item__badge menu-item__view"/);
  assert.match(html, /<button class="piece-viewer__close"[^>]*><span class="piece-viewer__close-icon" aria-hidden="true"><\/span><\/button>/);
  assert.match(html, /Imagen ilustrativa\. Cantidad de piezas según menú\./);
  assert.doesNotMatch(html, /piece-viewer__caption|data-piece-viewer-title/);
  assert.match(html, /data-piece-image="assets\/piezas\/buenos_aires\.webp"/);
  assert.match(html, /data-piece-image="assets\/piezas\/niguiri_salmon\.webp"/);
  assert.match(html, /data-piece-image="assets\/piezas\/sashimi_salmon\.webp"/);
  assert.match(html, /data-piece-image="assets\/piezas\/geisha_salmon\.webp"/);
  assert.match(html, /<h4 class="menu-item__name">BUENOS AIRES<\/h4>/);
  assert.match(html, /<h4 class="menu-item__name">FUTURAMA2<\/h4>/);
  assert.match(html, /<h4 class="menu-item__name">SALMÓN<\/h4>/);
  assert.match(html, /FINAS FETAS DE SALMÓN SOBRE BOCADITOS DE ARROZ\./);
  assert.match(html, /<h4 class="menu-item__name">PALTA THAI<\/h4>/);
  assert.match(html, /<h4 class="menu-item__name">\+ CAFÉ NESPRESSO X PERSONA<\/h4>/);
};

test('menu values, categories and piece image paths remain unchanged', async () => {
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
    { id: 'niguiris', title: 'NIGUIRIS', quantity: '3U', count: 9 },
    { id: 'sashimis', title: 'SASHIMIS', quantity: '5U', count: 4 },
    { id: 'geisha', title: 'GEISHA', quantity: '3U', count: 1 },
    { id: 'bebidas', title: 'BEBIDAS', quantity: '', count: 3 }
  ]);

  const pieceItems = menu.sections
    .filter(({ id }) => id !== 'bebidas')
    .flatMap(({ items }) => items);
  const beverages = menu.sections.find(({ id }) => id === 'bebidas');

  assert.equal(pieceItems.length, 33);
  pieceItems.forEach(({ image, name }) => {
    assert.equal(typeof image, 'string', `${name} must define an image path`);
    assert.match(image, PIECE_IMAGE_PATTERN);
  });
  beverages.items.forEach(({ image }) => assert.equal(image, undefined));

  const niguiris = menu.sections.find(({ id }) => id === 'niguiris');
  assert.deepEqual(niguiris.items.map(({ name }) => name), [
    'SALMÓN',
    'SALMÓN AHUMADO',
    'ATÚN ROJO',
    'PULPO',
    'ANTICUCHERO',
    'FUEGO THAI',
    'LANGOSTINO FUEGO THAI',
    'CRISPY WHITE',
    'PALTA THAI'
  ]);
});

test('build converts menu.json into normal HTML elements and one reusable viewer', async () => {
  const [template, rawMenu] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../menu.json', import.meta.url), 'utf8')
  ]);
  const generatedHtml = renderStaticHtml(template, parseMenuSource(rawMenu));

  assert.match(template, /<!--\s*MENU_SECTION\s*-->/);
  assert.match(template, /classList\.add\('has-menu-reveal'\)/);
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
  assert.match(script, /data-piece-viewer/);
});
