import { query } from '../shared/dom';

const MENU_BACKGROUND_SOURCE = 'assets/menu_bg.webp';

export const setupMenuDepth = (): void => {
  const section = query<HTMLElement>('.menu-section');
  const background = query<HTMLElement>('.menu-section__background');
  if (!section || !background) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let frame = 0;
  let active = false;
  let backgroundRequested = false;

  const requestBackground = (): void => {
    if (backgroundRequested || section.classList.contains('is-background-ready')) return;
    backgroundRequested = true;

    const preload = new Image();
    preload.decoding = 'async';
    preload.fetchPriority = 'low';
    preload.onload = () => {
      section.classList.add('is-background-ready');
      preload.onload = null;
      preload.onerror = null;
    };
    preload.onerror = () => {
      backgroundRequested = false;
      preload.onload = null;
      preload.onerror = null;
    };
    preload.src = MENU_BACKGROUND_SOURCE;
  };

  const update = (): void => {
    frame = 0;
    if (!active || reduce.matches) return;

    const rect = section.getBoundingClientRect();
    const viewport = Math.max(1, window.innerHeight);
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
    if (active && !reduce.matches && !frame) frame = requestAnimationFrame(update);
  };

  const syncMotion = (): void => {
    if (reduce.matches) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      background.style.transform = 'none';
      background.style.willChange = 'auto';
      return;
    }
    background.style.willChange = active ? 'transform' : 'auto';
    schedule();
  };

  background.style.transformOrigin = 'center';

  const motionObserver = new IntersectionObserver((entries) => {
    active = Boolean(entries[0]?.isIntersecting);
    background.style.willChange = active && !reduce.matches ? 'transform' : 'auto';
    if (active) schedule();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '120px 0px', threshold: 0 });
  motionObserver.observe(section);

  const preloadObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        if (!entries[0]?.isIntersecting) return;
        requestBackground();
        observer.disconnect();
      }, { rootMargin: '120% 0px 120% 0px', threshold: 0 })
    : null;

  if (preloadObserver) preloadObserver.observe(section);
  else requestBackground();

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  reduce.addEventListener('change', syncMotion);
  coarse.addEventListener('change', schedule);

  window.addEventListener('pagehide', () => {
    motionObserver.disconnect();
    preloadObserver?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    reduce.removeEventListener('change', syncMotion);
    coarse.removeEventListener('change', schedule);
  }, { once: true });
};
