import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const fontFiles = [
  'Gazzetta Thin.otf',
  'Gazzetta Thin Slanted.otf',
  'Gazzetta ExtraLight.otf',
  'Gazzetta ExtraLight Slanted.otf',
  'Gazzetta Light.otf',
  'Gazzetta Light Slanted.otf',
  'Gazzetta Regular.otf',
  'Gazzetta Regular Slanted.otf',
  'Gazzetta Medium.otf',
  'Gazzetta Medium Slanted.otf',
  'Gazzetta Bold.otf',
  'Gazzetta Bold Slanted.otf',
  'Gazzetta ExtraBold.otf',
  'Gazzetta ExtraBold Slanted.otf',
  'Gazzetta Black.otf',
  'Gazzetta Black Slanted.otf'
];

test('complete Gazzetta family remains available in the static distribution', async () => {
  await Promise.all(
    fontFiles.map((file) => access(new URL(`../dist/fonts/${file}`, import.meta.url)))
  );

  const fonts = await readSource('src/scss/_fonts.scss');
  assert.equal((fonts.match(/@font-face\s*\{/g) ?? []).length, 16);

  for (const weight of [100, 200, 300, 400, 500, 700, 800, 900]) {
    assert.match(fonts, new RegExp(`font-weight:\\s*${weight};`));
  }

  assert.match(fonts, /Gazzetta Black\.otf/);
  assert.match(fonts, /font-weight:\s*900;[\s\S]*?font-display:\s*block;/);
});

test('only the Sushi Libre hero words opt into Gazzetta Black', async () => {
  const [entry, titleStyles, template] = await Promise.all([
    readSource('src/scss/main.scss'),
    readSource('src/scss/_gazzetta-title.scss'),
    readSource('src/static/index.html')
  ]);

  assert.match(entry, /@use\s+["']fonts["'];/);
  assert.match(entry, /@use\s+["']gazzetta-title["'];/);
  assert.match(titleStyles, /^\.title-word\s*\{/m);
  assert.match(titleStyles, /font-family:\s*["']Gazzetta["'],\s*sans-serif;/);
  assert.match(titleStyles, /font-weight:\s*900;/);
  assert.match(titleStyles, /font-synthesis:\s*none;/);
  assert.match(titleStyles, /font-size:\s*clamp\(130px,\s*12\.7vw,\s*244px\);/);
  assert.match(titleStyles, /letter-spacing:\s*0\.018em;/);
  assert.match(titleStyles, /@media \(max-width: 620px\)[\s\S]*?font-size:\s*27vw;[\s\S]*?letter-spacing:\s*0\.024em;/);
  assert.doesNotMatch(titleStyles, /letter-spacing:\s*-/);
  assert.doesNotMatch(titleStyles, /title-kicker|hero-copy|masthead|proposal|menu-/);

  assert.match(template, /rel=["']preload["'][\s\S]*?href=["']fonts\/Gazzetta Black\.otf["'][\s\S]*?as=["']font["']/);
});

test('compiled CSS keeps Gazzetta Black and expanded title metrics after responsive rules', async () => {
  const css = await readSource('dist/app.css');
  const titleRules = [...css.matchAll(/\.title-word\s*\{([^}]*)\}/g)].map((match) => match[1]);
  const gazzettaRule = titleRules.find((rule) => /font-family:\s*"Gazzetta"/.test(rule)) ?? '';

  assert.match(css, /@font-face/);
  assert.match(css, /fonts\/Gazzetta Black\.otf/);
  assert.match(gazzettaRule, /font-family:\s*"Gazzetta",\s*sans-serif;/);
  assert.match(gazzettaRule, /font-weight:\s*900;/);
  assert.match(gazzettaRule, /font-size:\s*clamp\(130px,\s*12\.7vw,\s*244px\)/);
  assert.match(gazzettaRule, /letter-spacing:\s*0\.018em/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.title-word\s*\{[^}]*font-size:\s*27vw;[^}]*letter-spacing:\s*0\.024em/);
});
