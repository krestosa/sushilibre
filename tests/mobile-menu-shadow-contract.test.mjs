import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile menu shadow latches across category handoffs and clips before the marquee', async () => {
  const [observers, styles, main] = await Promise.all([
    readSource('src/ts/menu/observers.ts'),
    readSource('src/scss/_mobile-menu-sticky-shadow.scss'),
    readSource('src/scss/main.scss')
  ]);

  assert.match(observers, /const SHADOW_FADE_DISTANCE_PX = 36/);
  assert.match(observers, /const shadowHostBounds = shadowHost\.getBoundingClientRect\(\)/);
  assert.match(observers, /const naturalHeadingTop = groupBounds\.top \+ groupPaddingTop/);
  assert.match(
    observers,
    /const shadowProgress = clamp01\([\s\S]*?stickyTop - naturalHeadingTop[\s\S]*?SHADOW_FADE_DISTANCE_PX/
  );
  assert.match(observers, /window\.getComputedStyle\(shadowHost, '::before'\)/);
  assert.match(observers, /const shadowTop = Number\.parseFloat\(shadowStyle\.top\) \|\| 0/);
  assert.match(
    observers,
    /Math\.min\(shadowHeight, shadowHostBounds\.bottom - shadowTop\)/
  );
  assert.match(observers, /const clipBottom = Math\.max\(0, shadowHeight - visibleShadowHeight\)/);
  assert.match(observers, /--menu-sticky-shadow-clip-bottom/);
  assert.match(observers, /shadowHost\.style\.setProperty\([\s\S]*?--menu-sticky-shadow-progress/);
  assert.match(observers, /addScrollListener\(scheduleUpdate\)/);
  assert.doesNotMatch(observers, /menuSection|getBoundingClientRect\(\).*menuBounds|exitProgress|previousHeading|nearbyTargets|is-overlapping/);

  assert.match(styles, /\.menu-section__groups::before/);
  assert.match(styles, /position:\s*fixed/);
  assert.match(styles, /top:\s*-1px/);
  assert.match(styles, /right:\s*0/);
  assert.match(styles, /left:\s*0/);
  assert.match(styles, /clip-path:\s*inset\(0 0 var\(--menu-sticky-shadow-clip-bottom\) 0\)/);
  assert.match(styles, /opacity:\s*var\(--menu-sticky-shadow-progress\)/);
  assert.match(styles, /\.menu-group__heading\s*\{[\s\S]*?z-index:\s*10/);
  assert.match(styles, /\.menu-group__heading::before\s*\{[\s\S]*?content:\s*none/);
  assert.match(main, /@use "mobile-menu-sticky-shadow";/);
});
