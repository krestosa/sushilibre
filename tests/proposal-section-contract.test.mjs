import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const PROPOSAL_COPY = 'VIVÍ UNA EXPERIENCIA DONDE EL SABOR, LA FRESCURA Y LA DEDICACIÓN SE ENCUENTRAN EN CADA PIEZA.';

const assertProposalMarkup = (html) => {
  const heroIndex = html.indexOf('<section class="hero"');
  const proposalIndex = html.indexOf('<section class="proposal"');
  const menuIndex = html.indexOf('<section class="menu-section"');

  assert.ok(heroIndex >= 0, 'hero section is missing');
  assert.ok(proposalIndex > heroIndex, 'proposal must follow the hero');
  if (menuIndex >= 0) assert.ok(menuIndex > proposalIndex, 'proposal must precede the menu');

  assert.match(html, /id="propuesta"/);
  assert.match(html, /NUESTRA PROPUESTA/);
  assert.match(html, new RegExp(PROPOSAL_COPY));
  assert.match(html, /INCLUYE CUBIERTO/);
  assert.match(html, /PIEZAS ILIMITADAS/);
  assert.match(html, /EXPERIENCIA EXCLUSIVA/);
  assert.match(html, /110\.000/);
  assert.match(html, /82\.500/);
  assert.match(html, /assets\/galicia-eminent-visa\.svg/);
  assert.match(html, /width="245" height="32"/);
  assert.match(html, /PIEZAS SOBRANTES/);
  assert.match(html, /SI NO SOBRAN PIEZAS/);
};

test('proposal is static, semantic and placed between hero and menu', async () => {
  const template = await readSource('src/static/index.html');
  assertProposalMarkup(template);
});

test('proposal compiles into the static distribution', async () => {
  const html = await readSource('dist/index.html');
  assertProposalMarkup(html);
});

test('proposal layout is responsive and never sticky', async () => {
  const scss = await readSource('src/scss/_proposal.scss');

  assert.match(scss, /\.proposal\s*\{[\s\S]*?min-height:\s*100svh;/);
  assert.match(scss, /grid-template-columns:\s*repeat\(12,/);
  assert.match(scss, /@media \(max-width: 1100px\)/);
  assert.match(scss, /@media \(max-width: 620px\)/);
  assert.match(scss, /\.proposal__prices,[\s\S]*?\.proposal__conditions\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.doesNotMatch(scss, /position:\s*sticky/);
}
);
