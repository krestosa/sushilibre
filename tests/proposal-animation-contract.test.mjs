import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  hasAttribute,
  hasClass,
  openingTags
} from './html-contract-helpers.mjs';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const assertIndividualCommercialTargets = (html) => {
  const articles = openingTags(html, 'article');
  const divs = openingTags(html, 'div');

  const priceTargets = articles.filter((tag) => (
    hasClass(tag, 'proposal__price')
    && hasClass(tag, 'proposal-reveal--prices')
    && hasAttribute(tag, 'data-proposal-reveal')
  ));
  const conditionTargets = articles.filter((tag) => (
    hasClass(tag, 'proposal__condition')
    && hasClass(tag, 'proposal-reveal--conditions')
    && hasAttribute(tag, 'data-proposal-reveal')
  ));

  assert.equal(priceTargets.length, 2, 'each price card must reveal from its own viewport position');
  assert.equal(conditionTargets.length, 2, 'each condition card must reveal from its own viewport position');

  assert.equal(
    divs.some((tag) => hasClass(tag, 'proposal__prices') && hasAttribute(tag, 'data-proposal-reveal')),
    false,
    'price grid cannot own the reveal trigger'
  );
  assert.equal(
    divs.some((tag) => hasClass(tag, 'proposal__conditions') && hasAttribute(tag, 'data-proposal-reveal')),
    false,
    'conditions grid cannot own the reveal trigger'
  );
};

test('proposal reveal is restrained, prepaint-safe and overlay-dock aware', async () => {
  const [feature, application, styles, template] = await Promise.all([
    readSource('src/ts/features/proposal-reveal.ts'),
    readSource('src/ts/application.ts'),
    readSource('src/scss/_proposal-motion.scss'),
    readSource('src/static/index.html')
  ]);

  assert.match(template, /has-proposal-reveal/);
  assert.match(template, /proposal-reveal-fallback/);
  assert.match(template, /data-proposal-root/);
  assert.match(template, /data-proposal-reveal/);
  assert.match(template, /proposal-reveal--heading/);
  assert.match(template, /proposal-reveal--intro/);
  assert.match(template, /proposal-reveal--chips/);
  assert.match(template, /proposal-reveal--prices/);
  assert.match(template, /proposal-reveal--conditions/);
  assert.match(template, /proposal-reveal--legal/);
  assertIndividualCommercialTargets(template);

  const amountTags = openingTags(template, 'p').filter((tag) => hasClass(tag, 'proposal__amount'));
  const paymentLogos = openingTags(template, 'img').filter((tag) => hasClass(tag, 'proposal__payment-logo'));
  const chips = openingTags(template, 'li');
  assert.equal(amountTags.some((tag) => hasAttribute(tag, 'data-proposal-reveal')), false);
  assert.equal(paymentLogos.some((tag) => hasAttribute(tag, 'data-proposal-reveal')), false);
  assert.equal(chips.some((tag) => hasAttribute(tag, 'data-proposal-reveal')), false);

  const revealSetupIndex = application.indexOf('setupProposalReveal();');
  const countdownSetupIndex = application.indexOf('setupCountdown();');
  assert.ok(revealSetupIndex >= 0, 'proposal reveal must be initialized');
  assert.ok(
    countdownSetupIndex > revealSetupIndex,
    'proposal reveal must initialize before unrelated features can interrupt startup'
  );

  assert.match(feature, /RESPONSIVE_REVEAL_QUERY = ["']\(max-width: 840px\)["']/);
  assert.match(feature, /DESKTOP_REVEAL_RATIO = 0\.82/);
  assert.match(feature, /REVEAL_DOCK_GAP_PX = 16/);
  assert.match(feature, /dockBounds\.top - REVEAL_DOCK_GAP_PX/);
  assert.match(feature, /hasCrossedRevealBoundary/);
  assert.match(feature, /addScrollListener\(scheduleUpdate\)/);
  assert.match(feature, /getViewportHeight\(\)/);
  assert.match(feature, /window\.addEventListener\(["']resize["'], scheduleUpdate/);
  assert.match(feature, /requestAnimationFrame/);
  assert.match(feature, /pendingTargets\.delete\(element\)/);
  assert.match(feature, /classList\.remove\(["']proposal-reveal-fallback["']\)/);
  assert.match(feature, /setAttribute\(\s*["']data-proposal-reveal-ready["']/);
  assert.doesNotMatch(feature, /visualViewport/);
  assert.doesNotMatch(feature, /window\.addEventListener\(["']scroll["']/);
  assert.doesNotMatch(feature, /IntersectionObserver/);

  assert.match(styles, /html\.has-proposal-reveal \.proposal-reveal/);
  assert.match(styles, /proposal-reveal--heading[\s\S]*?560ms/);
  assert.match(styles, /proposal-reveal--intro[\s\S]*?520ms/);
  assert.match(styles, /proposal-reveal--chips[\s\S]*?400ms/);
  assert.match(styles, /proposal-reveal--prices[\s\S]*?480ms/);
  assert.match(styles, /proposal-reveal--prices\s*\{[\s\S]*?--proposal-reveal-distance:\s*0px;[\s\S]*?transform:\s*none;/);
  assert.match(styles, /proposal-reveal--prices\.is-visible\s*\{[\s\S]*?animation-name:\s*proposal-reveal-fade;/);
  assert.match(styles, /proposal-reveal--conditions[\s\S]*?440ms/);
  assert.match(styles, /proposal-reveal--legal[\s\S]*?320ms/);
  assert.match(styles, /is-visible\.is-reveal-bypassed/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /--proposal-reveal-duration: 160ms/);

  const keyframes = /@keyframes proposal-reveal-in\s*\{([\s\S]*?)\n\}/.exec(styles)?.[1] ?? '';
  assert.match(keyframes, /opacity/);
  assert.match(keyframes, /transform/);
  assert.doesNotMatch(keyframes, /scale|rotate|filter|clip|width|height/);
});

test('compiled distribution uses the shared scroll root without VisualViewport tracking', async () => {
  const [script, styles, html] = await Promise.all([
    readSource('dist/app.js'),
    readSource('dist/app.css'),
    readSource('dist/index.html')
  ]);

  assert.match(script, /data-proposal-reveal/);
  assert.match(script, /data-proposal-reveal-ready/);
  assert.match(script, /max-width: 840px/);
  assert.match(script, /proposal-reveal-fallback/);
  assert.doesNotMatch(script, /visualViewport/);
  assert.doesNotMatch(script, /0px 0px -18% 0px/);
  assert.match(styles, /html\.has-proposal-reveal \.proposal-reveal/);
  assert.match(styles, /proposal-reveal--prices\.is-visible/);
  assert.match(styles, /animation-name:\s*proposal-reveal-fade/);
  assert.match(styles, /is-reveal-bypassed/);
  assert.match(styles, /@keyframes proposal-reveal-in/);
  assert.match(html, /data-proposal-root/);
  assertIndividualCommercialTargets(html);
});
