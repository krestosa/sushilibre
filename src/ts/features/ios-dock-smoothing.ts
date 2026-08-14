import { query } from '../shared/dom';

const SETTLE_EPSILON = 0.12;
const RESPONSE_MS = 42;
const FAST_RESPONSE_MS = 28;
const FAST_THRESHOLD_PX = 72;

export const setupIosDockSmoothing = (): void => {
  const root = document.documentElement;
  const dock = query<HTMLElement>('.booking-dock');
  if (!dock || !root.classList.contains('is-ios-mobile')) return;

  const visualViewport = window.visualViewport;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let frame = 0;
  let currentOffset: number | null = null;
  let lastTime = 0;

  const readViewportBottomOffset = (): number => {
    if (!visualViewport) return window.innerHeight;
    return visualViewport.pageTop - window.scrollY + visualViewport.height;
  };

  const write = (offset: number): void => {
    const visualBottom = Math.max(0, window.scrollY + offset);
    root.style.setProperty('--ios-dock-smoothed-bottom', `${visualBottom.toFixed(2)}px`);
  };

  const tick = (now: number): void => {
    frame = 0;

    const targetOffset = readViewportBottomOffset();
    if (currentOffset === null) currentOffset = targetOffset;

    const dt = lastTime ? Math.min(50, Math.max(1, now - lastTime)) : 16.67;
    lastTime = now;

    if (reducedMotion.matches) {
      currentOffset = targetOffset;
    } else {
      const distance = Math.abs(targetOffset - currentOffset);
      const response = distance > FAST_THRESHOLD_PX ? FAST_RESPONSE_MS : RESPONSE_MS;
      const alpha = 1 - Math.exp(-dt / response);
      currentOffset += (targetOffset - currentOffset) * alpha;

      if (Math.abs(targetOffset - currentOffset) <= SETTLE_EPSILON) {
        currentOffset = targetOffset;
      }
    }

    write(currentOffset);

    if (Math.abs(targetOffset - currentOffset) > SETTLE_EPSILON) {
      frame = window.requestAnimationFrame(tick);
    }
  };

  const schedule = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(tick);
  };

  const snap = (): void => {
    currentOffset = readViewportBottomOffset();
    lastTime = 0;
    write(currentOffset);
  };

  snap();

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  visualViewport?.addEventListener('scroll', schedule, { passive: true });
  visualViewport?.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', schedule);

  window.addEventListener('pagehide', () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    visualViewport?.removeEventListener('scroll', schedule);
    visualViewport?.removeEventListener('resize', schedule);
    reducedMotion.removeEventListener('change', schedule);
  }, { once: true });
};
