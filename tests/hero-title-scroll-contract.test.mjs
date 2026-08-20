import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('hero title scroll follows the shared mobile scroll root', async () => {
  const feature = await readSource('src/ts/features/hero-title-scroll.ts');

  assert.match(feature, /addScrollListener, getScrollY, getViewportHeight/);
  assert.match(feature, /heroTop = getScrollY\(\) \+ h\.top/);
  assert.match(feature, /Math\.max\(hero\.offsetHeight, getViewportHeight\(\)\)/);
  assert.match(feature, /const raw = clamp\(\(getScrollY\(\) - heroTop - start\) \/ distance\)/);
  assert.match(feature, /addScrollListener\(scheduleRender\)/);
  assert.doesNotMatch(feature, /window\.addEventListener\(['"]scroll['"]/);
  assert.doesNotMatch(feature, /window\.scrollY/);
});
