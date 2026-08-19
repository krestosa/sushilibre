import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('menu reveal motion is prepaint-safe, one-time and viewport driven', async () => {
  const [feature, bootstrap, motion, template, generator] = await Promise.all([
    readSource('src/ts/features/menu-reveal.ts'),
    readSource('src/ts/menu-bootstrap.ts'),
    readSource('src/scss/_motion.scss'),
    readSource('src/static/index.html'),
    readSource('scripts/menu-html.mjs')
  ]);

  assert.match(template, /classList\.add\(\s*["']has-menu-reveal["']\s*\)/);
  assert.match(template, /data-menu-reveal-ready/);
  assert.match(generator, /data-menu-reveal/);
  assert.match(generator, /ITEM_REVEAL_STAGGER_MS = 45/);
  assert.match(generator, /MAX_ITEM_REVEAL_STAGGER_MS = 90/);
  assert.match(feature, /IntersectionObserver/);
  assert.match(feature, /observer\.unobserve\(element\)/);
  assert.match(feature, /isInitiallyVisible/);
  assert.match(feature, /requestAnimationFrame/);
  assert.match(feature, /setAttribute\(\s*["']data-menu-reveal-ready["']/);
  assert.match(bootstrap, /setupMenuReveal\(menuRoot, groups\)/);
  assert.match(motion, /html\.has-menu-reveal \.menu-reveal/);
  assert.match(motion, /animation: menu-reveal-in/);
  assert.match(motion, /menu-reveal-fallback/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test('mobile menu overlap shadow follows the shared scroll root', async () => {
  const observers = await readSource('src/ts/menu/observers.ts');

  assert.match(observers, /const overlaps = sentinelBounds\.top <= headingBounds\.bottom/);
  assert.match(observers, /scheduleResizeSettlement/);
  assert.match(observers, /window\.setTimeout\([\s\S]*?140/);
  assert.match(observers, /addScrollListener\(scheduleUpdate\)/);
  assert.match(observers, /window\.addEventListener\('resize', scheduleResizeSettlement/);
  assert.doesNotMatch(observers, /window\.addEventListener\('scroll', scheduleUpdate/);
});

test('hero title completion preserves the exact final rasterized state', async () => {
  const [feature, application, motion, tablet] = await Promise.all([
    readSource('src/ts/features/hero-intro-motion.ts'),
    readSource('src/ts/application.ts'),
    readSource('src/scss/_motion.scss'),
    readSource('src/scss/breakpoints/_tablet.scss')
  ]);

  assert.match(application, /setupHeroIntroMotion\(\)/);
  assert.match(feature, /hero-intro-complete/);
  assert.match(feature, /animationend/);
  assert.match(feature, /animationcancel/);
  assert.match(feature, /COMPLETION_FALLBACK_MS/);
  assert.match(motion, /filter: blur\(var\(--title-intro-blur, 5px\)\)/);
  assert.match(motion, /filter: blur\(0\)/);
  assert.doesNotMatch(motion, /html\.hero-intro-complete/);
  assert.doesNotMatch(motion, /filter:\s*none[\s\S]*animation:\s*none/);
  assert.match(tablet, /--title-intro-blur: 0px/);
  assert.doesNotMatch(tablet, /animation-name:\s*stage-title-in-lite/);
  assert.doesNotMatch(motion, /@keyframes stage-title-in-lite/);
});

test('desktop masthead animation cannot move or resize its logo geometry', async () => {
  const [motion, desktop] = await Promise.all([
    readSource('src/scss/_motion.scss'),
    readSource('src/scss/breakpoints/_desktop.scss')
  ]);

  const mastheadKeyframes = /@keyframes stage-masthead-in\s*\{([\s\S]*?)\n\}/.exec(motion)?.[1] ?? '';
  assert.match(mastheadKeyframes, /opacity:\s*0/);
  assert.match(mastheadKeyframes, /opacity:\s*1/);
  assert.doesNotMatch(mastheadKeyframes, /translate|transform|scale|width|height/);
  assert.match(desktop, /\.masthead__sushiclub\s*\{[\s\S]*?display: block;[\s\S]*?flex: 0 0 auto;[\s\S]*?aspect-ratio: 234 \/ 34;/);
  assert.match(desktop, /\.masthead__anniversary\s*\{[\s\S]*?display: block;[\s\S]*?flex: 0 0 auto;[\s\S]*?aspect-ratio: 147 \/ 113;/);
});

test('booking dock settles as one complete unit when scrolling begins', async () => {
  const [feature, motion] = await Promise.all([
    readSource('src/ts/dock-reveal.ts'),
    readSource('src/scss/_motion.scss')
  ]);

  assert.match(motion, /\.booking-dock\s*\{[\s\S]*?animation: stage-dock-in/);
  assert.match(feature, /getAnimations\(\)/);
  assert.match(feature, /settleImmediately/);
  assert.match(feature, /getScrollY\(\)/);
  assert.match(feature, /addScrollListener\(prioritizeScrollStability\)/);
  assert.doesNotMatch(feature, /dock\.animate/);
  assert.doesNotMatch(feature, /queryAll/);
  assert.doesNotMatch(feature, /booking-dock__meta|countdown__unit|booking-dock__cta > span/);
  assert.doesNotMatch(feature, /revealDockContent|stagger/);
});

test('piece viewer separates loading, ready and error states', async () => {
  const [feature, styles, generator] = await Promise.all([
    readSource('src/ts/features/piece-viewer.ts'),
    readSource('src/scss/components/_piece-viewer.scss'),
    readSource('scripts/menu-html.mjs')
  ]);

  assert.match(feature, /data-piece-viewer-status-text/);
  assert.match(feature, /dialog\.dataset\.state = 'loading'/);
  assert.match(feature, /dialog\.dataset\.state = 'ready'/);
  assert.match(feature, /dialog\.dataset\.state = 'error'/);
  assert.match(feature, /classList\.add\('is-open'\)/);
  assert.match(feature, /classList\.add\('is-closing'\)/);
  assert.match(feature, /transitionend/);
  assert.match(feature, /event\.preventDefault\(\)/);
  assert.match(generator, /piece-viewer__loader/);
  assert.match(generator, /piece-viewer__close-icon/);
  assert.match(styles, /\.piece-viewer__close[\s\S]*display: none/);
  assert.match(styles, /data-state="ready"\] \.piece-viewer__close/);
  assert.match(styles, /data-state="error"\] \.piece-viewer__close/);
  assert.match(styles, /\.piece-viewer__disclaimer[\s\S]*display: none/);
  assert.match(styles, /data-state="ready"\] \.piece-viewer__disclaimer/);
  assert.match(styles, /@keyframes piece-viewer-loader/);
  assert.match(styles, /rotate\(45deg\)/);
  assert.match(styles, /rotate\(-45deg\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('piece viewer loading state receives the same deterministic entrance animation', async () => {
  const [feature, styles] = await Promise.all([
    readSource('src/ts/features/piece-viewer.ts'),
    readSource('src/scss/components/_piece-viewer.scss')
  ]);

  assert.match(feature, /const beginOpenAnimation/);
  assert.match(feature, /requestAnimationFrame\([\s\S]*?getBoundingClientRect\(\)[\s\S]*?requestAnimationFrame/);
  assert.match(feature, /classList\.add\('is-open'\);[\s\S]*?image\.src = source/);
  assert.match(styles, /&\.is-open\s*\{[\s\S]*?animation: piece-viewer-open/);
  assert.match(styles, /@keyframes piece-viewer-open/);
  assert.match(styles, /@keyframes piece-viewer-backdrop-open/);
  assert.match(styles, /@keyframes piece-viewer-loader-enter/);
  assert.match(styles, /piece-viewer-loader 720ms linear infinite,[\s\S]*piece-viewer-loader-enter 220ms ease-out both/);
});

test('piece viewer locks scrolling without repositioning or hiding the document page', async () => {
  const [feature, styles] = await Promise.all([
    readSource('src/ts/features/piece-viewer.ts'),
    readSource('src/scss/components/_piece-viewer.scss')
  ]);

  assert.match(styles, /scrollbar-gutter: stable/);
  assert.match(styles, /html\.has-piece-viewer[\s\S]*overflow-y: scroll/);
  assert.doesNotMatch(styles, /\.page[\s\S]*position: fixed/);
  assert.doesNotMatch(styles, /--piece-viewer-scroll-offset|--piece-viewer-document-height/);
  assert.match(feature, /addEventListener\('wheel',[\s\S]*passive: false/);
  assert.match(feature, /addEventListener\('touchmove',[\s\S]*passive: false/);
  assert.match(feature, /addEventListener\('scroll', enforceLockedScroll/);
  assert.match(feature, /SCROLL_KEYS/);
  assert.match(feature, /window\.scrollTo\(0, lockedScrollY\)/);
  assert.doesNotMatch(feature, /--piece-viewer-scroll-offset|piece-viewer-document-height/);
  assert.match(styles, /background: rgba\(0, 0, 0, 0\.62\)/);
});

test('short desktop categories end with their final product divider', async () => {
  const tablet = await readSource('src/scss/breakpoints/_tablet.scss');

  assert.match(tablet, /\.menu-group\s*\{[\s\S]*?min-height: auto/);
  assert.match(tablet, /\.menu-item:last-of-type\s*\{[\s\S]*?margin-bottom: 0/);
  assert.doesNotMatch(tablet, /var\(--menu-item-count[^\n]*11\.5vh/);
});

test('compiled distribution contains synchronized animation and popup hooks', async () => {
  const [script, styles, html] = await Promise.all([
    readSource('dist/app.js'),
    readSource('dist/app.css'),
    readSource('dist/index.html')
  ]);

  const cssVersion = /app\.css\?v=([a-f0-9]{12})/.exec(html)?.[1];
  const scriptVersion = /app\.js\?v=([a-f0-9]{12})/.exec(html)?.[1];

  assert.ok(cssVersion);
  assert.equal(scriptVersion, cssVersion);
  assert.doesNotMatch(html, /__ASSET_VERSION__/);
  assert.match(script, /data-menu-reveal/);
  assert.match(script, /hero-intro-complete/);
  assert.match(script, /scheduleResizeSettlement/);
  assert.match(script, /is-closing/);
  assert.match(script, /data-piece-viewer-status-text/);
  assert.match(script, /enforceLockedScroll/);
  assert.match(script, /getBoundingClientRect/);
  assert.doesNotMatch(script, /piece-viewer-scroll-offset|piece-viewer-document-height/);
  assert.doesNotMatch(script, /revealDockContent|booking-dock__meta.*opacity/);
  assert.match(styles, /html\.has-menu-reveal \.menu-reveal/);
  assert.doesNotMatch(styles, /html\.hero-intro-complete/);
  assert.match(styles, /@keyframes menu-reveal-in/);
  assert.match(styles, /@keyframes piece-viewer-open/);
  assert.match(styles, /@keyframes piece-viewer-loader/);
  assert.match(styles, /html\.has-piece-viewer/);
  assert.match(styles, /\.piece-viewer\.is-open/);
  assert.match(styles, /\.piece-viewer\.is-closing/);
  assert.doesNotMatch(styles, /stage-title-in-lite/);
  assert.match(html, /piece-viewer__loader/);
  assert.match(html, /piece-viewer__close-icon/);
});
