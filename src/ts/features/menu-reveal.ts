import { queryAll } from '../shared/dom';

const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';
const REVEAL_THRESHOLD = 0.01;
const INITIAL_VIEWPORT_RATIO = 0.92;
const MAX_ANIMATED_ITEMS_PER_GROUP = 3;

const reveal = (element: HTMLElement): void => {
  if (element.classList.contains('is-visible')) return;
  element.classList.add('is-visible');
};

const isInitiallyVisible = (element: HTMLElement): boolean => {
  const bounds = element.getBoundingClientRect();
  return bounds.bottom > 0 && bounds.top < window.innerHeight * INITIAL_VIEWPORT_RATIO;
};

const shouldAnimateTarget = (element: HTMLElement): boolean => {
  if (!element.classList.contains('menu-item')) return true;
  const group = element.closest<HTMLElement>('[data-menu-group]');
  if (!group) return true;
  const items = queryAll<HTMLElement>('.menu-item[data-menu-reveal]', group);
  return items.indexOf(element) < MAX_ANIMATED_ITEMS_PER_GROUP;
};

export const setupMenuReveal = (
  menuRoot: HTMLElement,
  _groups: HTMLElement[]
): void => {
  const root = document.documentElement;
  const allTargets = queryAll<HTMLElement>('[data-menu-reveal]', menuRoot);
  const fallbackActive = root.classList.contains('menu-reveal-fallback');

  root.setAttribute('data-menu-reveal-ready', '');
  if (!allTargets.length) return;

  const targets = allTargets.filter(shouldAnimateTarget);
  allTargets.filter((target) => !shouldAnimateTarget(target)).forEach(reveal);

  if (fallbackActive || !('IntersectionObserver' in window)) {
    targets.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      reveal(element);
      observer.unobserve(element);
    });
  }, {
    rootMargin: REVEAL_ROOT_MARGIN,
    threshold: REVEAL_THRESHOLD
  });

  window.requestAnimationFrame(() => {
    targets.forEach((target) => {
      if (isInitiallyVisible(target)) reveal(target);
      else observer.observe(target);
    });
  });
};
