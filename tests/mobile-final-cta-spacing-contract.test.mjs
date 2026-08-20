import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile final CTA keeps one constant dock reserve instead of viewport-sized empty space', async () => {
  const [spacing, main, countdown] = await Promise.all([
    readSource('src/scss/_mobile-final-cta-spacing.scss'),
    readSource('src/scss/main.scss'),
    readSource('src/ts/features/countdown.ts')
  ]);

  assert.match(main, /@use "mobile-final-cta-spacing";/);
  assert.match(spacing, /@media \(max-width: 720px\)/);
  assert.match(spacing, /\.menu-section__shell\s*\{[\s\S]*?padding-bottom:\s*0/);
  assert.match(spacing, /\.menu-final-cta\s*\{[\s\S]*?height:\s*auto/);
  assert.match(spacing, /min-height:\s*0/);
  assert.match(
    spacing,
    /padding-bottom:\s*calc\(var\(--dock-height\) \+ var\(--dock-bottom\) \+ 12px\)/
  );
  assert.doesNotMatch(spacing, /100svh|100dvh|100vh/);

  assert.match(countdown, /finalMenuCtaTriggerScrollY = Math\.max/);
  assert.match(countdown, /actionRect\.bottom - dockRect\.top \+ FINAL_CTA_DOCK_CLEARANCE_PX/);
});
