import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile menu shadow starts at sticky, stays on while exiting downward and reverses upward', async () => {
  const [observers, styles, main] = await Promise.all([
    readSource('src/ts/menu/observers.ts'),
    readSource('src/scss/_mobile-menu-sticky-shadow.scss'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(observers, /const SHADOW_FADE_DISTANCE_PX = 36/);
  assert.match(observers, /const STICKY_EPSILON_PX = 0\.75/);
  assert.match(observers, /const naturalHeadingTop = groupBounds\.top \+ groupPaddingTop/);
  assert.match(
    observers,
    /const hasReachedSticky = headingBounds\.top <= stickyTop \+ STICKY_EPSILON_PX/
  );
  assert.match(observers, /const stickyDepth = Math\.max\(0, stickyTop - naturalHeadingTop\)/);
  assert.match(
    observers,
    /const shadowProgress = hasReachedSticky[\s\S]*?clamp01\(stickyDepth \/ SHADOW_FADE_DISTANCE_PX\)[\s\S]*?: 0/
  );
  assert.match(observers, /const overlaps = sentinelBounds\.top <= headingBounds\.bottom/);
  assert.doesNotMatch(observers, /exitProgress/);
  assert.doesNotMatch(observers, /Math\.min\(enterProgress, exitProgress\)/);
  assert.match(observers, /--menu-heading-shadow-progress/);
  assert.match(observers, /addScrollListener\(scheduleUpdate\)/);

  assert.match(styles, /--menu-heading-shadow-progress:\s*0/);
  assert.match(styles, /top:\s*-1px/);
  assert.match(styles, /opacity:\s*var\(--menu-heading-shadow-progress\)/);
  assert.match(styles, /transition:\s*none/);
  assert.doesNotMatch(styles, /is-overlapping/);
  assert.match(main, /@use "mobile-menu-sticky-shadow";/);
});
