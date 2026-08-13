import { query } from '../shared/dom';

const BASE_SPEED = 62;
const MAX_SPEED = 430;
const SCROLL_GAIN = 0.18;
const IMPULSE_HOLD_MS = 130;
const ACTIVE_RESPONSE = 15;
const IDLE_RESPONSE = 4.6;
const MAX_FRAME_DELTA = 1 / 30;

const wrap = (value: number, size: number): number => {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
};

export const setupScrollMarquee = (): void => {
  const root = query<HTMLElement>('[data-scroll-marquee]');
  if (!root) return;

  const track = query<HTMLElement>('[data-scroll-marquee-track]', root);
  const firstGroup = query<HTMLElement>('[data-scroll-marquee-group]', root);
  if (!track || !firstGroup) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let groupWidth = 0;
  let offset = 0;
  let velocity = BASE_SPEED;
  let targetVelocity = BASE_SPEED;
  let lastScrollY = window.scrollY;
  let lastScrollAt = performance.now();
  let lastFrameAt = 0;
  let frameId = 0;
  let isVisible = false;

  const measure = (): void => {
    groupWidth = firstGroup.getBoundingClientRect().width;
    offset = wrap(offset, groupWidth);
  };

  const stop = (): void => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrameAt = 0;
  };

  const frame = (now: number): void => {
    frameId = 0;
    if (!isVisible || reducedMotion.matches || groupWidth <= 0) return;

    if (!lastFrameAt) lastFrameAt = now;
    const deltaTime = Math.min(MAX_FRAME_DELTA, Math.max(0, (now - lastFrameAt) / 1_000));
    lastFrameAt = now;

    const idle = now - lastScrollAt > IMPULSE_HOLD_MS;
    const desiredVelocity = idle ? BASE_SPEED : targetVelocity;
    const response = idle ? IDLE_RESPONSE : ACTIVE_RESPONSE;
    const blend = 1 - Math.exp(-response * deltaTime);

    velocity += (desiredVelocity - velocity) * blend;
    offset = wrap(offset + velocity * deltaTime, groupWidth);
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;

    frameId = window.requestAnimationFrame(frame);
  };

  const start = (): void => {
    if (frameId || !isVisible || reducedMotion.matches || groupWidth <= 0) return;
    lastFrameAt = 0;
    frameId = window.requestAnimationFrame(frame);
  };

  const onScroll = (): void => {
    const now = performance.now();
    const nextScrollY = window.scrollY;
    const delta = nextScrollY - lastScrollY;
    lastScrollY = nextScrollY;

    if (Math.abs(delta) < 0.5) return;

    const elapsed = Math.max(16, now - lastScrollAt);
    const scrollVelocity = Math.abs(delta) / (elapsed / 1_000);
    const boost = Math.min(MAX_SPEED - BASE_SPEED, scrollVelocity * SCROLL_GAIN);
    targetVelocity = (delta > 0 ? 1 : -1) * (BASE_SPEED + boost);
    lastScrollAt = now;
    start();
  };

  const syncMotionPreference = (): void => {
    if (reducedMotion.matches) {
      stop();
      track.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    start();
  };

  measure();

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => {
        measure();
        start();
      })
    : null;
  resizeObserver?.observe(firstGroup);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    }, { rootMargin: '180px 0px', threshold: 0 });
    observer.observe(root);
  } else {
    isVisible = true;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reducedMotion.addEventListener('change', syncMotionPreference);

  document.fonts?.ready.then(() => {
    measure();
    start();
  }).catch(() => undefined);

  start();
};
