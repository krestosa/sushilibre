import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile final CTA locks the marquee to viewport top and centers content above the collapsed dock reserve', async () => {
  const [spacing, main, countdown, scrollRoot] = await Promise.all([
    readSource('src/scss/_mobile-final-cta-spacing.scss'),
    readSource('src/scss/main.scss'),
    readSource('src/ts/features/countdown.ts'),
    readSource('src/ts/shared/scroll-root.ts')
  ]);

  assert.match(main, /@use "mobile-final-cta-spacing";/);
  assert.match(spacing, /@media \(max-width: 720px\)/);
  assert.match(spacing, /\.menu-section__shell\s*\{[\s\S]*?padding-bottom:\s*0/);
  assert.match(
    spacing,
    /height:\s*calc\(100svh - var\(--menu-marquee-height\)\)/
  );
  assert.match(spacing, /min-height:\s*0/);
  assert.match(spacing, /justify-content:\s*center\s*!important/);
  assert.match(spacing, /--final-cta-content-top:/);
  assert.match(
    spacing,
    /--final-cta-dock-reserve:\s*calc\(112px \+ var\(--dock-bottom\) \+ 8px\)/
  );
  assert.match(
    spacing,
    /padding:[\s\S]*?var\(--final-cta-content-top\)[\s\S]*?var\(--final-cta-dock-reserve\)\s*!important/
  );

  assert.match(scrollRoot, /export const getMaxScrollY/);
  assert.match(scrollRoot, /page\.scrollHeight - page\.clientHeight/);
  assert.match(countdown, /const FINAL_CTA_MOBILE_END_GUARD_PX = 48/);
  assert.match(countdown, /getMaxScrollY\(\) - FINAL_CTA_MOBILE_END_GUARD_PX/);
  assert.match(
    countdown,
    /mobileFinalCta\.matches[\s\S]*?Math\.min\(overlapTrigger, endGuardTrigger\)/
  );
});
