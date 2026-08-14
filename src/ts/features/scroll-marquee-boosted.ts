import { query } from '../shared/dom';

const BASE_SPEED = 68;
const MAX_SPEED = 820;
const SCROLL_GAIN = 0.42;
const IMPULSE_HOLD_MS = 150;
const ACTIVE_RESPONSE = 30;
const REVERSE_RESPONSE = 50;
const IDLE_RESPONSE = 5.2;
const MAX_FRAME_DELTA = 1 / 30;
const RATE_EPSILON = 0.015;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

export const setupScrollMarquee = (): void => {
  const root = query<HTMLElement>('[data-scroll-marquee]');
  if (!root) return;

  const track = query<HTMLElement>('[data-scroll-marquee-track]', root);
  const firstGroup = query<HTMLElement>('[data-scroll-marquee-group]', root);
  if (!track || !firstGroup || typeof track.animate !== 'function') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let groupWidth = 0;
  let durationMs = 0;
  let baseAnimation: Animation | null = null;
  let currentRate = 1;
  let targetRate = 1;
  let lastScrollY = window.scrollY;
  let lastScrollAt = performance.now();
  let lastRateFrameAt = 0;
  let rateFrame = 0;
  let isVisible = false;

  const cancelRateFrame = (): void => {
    if (rateFrame) window.cancelAnimationFrame(rateFrame);
    rateFrame = 0;
    lastRateFrameAt = 0;
  };

  const safelySetRate = (rate: number): void => {
    const animation = baseAnimation;
    if (!animation) return;

    if (rate < 0 && durationMs > 0) {
      const currentTime = Number(animation.currentTime ?? 0);
      if (currentTime < durationMs * 4) {
        animation.currentTime = durationMs * 1_000 + (currentTime % durationMs);
      }
    }

    try {
      animation.updatePlaybackRate(rate);
    } catch {
      animation.playbackRate = rate;
    }
  };

  const resetRate = (): void => {
    currentRate = 1;
    targetRate = 1;
    safelySetRate(1);
  };

  const buildAnimation = (): void => {
    const nextWidth = firstGroup.getBoundingClientRect().width;
    if (nextWidth <= 0) return;

    const previousDuration = durationMs;
    const previousTime = Number(baseAnimation?.currentTime ?? 0);
    const phase = previousDuration > 0
      ? ((previousTime % previousDuration) + previousDuration) % previousDuration / previousDuration
      : 0;

    baseAnimation?.cancel();
    groupWidth = nextWidth;
    durationMs = Math.max(1, (groupWidth / BASE_SPEED) * 1_000);
    baseAnimation = track.animate([
      { transform: 'translate3d(0, 0, 0)' },
      { transform: `translate3d(${-groupWidth}px, 0, 0)` }
    ], {
      duration: durationMs,
      iterations: Infinity,
      easing: 'linear'
    });
    baseAnimation.currentTime = phase * durationMs;
    safelySetRate(currentRate);

    if (!isVisible || reducedMotion.matches) baseAnimation.pause();
  };

  const runRateFrame = (now: number): void => {
    rateFrame = 0;
    if (!baseAnimation || !isVisible || reducedMotion.matches) return;

    if (!lastRateFrameAt) lastRateFrameAt = now;
    const deltaTime = Math.min(
      MAX_FRAME_DELTA,
      Math.max(0, (now - lastRateFrameAt) / 1_000)
    );
    lastRateFrameAt = now;

    const idle = now - lastScrollAt > IMPULSE_HOLD_MS;
    const desiredRate = idle ? 1 : targetRate;
    const reversing = !idle && currentRate * desiredRate < 0;
    const response = idle ? IDLE_RESPONSE : reversing ? REVERSE_RESPONSE : ACTIVE_RESPONSE;
    const blend = 1 - Math.exp(-response * deltaTime);
    currentRate += (desiredRate - currentRate) * blend;

    if (idle && Math.abs(currentRate - 1) <= RATE_EPSILON) {
      resetRate();
      lastRateFrameAt = 0;
      return;
    }

    safelySetRate(currentRate);
    rateFrame = window.requestAnimationFrame(runRateFrame);
  };

  const ensureRateFrame = (): void => {
    if (rateFrame || !isVisible || reducedMotion.matches || !baseAnimation) return;
    rateFrame = window.requestAnimationFrame(runRateFrame);
  };

  const onScroll = (): void => {
    const now = performance.now();
    const nextScrollY = window.scrollY;
    const delta = nextScrollY - lastScrollY;
    lastScrollY = nextScrollY;
    if (Math.abs(delta) < 0.5) return;

    const elapsed = Math.max(12, now - lastScrollAt);
    const scrollVelocity = Math.abs(delta) / (elapsed / 1_000);
    const boost = Math.min(MAX_SPEED - BASE_SPEED, scrollVelocity * SCROLL_GAIN);
    const speed = BASE_SPEED + boost;
    targetRate = clamp(
      (delta > 0 ? 1 : -1) * (speed / BASE_SPEED),
      -(MAX_SPEED / BASE_SPEED),
      MAX_SPEED / BASE_SPEED
    );
    lastScrollAt = now;
    ensureRateFrame();
  };

  const syncMotionPreference = (): void => {
    if (!baseAnimation) return;
    if (reducedMotion.matches) {
      cancelRateFrame();
      resetRate();
      baseAnimation.pause();
      baseAnimation.currentTime = 0;
      track.style.transform = 'translate3d(0, 0, 0)';
      track.style.willChange = 'auto';
      return;
    }

    track.style.transform = '';
    if (isVisible) {
      if (performance.now() - lastScrollAt > IMPULSE_HOLD_MS) resetRate();
      track.style.willChange = 'transform';
      baseAnimation.play();
      safelySetRate(currentRate);
    }
  };

  buildAnimation();

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(buildAnimation)
    : null;
  resizeObserver?.observe(firstGroup);

  const visibilityObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        const nextVisible = Boolean(entries[0]?.isIntersecting);
        if (nextVisible === isVisible) return;
        isVisible = nextVisible;
        if (!baseAnimation) return;

        if (isVisible && !reducedMotion.matches) {
          if (performance.now() - lastScrollAt > IMPULSE_HOLD_MS) resetRate();
          track.style.willChange = 'transform';
          baseAnimation.play();
          safelySetRate(currentRate);
        } else {
          cancelRateFrame();
          resetRate();
          baseAnimation.pause();
          track.style.willChange = 'auto';
        }
      }, { rootMargin: '180px 0px', threshold: 0 })
    : null;

  if (visibilityObserver) visibilityObserver.observe(root);
  else {
    isVisible = true;
    if (!reducedMotion.matches) {
      track.style.willChange = 'transform';
      baseAnimation?.play();
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', buildAnimation, { passive: true });
  reducedMotion.addEventListener('change', syncMotionPreference);

  document.fonts?.ready.then(buildAnimation).catch(() => undefined);

  window.addEventListener('pagehide', () => {
    cancelRateFrame();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    baseAnimation?.cancel();
    track.style.willChange = 'auto';
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', buildAnimation);
    reducedMotion.removeEventListener('change', syncMotionPreference);
  }, { once: true });
};
