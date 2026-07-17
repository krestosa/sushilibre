import { query, queryAll } from './shared/dom';

interface RevealTarget {
  element: HTMLElement;
  order: number;
}

const dock = query<HTMLElement>('.booking-dock');
const heroTitle = query<HTMLElement>('.title-lockup');

if (dock && heroTitle) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsIntersectionObserver = typeof globalThis.IntersectionObserver === 'function';
  const easeOut = 'cubic-bezier(.22, 1, .36, 1)';
  let resolved = false;
  let observer: IntersectionObserver | null = null;
  let contentRevealed = false;

  const metadata = queryAll<HTMLElement>('.booking-dock__meta', dock);
  const countdownUnits = queryAll<HTMLElement>('.countdown__unit', dock);
  const ctaLabel = query<HTMLElement>('.booking-dock__cta > span', dock);
  const revealTargets: RevealTarget[] = [
    ...metadata.map((element, index) => ({ element, order: index })),
    ...countdownUnits.map((element, index) => ({ element, order: metadata.length + index })),
    ...(ctaLabel ? [{ element: ctaLabel, order: metadata.length + countdownUnits.length }] : [])
  ];

  revealTargets.forEach(({ element }) => {
    element.style.opacity = '0';
    element.style.transform = reducedMotion.matches
      ? 'translate3d(0, 2px, 0)'
      : 'translate3d(0, 6px, 0)';
  });

  const disconnect = (): void => {
    observer?.disconnect();
    observer = null;
  };

  const revealDockContent = ({ fast = false }: { fast?: boolean } = {}): void => {
    if (contentRevealed) return;
    contentRevealed = true;

    const baseDuration = reducedMotion.matches ? 120 : fast ? 170 : 230;
    const stagger = reducedMotion.matches ? 0 : fast ? 22 : 34;
    const distance = reducedMotion.matches ? 2 : fast ? 4 : 6;

    revealTargets.forEach(({ element, order }) => {
      const animation = element.animate([
        { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], {
        duration: baseDuration,
        delay: order * stagger,
        easing: easeOut,
        fill: 'both'
      });

      animation.addEventListener('finish', () => {
        element.style.opacity = '1';
        element.style.transform = 'translate3d(0, 0, 0)';
        animation.cancel();
      }, { once: true });
    });
  };

  const finishReveal = ({ fast = false }: { fast?: boolean } = {}): void => {
    resolved = true;
    disconnect();
    revealDockContent({ fast });
  };

  const revealImmediately = (): void => {
    if (resolved) return;
    resolved = true;
    disconnect();

    const computed = window.getComputedStyle(dock);
    const startOpacity = Number.parseFloat(computed.opacity);
    const startTranslate = computed.translate === 'none' ? '0 8px' : computed.translate;
    const startScale = computed.scale === 'none' ? '0.992' : computed.scale;

    dock.style.opacity = Number.isFinite(startOpacity) ? String(startOpacity) : '0';
    dock.style.translate = startTranslate;
    dock.style.scale = startScale;
    dock.style.willChange = 'opacity, translate, scale';
    dock.getAnimations().forEach((animation) => animation.cancel());

    if (reducedMotion.matches) {
      dock.style.opacity = '1';
      dock.style.translate = '0 0';
      dock.style.scale = '1';
      dock.style.willChange = '';
      revealDockContent({ fast: true });
      return;
    }

    const animation = dock.animate([
      {
        opacity: Number.isFinite(startOpacity) ? startOpacity : 0,
        translate: startTranslate,
        scale: startScale
      },
      {
        opacity: 1,
        translate: '0 0',
        scale: 1
      }
    ], {
      duration: 190,
      easing: easeOut,
      fill: 'both'
    });

    animation.addEventListener('finish', () => {
      dock.style.opacity = '1';
      dock.style.translate = '0 0';
      dock.style.scale = '1';
      dock.style.willChange = '';
      animation.cancel();
      revealDockContent({ fast: true });
    }, { once: true });
  };

  const titleIsOutsideViewport = (): boolean => {
    const rect = heroTitle.getBoundingClientRect();
    return rect.bottom <= 0 || rect.top >= window.innerHeight;
  };

  const prioritizeWhenNeeded = (): void => {
    if (!resolved && window.scrollY > 0 && titleIsOutsideViewport()) revealImmediately();
  };

  dock.addEventListener('animationend', (event) => {
    if (
      event.target === dock &&
      (event.animationName === 'dock-in' || event.animationName === 'stage-dock-in')
    ) {
      finishReveal();
    }
  });

  const activeDockAnimation = dock.getAnimations().some(
    (animation) => animation.playState === 'running'
  );

  if (!activeDockAnimation && Number.parseFloat(getComputedStyle(dock).opacity) >= 0.99) {
    finishReveal({ fast: true });
  } else if (supportsIntersectionObserver) {
    const nextObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && !entry.isIntersecting && window.scrollY > 0) revealImmediately();
    }, { threshold: 0 });
    observer = nextObserver;
    nextObserver.observe(heroTitle);
  } else {
    let frameId = 0;
    window.addEventListener('scroll', () => {
      if (frameId || resolved) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        prioritizeWhenNeeded();
      });
    }, { passive: true });
  }

  window.requestAnimationFrame(prioritizeWhenNeeded);
}
