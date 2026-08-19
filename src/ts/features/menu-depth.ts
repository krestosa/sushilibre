import { query } from '../shared/dom';

export const setupMenuDepth = (): void => {
  const section = query<HTMLElement>('.menu-section');
  const background = query<HTMLElement>('.menu-section__background');
  if (!section || !background) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let frame = 0;
  let active = false;
  let sectionTop = 0;
  let scrollDistance = 1;

  const disabled = (): boolean => reduce.matches || coarse.matches;

  const measure = (): void => {
    const rect = section.getBoundingClientRect();
    sectionTop = window.scrollY + rect.top;
    scrollDistance = Math.max(1, rect.height - window.innerHeight);
  };

  const update = (): void => {
    frame = 0;
    if (!active || disabled()) return;

    const progress = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / scrollDistance));
    const centered = progress * 2 - 1;
    const y = centered * 30;
    const x = Math.sin(progress * Math.PI * 2) * 4;
    const scale = 1.07 + Math.sin(progress * Math.PI) * 0.01;

    background.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  };

  const schedule = (): void => {
    if (active && !disabled() && !frame) frame = window.requestAnimationFrame(update);
  };

  const stop = (): void => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    background.style.transform = 'none';
    background.style.willChange = 'auto';
  };

  const syncMotion = (): void => {
    if (disabled()) {
      stop();
      return;
    }

    background.style.willChange = active ? 'transform' : 'auto';
    schedule();
  };

  const refresh = (): void => {
    measure();
    schedule();
  };

  background.style.transformOrigin = 'center';
  measure();

  const observer = new IntersectionObserver((entries) => {
    active = Boolean(entries[0]?.isIntersecting);
    if (!active || disabled()) {
      stop();
      return;
    }

    background.style.willChange = 'transform';
    schedule();
  }, { rootMargin: '120px 0px', threshold: 0 });
  observer.observe(section);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });
  reduce.addEventListener('change', syncMotion);
  coarse.addEventListener('change', syncMotion);

  window.addEventListener('pagehide', () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', refresh);
    window.removeEventListener('orientationchange', refresh);
    reduce.removeEventListener('change', syncMotion);
    coarse.removeEventListener('change', syncMotion);
  }, { once: true });
};