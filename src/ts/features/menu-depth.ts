import { query } from '../shared/dom';

export const setupMenuDepth = (): void => {
  const section = query<HTMLElement>('.menu-section');
  const background = query<HTMLElement>('.menu-section__background');
  if (!section || !background) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let frame = 0;

  const update = (): void => {
    frame = 0;
    if (reduce.matches) {
      background.style.transform = 'none';
      return;
    }

    const rect = section.getBoundingClientRect();
    const viewport = Math.max(1, window.innerHeight);
    if (rect.bottom < -120 || rect.top > viewport + 120) return;

    const distance = Math.max(1, rect.height - viewport);
    const progress = Math.min(1, Math.max(0, -rect.top / distance));
    const centered = progress * 2 - 1;
    const touch = coarse.matches;
    const y = centered * (touch ? 16 : 30);
    const x = Math.sin(progress * Math.PI * 2) * (touch ? 2 : 4);
    const scale = (touch ? 1.055 : 1.07) + Math.sin(progress * Math.PI) * (touch ? 0.007 : 0.01);

    background.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  };

  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  background.style.transformOrigin = 'center';
  background.style.willChange = 'transform';
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  reduce.addEventListener('change', schedule);
  coarse.addEventListener('change', schedule);
  schedule();
};
