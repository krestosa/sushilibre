import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile menu shadow is driven only by sticky progress and reverses continuously', async () => {
  const [observers, styles, main] = await Promise.all([
    readSource('src/ts/menu/observers.ts'),
    readSource('src/scss/_mobile-menu-sticky-shadow.scss'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(observers, /const SHADOW_FADE_DISTANCE_PX = 36/);
  assert.match(observers, /const naturalHeadingTop = groupBounds\.top \+ groupPaddingTop/);
  assert.match(
    observers,
    /const enterProgress = clamp01\([\s\S]*?stickyTop - naturalHeadingTop[\s\S]*?SHADOW_FADE_DISTANCE_PX/
  );
  assert.match(
    observers,
    /const exitProgress = clamp01\([\s\S]*?headingBounds\.top - stickyTop \+ SHADOW_FADE_DISTANCE_PX/
  );
  assert.match(observers, /const overlaps = sentinelBounds\.top <= headingBounds\.bottom/);
  assert.match(observers, /const stickyProgress = Math\.min\(enterProgress, exitProgress\)/);
  assert.match(observers, /--menu-heading-shadow-progress/);
  assert.match(observers, /addScrollListener\(scheduleUpdate\)/);
  assert.doesNotMatch(observers, /classList\.toggle\('is-overlapping'/);

  assert.match(styles, /--menu-heading-shadow-progress:\s*0/);
  assert.match(styles, /opacity:\s*var\(--menu-heading-shadow-progress\)/);
  assert.match(styles, /transition:\s*none/);
  assert.match(main, /@use "mobile-menu-sticky-shadow";/);
});
