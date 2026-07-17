import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  attributeValue,
  findOpeningTag,
  findTagIndexByClass,
  hasClass,
  visibleText
} from './html-contract-helpers.mjs';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const PROPOSAL_COPY = 'VIVÍ UNA EXPERIENCIA DONDE EL SABOR, LA FRESCURA Y LA DEDICACIÓN SE ENCUENTRAN EN CADA PIEZA.';
const PROPOSAL_LEGAL = 'BASES, CONDICIONES Y LOCALES ADHERIDOS EN SUSHICLUB.COM.AR/BENEFICIOS.';

const assertProposalMarkup = (html) => {
  const heroIndex = findTagIndexByClass(html, 'section', 'hero');
  const proposalIndex = findTagIndexByClass(html, 'section', 'proposal');
  const menuIndex = findTagIndexByClass(html, 'section', 'menu-section');
  const text = visibleText(html);

  assert.ok(heroIndex >= 0, 'hero section is missing');
  assert.ok(proposalIndex > heroIndex, 'proposal must follow the hero');
  if (menuIndex >= 0) assert.ok(menuIndex > proposalIndex, 'proposal must precede the menu');

  const proposal = findOpeningTag(html, 'section', (tag) => hasClass(tag, 'proposal'));
  assert.ok(proposal, 'proposal section is missing');
  assert.equal(attributeValue(proposal, 'id'), 'propuesta');

  assert.ok(text.includes('NUESTRA PROPUESTA'));
  assert.ok(text.includes(PROPOSAL_COPY));
  assert.ok(text.includes('INCLUYE CUBIERTO'));
  assert.ok(text.includes('PIEZAS ILIMITADAS'));
  assert.ok(text.includes('AGUA & LIMONADA LIBRE'));
  assert.ok(text.includes('110.000'));
  assert.ok(text.includes('82.500'));
  assert.match(html, /assets\/galicia-eminent-visa\.svg/);

  const paymentLogo = findOpeningTag(html, 'img', (tag) => hasClass(tag, 'proposal__payment-logo'));
  assert.ok(paymentLogo, 'payment logo must exist');
  assert.equal(attributeValue(paymentLogo, 'width'), '245');
  assert.equal(attributeValue(paymentLogo, 'height'), '32');

  assert.ok(text.includes('PIEZAS SOBRANTES'));
  assert.ok(text.includes('SI NO SOBRAN PIEZAS'));
  assert.ok(text.includes(PROPOSAL_LEGAL));
};

test('proposal is static, semantic and placed between hero and menu', async () => {
  const template = await readSource('src/static/index.html');
  assertProposalMarkup(template);
});

test('proposal compiles into the static distribution', async () => {
  const html = await readSource('dist/index.html');
  assertProposalMarkup(html);
});

test('proposal layout is responsive, menu-aligned and never sticky', async () => {
  const scss = await readSource('src/scss/_proposal.scss');

  assert.match(scss, /\.proposal__shell\s*\{[\s\S]*?width:\s*min\(1500px, calc\(100% - clamp\(48px, 6vw, 128px\)\)\);/);
  assert.match(scss, /grid-template-columns:\s*minmax\(280px, 0\.9fr\) minmax\(430px, 1fr\);/);
  assert.match(scss, /@media \(max-width: 980px\)/);
  assert.match(scss, /@media \(max-width: 620px\)/);
  assert.match(scss, /\.proposal__prices,[\s\S]*?\.proposal__conditions\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(scss, /\.proposal__legal\s*\{/);
  assert.doesNotMatch(scss, /\.proposal\s*\{[^}]*min-height:\s*100svh;/);
  assert.doesNotMatch(scss, /position:\s*sticky/);
});
