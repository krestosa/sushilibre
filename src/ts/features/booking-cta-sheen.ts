import { queryAll, setStyles } from '../shared/dom';
import { MOTION_EASE_OUT } from '../shared/motion';
import type { RuntimeContext } from '../shared/runtime';

export const setupBookingCtaSheen = ({
  reducedMotion,
  compactViewport,
  coarsePointer
}: RuntimeContext): void => {
  const ctas = queryAll<HTMLAnchorElement>('[data-booking-cta], .menu-final-cta__action');
  if (!ctas.length || reducedMotion.matches) return;

  const compact = compactViewport.matches || coarsePointer.matches;

  ctas.forEach((cta) => {
    if (typeof cta.animate !== 'function') return;

    const isFinalCta = cta.classList.contains('menu-final-cta__action');
    cta.style.overflow = 'hidden';
    cta.style.isolation = 'isolate';
    cta.classList.add('has-runtime-sheen');

    let label = cta.querySelector<HTMLElement>(':scope > span:not(.booking-cta-glow)');
    if (!label) {
      label = document.createElement('span');
      while (cta.firstChild) label.append(cta.firstChild);
      cta.append(label);
    }
    setStyles(label, { position: 'relative', zIndex: '2' });

    const glow = document.createElement('span');
    glow.className = 'booking-cta-glow';
    glow.setAttribute('aria-hidden', 'true');
    setStyles(glow, {
      position: 'absolute',
      zIndex: '0',
      inset: '-28%',
      borderRadius: 'inherit',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'scale(0.92)',
      transformOrigin: 'center',
      background: 'radial-gradient(circle at 50% 50%, rgba(107,124,255,.38) 0%, rgba(0,26,197,.25) 38%, rgba(0,26,197,0) 72%)',
      willChange: 'transform, opacity'
    });

    const sheen = document.createElement('i');
    sheen.className = 'booking-cta-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    setStyles(sheen, {
      position: 'absolute',
      zIndex: '1',
      top: '-48%',
      bottom: '-48%',
      left: '0',
      width: '88%',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translate3d(-145%, 0, 0) skewX(-18deg)',
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.05) 10%, rgba(255,255,255,.18) 24%, rgba(255,255,255,.46) 42%, rgba(255,255,255,.82) 50%, rgba(255,255,255,.46) 58%, rgba(255,255,255,.18) 76%, rgba(255,255,255,.05) 90%, transparent 100%)',
      filter: 'blur(6px)',
      willChange: 'transform, opacity'
    });
    cta.prepend(glow, sheen);

    const initialDelay = isFinalCta ? 550 : 1_500;
    const regularDelay = 7_400;
    const duration = compact ? 1_450 : 1_800;
    let timerId = 0;
    let activeSheen: Animation | null = null;
    let activeGlow: Animation | null = null;
    let interactionArmed = true;
    let initialPending = true;
    let visible = !isFinalCta;

    const clearTimer = (): void => {
      if (!timerId) return;
      window.clearTimeout(timerId);
      timerId = 0;
    };

    const stopAnimations = (): void => {
      activeSheen?.cancel();
      activeGlow?.cancel();
      activeSheen = null;
      activeGlow = null;
    };

    const scheduleRegularLoop = (delay = regularDelay): void => {
      clearTimer();
      if (!visible || document.hidden) return;
      timerId = window.setTimeout(() => {
        timerId = 0;
        runSheen();
      }, delay);
    };

    function runSheen(): void {
      if (!visible || document.hidden) return;
      clearTimer();
      stopAnimations();

      const sheenAnimation = sheen.animate([
        { transform: 'translate3d(-145%, 0, 0) skewX(-18deg)', opacity: 0 },
        { transform: 'translate3d(-122%, 0, 0) skewX(-18deg)', opacity: 0, offset: 0.1 },
        { transform: 'translate3d(-78%, 0, 0) skewX(-18deg)', opacity: 0.82, offset: 0.28 },
        { transform: 'translate3d(172%, 0, 0) skewX(-18deg)', opacity: 0.58, offset: 0.82 },
        { transform: 'translate3d(215%, 0, 0) skewX(-18deg)', opacity: 0 }
      ], {
        duration,
        easing: MOTION_EASE_OUT,
        fill: 'none'
      });

      const glowAnimation = glow.animate([
        { opacity: 0, transform: 'scale(0.92)' },
        { opacity: 0, transform: 'scale(0.92)', offset: 0.16 },
        { opacity: 0.9, transform: 'scale(1)', offset: 0.55 },
        { opacity: 0, transform: 'scale(1.04)' }
      ], {
        duration,
        easing: MOTION_EASE_OUT,
        fill: 'none'
      });

      activeSheen = sheenAnimation;
      activeGlow = glowAnimation;
      sheenAnimation.addEventListener('finish', () => {
        if (activeSheen === sheenAnimation) activeSheen = null;
        if (activeGlow === glowAnimation) activeGlow = null;
        scheduleRegularLoop();
      }, { once: true });
    }

    const triggerInteractionSheen = (): void => {
      if (!interactionArmed || !visible || document.hidden) return;
      interactionArmed = false;
      initialPending = false;
      runSheen();
    };

    const armInitial = (delay = initialDelay): void => {
      if (!visible) return;
      clearTimer();
      timerId = window.setTimeout(() => {
        timerId = 0;
        initialPending = false;
        runSheen();
      }, delay);
    };

    let observer: IntersectionObserver | null = null;
    if (isFinalCta && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        const nextVisible = Boolean(entries[0]?.isIntersecting);
        if (nextVisible === visible) return;
        visible = nextVisible;

        if (!visible) {
          clearTimer();
          stopAnimations();
          return;
        }

        armInitial(initialPending ? initialDelay : 650);
      }, { rootMargin: '140px 0px', threshold: 0 });
      observer.observe(cta);
    } else {
      visible = true;
      armInitial();
    }

    if (!compact) {
      cta.addEventListener('pointerenter', triggerInteractionSheen, { passive: true });
      cta.addEventListener('pointerleave', () => {
        interactionArmed = true;
      }, { passive: true });
    }
    cta.addEventListener('focus', triggerInteractionSheen);
    cta.addEventListener('blur', () => {
      interactionArmed = true;
    });

    const handleVisibility = (): void => {
      if (document.hidden) {
        clearTimer();
        stopAnimations();
        return;
      }
      scheduleRegularLoop(initialPending ? 650 : regularDelay);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    window.addEventListener('pagehide', () => {
      clearTimer();
      stopAnimations();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    }, { once: true });
  });
};
