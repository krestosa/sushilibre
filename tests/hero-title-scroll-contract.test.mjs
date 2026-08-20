import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('hero title scroll follows the shared mobile scroll root', async () => {
  const feature = await readSource('src/ts/features/hero-title-scroll.ts');

  assert.match(feature, /addScrollListener, getScrollY, getViewportHeight/);
  assert.match(feature, /heroTop = getScrollY\(\) \+ h\.top/);
  assert.match(feature, /Math\.max\(hero\.offsetHeight, viewportHeight\)/);
  assert.match(feature, /const raw = clamp\(\(getScrollY\(\) - heroTop - start\) \/ distance\)/);
  assert.match(feature, /addScrollListener\(scheduleRender\)/);
  assert.doesNotMatch(feature, /window\.addEventListener\(['"]scroll['"]/);
  assert.doesNotMatch(feature, /window\.scrollY/);
});

test('mobile joined title aligns base words independently from the libre superscript', async () => {
  const feature = await readSource('src/ts/features/hero-title-scroll.ts');

  assert.match(feature, /const getBaseTextRect/);
  assert.match(feature, /document\.createRange\(\)/);
  assert.match(feature, /range\.selectNodeContents\(textNode\)/);
  assert.match(feature, /const sText = getBaseTextRect\(sushi\)/);
  assert.match(feature, /const lText = getBaseTextRect\(libre\)/);
  assert.match(feature, /sy = top - s\.top - \(sText\.top - s\.top\) \* finalScale/);
  assert.match(feature, /ly = top - l\.top - \(lText\.top - l\.top\) \* finalScale/);
});

test('mobile joined title follows a limited portion of downward scroll', async () => {
  const feature = await readSource('src/ts/features/hero-title-scroll.ts');

  assert.match(feature, /mobileFollowMaxY = mobile[\s\S]*?Math\.max\(24, Math\.min\(48, viewportHeight \* 0\.055\)\)/);
  assert.match(feature, /const scrollDelta = Math\.max\(0, getScrollY\(\) - heroTop\)/);
  assert.match(feature, /const followPhase = mobileMotion \? ease\(clamp\(\(raw - 0\.45\) \/ 0\.55\)\) : 0/);
  assert.match(feature, /Math\.min\(mobileFollowMaxY, scrollDelta \* 0\.24\) \* followPhase/);
  assert.match(feature, /sy \* p \+ followY/);
  assert.match(feature, /ly \* p \+ followY/);
  assert.match(feature, /ky \* kp \+ followY/);
});
