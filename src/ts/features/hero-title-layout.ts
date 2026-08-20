import { query } from '../shared/dom';
import { setupHeroTitleScroll } from './hero-title-scroll';

const STACKED_CLASS = 'is-stacked';
const INLINE_WIDTH = 'min(1600px, calc(100vw - 48px))';
const MOBILE_VERTICAL_QUERY = '(max-width: 620px)';
const COLLISION_BUFFER_PX = 8;
const RETURN_BUFFER_PX = 24;
const MOBILE_TARGET_GAP_PX = 12;

export const setupHeroTitleLayout = (): void => {
  const hero = query<HTMLElement>('.hero');
  const masthead = query<HTMLElement>('.masthead');
  const brands = query<HTMLElement>('.masthead__brands', masthead ?? undefined);
  const lockup = query<HTMLElement>('.title-lockup');
  const sushi = query<HTMLElement>('.title-word--sushi');
  const kicker = query<HTMLElement>('.title-kicker');
  const libre = query<HTMLElement>('.title-word--libre');
  const heroCopy = query<HTMLElement>('.hero-copy');

  if (!hero || !masthead || !lockup || !sushi || !kicker || !libre || !heroCopy) return;

  const mobileVertical = window.matchMedia(MOBILE_VERTICAL_QUERY);
  let scheduledFrame = 0;

  const resetMobileVerticalLayout = (): void => {
    lockup.style.top = '';
    lockup.style.rowGap = '';
    sushi.style.fontSize = '';
    kicker.style.fontSize = '';
    libre.style.fontSize = '';
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

    const mastheadBottom = masthead.offsetTop + masthead.offsetHeight;
    const brandsBottom = brands
      ? masthead.offsetTop + brands.offsetTop + brands.offsetHeight
      : mastheadBottom;
    const upperBoundary = Math.max(mastheadBottom, brandsBottom);
    const lowerBoundary = heroCopy.offsetTop;
    const availableHeight = Math.max(0, lowerBoundary - upperBoundary);

    const lockupStyle = window.getComputedStyle(lockup);
    const sushiStyle = window.getComputedStyle(sushi);
    const kickerStyle = window.getComputedStyle(kicker);
    const libreStyle = window.getComputedStyle(libre);
    const baseHeight = lockup.offsetHeight;
    const baseRowGap = Number.parseFloat(lockupStyle.rowGap) || 0;
    const baseSushiSize = Number.parseFloat(sushiStyle.fontSize) || 0;
    const baseKickerSize = Number.parseFloat(kickerStyle.fontSize) || 0;
    const baseLibreSize = Number.parseFloat(libreStyle.fontSize) || 0;

    if (baseHeight <= 0 || availableHeight <= 0) return;

    const targetGap = Math.min(MOBILE_TARGET_GAP_PX, availableHeight / 4);
    const scale = Math.min(
      1,
      Math.max(0.01, (availableHeight - targetGap * 2) / baseHeight)
    );

    if (scale < 0.999) {
      sushi.style.fontSize = `${baseSushiSize * scale}px`;
      kicker.style.fontSize = `${baseKickerSize * scale}px`;
      libre.style.fontSize = `${baseLibreSize * scale}px`;
      lockup.style.rowGap = `${baseRowGap * scale}px`;
    }

    const scaledHeight = lockup.offsetHeight;
    const equalGap = Math.max(0, (availableHeight - scaledHeight) / 2);
    lockup.style.top = `${upperBoundary + equalGap}px`;
  };

  const syncLayout = (): void => {
    resetMobileVerticalLayout();

    const wasStacked = lockup.classList.contains(STACKED_CLASS);
    const { available, required } = measureInlineFit();
    const buffer = wasStacked ? RETURN_BUFFER_PX : COLLISION_BUFFER_PX;
    const shouldStack = required + buffer > available;

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
