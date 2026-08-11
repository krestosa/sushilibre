import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

const assertSequencedVideoMarkup = (html) => {
  const stack = html.match(/<div class="hero__video-stack"[\s\S]*?<\/div>/)?.[0];
  assert.ok(stack, 'Hero video stack was not found.');

  assert.equal(countMatches(stack, /<video\b/g), 3);
  assert.equal(countMatches(stack, /<source\b[^>]*\bsrc=/g), 1);
  assert.equal(countMatches(stack, /\bdata-intro-video\b/g), 1);
  assert.equal(countMatches(stack, /\bdata-loop-video\b/g), 2);
  assert.equal(countMatches(stack, /\bpreload="metadata"/g), 1);
  assert.equal(countMatches(stack, /\bpreload="none"/g), 2);

  assert.match(
    stack,
    /<video\b[^>]*\bdata-intro-video\b[^>]*data-video-source="assets\/bg_inicio\.webm"[^>]*\bautoplay\b[^>]*\bmuted\b[^>]*\bplaysinline\b/
  );
  assert.match(stack, /<source\b[^>]*src="assets\/bg_inicio\.webm"[^>]*type="video\/webm"/);
  assert.equal(countMatches(stack, /data-video-source="assets\/bg_loop\.webm"/g), 2);
  assert.doesNotMatch(stack, /<video\b[^>]*\bdata-intro-video\b[^>]*\bloop\b/);
};

test('the hero loads the intro once and keeps two deferred loop layers', async () => {
  const [template, distribution] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  ]);

  assertSequencedVideoMarkup(template);
  assertSequencedVideoMarkup(distribution);

  await Promise.all([
    access(new URL('../dist/assets/bg_inicio.webm', import.meta.url)),
    access(new URL('../dist/assets/bg_loop.webm', import.meta.url))
  ]);
});

test('runtime switches permanently from intro to the crossfaded loop pair', async () => {
  const source = await readFile(new URL('../src/ts/features/video-loop.ts', import.meta.url), 'utf8');

  assert.match(source, /query<HTMLVideoElement>\('\[data-intro-video\]'\)/);
  assert.match(source, /queryAll<HTMLVideoElement>\('\[data-loop-video\]'\)/);
  assert.match(source, /introVideo\.addEventListener\('ended',[\s\S]*?introCompleted = true;[\s\S]*?transitionToLoop\(0\)/);
  assert.match(source, /const nextLoopIndex = \(index: number\): number/);
  assert.match(source, /void transitionToLoop\(nextLoopIndex\(activeLoopIndex\)\)/);
  assert.match(source, /incoming\.classList\.add\('is-mixing-in'\)/);
  assert.match(source, /incoming\.classList\.add\('is-active'\)/);
  assert.match(source, /--video-mix-duration/);
  assert.match(source, /addEventListener\('waiting'/);
  assert.match(source, /addEventListener\('stalled'/);
  assert.match(source, /addEventListener\('pageshow'/);
  assert.match(source, /HARD_STALL_THRESHOLD/);
});

test('intro cuts directly to loop while loop boundaries retain the crossfade', async () => {
  const motion = await readFile(new URL('../src/scss/_motion.scss', import.meta.url), 'utf8');

  assert.match(
    motion,
    /\.hero__video-stack:has\(\.hero__video\[data-intro-video\]\.is-active\)[\s\S]*?\.hero__video\[data-loop-video\][\s\S]*?transition:\s*none/
  );
  assert.match(motion, /\.hero__black-filter\s*\{[\s\S]*?--stage-overlay-opacity:\s*0\.66/);
  assert.match(motion, /\.hero__gradient\s*\{[\s\S]*?--stage-overlay-opacity:\s*0\.52/);
});
