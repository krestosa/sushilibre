import { query, queryAll } from '../shared/dom';

const DESKTOP_PROMPT_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SPRING_STIFFNESS = 260;
const SPRING_DAMPING = 30;
const MAX_FRAME_DELTA = 1 / 30;
const MAX_DEFORM_SPEED = 1_450;
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = 10;
const EDGE_GUTTER = 10;
const BLOB_POINTS = 18;
const BLOB_RADIUS = 43;
const BLOB_CENTER = 50;
const MAX_STRETCH = 0.22;
const MAX_SQUASH = 0.13;
const LEADING_BELLY = 4.6;
const TRAILING_CAVE = 2.8;
const SIDE_BULGE = 1.35;
const SVG_NS = 'http://www.w3.org/2000/svg';

type Point = { x: number; y: number };

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const closedSplinePath = (points: readonly Point[]): string => {
  if (points.length < 3) return '';
  const count = points.length;
  const first = points[0];
  if (!first) return '';

  let path = `M ${first.x.toFixed(3)} ${first.y.toFixed(3)}`;
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const afterNext = points[(index + 2) % count];
    if (!previous || !current || !next || !afterNext) continue;

    const control1X = current.x + (next.x - previous.x) / 6;
    const control1Y = current.y + (next.y - previous.y) / 6;
    const control2X = next.x - (afterNext.x - current.x) / 6;
    const control2Y = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${control1X.toFixed(3)} ${control1Y.toFixed(3)}, ${control2X.toFixed(3)} ${control2Y.toFixed(3)}, ${next.x.toFixed(3)} ${next.y.toFixed(3)}`;
  }
  return `${path} Z`;
};

const buildBlobPath = (deformation: number, directionX: number, directionY: number): string => {
  const directionLength = Math.hypot(directionX, directionY) || 1;
  const dx = directionX / directionLength;
  const dy = directionY / directionLength;
  const px = -dy;
  const py = dx;
  const stretch = 1 + deformation * MAX_STRETCH;
  const squash = 1 - deformation * MAX_SQUASH;
  const points: Point[] = [];

  for (let index = 0; index < BLOB_POINTS; index += 1) {
    const angle = (index / BLOB_POINTS) * Math.PI * 2;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const axial = ux * dx + uy * dy;
    const lateral = ux * px + uy * py;
    const leading = Math.max(0, axial) ** 2;
    const trailing = Math.max(0, -axial) ** 2;
    const side = Math.max(0, 1 - Math.abs(axial)) ** 1.6;

    const along = BLOB_RADIUS * axial * stretch;
    const across = BLOB_RADIUS * lateral * squash;
    let x = BLOB_CENTER + dx * along + px * across;
    let y = BLOB_CENTER + dy * along + py * across;

    const directionalPush = deformation * (LEADING_BELLY * leading - TRAILING_CAVE * trailing);
    const sidePush = deformation * SIDE_BULGE * side;
    x += dx * directionalPush + ux * sidePush;
    y += dy * directionalPush + uy * sidePush;

    points.push({ x, y });
  }

  return closedSplinePath(points);
};

export const setupPieceCursorPrompt = (): void => {
  const menuRoot = query<HTMLElement>('[data-menu-root]');
  const itemZones = queryAll<HTMLElement>('.menu-group__items', menuRoot ?? undefined);
  const pieceItems = queryAll<HTMLElement>('[data-piece-item]', menuRoot ?? undefined);
  if (!menuRoot || !itemZones.length || !pieceItems.length) return;

  const desktopPrompt = window.matchMedia(DESKTOP_PROMPT_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const prompt = document.createElement('div');
  prompt.className = 'piece-cursor-preview';
  prompt.setAttribute('aria-hidden', 'true');

  const surface = document.createElementNS(SVG_NS, 'svg');
  surface.classList.add('piece-cursor-preview__surface');
  surface.setAttribute('viewBox', '0 0 100 100');
  surface.setAttribute('aria-hidden', 'true');
  surface.setAttribute('focusable', 'false');
  const surfacePath = document.createElementNS(SVG_NS, 'path');
  surfacePath.classList.add('piece-cursor-preview__shape');
  surfacePath.setAttribute('d', buildBlobPath(0, 1, 0));
  surface.append(surfacePath);

  const label = document.createElement('span');
  label.className = 'piece-cursor-preview__label';
  label.textContent = 'CLICKEÁ';

  const icon = document.createElement('img');
  icon.className = 'piece-cursor-preview__icon';
  icon.src = 'assets/visibility.svg';
  icon.alt = '';
  icon.width = 24;
  icon.height = 24;

  prompt.append(surface, label, icon);
  document.body.append(prompt);

  let activeZone: HTMLElement | null = null;
  let frameId = 0;
  let lastFrameTime = 0;
  let lastPointerTime = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;
  let pointerVelocityX = 0;
  let pointerVelocityY = 0;
  let targetX = pointerX;
  let targetY = pointerY;
  let currentX = pointerX;
  let currentY = pointerY;
  let velocityX = 0;
  let velocityY = 0;
  let deformation = 0;
  let directionX = 1;
  let directionY = 0;
  let promptRadius = 44;
  let hasPosition = false;
  let hasClicked = false;

  const measurePrompt = (): void => {
    const bounds = prompt.getBoundingClientRect();
    if (bounds.width > 0) promptRadius = Math.max(bounds.width, bounds.height) * 0.5;
  };

  const markAsUnderstood = (): void => {
    if (hasClicked) return;
    hasClicked = true;
    prompt.classList.add('has-clicked');
    window.requestAnimationFrame(measurePrompt);
  };

  const updateTarget = (event: PointerEvent): void => {
    const clientX = event.clientX;
    const clientY = event.clientY;
    pointerX = clientX;
    pointerY = clientY;

    if (lastPointerTime > 0) {
      const elapsed = Math.max(8, event.timeStamp - lastPointerTime) / 1_000;
      const rawVelocityX = (clientX - lastPointerX) / elapsed;
      const rawVelocityY = (clientY - lastPointerY) / elapsed;
      pointerVelocityX += (rawVelocityX - pointerVelocityX) * 0.48;
      pointerVelocityY += (rawVelocityY - pointerVelocityY) * 0.48;
    }

    lastPointerTime = event.timeStamp;
    lastPointerX = clientX;
    lastPointerY = clientY;

    targetX = clamp(
      clientX + CURSOR_OFFSET_X,
      promptRadius + EDGE_GUTTER,
      Math.max(promptRadius + EDGE_GUTTER, window.innerWidth - promptRadius - EDGE_GUTTER)
    );
    targetY = clamp(
      clientY + CURSOR_OFFSET_Y,
      promptRadius + EDGE_GUTTER,
      Math.max(promptRadius + EDGE_GUTTER, window.innerHeight - promptRadius - EDGE_GUTTER)
    );

    if (!hasPosition) {
      currentX = targetX;
      currentY = targetY;
      hasPosition = true;
    }
  };

  const shouldKeepAnimating = (): boolean => (
    Math.abs(targetX - currentX) > 0.1
    || Math.abs(targetY - currentY) > 0.1
    || Math.abs(velocityX) > 0.7
    || Math.abs(velocityY) > 0.7
    || Math.abs(pointerVelocityX) > 0.7
    || Math.abs(pointerVelocityY) > 0.7
    || deformation > 0.001
  );

  const runFrame = (time: number): void => {
    frameId = 0;
    const elapsed = lastFrameTime ? (time - lastFrameTime) / 1_000 : 1 / 60;
    const delta = clamp(elapsed, 1 / 240, MAX_FRAME_DELTA);
    lastFrameTime = time;

    if (reducedMotion.matches) {
      currentX = targetX;
      currentY = targetY;
      velocityX = 0;
      velocityY = 0;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
      deformation = 0;
    } else {
      const accelerationX = (targetX - currentX) * SPRING_STIFFNESS - velocityX * SPRING_DAMPING;
      const accelerationY = (targetY - currentY) * SPRING_STIFFNESS - velocityY * SPRING_DAMPING;
      velocityX += accelerationX * delta;
      velocityY += accelerationY * delta;
      currentX += velocityX * delta;
      currentY += velocityY * delta;

      const motionX = velocityX * 0.76 + pointerVelocityX * 0.24;
      const motionY = velocityY * 0.76 + pointerVelocityY * 0.24;
      const kineticSpeed = Math.hypot(motionX, motionY);
      const deformationTarget = clamp(kineticSpeed / MAX_DEFORM_SPEED, 0, 1);
      const deformationBlend = 1 - Math.exp(-delta * 14);
      deformation += (deformationTarget - deformation) * deformationBlend;

      if (kineticSpeed > 2) {
        const targetDirectionX = motionX / kineticSpeed;
        const targetDirectionY = motionY / kineticSpeed;
        const directionBlend = 1 - Math.exp(-delta * 11);
        directionX += (targetDirectionX - directionX) * directionBlend;
        directionY += (targetDirectionY - directionY) * directionBlend;
        const directionLength = Math.hypot(directionX, directionY) || 1;
        directionX /= directionLength;
        directionY /= directionLength;
      }

      const pointerDecay = Math.exp(-delta * 13);
      pointerVelocityX *= pointerDecay;
      pointerVelocityY *= pointerDecay;
    }

    prompt.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    surfacePath.setAttribute('d', buildBlobPath(deformation, directionX, directionY));

    if (shouldKeepAnimating()) frameId = window.requestAnimationFrame(runFrame);
    else lastFrameTime = 0;
  };

  const ensureAnimation = (): void => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(runFrame);
  };

  const resolveItem = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>('[data-piece-item]');
  };

  const activateZone = (zone: HTMLElement, event: PointerEvent): void => {
    if (!desktopPrompt.matches) return;

    if (activeZone && activeZone !== zone) {
      activeZone.classList.remove('has-piece-cursor-prompt');
    }
    activeZone = zone;
    activeZone.classList.add('has-piece-cursor-prompt');
    updateTarget(event);
    prompt.classList.add('is-visible');
    ensureAnimation();
  };

  const hidePrompt = (zone?: HTMLElement): void => {
    if (zone && activeZone !== zone) return;
    activeZone?.classList.remove('has-piece-cursor-prompt');
    activeZone = null;
    prompt.classList.remove('is-visible');
    pointerVelocityX = 0;
    pointerVelocityY = 0;
    lastPointerTime = 0;
    ensureAnimation();
  };

  itemZones.forEach((zone) => {
    zone.addEventListener('pointerenter', (event) => activateZone(zone, event), { passive: true });
    zone.addEventListener('pointermove', (event) => {
      if (!desktopPrompt.matches) return;
      if (activeZone !== zone || !prompt.classList.contains('is-visible')) {
        activateZone(zone, event);
        return;
      }
      updateTarget(event);
      ensureAnimation();
    }, { passive: true });
    zone.addEventListener('pointerleave', () => hidePrompt(zone), { passive: true });
  });

  menuRoot.addEventListener('click', (event) => {
    if (!desktopPrompt.matches || !resolveItem(event.target)) return;
    markAsUnderstood();
  });

  const syncPromptMode = (): void => {
    if (desktopPrompt.matches) {
      measurePrompt();
      return;
    }
    hidePrompt();
  };

  desktopPrompt.addEventListener('change', syncPromptMode);
  reducedMotion.addEventListener('change', ensureAnimation);
  window.addEventListener('resize', () => {
    measurePrompt();
    if (hasPosition) {
      targetX = clamp(pointerX + CURSOR_OFFSET_X, promptRadius + EDGE_GUTTER, Math.max(promptRadius + EDGE_GUTTER, window.innerWidth - promptRadius - EDGE_GUTTER));
      targetY = clamp(pointerY + CURSOR_OFFSET_Y, promptRadius + EDGE_GUTTER, Math.max(promptRadius + EDGE_GUTTER, window.innerHeight - promptRadius - EDGE_GUTTER));
    }
    ensureAnimation();
  }, { passive: true });

  window.requestAnimationFrame(measurePrompt);
};
