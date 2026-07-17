import { query, setStyles } from '../shared/dom';
import type { RuntimeContext } from '../shared/runtime';

export const setupBookingCtaSheen = ({
  reducedMotion,
  compactViewport,
  coarsePointer
}: RuntimeContext): void => {
  const cta = query<HTMLAnchorElement>('.booking-dock__cta');
  if (!cta || reducedMotion.matches || typeof cta.animate !== 'function') return;

  cta.style.filter = 'none';
  cta.classList.add('has-runtime-sheen');

  const sheen = document.createElement('i');
  sheen.setAttribute('aria-hidden', 'true');
  setStyles(sheen, {
    position: 'absolute',
    zIndex: '1',
    top: '-42%',
    bottom: '-42%',
    left: '0',
    width: '72%',
    opacity: '0',
    pointerEvents: 'none',
    transform: 'translate3d(-135%, 0, 0) skewX(-18deg)',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 12%, rgba(255,255,255,.14) 26%, rgba(255,255,255,.36) 42%, rgba(255,255,255,.58) 50%, rgba(255,255,255,.36) 58%, rgba(255,255,255,.14) 74%, rgba(255,255,255,.04) 88%, transparent 100%)',
    filter: 'blur(5px)',
    willChange: 'transform, opacity'
  });
  cta.prepend(sheen);

  const initialDelay = 2_350;
  const regularDelay = 4_700;
  const duration = compactViewport.matches || coarsePointer.matches ? 850 : 1_050;
  let timerId = 0;
  let activeAnimation: Animation | null = null;
  let interactionArmed = true;
  let initialPending = true;

  const clearTimer = (): void => {
    if (!timerId) return;
    window.clearTimeout(timerId);
    timerId = 0;
  };

  const scheduleRegularLoop = (delay = regularDelay): void => {
    clearTimer();
    timerId = window.setTimeout(() => {
      timerId = 0;
      runSheen();
    }, delay);
  };

  function runSheen(): void {
    clearTimer();
    activeAnimation?.cancel();

    const animation = sheen.animate([
      { transform: 'translate3d(-135%, 0, 0) skewX(-18deg)', opacity: 0 },
      { transform: 'translate3d(-112%, 0, 0) skewX(-18deg)', opacity: 0, offset: 0.08 },
      { transform: 'translate3d(-72%, 0, 0) skewX(-18deg)', opacity: 0.68, offset: 0.24 },
      { transform: 'translate3d(170%, 0, 0) skewX(-18deg)', opacity: 0.46, offset: 0.82 },
      { transform: 'translate3d(205%, 0, 0) skewX(-18deg)', opacity: 0 }
    ], {
      duration,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'none'
    });

    activeAnimation = animation;
    animation.addEventListener('finish', () => {
      if (activeAnimation === animation) activeAnimation = null;
      scheduleRegularLoop();
    }, { once: true });
  }

  const triggerInteractionSheen = (): void => {
    if (!interactionArmed || document.hidden) return;
    interactionArmed = false;
    initialPending = false;
    runSheen();
  };

  timerId = window.setTimeout(() => {
    timerId = 0;
    initialPending = false;
    runSheen();
  }, initialDelay);

  cta.addEventListener('pointerenter', triggerInteractionSheen, { passive: true });
  cta.addEventListener('pointerleave', () => {
    interactionArmed = true;
  }, { passive: true });
  cta.addEventListener('focus', triggerInteractionSheen);
  cta.addEventListener('blur', () => {
    interactionArmed = true;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimer();
      activeAnimation?.cancel();
      activeAnimation = null;
      return;
    }
    scheduleRegularLoop(initialPending ? 650 : regularDelay);
  });
};
