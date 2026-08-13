import { query, queryAll } from '../shared/dom';

const DESKTOP_PROMPT_QUERY = '(min-width: 721px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SPRING_STIFFNESS = 112;
const SPRING_DAMPING = 19;
const MAX_FRAME_DELTA = 1 / 30;
const MAX_POINTER_SPEED = 1700;
const MAX_STRETCH_X = 0.24;
const MAX_SQUASH_Y = 0.17;
const CURSOR_OFFSET_X = 28;
const CURSOR_OFFSET_Y = 20;
const EDGE_GUTTER = 12;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

export const setupPieceCursorPrompt = (): void => {
  const menuRoot = query<HTMLElement>('[data-menu-root]');
  const pieceItems = queryAll<HTMLElement>('[data-piece-item]', menuRoot ?? undefined);
  if (!menuRoot || !pieceItems.length) return;

  const desktopPrompt = window.matchMedia(DESKTOP_PROMPT_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const prompt = document.createElement('div');
  prompt.className = 'piece-cursor-preview';
  prompt.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'piece-cursor-preview__label';
  label.textContent = 'CLICKEÁ';

  const icon = document.createElement('img');
  icon.className = 'piece-cursor-preview__icon';
  icon.src = 'assets/visibility.svg';
  icon.alt = '';
  icon.width = 24;
  icon.height = 24;

  prompt.append(label, icon);
  document.body.append(prompt);

  let activeItem: HTMLElement | null = null;
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
  let promptRadius = 44;
  let hasPosition = false;
  let hasClicked = false;

  const measurePrompt = (): void => {
    const bounds = prompt.getBoundingClientRect();
    if (bounds.width > 0) promptRadius = bounds.width * 0.5;
  };

  const markAsUnderstood = (): void => {
    if (hasClicked) return;
    hasClicked = true;
    prompt.classList.add('has-clicked');
  };

  const updateTarget = (event: PointerEvent): void => {
    const clientX = event.clientX;
    const clientY = event.clientY;
    pointerX = clientX;
    pointerY = clientY;

    if (lastPointerTime > 0) {
      const elapsed = Math.max(8, event.timeStamp - lastPointerTime) / 1000;
      const distance = Math.hypot(clientX - lastPointerX, clientY - lastPointerY);
      deformationTarget = clamp((distance / elapsed) / MAX_POINTER_SPEED, 0, 1);
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
    const elapsed = lastFrameTime ? (time - lastFrameTime) / 1000 : 1 / 60;
    const delta = clamp(elapsed, 1 / 240, MAX_FRAME_DELTA);
    lastFrameTime = time;

    if (reducedMotion.matches) {
      currentX = targetX;
      currentY = targetY;
      velocityX = 0;
      velocityY = 0;
      deformation = 0;
      deformationTarget = 0;
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
    }

    const scaleX = 1 + deformation * MAX_STRETCH_X;
    const scaleY = 1 - deformation * MAX_SQUASH_Y;
    prompt.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${scaleX}, ${scaleY})`;

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

  const showItem = (item: HTMLElement, event: PointerEvent): void => {
    if (!desktopPrompt.matches) return;
    activeItem = item;
    updateTarget(event);
    prompt.classList.add('is-visible');
    ensureAnimation();
  };

  const hidePrompt = (): void => {
    activeItem = null;
    prompt.classList.remove('is-visible');
    deformationTarget = 0;
    ensureAnimation();
  };

  menuRoot.addEventListener('pointerover', (event) => {
    const item = resolveItem(event.target);
    if (!item || item === activeItem) return;
    showItem(item, event);
  }, { passive: true });

  menuRoot.addEventListener('pointermove', (event) => {
    if (!desktopPrompt.matches) return;
    const item = resolveItem(event.target);
    if (!item) return;
    if (item !== activeItem) showItem(item, event);
    else {
      updateTarget(event);
      ensureAnimation();
    }
  }, { passive: true });

  menuRoot.addEventListener('pointerout', (event) => {
    const item = resolveItem(event.target);
    if (!item || item !== activeItem) return;
    const related = event.relatedTarget;
    if (related instanceof Node && item.contains(related)) return;
    hidePrompt();
  }, { passive: true });

  menuRoot.addEventListener('click', (event) => {
    if (!desktopPrompt.matches || !resolveItem(event.target)) return;
    markAsUnderstood();
  });

  menuRoot.addEventListener('pointerleave', hidePrompt, { passive: true });

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
