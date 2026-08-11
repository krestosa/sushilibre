import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

const assertDeferredVideoMarkup = (html) => {
  const stack = html.match(/<div class="hero__video-stack"[\s\S]*?<\/div>/)?.[0];
  assert.ok(stack, 'Hero video stack was not found.');
  assert.equal(countMatches(stack, /<video\b/g), 2);
  assert.equal(countMatches(stack, /<source\b[^>]*\bsrc=/g), 1);
  assert.equal(countMatches(stack, /\bpreload="metadata"/g), 1);
  assert.equal(countMatches(stack, /\bpreload="none"/g), 1);
  assert.match(stack, /<video\b[^>]*\bautoplay\b[^>]*\bloop\b[^>]*\bmuted\b[^>]*\bplaysinline\b/);
  assert.match(stack, /<video\b[^>]*data-video-source="assets\/hero_bg\.webm"[^>]*preload="none"[^>]*><\/video>/);
};

test('only the primary hero video is requested by static HTML', async () => {
  const [template, distribution] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  ]);

  assertDeferredVideoMarkup(template);
  assertDeferredVideoMarkup(distribution);
});

test('mobile playback uses one resilient loop with recovery hooks', async () => {
  const source = await readFile(new URL('../src/ts/features/video-loop.ts', import.meta.url), 'utf8');

  assert.match(source, /compactPlayback \|\| videos\.length < 2/);
  assert.match(source, /setupSingleVideoLoop\(firstVideo, videos\.slice\(1\), hero\)/);
  assert.match(source, /releaseVideoSource\(unusedVideo\)/);
  assert.match(source, /addEventListener\('waiting'/);
  assert.match(source, /addEventListener\('stalled'/);
  assert.match(source, /addEventListener\('pageshow'/);
  assert.match(source, /HARD_STALL_THRESHOLD/);
});
