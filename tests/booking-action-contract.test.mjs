import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const RESERVATION_URL = 'https://www.sushiclub.com.ar/shop_reservas.php';
const MAPS_URL = 'https://maps.app.goo.gl/N6UjNEoETLvo1ucRA';

test('booking dock exposes reservation and Maps destinations', async () => {
  const template = await readSource('src/static/index.html');

  assert.match(template, new RegExp(`href="${RESERVATION_URL.replaceAll('.', '\\.') }"`));
  assert.match(template, /data-booking-cta/);
  assert.match(template, /data-booking-cta-label/);
  assert.match(template, new RegExp(`href="${MAPS_URL.replaceAll('.', '\\.') }"`));
  assert.match(template, /class="booking-dock__location"/);
  assert.match(template, /target="_blank"/);
  assert.match(template, /rel="noopener noreferrer"/);
});

test('countdown converts the CTA into a smooth menu action at zero', async () => {
  const countdown = await readSource('src/ts/features/countdown.ts');

  assert.match(countdown, /2026-07-30T20:00:00-03:00/);
  assert.match(countdown, /activateMenuMode/);
  assert.match(countdown, /cta\.href = '#menu'/);
  assert.match(countdown, /replaceCtaLabel\(ctaLabel, 'IR A', 'MENÚ'\)/);
  assert.match(countdown, /menu\.scrollIntoView/);
  assert.match(countdown, /behavior: reducedMotion\.matches \? 'auto' : 'smooth'/);
  assert.match(countdown, /window\.history\.replaceState\(null, '', '#menu'\)/);
  assert.match(countdown, /if \(remaining === 0\) activateMenuMode\(\)/);
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

  assert.match(html, new RegExp(`href="${RESERVATION_URL.replaceAll('.', '\\.') }"`));
  assert.match(html, new RegExp(`href="${MAPS_URL.replaceAll('.', '\\.') }"`));
  assert.match(script, /scrollIntoView/);
  assert.match(script, /Ir al menú/);
});
