import { query, queryAll } from '../shared/dom';
import { MOTION_DURATION, MOTION_EASE_OUT } from '../shared/motion';

type CountdownKey = 'days' | 'hours' | 'minutes' | 'seconds';

const keys: CountdownKey[] = ['days', 'hours', 'minutes', 'seconds'];
const target = new Date('2026-09-03T20:00:00-03:00').getTime();
const FINAL_CTA_DOCK_CLEARANCE_PX = 8;
const DOCK_FADE_MS = 170;
const DOCK_REVEAL_DELAY_MS = 90;

const replaceCtaLabel = (label: HTMLElement, firstLine: string, secondLine: string): void => {
  label.replaceChildren(
    document.createTextNode(firstLine),
    document.createElement('br'),
    document.createTextNode(secondLine)
  );
};

export const setupCountdown = (): void => {
  const countdown = query<HTMLElement>('.countdown');
  const dock = query<HTMLElement>('.booking-dock');
  const cta = query<HTMLAnchorElement>('[data-booking-cta]');
  const ctaLabel = query<HTMLElement>('[data-booking-cta-label]', cta ?? undefined);
  const menu = query<HTMLElement>('#menu');
  const finalMenuCtaAction = query<HTMLElement>('.menu-final-cta__action');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const countdownUnits = countdown ? queryAll<HTMLElement>('.countdown__unit', countdown) : [];

  let dockSurface = dock ? query<HTMLElement>('.booking-dock__surface', dock) : null;
  if (dock && !dockSurface) {
    dockSurface = document.createElement('div');
    dockSurface.className = 'booking-dock__surface';
    dockSurface.setAttribute('aria-hidden', 'true');
    dock.prepend(dockSurface);
  }

  let menuMode = false;
  let finalMenuCtaActionPassedDock = false;
  let finalMenuCtaTriggerScrollY = Number.POSITIVE_INFINITY;
  let measurementFrame = 0;
  let dockPhaseTimer = 0;
  let dockTransitionToken = 0;

  const nodes: Record<CountdownKey, HTMLElement | null> = {
    days: query<HTMLElement>('[data-countdown="days"]'),
    hours: query<HTMLElement>('[data-countdown="hours"]'),
    minutes: query<HTMLElement>('[data-countdown="minutes"]'),
    seconds: query<HTMLElement>('[data-countdown="seconds"]')
  };

  const animateDockGeometryChange = (mutate: () => void): void => {
    if (!dock || !dockSurface || reducedMotion.matches || typeof dockSurface.animate !== 'function') {
      mutate();
      return;
    }

    const beforeSurface = dockSurface.getBoundingClientRect();
    const beforeUnits = countdownUnits.map((unit) => unit.getBoundingClientRect());
    dockSurface.getAnimations().forEach((animation) => animation.cancel());
    countdownUnits.forEach((unit) => unit.getAnimations().forEach((animation) => animation.cancel()));

    mutate();

    const afterSurface = dockSurface.getBoundingClientRect();
    const surfaceWidth = Math.max(1, afterSurface.width);
    const surfaceHeight = Math.max(1, afterSurface.height);
    const surfaceDx = beforeSurface.left - afterSurface.left;
    const surfaceDy = beforeSurface.top - afterSurface.top;
    const surfaceScaleX = beforeSurface.width / surfaceWidth;
    const surfaceScaleY = beforeSurface.height / surfaceHeight;

    dockSurface.style.willChange = 'transform';
    const surfaceAnimation = dockSurface.animate([
      {
        transformOrigin: '0 0',
        transform: `translate3d(${surfaceDx}px, ${surfaceDy}px, 0) scale(${surfaceScaleX}, ${surfaceScaleY})`
      },
      {
        transformOrigin: '0 0',
        transform: 'translate3d(0, 0, 0) scale(1, 1)'
      }
    ], {
      duration: MOTION_DURATION.standard,
      easing: MOTION_EASE_OUT,
      fill: 'none'
    });

    surfaceAnimation.addEventListener('finish', () => {
      dockSurface!.style.willChange = 'auto';
    }, { once: true });
    surfaceAnimation.addEventListener('cancel', () => {
      dockSurface!.style.willChange = 'auto';
    }, { once: true });

    countdownUnits.forEach((unit, index) => {
      const before = beforeUnits[index];
      if (!before) return;
      const after = unit.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) return;

      unit.animate([
        { transform: `translate3d(${dx}px, ${dy}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' }
      ], {
        duration: MOTION_DURATION.standard,
        easing: MOTION_EASE_OUT,
        fill: 'none'
      });
    });
  };

  const syncDockCtaVisibility = (): void => {
    if (!cta) return;
    const shouldSuppress = finalMenuCtaActionPassedDock && !menuMode;
    const token = ++dockTransitionToken;
    window.clearTimeout(dockPhaseTimer);

    if (shouldSuppress) {
      cta.classList.add('is-suppressed');
      dock?.classList.add('is-cta-suppressed');
      cta.setAttribute('tabindex', '-1');

      if (!dock) return;
      if (reducedMotion.matches) {
        dock.classList.add('is-cta-collapsed');
        return;
      }

      dockPhaseTimer = window.setTimeout(() => {
        if (token !== dockTransitionToken || !dock.classList.contains('is-cta-suppressed')) return;
        animateDockGeometryChange(() => dock.classList.add('is-cta-collapsed'));
      }, DOCK_FADE_MS);
      return;
    }

    const wasCollapsed = Boolean(dock?.classList.contains('is-cta-collapsed'));
    if (dock && wasCollapsed) {
      animateDockGeometryChange(() => dock.classList.remove('is-cta-collapsed'));
    } else {
      dock?.classList.remove('is-cta-collapsed');
    }

    const reveal = (): void => {
      if (token !== dockTransitionToken) return;
      cta.classList.remove('is-suppressed');
      dock?.classList.remove('is-cta-suppressed');
      cta.removeAttribute('tabindex');
    };

    if (reducedMotion.matches || !dock || !wasCollapsed) {
      reveal();
      return;
    }

    dockPhaseTimer = window.setTimeout(reveal, DOCK_REVEAL_DELAY_MS);
  };

  const syncFinalMenuCtaActionPosition = (): void => {
    const nextPassedState = window.scrollY >= finalMenuCtaTriggerScrollY;
    if (nextPassedState === finalMenuCtaActionPassedDock) return;
    finalMenuCtaActionPassedDock = nextPassedState;
    syncDockCtaVisibility();
  };

  const measureFinalMenuCtaTrigger = (): void => {
    measurementFrame = 0;
    if (!finalMenuCtaAction || !dock) return;

    const scrollY = window.scrollY;
    const actionRect = finalMenuCtaAction.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    finalMenuCtaTriggerScrollY = Math.max(
      0,
      scrollY + actionRect.bottom - dockRect.top + FINAL_CTA_DOCK_CLEARANCE_PX
    );
    syncFinalMenuCtaActionPosition();
  };

  const scheduleFinalMenuCtaTriggerMeasurement = (): void => {
    if (measurementFrame) return;
    measurementFrame = window.requestAnimationFrame(measureFinalMenuCtaTrigger);
  };

  if (finalMenuCtaAction && dock) {
    measureFinalMenuCtaTrigger();
    window.addEventListener('scroll', syncFinalMenuCtaActionPosition, { passive: true });
    window.addEventListener('resize', scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
    window.addEventListener('orientationchange', scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
    document.fonts.ready.then(scheduleFinalMenuCtaTriggerMeasurement).catch(() => undefined);
  }

  const handleMenuClick = (event: MouseEvent): void => {
    if (!menu) return;
    event.preventDefault();
    menu.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });
    window.history.replaceState(null, '', '#menu');
  };

  const activateMenuMode = (): void => {
    if (menuMode || !cta || !ctaLabel) return;
    menuMode = true;
    document.documentElement.classList.add('event-live');
    dock?.classList.add('is-event-live');
    cta.href = '#menu';
    cta.dataset.destination = 'menu';
    cta.setAttribute('aria-label', 'Ir al menú');
    replaceCtaLabel(ctaLabel, 'IR A', 'MENÚ');
    cta.addEventListener('click', handleMenuClick);
    countdown?.setAttribute('aria-label', 'El evento comenzó');
    countdown?.setAttribute('data-state', 'complete');
    syncDockCtaVisibility();
  };

  const pad = (value: number): string => String(value).padStart(2, '0');

  const render = (): number => {
    const remaining = Math.max(0, target - Date.now());
    const values: Record<CountdownKey, number> = {
      days: Math.floor(remaining / 86_400_000),
      hours: Math.floor((remaining % 86_400_000) / 3_600_000),
      minutes: Math.floor((remaining % 3_600_000) / 60_000),
      seconds: Math.floor((remaining % 60_000) / 1_000)
    };

    keys.forEach((key) => {
      const node = nodes[key];
      const nextValue = pad(values[key]);
      if (node && node.textContent !== nextValue) node.textContent = nextValue;
    });

    if (remaining === 0) activateMenuMode();
    return remaining;
  };

  if (render() <= 0) return;
  const timerId = window.setInterval(() => {
    if (render() === 0) window.clearInterval(timerId);
  }, 1_000);
};
