import { query } from '../shared/dom';
import { addScrollListener, getScrollY, getViewportHeight } from '../shared/scroll-root';

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const ease = (n: number): number => n * n * (3 - 2 * n);

const getBaseTextRect = (element: HTMLElement): DOMRect => {
  const textNode = Array.from(element.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
  );
  if (!textNode) return element.getBoundingClientRect();

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : element.getBoundingClientRect();
};

export const setupHeroTitleScroll = (): void => {
  const hero = query<HTMLElement>('.hero');
  const lockup = query<HTMLElement>('.title-lockup');
  const sushi = query<HTMLElement>('.title-word--sushi');
  const libre = query<HTMLElement>('.title-word--libre');
  const kicker = query<HTMLElement>('.title-kicker');
  const heroCopy = query<HTMLElement>('.hero-copy');
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
  let copyShiftY = 0;
  let mobileFollowMaxY = 0;
  let mobileMotion = false;

  [sushi, libre, kicker].forEach((el) => {
    el.style.transformOrigin = '0 0';
    el.style.willChange = 'transform';
  });
  kicker.style.willChange = 'transform, opacity';
  if (heroCopy) heroCopy.style.willChange = 'translate, opacity';

  const clear = (): void => {
    sushi.style.transform = '';
    libre.style.transform = '';
    kicker.style.transform = '';
    kicker.style.opacity = '';
    if (heroCopy) {
      heroCopy.style.translate = '';
      heroCopy.style.opacity = '';
    }
  };

  const measure = (): void => {
    clear();
    const box = lockup.getBoundingClientRect();
    const s = sushi.getBoundingClientRect();
    const l = libre.getBoundingClientRect();
    const sText = getBaseTextRect(sushi);
    const lText = getBaseTextRect(libre);
    const k = kicker.getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    const copy = heroCopy?.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = getViewportHeight();
    const mobile = viewportWidth <= 620;
    const tablet = !mobile && viewportWidth <= 900;
    const compact = lockup.classList.contains('is-stacked') || mobile;
    const gap = compact
      ? Math.max(4, Math.min(8, viewportWidth * 0.012))
      : Math.max(6, Math.min(14, viewportWidth * 0.006));

    mobileMotion = mobile;
    mobileFollowMaxY = mobile
      ? Math.max(24, Math.min(48, viewportHeight * 0.055))
      : 0;
    finalScale = compact
      ? Math.max(0.56, Math.min(1, (box.width - 16 - gap) / (s.width + l.width)))
      : 1;

    const sw = s.width * finalScale;
    const lw = l.width * finalScale;
    const rowH = Math.max(sText.height, lText.height) * finalScale;
    const joinedW = sw + gap + lw;
    const left = box.left + (box.width - joinedW) / 2;
    const drop = mobile ? Math.max(18, Math.min(24, viewportWidth * 0.058)) : 0;
    const top = (compact ? sText.top : Math.min(sText.top, lText.top)) + drop;

    sx = left - s.left;
    sy = top - s.top - (sText.top - s.top) * finalScale;
    lx = left + sw + gap - l.left;
    ly = top - l.top - (lText.top - l.top) * finalScale;
    kx = box.left + (box.width - k.width) / 2 - k.left;
    ky = top + rowH + (compact ? 13 : 12) - k.top;

    const kickerBottom = k.bottom + ky;
    const safeGap = mobile ? 30 : tablet ? 26 : 30;
    copyShiftY = copy ? Math.max(0, kickerBottom + safeGap - copy.top) : 0;

    heroTop = getScrollY() + h.top;
    const height = Math.max(hero.offsetHeight, viewportHeight);
    start = height * (mobile ? 0.004 : tablet ? 0.006 : 0.01);
    distance = height * (mobile ? 0.15 : tablet ? 0.17 : 0.23);
  };

  const render = (): void => {
    frame = 0;
    const scrollDelta = Math.max(0, getScrollY() - heroTop);
    const raw = clamp((getScrollY() - heroTop - start) / distance);
    const p = ease(raw);
    const scale = 1 + (finalScale - 1) * p;
    const followPhase = mobileMotion ? ease(clamp((raw - 0.45) / 0.55)) : 0;
    const followY = mobileMotion
      ? Math.min(mobileFollowMaxY, scrollDelta * 0.24) * followPhase
      : 0;

    sushi.style.transform = `translate3d(${sx * p}px, ${sy * p + followY}px, 0) scale(${scale})`;
    libre.style.transform = `translate3d(${lx * p}px, ${ly * p + followY}px, 0) scale(${scale})`;

    if (mobileMotion) {
      const kp = ease(clamp((raw - 0.08) / 0.76));
      const before = 1 - ease(clamp(raw / 0.2));
      const after = ease(clamp((raw - 0.68) / 0.24));
      kicker.style.transform = `translate3d(${kx * kp}px, ${ky * kp + followY}px, 0)`;
      kicker.style.opacity = String(Math.max(before, after));
    } else {
      kicker.style.transform = `translate3d(${kx * p}px, ${ky * p}px, 0)`;
      kicker.style.opacity = '';
    }

    if (heroCopy) {
      const copyP = ease(clamp((raw - 0.18) / 0.7));
      heroCopy.style.translate = `0 ${copyShiftY * copyP}px`;
      heroCopy.style.opacity = String(1 - copyP * 0.82);
    }
  };

  const scheduleRender: EventListener = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  };

  const refresh = (): void => {
    window.requestAnimationFrame(() => {
      measure();
      render();
    });
  };

  addScrollListener(scheduleRender);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('orientationchange', refresh, { passive: true });
  document.fonts.ready.then(refresh).catch(() => undefined);
  refresh();
};
