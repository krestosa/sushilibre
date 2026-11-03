import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

const assertSingleLoopVideoMarkup = (html) => {
  const stack = html.match(/<div class="hero__video-stack"[\s\S]*?<\/div>/)?.[0];
  assert.ok(stack, 'Hero video stack was not found.');

  assert.equal(countMatches(stack, /<video\b/g), 1);
  assert.equal(countMatches(stack, /<source\b[^>]*\bsrc=/g), 1);
  assert.match(stack, /<video\b[\s\S]*?\bautoplay\b[\s\S]*?\bmuted\b[\s\S]*?\bloop\b[\s\S]*?\bplaysinline\b/);
  assert.match(stack, /<source src="assets\/hero-loop\.webm" type="video\/webm"/);
  assert.doesNotMatch(stack, /data-intro-video|data-loop-video|\.mp4/);
};

test('the hero uses one muted WebM video with native looping', async () => {
  const [template, distribution] = await Promise.all([
    readFile(new URL('../src/static/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  ]);

  assertSingleLoopVideoMarkup(template);
  assertSingleLoopVideoMarkup(distribution);
  await access(new URL('../dist/assets/hero-loop.webm', import.meta.url));
});

test('the single-video hero keeps its fade and dark overlays', async () => {
  const motion = await readFile(new URL('../src/scss/_motion.scss', import.meta.url), 'utf8');

  assert.match(motion, /animation: video-settle 400ms/);
  assert.match(motion, /animation: stage-overlay-in 220ms ease-out 200ms/);
  assert.match(motion, /\.hero__black-filter\s*\{[\s\S]*?--stage-overlay-opacity:\s*0\.66/);
  assert.match(motion, /\.hero__gradient\s*\{[\s\S]*?--stage-overlay-opacity:\s*0\.52/);
});
