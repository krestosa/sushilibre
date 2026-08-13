import { query, queryAll } from '../shared/dom';

const RESPONSIVE_REVEAL_QUERY = '(max-width: 840px)';
const DESKTOP_REVEAL_RATIO = 0.82;
const REVEAL_DOCK_GAP_PX = 16;
const MIN_VISIBLE_PX = 12;
const MAX_VISIBLE_PX = 28;
const VISIBLE_RATIO = 0.08;
const LINE_SPLIT_SELECTOR = '.proposal__intro, .proposal__condition p, .proposal__legal';
const LINE_TOP_TOLERANCE_PX = 3;
const originalLineHtml = new WeakMap<HTMLElement, string>();

const reveal = (element: HTMLElement): void => {
  if (element.classList.contains('is-visible')) return;
  element.classList.remove('is-reveal-bypassed');
  element.classList.add('is-visible');
};

const bypassReveal = (element: HTMLElement): void => {
  element.classList.add('is-visible', 'is-reveal-bypassed');
};

const getViewportBottom = (): number => {
  const viewport = window.visualViewport;
  return viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
};

const getRevealBoundary = (
  dock: HTMLElement | null,
  responsiveReveal: MediaQueryList
): number => {
  const viewportBottom = getViewportBottom();

  if (!responsiveReveal.matches || !dock) {
    return viewportBottom * DESKTOP_REVEAL_RATIO;
  }

  const dockBounds = dock.getBoundingClientRect();
  const dockIsFixed = window.getComputedStyle(dock).position === 'fixed';
  const dockOverlapsViewport = dockBounds.bottom > 0 && dockBounds.top < viewportBottom;

  if (!dockIsFixed || !dockOverlapsViewport) {
    return viewportBottom * DESKTOP_REVEAL_RATIO;
  }

  return Math.max(0, dockBounds.top - REVEAL_DOCK_GAP_PX);
};

const hasCrossedRevealBoundary = (element: HTMLElement, boundary: number): boolean => {
  const bounds = element.getBoundingClientRect();
  const visibleDistance = Math.min(
    MAX_VISIBLE_PX,
    Math.max(MIN_VISIBLE_PX, bounds.height * VISIBLE_RATIO)
  );

  return bounds.bottom > 0 && bounds.top + visibleDistance <= boundary;
};

const wrapWords = (element: HTMLElement): void => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.trim()) textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();

    node.data.split(/(\s+)/).forEach((token) => {
      if (!token) return;

      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(token));
        return;
      }

      const mask = document.createElement('span');
      const word = document.createElement('span');
      mask.className = 'proposal-line-mask';
      word.className = 'proposal-line-word';
      word.textContent = token;
      mask.append(word);
      fragment.append(mask);
    });

    node.replaceWith(fragment);
  });
};

const splitResponsiveLines = (element: HTMLElement): void => {
  const original = originalLineHtml.get(element) ?? element.innerHTML;
  const wasVisible = element.classList.contains('is-visible');
  originalLineHtml.set(element, original);

  element.innerHTML = original;
  element.classList.remove('has-line-split', 'is-line-split-settled');
  wrapWords(element);

  const masks = queryAll<HTMLElement>('.proposal-line-mask', element);
  let lineIndex = -1;
  let lineTop = Number.NEGATIVE_INFINITY;

  masks.forEach((mask) => {
    const top = mask.getBoundingClientRect().top;
    if (lineIndex < 0 || Math.abs(top - lineTop) > LINE_TOP_TOLERANCE_PX) {
      lineIndex += 1;
      lineTop = top;
    }
    mask.style.setProperty('--proposal-line-index', String(lineIndex));
  });

  element.style.setProperty('--proposal-line-count', String(Math.max(0, lineIndex + 1)));
  element.classList.add('has-line-split');
  if (wasVisible) element.classList.add('is-line-split-settled');
};

const setupResponsiveLineSplits = (proposalRoot: HTMLElement): (() => void) => {
  const targets = queryAll<HTMLElement>(LINE_SPLIT_SELECTOR, proposalRoot);
  if (!targets.length) return () => undefined;

  let resizeTimer = 0;

  const splitAll = (): void => {
    targets.forEach(splitResponsiveLines);
  };

  const scheduleSplit = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(splitAll, 110);
  };

  splitAll();
  window.addEventListener('resize', scheduleSplit, { passive: true });
  window.addEventListener('orientationchange', scheduleSplit, { passive: true });
  document.fonts.ready.then(scheduleSplit).catch(() => undefined);

  return () => {
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', scheduleSplit);
    window.removeEventListener('orientationchange', scheduleSplit);
  };
};

export const setupProposalReveal = (): void => {
  const root = document.documentElement;
  const proposalRoot = query<HTMLElement>('[data-proposal-root]');

  root.setAttribute('data-proposal-reveal-ready', '');
  if (!proposalRoot) return;

  const cleanupLineSplits = setupResponsiveLineSplits(proposalRoot);
  const targets = queryAll<HTMLElement>('[data-proposal-reveal]', proposalRoot);
  if (!targets.length) return;

  const dock = query<HTMLElement>('.booking-dock');
  const responsiveReveal = window.matchMedia(RESPONSIVE_REVEAL_QUERY);
  const visualViewport = window.visualViewport;
  const pendingTargets = new Set(targets);
  let updateFrame = 0;

  const revealVisibleTargets = (): void => {
    updateFrame = 0;
    const boundary = getRevealBoundary(dock, responsiveReveal);

    pendingTargets.forEach((element) => {
      if (element.classList.contains('is-visible')) {
        pendingTargets.delete(element);
        return;
      }

      if (!hasCrossedRevealBoundary(element, boundary)) return;
      reveal(element);
      pendingTargets.delete(element);
    });

    if (!pendingTargets.size) removeListeners();
  };

  const scheduleUpdate = (): void => {
    if (updateFrame) return;
    updateFrame = window.requestAnimationFrame(revealVisibleTargets);
  };

  const removeListeners = (): void => {
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    responsiveReveal.removeEventListener('change', scheduleUpdate);
    visualViewport?.removeEventListener('resize', scheduleUpdate);
    visualViewport?.removeEventListener('scroll', scheduleUpdate);
  };

  if (root.classList.contains('proposal-reveal-fallback')) {
    const boundary = getRevealBoundary(dock, responsiveReveal);

    pendingTargets.forEach((element) => {
      if (!hasCrossedRevealBoundary(element, boundary)) return;
      bypassReveal(element);
      pendingTargets.delete(element);
    });

    root.classList.remove('proposal-reveal-fallback');
  }

  if (!pendingTargets.size) {
    window.addEventListener('pagehide', cleanupLineSplits, { once: true });
    return;
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  responsiveReveal.addEventListener('change', scheduleUpdate);
  visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true });
  visualViewport?.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('pagehide', cleanupLineSplits, { once: true });

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(revealVisibleTargets);
  });
};
