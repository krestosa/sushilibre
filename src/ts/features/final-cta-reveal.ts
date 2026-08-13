import { query, queryAll } from '../shared/dom';

const TITLE_TEXT = '¿ESTÁS PREPARADO?';
const LINE_TOP_TOLERANCE_PX = 3;

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
      mask.className = 'final-cta-line-mask';
      word.className = 'final-cta-line-word';
      word.textContent = token;
      mask.append(word);
      fragment.append(mask);
    });

    node.replaceWith(fragment);
  });
};

export const setupFinalCtaReveal = (): void => {
  const root = query<HTMLElement>('.menu-final-cta');
  if (!root) return;

  const title = query<HTMLElement>('.menu-final-cta__title', root);
  const text = query<HTMLElement>('.menu-final-cta__text', root);
  const eyebrow = query<HTMLElement>('.menu-final-cta__eyebrow', root);
  const action = query<HTMLElement>('.menu-final-cta__action', root);
  if (!title || !text || !action) return;

  title.textContent = TITLE_TEXT;
  document.documentElement.classList.add('has-final-cta-reveal');

  const originalText = text.innerHTML;
  let resizeTimer = 0;

  const splitLines = (): void => {
    const wasVisible = root.classList.contains('is-final-cta-visible');
    text.innerHTML = originalText;
    wrapWords(text);

    const masks = queryAll<HTMLElement>('.final-cta-line-mask', text);
    let lineIndex = -1;
    let lineTop = Number.NEGATIVE_INFINITY;

    masks.forEach((mask) => {
      const top = mask.getBoundingClientRect().top;
      if (lineIndex < 0 || Math.abs(top - lineTop) > LINE_TOP_TOLERANCE_PX) {
        lineIndex += 1;
        lineTop = top;
      }
      mask.style.setProperty('--final-cta-line-index', String(lineIndex));
    });

    if (wasVisible) text.classList.add('is-final-cta-line-settled');
  };

  const scheduleSplit = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(splitLines, 110);
  };

  splitLines();
  window.addEventListener('resize', scheduleSplit, { passive: true });
  window.addEventListener('orientationchange', scheduleSplit, { passive: true });
  document.fonts.ready.then(scheduleSplit).catch(() => undefined);

  const reveal = (): void => {
    if (root.classList.contains('is-final-cta-visible')) return;
    root.classList.add('is-final-cta-visible');
  };

  if (!('IntersectionObserver' in window)) {
    reveal();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (!entry?.isIntersecting) return;
    reveal();
    observer.disconnect();
  }, {
    rootMargin: '0px 0px -18% 0px',
    threshold: 0.04
  });

  observer.observe(root);

  window.addEventListener('pagehide', () => {
    observer.disconnect();
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', scheduleSplit);
    window.removeEventListener('orientationchange', scheduleSplit);
  }, { once: true });

  void eyebrow;
};
