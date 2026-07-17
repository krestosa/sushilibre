import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const legal = 'BASES, CONDICIONES Y LOCALES ADHERIDOS EN SUSHICLUB.COM.AR/BENEFICIOS.';

const assertCommercialContent = (html) => {
  assert.match(html, /class="proposal__payment-logo"[^>]*assets\/galicia-eminent-visa\.svg/);
  assert.match(html, /width="245" height="32"/);
  assert.ok(html.includes(legal));
};

test('proposal is static, precedes the menu and includes complete commercial information', async () => {
  const [template, generated] = await Promise.all([
    readSource('src/static/index.html'),
    readSource('dist/index.html')
  ]);

  const sourceProposalIndex = template.indexOf('<section class="proposal"');
  const sourceMenuMarkerIndex = template.indexOf('<!-- MENU_SECTION -->');
  assert.ok(sourceProposalIndex >= 0, 'source proposal section must exist');
  assert.ok(sourceMenuMarkerIndex > sourceProposalIndex, 'source proposal must precede the menu marker');
  assertCommercialContent(template);

  const generatedProposalIndex = generated.indexOf('<section class="proposal"');
  const generatedMenuIndex = generated.indexOf('<section class="menu-section"');
  assert.ok(generatedProposalIndex >= 0, 'generated proposal section must exist');
  assert.ok(generatedMenuIndex > generatedProposalIndex, 'generated proposal must precede the menu');
  assertCommercialContent(generated);
});

test('proposal reuses the menu column split and avoids artificial section height', async () => {
  const styles = await readSource('src/scss/_proposal.scss');

  assert.match(styles, /\.proposal__shell\s*\{[\s\S]*?width:\s*min\(1500px, calc\(100% - clamp\(48px, 6vw, 128px\)\)\);/);
  assert.match(styles, /grid-template-columns:\s*minmax\(280px, 0\.9fr\) minmax\(430px, 1fr\);/);
  assert.match(styles, /column-gap:\s*clamp\(56px, 9vw, 164px\);/);
  assert.match(styles, /@media \(max-width: 980px\)[\s\S]*?grid-template-columns:\s*minmax\(220px, 0\.78fr\) minmax\(360px, 1fr\);/);
  assert.match(styles, /\.proposal \+ \.menu-section \.menu-section__shell\s*\{[\s\S]*?padding-top:/);
  assert.match(styles, /\.proposal__payment-logo\s*\{[\s\S]*?width:\s*min\(290px, 90%\);/);
  assert.match(styles, /\.proposal__legal\s*\{/);
  assert.doesNotMatch(styles, /\.proposal\s*\{[^}]*min-height:\s*100svh;/);
  assert.doesNotMatch(styles, /position:\s*sticky/);
});
