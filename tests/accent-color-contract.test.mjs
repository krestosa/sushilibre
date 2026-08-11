import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const collectScss = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectScss(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.scss')) files.push(fullPath);
  }

  return files;
};

test('active accent is the new blue and legacy orange derivatives are gone', async () => {
  const settings = await readFile(new URL('../src/scss/_settings.scss', import.meta.url), 'utf8');
  const bookingButton = await readFile(new URL('../src/scss/components/_booking-button.scss', import.meta.url), 'utf8');
  const chips = await readFile(new URL('../src/scss/components/_chips.scss', import.meta.url), 'utf8');
  const scssRoot = fileURLToPath(new URL('../src/scss/', import.meta.url));
  const scssFiles = await collectScss(scssRoot);
  const source = (await Promise.all(scssFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  const compiled = await readFile(new URL('../dist/app.css', import.meta.url), 'utf8');

  assert.match(settings, /--orange:\s*#001ac5;/i);
  assert.match(settings, /--orange-rgb:\s*0,\s*26,\s*197;/i);
  assert.match(settings, /--orange-light:\s*#1234e3;/i);
  assert.match(chips, /rgba\(var\(--orange-rgb\),\s*0\.72\)/);
  assert.match(chips, /rgba\(var\(--orange-rgb\),\s*0\.12\)/);
  assert.match(chips, /color:\s*var\(--orange-light\)/);
  assert.match(bookingButton, /\.booking-dock__cta[\s\S]*?background:\s*var\(--orange\);[\s\S]*?color:\s*#fff;/);

  for (const css of [source, compiled]) {
    assert.doesNotMatch(css, /#dd702d/i);
    assert.doesNotMatch(css, /rgba\(\s*221\s*,\s*112\s*,\s*45/i);
    assert.doesNotMatch(css, /#ef8a4b/i);
  }
});
