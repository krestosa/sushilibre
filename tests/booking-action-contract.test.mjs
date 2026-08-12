import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  attributeValue,
  findOpeningTag,
  hasClass
} from './html-contract-helpers.mjs';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const RESERVATION_URL = 'https://www.sushiclub.com.ar/shop_reservas.php';
const MAPS_URL = 'https://maps.app.goo.gl/nbh1CpNqBgfToHEe8';

const assertBookingDestinations = (html) => {
  const reservationLink = findOpeningTag(html, 'a', (tag) => (
    hasClass(tag, 'booking-dock__cta')
    && attributeValue(tag, 'href') === RESERVATION_URL
  ));
  assert.ok(reservationLink, 'reservation link must exist');
  assert.match(reservationLink, /\bdata-booking-cta(?:\s|>|=)/i);

  const locationLink = findOpeningTag(html, 'a', (tag) => (
    hasClass(tag, 'booking-dock__meta--location')
    && attributeValue(tag, 'href') === MAPS_URL
  ));
  assert.ok(locationLink, 'Maps link must exist');
  assert.equal(attributeValue(locationLink, 'target'), '_blank');
  assert.equal(attributeValue(locationLink, 'rel'), 'noopener noreferrer');
};

test('booking dock exposes reservation and Maps destinations', async () => {
  const [template, styles] = await Promise.all([
    readSource('src/static/index.html'),
    readSource('src/scss/components/_booking-button.scss')
  ]);

  assertBookingDestinations(template);
  assert.match(template, /data-booking-cta-label/);
  assert.match(template, /booking-dock__external-arrow/);
  assert.match(template, /RECOVA/);
  assert.match(template, /JUEVES 03\/09/);
  assert.match(template, /JUE 03\/09/);
  assert.match(template, /data-video-source="assets\/bg_inicio\.mp4"/);
  assert.match(template, /<source src="assets\/bg_inicio\.mp4" type="video\/mp4"/);
  assert.equal((template.match(/data-video-source="assets\/bg_loop\.mp4"/g) ?? []).length, 2);
  assert.doesNotMatch(template, /\.webm/);
  assert.match(styles, /\.booking-dock__meta--location/);
  assert.match(styles, /\.booking-dock__external-arrow/);
  assert.match(styles, /translate3d\(2px, -2px, 0\)/);
});

test('countdown converts the CTA into a smooth menu action at zero', async () => {
  const countdown = await readSource('src/ts/features/countdown.ts');

  assert.match(countdown, /2026-09-03T20:00:00-03:00/);
  assert.match(countdown, /activateMenuMode/);
  assert.match(countdown, /cta\.href = '#menu'/);
  assert.match(countdown, /replaceCtaLabel\(ctaLabel, 'IR A', 'MENÚ'\)/);
  assert.match(countdown, /menu\.scrollIntoView/);
  assert.match(countdown, /behavior: reducedMotion\.matches \? 'auto' : 'smooth'/);
  assert.match(countdown, /window\.history\.replaceState\(null, '', '#menu'\)/);
  assert.match(countdown, /if \(remaining === 0\) activateMenuMode\(\)/);
});

test('active countdown hides the reservation CTA only when the final action overlaps the floating dock', async () => {
  const [countdown, layout, styles, mobileStyles] = await Promise.all([
    readSource('src/ts/features/countdown.ts'),
    readSource('src/ts/features/booking-dock-layout.ts'),
    readSource('src/scss/components/_booking-button.scss'),
    readSource('src/scss/breakpoints/_mobile.scss')
  ]);

  assert.match(countdown, /query<HTMLElement>\('\.menu-final-cta__action'\)/);
  assert.match(countdown, /FINAL_CTA_DOCK_OVERLAP_PX = 8/);
  assert.match(countdown, /finalMenuCtaAction\.getBoundingClientRect\(\)/);
  assert.match(countdown, /dock\.getBoundingClientRect\(\)/);
  assert.match(countdown, /Math\.min\(actionRect\.bottom, dockRect\.bottom\)/);
  assert.match(countdown, /Math\.max\(actionRect\.top, dockRect\.top\)/);
  assert.match(countdown, /overlapHeight >= FINAL_CTA_DOCK_OVERLAP_PX/);
  assert.match(countdown, /finalMenuCtaActionOverlapsDock && !menuMode/);
  assert.match(countdown, /classList\.toggle\('is-suppressed', shouldSuppress\)/);
  assert.match(countdown, /classList\.toggle\('is-cta-suppressed', shouldSuppress\)/);
  assert.match(countdown, /window\.addEventListener\('scroll'/);
  assert.match(countdown, /window\.addEventListener\('resize'/);
  assert.match(countdown, /window\.addEventListener\('orientationchange'/);
  assert.doesNotMatch(countdown, /FINAL_CTA_MIN_VISIBLE_RATIO|FINAL_CTA_MIN_VISIBLE_PX/);
  assert.match(layout, /is-cta-suppressed/);
  assert.match(layout, /--dock-cta-track/);
  assert.match(layout, /suppressedWidth: 'min\(923px, calc\(100vw - 165px\)\)'/);
  assert.match(layout, /suppressedWidth: 'min\(667px, calc\(100vw - 145px\)\)'/);
  assert.match(layout, /dock\.style\.width = 'min\(680px, calc\(100vw - 24px\)\)'/);
  assert.match(layout, /max-content max-content max-content minmax\(0, 1fr\) var\(--dock-cta-track\)/);
  assert.match(layout, /countdown\.style\.gridColumn = '1 \/ span 4'/);
  assert.match(layout, /dateMeta\.style\.justifySelf = 'start'/);
  assert.match(layout, /timeMeta\.style\.justifySelf = 'start'/);
  assert.match(mobileStyles, /grid-template-columns:\s*max-content max-content max-content minmax\(0, 1fr\) var\(--dock-cta-track, 96px\)/);
  assert.match(mobileStyles, /column-gap:\s*12px/);
  assert.match(mobileStyles, /\.countdown\s*\{[\s\S]*?grid-column:\s*1 \/ span 4/);
  assert.match(styles, /@property --dock-cta-track/);
  assert.match(styles, /width 220ms cubic-bezier/);
  assert.match(styles, /--dock-cta-track 190ms cubic-bezier/);
  assert.match(styles, /&\.is-suppressed/);
  assert.match(styles, /visibility: hidden/);
  assert.match(styles, /pointer-events: none/);
});

test('reservation CTA motion is slower, brighter and deliberately spaced', async () => {
  const [feature, styles, motion] = await Promise.all([
    readSource('src/ts/features/booking-cta-sheen.ts'),
    readSource('src/scss/components/_booking-button.scss'),
    readSource('src/scss/_motion.scss')
  ]);

  assert.match(feature, /const regularDelay = 7_400/);
  assert.match(feature, /\? 1_450 : 1_800/);
  assert.match(feature, /boxShadow: '0 0 28px/);
  assert.match(feature, /filter: 'brightness\(1\.08\)'/);
  assert.match(styles, /width: 88%/);
  assert.match(styles, /rgba\(255, 255, 255, 0\.82\)/);
  assert.match(motion, /animation: cta-sheen 8\.8s ease-in-out 1\.5s infinite/);
});

test('compiled distribution keeps booking destinations and action hooks', async () => {
  const [html, script] = await Promise.all([
    readSource('dist/index.html'),
    readSource('dist/app.js')
  ]);

  assertBookingDestinations(html);
  assert.match(html, /booking-dock__external-arrow/);
  assert.match(html, /RECOVA/);
  assert.match(html, /03\/09/);
  assert.match(html, /assets\/bg_inicio\.mp4/);
  assert.match(html, /assets\/bg_loop\.mp4/);
  assert.doesNotMatch(html, /\.webm/);
  assert.match(script, /data-booking-cta/);
  assert.match(script, /scrollIntoView/);
  assert.match(script, /replaceChildren/);
  assert.match(script, /is-suppressed/);
  assert.match(script, /is-cta-suppressed/);
  assert.match(script, /--dock-cta-track/);
  assert.match(script, /getBoundingClientRect/);
  assert.match(script, /#menu/);
});
