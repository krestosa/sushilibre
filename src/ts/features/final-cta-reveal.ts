import { query, queryAll } from '../shared/dom';

const TITLE_TEXT = '¿ESTÁS PREPARADO?';
const LINE_TOP_TOLERANCE_PX = 3;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

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
      mask.style.display = 'inline-block';
      mask.style.overflow = 'hidden';
      mask.style.verticalAlign = 'baseline';
      word.style.display = 'inline-block';
      word.textContent = token;
      mask.append(word);
      fragment.append(mask);
    });

    node.replaceWith(fragment);
  });
};

const settle = (element: HTMLElement): void => {
  element.style.opacity = '1';
  element.style.transform = 'none';
};

const animateIn = (element: HTMLElement, distance: number, duration: number, delay = 0): void => {
  const animation = element.animate([
    { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
    { opacity: 1, transform: 'translate3d(0, 0, 0)' }
  ], {
    duration,
    delay,
    easing: EASE_OUT,
    fill: 'forwards'
  });

  animation.onfinish = () => {
    settle(element);
    animation.cancel();
  };
};

export const setupFinalCtaReveal = (): void => {
  const root = query<HTMLElement>('.menu-final-cta');
  if (!root) return;

  const copy = query<HTMLElement>('.menu-final-cta__copy', root);
  const title = query<HTMLElement>('.menu-final-cta__title', root);
  const text = query<HTMLElement>('.menu-final-cta__text', root);
  const eyebrow = query<HTMLElement>('.menu-final-cta__eyebrow', root);
  const action = query<HTMLElement>('.menu-final-cta__action', root);
  if (!copy || !title || !text || !action) return;

  title.textContent = TITLE_TEXT;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const originalText = text.innerHTML;
  let resizeTimer = 0;
  let revealed = false;

  const applyLayout = (): void => {
    const mobile = window.innerWidth <= 720;
    const compact = window.innerWidth <= 1100;

    root.style.background = '#050505';
    root.style.gridTemplateColumns = '1fr';
    root.style.gridTemplateRows = 'auto auto';
    root.style.alignContent = 'start';
    root.style.alignItems = 'start';
    root.style.rowGap = mobile ? '22px' : 'clamp(24px, 3vh, 34px)';
    root.style.setProperty('--cta-content-inset', mobile ? '0px' : compact ? 'clamp(0px, 10vw, 96px)' : 'clamp(0px, 18vw, 320px)');
    root.style.setProperty('--cta-main-top', mobile ? '58px' : compact ? 'clamp(68px, 7vh, 84px)' : 'clamp(72px, 8vh, 96px)');
    root.style.display = mobile ? 'flex' : 'grid';
    if (mobile) {
      root.style.flexDirection = 'column';
      root.style.alignItems = 'stretch';
    }

    copy.style.width = mobile ? '100%' : 'calc(100% - var(--cta-content-inset))';
    copy.style.marginLeft = mobile ? '0' : 'var(--cta-content-inset)';
    copy.style.paddingTop = 'var(--cta-main-top)';

    title.style.maxWidth = mobile ? '7.8ch' : 'none';
    title.style.fontSize = mobile ? 'clamp(64px, 19vw, 92px)' : compact ? 'clamp(82px, 12vw, 132px)' : 'clamp(104px, 11.4vw, 214px)';
    title.style.lineHeight = mobile ? '0.76' : '0.75';
    title.style.letterSpacing = '-0.018em';
    title.style.whiteSpace = mobile ? 'normal' : 'nowrap';

    text.style.maxWidth = mobile ? '34ch' : '55ch';
    text.style.marginTop = mobile ? '18px' : 'clamp(22px, 2vw, 30px)';
    text.style.fontSize = mobile ? 'clamp(13px, 3.7vw, 16px)' : 'clamp(15px, 1.1vw, 20px)';
    text.style.lineHeight = mobile ? '1.17' : '1.14';

    action.style.justifySelf = 'start';
    action.style.alignSelf = 'start';
    action.style.width = mobile ? 'min(100%, 320px)' : 'clamp(220px, 17vw, 292px)';
    action.style.minHeight = mobile ? '68px' : 'clamp(72px, 5.4vw, 88px)';
    action.style.margin = mobile ? '0' : '0 0 0 var(--cta-content-inset)';
    action.style.padding = mobile ? '16px 22px' : '18px 28px';
    action.style.background = 'var(--orange)';
    action.style.border = '1px solid rgba(255, 255, 255, 0.16)';
    action.style.borderRadius = '6px';
    action.style.boxShadow = '0 12px 30px rgba(var(--orange-rgb), 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
    action.style.fontSize = mobile ? 'clamp(27px, 8vw, 36px)' : 'clamp(24px, 2vw, 36px)';
  };

  const splitLines = (): void => {
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

      const word = query<HTMLElement>('.final-cta-line-word', mask);
      if (!word) return;
      word.dataset.finalCtaLine = String(lineIndex);
      if (revealed || reducedMotion.matches) settle(word);
      else {
        word.style.opacity = '0';
        word.style.transform = 'translate3d(0, 112%, 0)';
      }
    });
  };

  const prepare = (): void => {
    applyLayout();
    splitLines();
    if (!revealed && !reducedMotion.matches) {
      [eyebrow, title, action].forEach((element) => {
        if (!element) return;
        element.style.opacity = '0';
        element.style.transform = `translate3d(0, ${element === title ? 46 : 14}px, 0)`;
      });
    }
  };

  const reveal = (): void => {
    if (revealed) return;
    revealed = true;

    if (reducedMotion.matches) {
      [eyebrow, title, action, ...queryAll<HTMLElement>('.final-cta-line-word', text)].forEach((element) => {
        if (element) settle(element);
      });
      return;
    }

    if (eyebrow) animateIn(eyebrow, 14, 460, 0);
    animateIn(title, 46, 760, 40);

    queryAll<HTMLElement>('.final-cta-line-word', text).forEach((word) => {
      const line = Number.parseInt(word.dataset.finalCtaLine ?? '0', 10) || 0;
      animateIn(word, Math.max(12, word.getBoundingClientRect().height * 1.12), 680, 150 + line * 58);
    });

    animateIn(action, 14, 460, 250);
  };

  const schedulePrepare = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(prepare, 110);
  };

  prepare();
  window.addEventListener('resize', schedulePrepare, { passive: true });
  window.addEventListener('orientationchange', schedulePrepare, { passive: true });
  document.fonts.ready.then(schedulePrepare).catch(() => undefined);

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
    window.removeEventListener('resize', schedulePrepare);
    window.removeEventListener('orientationchange', schedulePrepare);
  }, { once: true });
};
