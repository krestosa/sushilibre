const FRAME_MS = 1000 / 60;
const LERP = 0.1;
const WHEEL_MULTIPLIER = 1;
const MAX_WHEEL_DELTA = 480;
const FINISH_EPSILON = 0.35;
const NATIVE_SCROLL_SELECTOR = [
  'dialog[open]',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-native-scroll]'
].join(',');
const VERTICAL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' '
]);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const getScrollLimit = (): number =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const normalizeWheelDelta = (event: WheelEvent): number => {
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? window.innerHeight
      : 1;

  return clamp(event.deltaY * unit, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
};

const shouldUseNativeScroll = (event: WheelEvent): boolean => {
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return true;
  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target?.closest(NATIVE_SCROLL_SELECTOR));
};

export const setupEfficientSmoothScroll = (): void => {
  const root = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialInlineScrollBehavior = root.style.scrollBehavior;

  let enabled = false;
  let frameId = 0;
  let lastFrameTime = 0;
  let animatedY = window.scrollY;
  let targetY = animatedY;

  const syncPosition = (): void => {
    animatedY = window.scrollY;
    targetY = animatedY;
    lastFrameTime = 0;
  };

  const stop = (): void => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    syncPosition();
  };

  const render = (time: number): void => {
    frameId = 0;
    if (!enabled || document.hidden) {
      syncPosition();
      return;
    }

    const deltaTime = lastFrameTime
      ? Math.min(50, Math.max(1, time - lastFrameTime))
      : FRAME_MS;
    lastFrameTime = time;

    const frameRatio = deltaTime / FRAME_MS;
    const alpha = 1 - Math.pow(1 - LERP, frameRatio);
    const distance = targetY - animatedY;

    if (Math.abs(distance) <= FINISH_EPSILON) {
      animatedY = targetY;
      window.scrollTo(0, animatedY);
      lastFrameTime = 0;
      return;
    }

    animatedY += distance * alpha;
    window.scrollTo(0, animatedY);
    frameId = window.requestAnimationFrame(render);
  };

  const requestRender = (): void => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(render);
  };

  const scrollToTarget = (nextTarget: number): void => {
    const limit = getScrollLimit();
    if (!frameId) animatedY = window.scrollY;
    targetY = clamp(nextTarget, 0, limit);
    requestRender();
  };

  const onWheel = (event: WheelEvent): void => {
    if (shouldUseNativeScroll(event)) return;
    const delta = normalizeWheelDelta(event);
    if (Math.abs(delta) < 0.01) return;

    event.preventDefault();
    if (!frameId) syncPosition();
    scrollToTarget(targetY + delta * WHEEL_MULTIPLIER);
  };

  const onScroll = (): void => {
    if (!frameId) syncPosition();
  };

  const onResize = (): void => {
    const limit = getScrollLimit();
    targetY = clamp(targetY, 0, limit);
    animatedY = clamp(animatedY, 0, limit);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!VERTICAL_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    stop();
  };

  const onAnchorClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
    if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

    const hash = anchor.getAttribute('href') ?? '';
    let destination = 0;

    if (hash && hash !== '#') {
      const id = decodeURIComponent(hash.slice(1));
      const element = document.getElementById(id);
      if (!element) return;
      destination = window.scrollY + element.getBoundingClientRect().top;
    }

    event.preventDefault();
    if (hash && hash !== window.location.hash) history.pushState(null, '', hash);
    scrollToTarget(destination);
  };

  const enable = (): void => {
    if (enabled) return;
    enabled = true;
    root.style.scrollBehavior = 'auto';
    syncPosition();

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointerdown', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onAnchorClick);
  };

  const disable = (): void => {
    if (!enabled) return;
    enabled = false;
    stop();
    root.style.scrollBehavior = initialInlineScrollBehavior;

    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointerdown', stop);
    window.removeEventListener('touchstart', stop);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click', onAnchorClick);
  };

  const syncMode = (): void => {
    if (finePointer.matches && !coarsePointer.matches && !reducedMotion.matches) enable();
    else disable();
  };

  finePointer.addEventListener('change', syncMode);
  coarsePointer.addEventListener('change', syncMode);
  reducedMotion.addEventListener('change', syncMode);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else syncPosition();
  });

  window.addEventListener('pagehide', () => {
    disable();
    finePointer.removeEventListener('change', syncMode);
    coarsePointer.removeEventListener('change', syncMode);
    reducedMotion.removeEventListener('change', syncMode);
  }, { once: true });

  syncMode();
};
