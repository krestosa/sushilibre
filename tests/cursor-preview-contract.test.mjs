import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('piece cards expose full-card image metadata for mobile and desktop previews', async () => {
  const generator = await readSource('scripts/menu-html.mjs');

  assert.match(generator, /data-piece-item/);
  assert.match(generator, /data-piece-name=/);
  assert.match(generator, /data-piece-image=/);
  assert.match(generator, /<article class="menu-item/);
});

test('piece dialog opens only from full cards on mobile', async () => {
  const viewer = await readSource('src/ts/features/piece-viewer.ts');

  assert.match(viewer, /MOBILE_PIECE_QUERY = '\(max-width: 720px\)'/);
  assert.match(viewer, /queryAll<HTMLElement>\('\[data-piece-item\]'\)/);
  assert.match(viewer, /if \(!mobilePieces\.matches\) return;/);
  assert.match(viewer, /item\.addEventListener\('click'/);
  assert.match(viewer, /item\.setAttribute\('role', 'button'\)/);
  assert.match(viewer, /button\.tabIndex = interactive \? 0 : -1/);
  assert.doesNotMatch(viewer, /openButtons\.forEach\(\(button\) => \{\s*button\.addEventListener\('click'/);
});

test('desktop preview uses native spring inertia and velocity-driven mesh deformation without GSAP', async () => {
  const [feature, styles, application] = await Promise.all([
    readSource('src/ts/features/piece-cursor-preview.ts'),
    readSource('src/scss/components/_piece-cursor-preview.scss'),
    readSource('src/ts/application.ts')
  ]);

  assert.match(application, /setupPieceCursorPreview\(\)/);
  assert.match(feature, /DESKTOP_PREVIEW_QUERY/);
  assert.match(feature, /SPRING_STIFFNESS = 108/);
  assert.match(feature, /SPRING_DAMPING = 18\.5/);
  assert.match(feature, /velocityX \+= accelerationX \* delta/);
  assert.match(feature, /requestAnimationFrame/);
  assert.match(feature, /getContext\('webgl'/);
  assert.match(feature, /uniform vec2 uMotion/);
  assert.match(feature, /leading edge gains a restrained belly/);
  assert.match(feature, /0\.074 \* leading \+ 0\.041 \* trailing/);
  assert.doesNotMatch(feature, /\bgsap\b/i);
  assert.match(styles, /\.piece-cursor-preview/);
  assert.match(styles, /pointer-events: none/);
  assert.match(styles, /@media \(min-width: 721px\) and \(hover: hover\) and \(pointer: fine\)/);
});
