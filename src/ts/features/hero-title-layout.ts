import { query } from '../shared/dom';
import { setupHeroTitleScroll } from './hero-title-scroll';

const STACKED_CLASS = 'is-stacked';
const INLINE_WIDTH = 'min(1600px, calc(100vw - 48px))';
const MOBILE_VERTICAL_QUERY = '(max-width: 620px)';
const COLLISION_BUFFER_PX = 8;
const RETURN_BUFFER_PX = 24;
const MOBILE_MIN_GAP_PX = 12;

export const setupHeroTitleLayout = (): void => {
  const hero = query<HTMLElement>('.hero');
  const masthead = query<HTMLElement>('.masthead');
  const lockup = query<HTMLElement>('.title-lockup');
  const sushi = query<HTMLElement>('.title-word--sushi');
  const kicker = query<HTMLElement>('.title-kicker');
  const libre = query<HTMLElement>('.title-word--libre');
  const heroCopy = query<HTMLElement>('.hero-copy');

  if (!hero || !masthead || !lockup || !sushi || !kicker || !libre || !heroCopy) return;

  const mobileVertical = window.matchMedia(MOBILE_VERTICAL_QUERY);
  let scheduledFrame = 0;

  const resetMobileVerticalLayout = (): void => {
    hero.style.removeProperty('--hero-mobile-masthead-end');
    lockup.style.scale = '';
    lockup.style.transformOrigin = '';
  };

  const measureInlineFit = (): { available: number; required: number } => {
    const wasStacked = lockup.classList.contains(STACKED_CLASS);
    const previousWidth = lockup.style.width;

    if (wasStacked) lockup.classList.remove(STACKED_CLASS);
    lockup.style.width = INLINE_WIDTH;

    const style = window.getComputedStyle(lockup);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const available = lockup.clientWidth;
    const required =
      sushi.getBoundingClientRect().width +
      kicker.getBoundingClientRect().width +
      libre.getBoundingClientRect().width +
      gap * 2;

    lockup.style.width = previousWidth;
    if (wasStacked) lockup.classList.add(STACKED_CLASS);

    return { available, required };
  };

  const fitMobileTitleVertically = (): void => {
    if (!mobileVertical.matches) return;

    lockup.style.scale = '';
    lockup.style.transformOrigin = 'center center';

    const heroRect = hero.getBoundingClientRect();
    const mastheadRect = masthead.getBoundingClientRect();
    const mastheadEnd = Math.max(
      0,
      Math.min(heroRect.height, mastheadRect.bottom - heroRect.top)
    );

    hero.style.setProperty('--hero-mobile-masthead-end', `${Math.ceil(mastheadEnd)}px`);

    const copyRect = heroCopy.getBoundingClientRect();
    const titleRect = lockup.getBoundingClientRect();
    const availableHeight = Math.max(
      0,
      copyRect.top - (heroRect.top + mastheadEnd)
    );
    const maxTitleHeight = Math.max(0, availableHeight - MOBILE_MIN_GAP_PX * 2);

    if (titleRect.height <= 0 || maxTitleHeight >= titleRect.height) return;

    const scale = Math.max(0.01, maxTitleHeight / titleRect.height);
    lockup.style.scale = String(scale);
  };

  const syncLayout = (): void => {
    resetMobileVerticalLayout();

    const wasStacked = lockup.classList.contains(STACKED_CLASS);
    const { available, required } = measureInlineFit();
    const buffer = wasStacked ? RETURN_BUFFER_PX : COLLISION_BUFFER_PX;
    const shouldStack = mobileVertical.matches || required + buffer > available;

    lockup.classList.toggle(STACKED_CLASS, shouldStack);
    lockup.style.width = shouldStack ? '' : INLINE_WIDTH;
    fitMobileTitleVertically();
  };

  const scheduleSync = (): void => {
    if (scheduledFrame) return;

    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = 0;
      syncLayout();
    });
  };

  scheduleSync();
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('orientationchange', scheduleSync, { passive: true });
  mobileVertical.addEventListener('change', scheduleSync);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(hero);
    observer.observe(masthead);
    observer.observe(heroCopy);
  }

  document.fonts.ready.then(scheduleSync).catch(() => undefined);
  setupHeroTitleScroll();
};
