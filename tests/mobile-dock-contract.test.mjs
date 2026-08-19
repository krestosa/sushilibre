import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const assertDockOutsidePage = (html) => {
  const dockIndex = html.indexOf('<aside class="booking-dock"');
  const pageIndex = html.indexOf('<main class="page"');
  assert.ok(dockIndex >= 0, 'booking dock must exist');
  assert.ok(pageIndex >= 0, 'page scroll root must exist');
  assert.ok(dockIndex < pageIndex, 'booking dock must be outside and before the page scroll root');
};

test('touch mobile uses a stable app scroll root with the booking dock outside it', async () => {
  const [template, layoutSource, scrollRoot, stabilityStyles, mobileStyles] = await Promise.all([
    readSource('src/static/index.html'),
    readSource('src/ts/features/booking-dock-layout.ts'),
    readSource('src/ts/shared/scroll-root.ts'),
    readSource('src/scss/_global-scroll-stability.scss'),
    readSource('src/scss/breakpoints/_mobile.scss')
  ]);

  assertDockOutsidePage(template);

  assert.match(scrollRoot, /\(max-width: 840px\) and \(pointer: coarse\)/);
  assert.match(scrollRoot, /page \? page\.scrollTop : window\.scrollY/);
  assert.match(scrollRoot, /page \? page\.clientHeight : window\.innerHeight/);
  assert.match(scrollRoot, /page\?\.addEventListener\('scroll'/);

  assert.match(stabilityStyles, /height:\s*100svh/);
  assert.match(stabilityStyles, /html,[\s\S]*body[\s\S]*overflow:\s*hidden/);
  assert.match(stabilityStyles, /\.page\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(stabilityStyles, /overscroll-behavior-y:\s*contain/);
  assert.match(stabilityStyles, /\.booking-dock\s*\{[\s\S]*position:\s*absolute/);
  assert.match(stabilityStyles, /bottom:\s*var\(--dock-bottom\)/);
  assert.match(stabilityStyles, /safe-area-inset-left/);
  assert.match(stabilityStyles, /safe-area-inset-right/);

  assert.doesNotMatch(layoutSource, /visualViewport|isIosDevice|is-ios-mobile|ios-dock/i);
  assert.doesNotMatch(mobileStyles, /visualViewport|is-ios-mobile|--ios-dock|100dvh/i);
});

test('compiled mobile shell keeps viewport tracking out of production runtime', async () => {
  const [html, script, styles] = await Promise.all([
    readSource('dist/index.html'),
    readSource('dist/app.js'),
    readSource('dist/app.css')
  ]);

  assertDockOutsidePage(html);
  assert.doesNotMatch(script, /visualViewport|is-ios-mobile|--ios-dock/i);
  assert.doesNotMatch(styles, /is-ios-mobile|--ios-dock/i);
  assert.match(styles, /height:\s*100svh/);
  assert.match(styles, /overflow-y:\s*auto/);
  assert.match(styles, /overscroll-behavior-y:\s*contain/);
});
