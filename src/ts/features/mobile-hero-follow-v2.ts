import { query } from '../shared/dom';

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
    const rect = hero.getBoundingClientRect();
    heroTop = window.scrollY + rect.top;
    heroHeight = Math.max(hero.offsetHeight, window.innerHeight);
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

    const heroProgress = clamp((window.scrollY - heroTop) / heroHeight);
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
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });
  mobileQuery.addEventListener('change', refresh);
};