(() => {
  const dock = document.querySelector('.booking-dock');
  const heroTitle = document.querySelector('.title-lockup');

  if (!dock || !heroTitle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resolved = false;
  let observer = null;

  const disconnect = () => {
    observer?.disconnect();
    observer = null;
  };

  const finishReveal = () => {
    resolved = true;
    disconnect();
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
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'both'
    });

    animation.addEventListener('finish', () => {
      dock.style.opacity = '1';
      dock.style.translate = '0 0';
      dock.style.scale = '1';
      dock.style.willChange = '';
      animation.cancel();
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
    if (event.target === dock && event.animationName === 'stage-dock-in') {
      finishReveal();
    }
  });

  const activeDockAnimation = dock.getAnimations().some(
    (animation) => animation.playState === 'running' || animation.playState === 'pending'
  );

  if (!activeDockAnimation && Number.parseFloat(getComputedStyle(dock).opacity) >= 0.99) {
    finishReveal();
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
