import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('piece cards keep image metadata for the reusable viewer', async () => {
  const generator = await readSource('scripts/menu-html.mjs');

  assert.match(generator, /data-piece-item/);
  assert.match(generator, /data-piece-name=/);
  assert.match(generator, /data-piece-image=/);
  assert.match(generator, /<article class="menu-item/);
});

test('piece dialog opens from the full card on desktop and mobile', async () => {
  const viewer = await readSource('src/ts/features/piece-viewer.ts');

  assert.match(viewer, /MOBILE_PIECE_QUERY = '\(max-width: 720px\)'/);
  assert.match(viewer, /queryAll<HTMLElement>\('\[data-piece-item\]'\)/);
  assert.match(viewer, /item\.addEventListener\('click'/);
  assert.match(viewer, /openPiece\(button \?\? item\)/);
  assert.match(viewer, /item\.setAttribute\('role', 'button'\)/);
  assert.match(viewer, /item\.tabIndex = 0/);
  assert.doesNotMatch(viewer, /if \(!mobilePieces\.matches\) return;/);
  assert.match(viewer, /button\.tabIndex = mobilePieces\.matches \? 0 : -1/);
});

test('desktop cursor uses an inertial blue prompt with velocity squash and no food image', async () => {
  const [bridge, prompt, styles, application] = await Promise.all([
    readSource('src/ts/features/piece-cursor-preview.ts'),
    readSource('src/ts/features/piece-cursor-prompt.ts'),
    readSource('src/scss/components/_piece-cursor-preview.scss'),
    readSource('src/ts/application.ts')
  ]);

  assert.match(application, /setupPieceCursorPreview\(\)/);
  assert.match(bridge, /setupPieceCursorPrompt as setupPieceCursorPreview/);
  assert.match(prompt, /DESKTOP_PROMPT_QUERY/);
  assert.match(prompt, /SPRING_STIFFNESS = 112/);
  assert.match(prompt, /SPRING_DAMPING = 19/);
  assert.match(prompt, /MAX_STRETCH_X = 0\.24/);
  assert.match(prompt, /MAX_SQUASH_Y = 0\.17/);
  assert.match(prompt, /MAX_POINTER_SPEED = 1700/);
  assert.match(prompt, /velocityX \+= accelerationX \* delta/);
  assert.match(prompt, /deformationTarget = clamp/);
  assert.match(prompt, /scaleX = 1 \+ deformation \* MAX_STRETCH_X/);
  assert.match(prompt, /scaleY = 1 - deformation \* MAX_SQUASH_Y/);
  assert.match(prompt, /label\.textContent = 'CLICKEÁ'/);
  assert.match(prompt, /assets\/visibility\.svg/);
  assert.match(prompt, /prompt\.classList\.add\('has-clicked'\)/);
  assert.doesNotMatch(prompt, /new Image\(/);
  assert.doesNotMatch(prompt, /getContext\('webgl'/);
  assert.match(styles, /background: var\(--orange\)/);
  assert.match(styles, /width: 88px/);
  assert.match(styles, /\.menu-item__view \{ display: none; \}/);
  assert.match(styles, /\.piece-cursor-preview\.has-clicked/);
});
