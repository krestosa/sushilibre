import { query, queryAll } from './shared/dom';

type RevealType = 'intro' | 'item';

interface RevealCandidate {
  element: HTMLElement;
  type: RevealType;
  delay: number;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = window.matchMedia('(max-width: 720px)');
const easeOut = 'cubic-bezier(.22, 1, .36, 1)';
const menuGroups = query<HTMLElement>('[data-menu-groups]');
const menuIntroHeading = query<HTMLElement>('.menu-section__intro h2');

if (menuGroups) {
  query<HTMLElement>('.menu-mobile-sticky')?.remove();

  let revealObserver: IntersectionObserver | null = null;
  let exitObservers: IntersectionObserver[] = [];
  let resizeFrame = 0;

  const groups = queryAll<HTMLElement>('[data-menu-group]', menuGroups);

  const animateOnce = (
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ): void => {
    const animation = element.animate(keyframes, {
      fill: 'both',
      ...options
    });

    animation.addEventListener('finish', () => {
      element.style.opacity = '1';
      element.style.transform = 'translate3d(0, 0, 0)';
      animation.cancel();
    }, { once: true });
  };

  const setupScrollReveals = (): void => {
    revealObserver?.disconnect();
    revealObserver = null;
    if (!('IntersectionObserver' in window)) return;

    const candidates: RevealCandidate[] = [];
    if (menuIntroHeading && !menuIntroHeading.dataset.motionReady) {
      menuIntroHeading.dataset.motionReady = 'true';
      candidates.push({ element: menuIntroHeading, type: 'intro', delay: 0 });
    }

    groups.forEach((group) => {
      queryAll<HTMLElement>('.menu-item', group).slice(0, 3).forEach((item, index) => {
        if (item.dataset.motionReady) return;
        item.dataset.motionReady = 'true';
        candidates.push({
          element: item,
          type: 'item',
          delay: reducedMotion.matches ? 0 : index * 40
        });
      });
    });

    if (!candidates.length) return;

    const candidateByElement = new Map<HTMLElement, RevealCandidate>();
    candidates.forEach((candidate) => {
      candidateByElement.set(candidate.element, candidate);
      candidate.element.style.opacity = '0';
      candidate.element.style.transform = reducedMotion.matches
        ? 'translate3d(0, 3px, 0)'
        : candidate.type === 'intro'
          ? 'translate3d(0, 14px, 0)'
          : 'translate3d(0, 8px, 0)';
    });

    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        const candidate = candidateByElement.get(element);
        if (!candidate) return;

        observer.unobserve(element);
        const isIntro = candidate.type === 'intro';
        const duration = reducedMotion.matches ? 150 : isIntro ? 360 : 260;
        const distance = reducedMotion.matches ? 3 : isIntro ? 14 : 8;

        animateOnce(element, [
          { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], {
          duration,
          delay: candidate.delay,
          easing: easeOut
        });
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.08
    });

    candidates.forEach(({ element }) => revealObserver?.observe(element));
  };

  const disconnectExitObservers = (): void => {
    exitObservers.forEach((observer) => observer.disconnect());
    exitObservers = [];
    groups.forEach((group) => {
      query<HTMLElement>('.menu-group__heading', group)?.classList.remove('is-leaving');
    });
  };

  const setupStickyExitAnimations = (): void => {
    disconnectExitObservers();
    if (!mobileQuery.matches || !('IntersectionObserver' in window)) return;

    groups.forEach((group) => {
      const heading = query<HTMLElement>('.menu-group__heading', group);
      const sentinel = query<HTMLElement>('.menu-group__exit-sentinel', group);
      if (!heading || !sentinel) return;

      const headingHeight = Math.ceil(heading.getBoundingClientRect().height);
      const preExitBuffer = Math.max(12, Math.min(22, Math.round(window.innerHeight * 0.018)));
      const handoffLine = headingHeight + preExitBuffer;
      const bottomMargin = Math.max(0, window.innerHeight - handoffLine - 1);

      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const leaving = entry.boundingClientRect.top <= handoffLine;
        heading.classList.toggle('is-leaving', leaving);
      }, {
        root: null,
        rootMargin: `-${handoffLine}px 0px -${bottomMargin}px 0px`,
        threshold: 0
      });

      observer.observe(sentinel);
      exitObservers.push(observer);
    });
  };

  const scheduleStickySetup = (): void => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      setupStickyExitAnimations();
    });
  };

  if (groups.length) {
    setupScrollReveals();
    setupStickyExitAnimations();
  }

  mobileQuery.addEventListener('change', scheduleStickySetup);
  window.addEventListener('resize', scheduleStickySetup, { passive: true });
  document.fonts.ready.then(scheduleStickySetup).catch(() => undefined);
}
