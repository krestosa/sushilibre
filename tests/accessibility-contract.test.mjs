import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  attributeValue,
  compactHtml,
  findOpeningTag,
  hasAttribute,
  hasClass,
  openingTags
} from './html-contract-helpers.mjs';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const assertAccessibleMarkup = (html) => {
  const compact = compactHtml(html);

  openingTags(compact, 'strong').forEach((tag) => {
    assert.equal(attributeValue(tag, 'aria-label'), null, 'strong elements cannot carry aria-label');
  });

  assert.match(compact, /<span\b[^>]*class=["']sr-only["'][^>]*>Recova — abrir en Google Maps<\/span>/i);
  assert.match(compact, /<span\b[^>]*class=["']sr-only["'][^>]*>Jueves 3 de septiembre<\/span>/i);

  const locationLink = findOpeningTag(compact, 'a', (tag) => (
    hasClass(tag, 'booking-dock__meta--location')
    && attributeValue(tag, 'href') === 'https://maps.app.goo.gl/nbh1CpNqBgfToHEe8'
  ));
  assert.ok(locationLink, 'location link must exist');
  assert.equal(attributeValue(locationLink, 'target'), '_blank');
  assert.equal(attributeValue(locationLink, 'rel'), 'noopener noreferrer');

  const externalArrow = findOpeningTag(compact, 'span', (tag) => hasClass(tag, 'booking-dock__external-arrow'));
  assert.ok(externalArrow, 'external-link arrow must exist');
  assert.equal(attributeValue(externalArrow, 'aria-hidden'), 'true');

  const brandLink = findOpeningTag(compact, 'a', (tag) => hasClass(tag, 'masthead__brands'));
  assert.ok(brandLink, 'masthead brand block must be a link');
  assert.equal(attributeValue(brandLink, 'href'), 'https://www.sushiclub.com.ar/');
  assert.equal(attributeValue(brandLink, 'aria-label'), 'Ir al sitio de SushiClub');

  const sushiClubLogo = findOpeningTag(compact, 'img', (tag) => hasClass(tag, 'masthead__sushiclub'));
  assert.ok(sushiClubLogo, 'SushiClub logo must exist');
  assert.equal(attributeValue(sushiClubLogo, 'width'), '234');
  assert.equal(attributeValue(sushiClubLogo, 'height'), '34');

  const anniversaryLogo = findOpeningTag(compact, 'img', (tag) => hasClass(tag, 'masthead__anniversary'));
  assert.ok(anniversaryLogo, 'anniversary logo must exist');
  assert.equal(attributeValue(anniversaryLogo, 'width'), '147');
  assert.equal(attributeValue(anniversaryLogo, 'height'), '113');
  assert.ok(hasAttribute(anniversaryLogo, 'alt'));
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
