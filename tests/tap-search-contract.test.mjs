import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('single taps cannot trigger text search while long-press selection remains available', async () => {
  const [applicationSource, guardSource, compiledScript, compiledCss] = await Promise.all([
    readFile(new URL('../src/ts/application.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/ts/features/tap-search-guard.ts', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../dist/app.css', import.meta.url), 'utf8')
  ]);

  assert.match(applicationSource, /setupTapSearchGuard\(\)/);
  assert.match(guardSource, /navigator\.maxTouchPoints/);
  assert.match(guardSource, /TAP_MAX_DURATION/);
  assert.match(guardSource, /TAP_MOVEMENT_TOLERANCE/);
  assert.match(guardSource, /touchstart/);
  assert.match(guardSource, /touchmove/);
  assert.match(guardSource, /touchend/);
  assert.match(guardSource, /selectstart/);
  assert.match(guardSource, /selectionchange/);
  assert.match(guardSource, /event\.preventDefault\(\)/);
  assert.match(guardSource, /removeAllRanges\(\)/);
  assert.match(guardSource, /duration <= TAP_MAX_DURATION/);
  assert.match(guardSource, /isEditableTarget/);

  assert.match(compiledScript, /SELECTION_SUPPRESSION_DURATION/);
  assert.match(compiledScript, /selectionchange/);
  assert.match(compiledScript, /removeAllRanges/);
  assert.doesNotMatch(compiledCss, /user-select:\s*none/i);
  assert.doesNotMatch(compiledCss, /-webkit-touch-callout:\s*none/i);
});
