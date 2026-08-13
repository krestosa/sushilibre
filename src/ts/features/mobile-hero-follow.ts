import { query } from '../shared/dom';

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const ease = (n: number): number => n * n * (3 - 2 * n);

export const setupMobileHeroFollow = (): void => {
  const hero = query<HTMLElement>('.hero');
  const lockup = query<HTMLElement>('.title-lockup');
  if (!hero || !lockup) return;

  let frame = 0;
  let heroTop = 0;
  let heroHeight = 1;

  const measure = (): void => {
    const rect = hero.getBoundingClientRect();
    heroTop = window.scrollY + rect.top;
    heroHeight = Math.max(hero.offsetHeight, window.innerHeight);
  };

  const render = (): void => {
    frame = 0;
    if (window.innerWidth > 620) {
      lockup.style.transform = 'translateX(-50%)';
      return;
    }

    const progress = ease(clamp((window.scrollY - heroTop - heroHeight * 0.1) / (heroHeight * 0.48)));
    lockup.style.transform = `translate3d(-50%, ${progress * 46}px, 0)`;
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
};
