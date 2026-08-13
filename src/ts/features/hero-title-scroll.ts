import { query } from '../shared/dom';

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const ease = (n: number): number => n * n * (3 - 2 * n);

export const setupHeroTitleScroll = (): void => {
  const hero = query<HTMLElement>('.hero');
  const lockup = query<HTMLElement>('.title-lockup');
  const sushi = query<HTMLElement>('.title-word--sushi');
  const libre = query<HTMLElement>('.title-word--libre');
  const kicker = query<HTMLElement>('.title-kicker');
  if (!hero || !lockup || !sushi || !libre || !kicker) return;

  let frame = 0;
  let heroTop = 0;
  let start = 0;
  let distance = 1;
  let sx = 0;
  let sy = 0;
  let lx = 0;
  let ly = 0;
  let kx = 0;
  let ky = 0;
  let finalScale = 1;

  [sushi, libre, kicker].forEach((el) => {
    el.style.transformOrigin = '0 0';
    el.style.willChange = 'transform';
  });

  const clear = (): void => {
    sushi.style.transform = '';
    libre.style.transform = '';
    kicker.style.transform = '';
  };

  const measure = (): void => {
    clear();

    const box = lockup.getBoundingClientRect();
    const s = sushi.getBoundingClientRect();
    const l = libre.getBoundingClientRect();
    const k = kicker.getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    const compact = lockup.classList.contains('is-stacked') || window.innerWidth <= 620;
    const gap = compact
      ? Math.max(4, Math.min(8, window.innerWidth * 0.012))
      : Math.max(6, Math.min(14, window.innerWidth * 0.006));

    finalScale = compact
      ? Math.max(0.56, Math.min(1, (box.width - 16 - gap) / (s.width + l.width)))
      : 1;

    const sw = s.width * finalScale;
    const lw = l.width * finalScale;
    const sh = s.height * finalScale;
    const lh = l.height * finalScale;
    const rowH = Math.max(sh, lh);
    const joinedW = sw + gap + lw;
    const left = box.left + (box.width - joinedW) / 2;
    const top = compact ? s.top : Math.min(s.top, l.top);

    sx = left - s.left;
    sy = top + (rowH - sh) / 2 - s.top;
    lx = left + sw + gap - l.left;
    ly = top + (rowH - lh) / 2 - l.top;
    kx = box.left + (box.width - k.width) / 2 - k.left;
    ky = top + rowH + (compact ? 9 : 14) - k.top;

    heroTop = window.scrollY + h.top;
    const height = Math.max(hero.offsetHeight, window.innerHeight);
    start = height * (compact ? 0.015 : 0.025);
    distance = height * (compact ? 0.285 : 0.375);
  };

  const render = (): void => {
    frame = 0;
    const raw = clamp((window.scrollY - heroTop - start) / distance);
    const p = ease(raw);
    const scale = 1 + (finalScale - 1) * p;

    sushi.style.transform = `translate3d(${sx * p}px, ${sy * p}px, 0) scale(${scale})`;
    libre.style.transform = `translate3d(${lx * p}px, ${ly * p}px, 0) scale(${scale})`;
    kicker.style.transform = `translate3d(${kx * p}px, ${ky * p}px, 0)`;
  };

  const scheduleRender = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  };

  const refresh = (): void => {
    window.requestAnimationFrame(() => {
      measure();
      render();
    });
  };

  window.addEventListener('scroll', scheduleRender, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });
  document.fonts.ready.then(refresh).catch(() => undefined);

  refresh();
};
