import { query } from '../shared/dom';
import { addScrollListener, getScrollY, getViewportHeight } from '../shared/scroll-root';

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const ease = (n: number): number => n * n * (3 - 2 * n);
const WRITE_EPSILON_PX = 0.1;

export const setupMobileHeroFollowV2 = (): void => {
  const hero = query<HTMLElement>('.hero');
  const lockup = query<HTMLElement>('.title-lockup');
  if (!hero || !lockup) return;

  const mobileQuery = window.matchMedia('(max-width: 620px)');
  let frame = 0;
  let heroTop = 0;
  let heroHeight = 1;
  let lastTranslate: number | null = null;

  const measure = (): void => {
    const scrollY = getScrollY();
    const rect = hero.getBoundingClientRect();
    heroTop = scrollY + rect.top;
    heroHeight = Math.max(hero.offsetHeight, getViewportHeight());
  };

  const writeTranslate = (value: number): void => {
    if (lastTranslate !== null && Math.abs(lastTranslate - value) < WRITE_EPSILON_PX) return;
    lastTranslate = value;
    lockup.style.translate = `0 ${value.toFixed(2)}px`;
  };

  const render = (): void => {
    frame = 0;
    if (!mobileQuery.matches) {
      if (lastTranslate !== null) {
        lastTranslate = null;
        lockup.style.translate = '';
      }
      return;
    }

    const heroProgress = clamp((getScrollY() - heroTop) / heroHeight);
    const progress = ease(clamp((heroProgress - 0.10) / 0.34));
    writeTranslate(progress * 72);
  };

  const schedule = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  };

  const refresh = (): void => {
    measure();
    render();
  };

  refresh();
  const removeScrollListener = addScrollListener(schedule);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });
  mobileQuery.addEventListener('change', refresh);

  window.addEventListener('pagehide', () => {
    if (frame) window.cancelAnimationFrame(frame);
    removeScrollListener();
    window.removeEventListener('resize', refresh);
    window.removeEventListener('orientationchange', refresh);
    mobileQuery.removeEventListener('change', refresh);
  }, { once: true });
};
