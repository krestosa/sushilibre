import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('font payload only declares the three Gazzetta weights used by the UI', async () => {
  const fonts = await readSource('src/scss/_fonts.scss');
  const faces = fonts.match(/@font-face/g) ?? [];

  assert.equal(faces.length, 3);
  assert.match(fonts, /Gazzetta Bold\.otf/);
  assert.match(fonts, /font-weight:\s*700/);
  assert.match(fonts, /Gazzetta ExtraBold\.otf/);
  assert.match(fonts, /font-weight:\s*800/);
  assert.match(fonts, /Gazzetta Black\.otf/);
  assert.match(fonts, /font-weight:\s*900/);
  assert.doesNotMatch(fonts, /Slanted|Thin|ExtraLight|Light\.otf|Regular\.otf|Medium\.otf/);
  assert.doesNotMatch(fonts, /font-display:\s*block/);
});

test('media optimizer rebuilds decoder-friendly videos from the original sources', async () => {
  const workflow = await readSource('.github/workflows/optimize-media.yml');

  assert.match(workflow, /SOURCE_COMMIT='32ebbc7fe701d421ea494de0892b7e5771cd31d6'/);
  assert.match(workflow, /git show "\$\{SOURCE_COMMIT\}:\$\{input\}"/);
  assert.match(workflow, /-crf 20/);
  assert.match(workflow, /-preset medium/);
  assert.match(workflow, /-profile:v main/);
  assert.match(workflow, /-g 60/);
  assert.match(workflow, /-keyint_min 30/);
  assert.match(workflow, /-refs 2/);
  assert.match(workflow, /-bf 2/);
  assert.match(workflow, /-pix_fmt yuv420p/);
  assert.match(workflow, /-movflags \+faststart/);
  assert.match(workflow, /before_rate/);
  assert.match(workflow, /before_duration/);
});

test('application uses the resilient video controller on every breakpoint', async () => {
  const application = await readSource('src/ts/application.ts');
  const setupCalls = application.match(/setupVideoLoop\(runtime\)/g) ?? [];

  assert.equal(setupCalls.length, 1);
  assert.doesNotMatch(application, /compactVideo|waitForMetadata|waitForPaintedFrame|transitionInProgress/);
});
