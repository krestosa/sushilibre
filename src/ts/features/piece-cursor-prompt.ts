import { query, queryAll } from '../shared/dom';

const DESKTOP_PROMPT_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SPRING_STIFFNESS = 112;
const SPRING_DAMPING = 19;
const MAX_FRAME_DELTA = 1 / 30;
const MAX_POINTER_SPEED = 1_700;
const MAX_STRETCH = 0.25;
const MAX_SQUASH = 0.18;
const CURSOR_OFFSET_X = 28;
const CURSOR_OFFSET_Y = 20;
const EDGE_GUTTER = 12;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

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

  const surface = document.createElement('span');
  surface.className = 'piece-cursor-preview__surface';

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
  let targetX = pointerX;
  let targetY = pointerY;
  let currentX = pointerX;
  let currentY = pointerY;
  let velocityX = 0;
  let velocityY = 0;
  let deformation = 0;
  let deformationTarget = 0;
  let directionX = 1;
  let directionY = 0;
  let directionTargetX = 1;
  let directionTargetY = 0;
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
      const deltaX = clientX - lastPointerX;
      const deltaY = clientY - lastPointerY;
      const distance = Math.hypot(deltaX, deltaY);
      const speed = distance / elapsed;
      deformationTarget = clamp(speed / MAX_POINTER_SPEED, 0, 1);

      if (distance > 0.35) {
        directionTargetX = deltaX / distance;
        directionTargetY = deltaY / distance;
      }
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
    Math.abs(targetX - currentX) > 0.12
    || Math.abs(targetY - currentY) > 0.12
    || Math.abs(velocityX) > 0.8
    || Math.abs(velocityY) > 0.8
    || deformation > 0.001
    || deformationTarget > 0.001
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
      deformation = 0;
      deformationTarget = 0;
      directionX = directionTargetX;
      directionY = directionTargetY;
    } else {
      const accelerationX = (targetX - currentX) * SPRING_STIFFNESS - velocityX * SPRING_DAMPING;
      const accelerationY = (targetY - currentY) * SPRING_STIFFNESS - velocityY * SPRING_DAMPING;
      velocityX += accelerationX * delta;
      velocityY += accelerationY * delta;
      currentX += velocityX * delta;
      currentY += velocityY * delta;

      const deformationBlend = 1 - Math.exp(-delta * 19);
      deformation += (deformationTarget - deformation) * deformationBlend;
      deformationTarget *= Math.exp(-delta * 8.5);

      const directionBlend = 1 - Math.exp(-delta * 15);
      directionX += (directionTargetX - directionX) * directionBlend;
      directionY += (directionTargetY - directionY) * directionBlend;
      const directionLength = Math.hypot(directionX, directionY) || 1;
      directionX /= directionLength;
      directionY /= directionLength;
    }

    const angle = Math.atan2(directionY, directionX) * 180 / Math.PI;
    const stretch = 1 + deformation * MAX_STRETCH;
    const squash = 1 - deformation * MAX_SQUASH;

    prompt.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    surface.style.transform = `rotate(${angle}deg) scale(${stretch}, ${squash}) rotate(${-angle}deg)`;

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
    deformationTarget = 0;
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
