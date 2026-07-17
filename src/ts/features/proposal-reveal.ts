import { query, queryAll } from '../shared/dom';

const REVEAL_ROOT_MARGIN = '0px 0px -10% 0px';
const REVEAL_THRESHOLD = 0.01;
const INITIAL_VIEWPORT_RATIO = 0.92;

const reveal = (element: HTMLElement): void => {
  if (element.classList.contains('is-visible')) return;
  element.classList.add('is-visible');
};

const isInitiallyVisible = (element: HTMLElement): boolean => {
  const bounds = element.getBoundingClientRect();
  return bounds.bottom > 0 && bounds.top < window.innerHeight * INITIAL_VIEWPORT_RATIO;
};

export const setupProposalReveal = (): void => {
  const root = document.documentElement;
  const proposalRoot = query<HTMLElement>('[data-proposal-root]');

  root.setAttribute('data-proposal-reveal-ready', '');
  if (!proposalRoot) return;

  const targets = queryAll<HTMLElement>('[data-proposal-reveal]', proposalRoot);
  const fallbackActive = root.classList.contains('proposal-reveal-fallback');

  if (!targets.length) return;

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
