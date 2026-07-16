(() => {
  const dock = document.querySelector('.booking-dock');
  const heroTitle = document.querySelector('.title-lockup');

  if (!dock || !heroTitle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = 'cubic-bezier(.22, 1, .36, 1)';
  let resolved = false;
  let observer = null;
  let contentRevealed = false;

  const metadata = Array.from(dock.querySelectorAll('.booking-dock__meta'));
  const countdownUnits = Array.from(dock.querySelectorAll('.countdown__unit'));
  const ctaLabel = dock.querySelector('.booking-dock__cta > span');
  const revealTargets = [
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

  const disconnect = () => {
    observer?.disconnect();
    observer = null;
  };

  const revealDockContent = ({ fast = false } = {}) => {
    if (contentRevealed) return;
    contentRevealed = true;

    const baseDuration = reducedMotion.matches ? 120 : fast ? 170 : 230;
    const stagger = reducedMotion.matches ? 0 : fast ? 22 : 34;
    const distance = reducedMotion.matches ? 2 : fast ? 4 : 6;

    revealTargets.forEach(({ element, order }) => {
      if (typeof element.animate !== 'function') {
        element.style.opacity = '1';
        element.style.transform = 'translate3d(0, 0, 0)';
        return;
      }

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

  const finishReveal = ({ fast = false } = {}) => {
    resolved = true;
    disconnect();
    revealDockContent({ fast });
  };

  const revealImmediately = () => {
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

    if (reducedMotion.matches || typeof dock.animate !== 'function') {
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

  const titleIsOutsideViewport = () => {
    const rect = heroTitle.getBoundingClientRect();
    return rect.bottom <= 0 || rect.top >= window.innerHeight;
  };

  const prioritizeWhenNeeded = () => {
    if (!resolved && window.scrollY > 0 && titleIsOutsideViewport()) {
      revealImmediately();
    }
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
    (animation) => animation.playState === 'running' || animation.playState === 'pending'
  );

  if (!activeDockAnimation && Number.parseFloat(getComputedStyle(dock).opacity) >= 0.99) {
    finishReveal({ fast: true });
    return;
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && window.scrollY > 0) revealImmediately();
    }, { threshold: 0 });
    observer.observe(heroTitle);
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
})();
