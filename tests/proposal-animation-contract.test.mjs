import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const countMatches = (source, expression) => source.match(expression)?.length ?? 0;

const assertIndividualCommercialTargets = (html) => {
  assert.equal(
    countMatches(html, /<article class="proposal__price[^\"]*proposal-reveal--prices[^\"]*"[^>]*data-proposal-reveal/g),
    2,
    'each price card must reveal from its own viewport position'
  );
  assert.equal(
    countMatches(html, /<article class="proposal__condition[^\"]*proposal-reveal--conditions[^\"]*"[^>]*data-proposal-reveal/g),
    2,
    'each condition card must reveal from its own viewport position'
  );
  assert.doesNotMatch(html, /<div class="proposal__prices[^\"]*"[^>]*data-proposal-reveal/);
  assert.doesNotMatch(html, /<div class="proposal__conditions[^\"]*"[^>]*data-proposal-reveal/);
};

test('proposal reveal is restrained, prepaint-safe and one-time', async () => {
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
  assert.doesNotMatch(template, /proposal__amount[^>]*data-proposal-reveal/);
  assert.doesNotMatch(template, /proposal__payment-logo[^>]*data-proposal-reveal/);
  assert.doesNotMatch(template, /<li[^>]*data-proposal-reveal/);

  assert.match(application, /setupProposalReveal\(\)/);
  assert.match(feature, /IntersectionObserver/);
  assert.match(feature, /observer\.unobserve\(element\)/);
  assert.match(feature, /isInitiallyVisible/);
  assert.match(feature, /requestAnimationFrame/);
  assert.match(feature, /setAttribute\('data-proposal-reveal-ready'/);
  assert.match(feature, /REVEAL_ROOT_MARGIN = '0px 0px -18% 0px'/);
  assert.match(feature, /REVEAL_THRESHOLD = 0\.08/);
  assert.match(feature, /INITIAL_VIEWPORT_RATIO = 0\.84/);
  assert.match(feature, /entry\.intersectionRatio < REVEAL_THRESHOLD/);

  assert.match(styles, /html\.has-proposal-reveal \.proposal-reveal/);
  assert.match(styles, /proposal-reveal--heading[\s\S]*?560ms/);
  assert.match(styles, /proposal-reveal--intro[\s\S]*?520ms/);
  assert.match(styles, /proposal-reveal--chips[\s\S]*?400ms/);
  assert.match(styles, /proposal-reveal--prices[\s\S]*?480ms/);
  assert.match(styles, /proposal-reveal--conditions[\s\S]*?440ms/);
  assert.match(styles, /proposal-reveal--legal[\s\S]*?320ms/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /--proposal-reveal-duration: 160ms/);

  const keyframes = /@keyframes proposal-reveal-in\s*\{([\s\S]*?)\n\}/.exec(styles)?.[1] ?? '';
  assert.match(keyframes, /opacity/);
  assert.match(keyframes, /transform/);
  assert.doesNotMatch(keyframes, /scale|rotate|filter|clip|width|height/);
});

test('compiled distribution includes proposal motion hooks', async () => {
  const [script, styles, html] = await Promise.all([
    readSource('dist/app.js'),
    readSource('dist/app.css'),
    readSource('dist/index.html')
  ]);

  assert.match(script, /data-proposal-reveal/);
  assert.match(script, /data-proposal-reveal-ready/);
  assert.match(script, /-18%/);
  assert.match(styles, /html\.has-proposal-reveal \.proposal-reveal/);
  assert.match(styles, /@keyframes proposal-reveal-in/);
  assert.match(html, /data-proposal-root/);
  assertIndividualCommercialTargets(html);
});
