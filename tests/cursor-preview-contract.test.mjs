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

test('desktop cursor uses a fast damped mass and spline membrane deformation', async () => {
  const [bridge, prompt, styles, application] = await Promise.all([
    readSource('src/ts/features/piece-cursor-preview.ts'),
    readSource('src/ts/features/piece-cursor-prompt.ts'),
    readSource('src/scss/components/_piece-cursor-preview.scss'),
    readSource('src/ts/application.ts')
  ]);

  assert.match(application, /setupPieceCursorPreview\(\)/);
  assert.match(bridge, /setupPieceCursorPrompt as setupPieceCursorPreview/);
  assert.match(prompt, /SPRING_STIFFNESS = 260/);
  assert.match(prompt, /SPRING_DAMPING = 30/);
  assert.match(prompt, /MAX_DEFORM_SPEED = 1_450/);
  assert.match(prompt, /CURSOR_OFFSET_X = 14/);
  assert.match(prompt, /CURSOR_OFFSET_Y = 10/);
  assert.match(prompt, /BLOB_POINTS = 18/);
  assert.match(prompt, /closedSplinePath/);
  assert.match(prompt, /createElementNS\(SVG_NS, 'svg'\)/);
  assert.match(prompt, /createElementNS\(SVG_NS, 'path'\)/);
  assert.match(prompt, /LEADING_BELLY/);
  assert.match(prompt, /TRAILING_CAVE/);
  assert.match(prompt, /SIDE_BULGE/);
  assert.match(prompt, /pointerVelocityX/);
  assert.match(prompt, /velocityX \* 0\.76 \+ pointerVelocityX \* 0\.24/);
  assert.match(prompt, /surfacePath\.setAttribute\('d', buildBlobPath/);
  assert.doesNotMatch(prompt, /new Image\(/);
  assert.doesNotMatch(prompt, /getContext\('webgl'/);
  assert.match(styles, /width: 88px/);
  assert.match(styles, /&\.has-clicked[\s\S]*width: 70px/);
  assert.match(styles, /\.piece-cursor-preview__shape/);
});

test('cursor stays active across each item zone while the native pointer remains visible', async () => {
  const [prompt, environment] = await Promise.all([
    readSource('src/ts/features/piece-cursor-prompt.ts'),
    readSource('src/scss/_environment.scss')
  ]);

  assert.match(prompt, /queryAll<HTMLElement>\('\.menu-group__items'/);
  assert.match(prompt, /zone\.addEventListener\('pointerenter'/);
  assert.match(prompt, /zone\.addEventListener\('pointermove'/);
  assert.match(prompt, /zone\.addEventListener\('pointerleave'/);
  assert.doesNotMatch(environment, /cursor: none !important/);
  assert.match(environment, /\.menu-item\[data-piece-item\],[\s\S]*\.menu-item\[data-piece-item\] \*[\s\S]*cursor: pointer/);
  assert.match(environment, /\.menu-group__items\.has-piece-cursor-prompt,[\s\S]*cursor: pointer/);
  assert.match(environment, /\.menu-group__items,[\s\S]*user-select: none/);
  assert.match(environment, /\.menu-item \{\s*margin-bottom: 0;/);
  assert.match(environment, /\.menu-item \+ \.menu-item \{\s*padding-top: clamp\(28px, 4vh, 52px\)/);
  assert.match(environment, /padding-top: 30px/);
});

test('inline eye is hidden for fine pointers and matches quantity-pill height on touch layouts', async () => {
  const environment = await readSource('src/scss/_environment.scss');

  assert.match(environment, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.menu-item__view \{\s*display: none/);
  assert.match(environment, /@media \(hover: none\), \(pointer: coarse\)[\s\S]*width: 25px;[\s\S]*height: 25px/);
  assert.match(environment, /@media \(max-width: 720px\)[\s\S]*\.menu-item__view[\s\S]*width: 22px;[\s\S]*height: 22px/);
});
