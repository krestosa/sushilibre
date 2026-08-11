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
});

test('Gazzetta display hierarchy lives in the shared fonts stylesheet without tracking', async () => {
  const [entry, fonts, template] = await Promise.all([
    readSource('src/scss/main.scss'),
    readSource('src/scss/_fonts.scss'),
    readSource('src/static/index.html')
  ]);

  assert.match(entry, /@use\s+["']fonts["'];/);
  assert.doesNotMatch(entry, /gazzetta-title/);
  await assert.rejects(access(new URL('../src/scss/_gazzetta-title.scss', import.meta.url)));

  assert.match(fonts, /\.title-word[\s\S]*?font-weight:\s*900;/);
  assert.match(fonts, /\.proposal__header h2[\s\S]*?font-weight:\s*700;/);
  assert.match(fonts, /\.menu-section__intro h2[\s\S]*?font-weight:\s*700;/);
  assert.match(fonts, /\.menu-group__title[\s\S]*?font-weight:\s*800;/);
  assert.match(fonts, /letter-spacing:\s*normal;/);
  assert.doesNotMatch(fonts, /letter-spacing:\s*[-+]?[\d.]+(?:em|px|rem)/);

  assert.match(fonts, /\.title-word\s*\{[\s\S]*?font-size:\s*clamp\(170px, 15\.6vw, 302px\)/);
  assert.match(fonts, /\.proposal__header h2\s*\{[\s\S]*?font-size:\s*clamp\(68px, 6vw, 112px\)/);
  assert.match(fonts, /\.menu-section__intro h2\s*\{[\s\S]*?font-size:\s*clamp\(70px, 7\.4vw, 126px\)/);
  assert.match(fonts, /\.menu-group__title\s*\{[\s\S]*?font-size:\s*clamp\(108px, 11\.4vw, 220px\)/);

  assert.match(template, /rel=["']preload["'][\s\S]*?href=["']fonts\/Gazzetta Black\.otf["'][\s\S]*?as=["']font["']/);
});

test('hero lockup stays heavy and the experience kicker is geometrically centered', async () => {
  const fonts = await readSource('src/scss/_fonts.scss');

  assert.match(fonts, /@media \(min-width: 821px\)[\s\S]*?\.title-lockup\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(fonts, /@media \(min-width: 821px\)[\s\S]*?\.title-kicker\s*\{[\s\S]*?justify-self:\s*center;[\s\S]*?font-size:\s*clamp\(22px, 1\.85vw, 36px\)/);
  assert.match(fonts, /@media \(max-width: 820px\), \(max-aspect-ratio: 4\/3\)[\s\S]*?\.title-kicker\s*\{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?grid-row:\s*2;[\s\S]*?justify-self:\s*center;/);
  assert.match(fonts, /@media \(max-width: 820px\), \(max-aspect-ratio: 4\/3\)[\s\S]*?\.title-word--libre\s*\{[\s\S]*?grid-row:\s*3;/);
  assert.match(fonts, /@media \(max-width: 620px\)[\s\S]*?\.title-word\s*\{[\s\S]*?font-size:\s*clamp\(108px, 31vw, 164px\)/);
});

test('mobile Gazzetta layout keeps category headings clear of product content', async () => {
  const fonts = await readSource('src/scss/_fonts.scss');

  assert.match(fonts, /@media \(max-width: 720px\)[\s\S]*?\.menu-group\s*\{[\s\S]*?padding-top:\s*7vh;[\s\S]*?padding-bottom:\s*9vh;/);
  assert.match(fonts, /\.menu-group \+ \.menu-group\s*\{[\s\S]*?margin-top:\s*-1vh;/);
  assert.match(fonts, /\.menu-group__items\s*\{[\s\S]*?padding-top:\s*6\.5vh;/);
  assert.match(fonts, /@media \(max-width: 620px\)[\s\S]*?\.menu-group__title\s*\{[\s\S]*?font-size:\s*clamp\(78px, 24vw, 108px\)/);
});

test('compiled CSS keeps Gazzetta weights and neutral tracking for display titles', async () => {
  const css = await readSource('dist/app.css');

  assert.match(css, /@font-face/);
  assert.match(css, /fonts\/Gazzetta Black\.otf/);
  assert.match(css, /\.title-word[\s\S]*?font-family:\s*"Gazzetta",\s*sans-serif;[\s\S]*?letter-spacing:\s*normal/);
  assert.match(css, /\.proposal__header h2[\s\S]*?font-weight:\s*700/);
  assert.match(css, /\.menu-section__intro h2[\s\S]*?font-weight:\s*700/);
  assert.match(css, /\.menu-group__title[\s\S]*?font-weight:\s*800/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
});
