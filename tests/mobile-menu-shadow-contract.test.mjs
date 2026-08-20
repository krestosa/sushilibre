import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile sticky menu shadow survives proximity observer exit', async () => {
  const observers = await readSource('src/ts/menu/observers.ts');

  assert.match(
    observers,
    /nearbyTargets\.delete\(target\);[\s\S]*?if \(previousHeading !== target\.heading\) \{[\s\S]*?target\.heading\.classList\.remove\('is-overlapping'\)/
  );
  assert.doesNotMatch(
    observers,
    /nearbyTargets\.delete\(target\);\s*target\.heading\.classList\.remove\('is-overlapping'\);\s*if \(previousHeading === target\.heading\)/
  );
  assert.match(
    observers,
    /if \(previousHeading && previousHeading !== target\.heading\) \{[\s\S]*?previousHeading\.classList\.remove\('is-overlapping'\)/
  );
});
