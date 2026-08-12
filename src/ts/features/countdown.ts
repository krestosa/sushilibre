import { query } from '../shared/dom';

type CountdownKey = 'days' | 'hours' | 'minutes' | 'seconds';

const keys: CountdownKey[] = ['days', 'hours', 'minutes', 'seconds'];
const target = new Date('2026-09-03T20:00:00-03:00').getTime();
const FINAL_CTA_MIN_VISIBLE_RATIO = 0.16;
const FINAL_CTA_MIN_VISIBLE_PX = 14;

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
  let finalMenuCtaActionVisible = false;
  let visibilityFrame = 0;

  const nodes: Record<CountdownKey, HTMLElement | null> = {
    days: query<HTMLElement>('[data-countdown="days"]'),
    hours: query<HTMLElement>('[data-countdown="hours"]'),
    minutes: query<HTMLElement>('[data-countdown="minutes"]'),
    seconds: query<HTMLElement>('[data-countdown="seconds"]')
  };

  const syncDockCtaVisibility = (): void => {
    if (!cta) return;
    const shouldSuppress = finalMenuCtaActionVisible && !menuMode;
    cta.classList.toggle('is-suppressed', shouldSuppress);
    dock?.classList.toggle('is-cta-suppressed', shouldSuppress);
    if (shouldSuppress) cta.setAttribute('tabindex', '-1');
    else cta.removeAttribute('tabindex');
  };

  const isFinalMenuCtaActionVisible = (): boolean => {
    if (!finalMenuCtaAction) return false;

    const rect = finalMenuCtaAction.getBoundingClientRect();
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    const requiredVisibleHeight = Math.min(
      rect.height,
      Math.max(FINAL_CTA_MIN_VISIBLE_PX, rect.height * FINAL_CTA_MIN_VISIBLE_RATIO)
    );
    const requiredVisibleWidth = Math.min(rect.width, Math.max(24, rect.width * 0.12));

    return visibleHeight >= requiredVisibleHeight && visibleWidth >= requiredVisibleWidth;
  };

  const syncFinalMenuCtaActionVisibility = (): void => {
    const nextVisible = isFinalMenuCtaActionVisible();
    if (nextVisible === finalMenuCtaActionVisible) return;
    finalMenuCtaActionVisible = nextVisible;
    syncDockCtaVisibility();
  };

  const scheduleFinalMenuCtaActionVisibilitySync = (): void => {
    if (visibilityFrame) return;
    visibilityFrame = window.requestAnimationFrame(() => {
      visibilityFrame = 0;
      syncFinalMenuCtaActionVisibility();
    });
  };

  if (finalMenuCtaAction) {
    syncFinalMenuCtaActionVisibility();

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(scheduleFinalMenuCtaActionVisibilitySync, {
        threshold: [0, FINAL_CTA_MIN_VISIBLE_RATIO, 0.5, 1]
      });
      observer.observe(finalMenuCtaAction);
    }

    window.addEventListener('scroll', scheduleFinalMenuCtaActionVisibilitySync, { passive: true });
    window.addEventListener('resize', scheduleFinalMenuCtaActionVisibilitySync, { passive: true });
    window.addEventListener('orientationchange', scheduleFinalMenuCtaActionVisibilitySync, { passive: true });
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
