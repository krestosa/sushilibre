import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeFileIfChanged } from '../scripts/build-core.mjs';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('generated outputs are not rewritten when bytes are unchanged', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sushilibre-output-'));
  const file = join(directory, 'app.js');

  try {
    await writeFile(file, 'stable output\n');
    const before = await stat(file);

    await wait(25);
    const unchanged = await writeFileIfChanged(file, 'stable output\n');
    const afterUnchanged = await stat(file);

    assert.equal(unchanged, false);
    assert.equal(afterUnchanged.mtimeMs, before.mtimeMs);

    await wait(25);
    const changed = await writeFileIfChanged(file, 'updated output\n');
    const afterChanged = await stat(file);

    assert.equal(changed, true);
    assert.ok(afterChanged.mtimeMs > afterUnchanged.mtimeMs);
    assert.equal(await readFile(file, 'utf8'), 'updated output\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
