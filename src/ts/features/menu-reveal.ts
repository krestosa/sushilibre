import { query, queryAll } from '../shared/dom';

const REVEAL_ROOT_MARGIN = '0px 0px -12% 0px';
const REVEAL_THRESHOLD = 0.12;
const ITEM_STAGGER_MS = 40;
const MAX_ITEM_STAGGER_MS = 120;

const reveal = (element: HTMLElement): void => {
  element.classList.add('is-visible');
};

const prepareReveal = (
  element: HTMLElement,
  kind: 'intro' | 'group' | 'item',
  delay = 0
): void => {
  element.classList.add('menu-reveal', `menu-reveal--${kind}`);
  element.style.setProperty('--menu-reveal-delay', `${delay}ms`);
};

export const setupMenuReveal = (
  menuRoot: HTMLElement,
  groups: HTMLElement[]
): void => {
  const intro = query<HTMLElement>('.menu-section__intro h2', menuRoot);
  const targets: HTMLElement[] = [];

  if (intro) {
    prepareReveal(intro, 'intro');
    targets.push(intro);
  }

  groups.forEach((group) => {
    const title = query<HTMLElement>('.menu-group__title-line', group);
    if (title) {
      prepareReveal(title, 'group');
      targets.push(title);
    }

    queryAll<HTMLElement>('.menu-item', group).forEach((item, index) => {
      const delay = Math.min(index * ITEM_STAGGER_MS, MAX_ITEM_STAGGER_MS);
      prepareReveal(item, 'item', delay);
      targets.push(item);
    });
  });

  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
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

  targets.forEach((target) => observer.observe(target));
};
