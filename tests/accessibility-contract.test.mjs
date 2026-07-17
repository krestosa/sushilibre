import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const assertAccessibleMarkup = (html) => {
  assert.doesNotMatch(html, /<strong\b[^>]*\baria-label=/i);
  assert.match(html, /<span class="sr-only">Puerto Madero — abrir en Google Maps<\/span>/);
  assert.match(html, /<span class="sr-only">Jueves 30 de julio<\/span>/);
  assert.match(
    html,
    /<a class="booking-dock__meta booking-dock__meta--location"[^>]*href="https:\/\/maps\.app\.goo\.gl\/N6UjNEoETLvo1ucRA"[^>]*>/i
  );
  assert.match(html, /<span class="booking-dock__external-arrow" aria-hidden="true">↗<\/span>/);
  assert.match(
    html,
    /<img class="masthead__sushiclub"[^>]*\bwidth="234"[^>]*\bheight="34"/i
  );
  assert.match(
    html,
    /<img class="masthead__anniversary"[^>]*\bwidth="147"[^>]*\bheight="113"/i
  );
};

test('source and compiled markup avoid prohibited ARIA and reserve logo dimensions', async () => {
  const [template, compiled] = await Promise.all([
    readSource('src/static/index.html'),
    readSource('dist/index.html')
  ]);

  assertAccessibleMarkup(template);
  assertAccessibleMarkup(compiled);
});

test('menu background uses WebP throughout the active build', async () => {
  const [menuSource, environment, compiled] = await Promise.all([
    readSource('menu.json'),
    readSource('src/scss/_environment.scss'),
    readSource('dist/index.html')
  ]);

  const menu = JSON.parse(menuSource);
  assert.equal(menu.background, 'assets/menu_bg.webp');
  assert.match(environment, /assets\/menu_bg\.webp/);
  assert.match(compiled, /assets\/menu_bg\.webp/);
  assert.doesNotMatch(compiled, /assets\/menu_bg\.png/);
});
