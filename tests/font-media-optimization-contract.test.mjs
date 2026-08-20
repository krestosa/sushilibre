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

test('media optimizer preserves video geometry and avoids bot recursion', async () => {
  const workflow = await readSource('.github/workflows/optimize-media.yml');

  assert.match(workflow, /github\.actor != 'github-actions\[bot\]'/);
  assert.match(workflow, /-crf 24/);
  assert.match(workflow, /-preset slow/);
  assert.match(workflow, /-pix_fmt yuv420p/);
  assert.match(workflow, /-movflags \+faststart/);
  assert.match(workflow, /before_dim/);
  assert.match(workflow, /before_duration/);
  assert.match(workflow, /after_size < before_size/);
});
