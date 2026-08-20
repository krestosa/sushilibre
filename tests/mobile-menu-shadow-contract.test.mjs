import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile menu shadow stays continuous across category handoffs', async () => {
  const [observers, styles, main] = await Promise.all([
    readSource('src/ts/menu/observers.ts'),
    readSource('src/scss/_mobile-menu-sticky-shadow.scss'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(observers, /const firstGroup = groups\[0\]/);
  assert.match(observers, /const shadowHost = firstGroup\?\.parentElement/);
  assert.match(observers, /const SHADOW_FADE_DISTANCE_PX = 36/);
  assert.match(observers, /const STICKY_EPSILON_PX = 0\.75/);
  assert.match(observers, /const hasReachedSticky = headingBounds\.top <= stickyTop \+ STICKY_EPSILON_PX/);
  assert.match(observers, /const stickyDepth = Math\.max\(0, stickyTop - naturalHeadingTop\)/);
  assert.match(observers, /const overlaps = sentinelBounds\.top <= headingBounds\.bottom/);
  assert.match(observers, /--menu-sticky-shadow-progress/);
  assert.match(observers, /addScrollListener\(scheduleUpdate\)/);
  assert.doesNotMatch(observers, /exitProgress/);
  assert.doesNotMatch(observers, /--menu-heading-shadow-progress/);

  assert.match(styles, /\.menu-section__groups::before/);
  assert.match(styles, /position:\s*sticky/);
  assert.match(styles, /top:\s*-1px/);
  assert.match(styles, /opacity:\s*var\(--menu-sticky-shadow-progress\)/);
  assert.match(styles, /\.menu-group__heading::before\s*\{[\s\S]*?content:\s*none/);
  assert.match(main, /@use "mobile-menu-sticky-shadow";/);
});
