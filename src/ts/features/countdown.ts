import { query } from '../shared/dom';
import { addScrollListener, getScrollY } from '../shared/scroll-root';

type CountdownKey = 'days' | 'hours' | 'minutes' | 'seconds';

const keys: CountdownKey[] = ['days', 'hours', 'minutes', 'seconds'];
const target = new Date('2026-09-03T20:00:00-03:00').getTime();
const FINAL_CTA_DOCK_CLEARANCE_PX = 8;
const DOCK_FADE_MS = 170;

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
  let menuMode = false;
  let finalMenuCtaActionPassedDock = false;
  let finalMenuCtaTriggerScrollY = Number.POSITIVE_INFINITY;
  let measurementFrame = 0;
  let dockCollapseTimer = 0;
  let dockTransitionToken = 0;

  const nodes: Record<CountdownKey, HTMLElement | null> = {
    days: query<HTMLElement>('[data-countdown="days"]'),
    hours: query<HTMLElement>('[data-countdown="hours"]'),
    minutes: query<HTMLElement>('[data-countdown="minutes"]'),
    seconds: query<HTMLElement>('[data-countdown="seconds"]')
  };

  const syncDockCtaVisibility = (): void => {
    if (!cta) return;
    const shouldSuppress = finalMenuCtaActionPassedDock && !menuMode;
    const token = ++dockTransitionToken;
    window.clearTimeout(dockCollapseTimer);

    if (shouldSuppress) {
      cta.classList.add('is-suppressed');
      dock?.classList.add('is-cta-suppressed');
      cta.setAttribute('tabindex', '-1');

      if (!dock) return;
      if (reducedMotion.matches) {
        dock.classList.add('is-cta-collapsed');
        return;
      }

      dockCollapseTimer = window.setTimeout(() => {
        if (token !== dockTransitionToken || !dock.classList.contains('is-cta-suppressed')) return;
        dock.classList.add('is-cta-collapsed');
      }, DOCK_FADE_MS);
      return;
    }

    dock?.classList.remove('is-cta-collapsed');

    const reveal = (): void => {
      if (token !== dockTransitionToken) return;
      cta.classList.remove('is-suppressed');
      dock?.classList.remove('is-cta-suppressed');
      cta.removeAttribute('tabindex');
    };

    if (reducedMotion.matches || !dock) {
      reveal();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(reveal);
    });
  };

  const syncFinalMenuCtaActionPosition = (): void => {
    const nextPassedState = getScrollY() >= finalMenuCtaTriggerScrollY;
    if (nextPassedState === finalMenuCtaActionPassedDock) return;
    finalMenuCtaActionPassedDock = nextPassedState;
    syncDockCtaVisibility();
  };

  const measureFinalMenuCtaTrigger = (): void => {
    measurementFrame = 0;
    if (!finalMenuCtaAction || !dock) return;

    const scrollY = getScrollY();
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
    const removeScrollListener = addScrollListener(syncFinalMenuCtaActionPosition);
    window.addEventListener('resize', scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
    window.addEventListener('orientationchange', scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
    document.fonts.ready.then(scheduleFinalMenuCtaTriggerMeasurement).catch(() => undefined);
    window.addEventListener('pagehide', removeScrollListener, { once: true });
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
