(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 720px)');
  const easeOut = 'cubic-bezier(.22, 1, .36, 1)';

  const style = document.createElement('style');
  style.dataset.menuLayoutAdjustments = '';
  style.textContent = `
    .menu-section__intro h2 {
      font-size: clamp(42px, 5.6vw, 88px) !important;
      line-height: .84;
      letter-spacing: -.065em;
    }

    .menu-group + .menu-group {
      margin-top: 5vh !important;
    }

    .menu-group__exit-sentinel {
      display: none;
    }

    @media (max-width: 980px) {
      .menu-section__intro h2 {
        font-size: clamp(40px, 6.2vw, 62px) !important;
      }
    }

    @media (max-width: 720px) {
      .menu-section__intro h2 {
        font-size: clamp(38px, 12vw, 54px) !important;
      }

      .menu-group + .menu-group {
        margin-top: 5vh !important;
      }

      .menu-group__heading {
        position: sticky !important;
        z-index: 10 !important;
        top: 0 !important;
        visibility: visible !important;
        opacity: .62 !important;
        transform: translate3d(0, 0, 0) !important;
        pointer-events: none;
        transition:
          opacity 150ms ease-out,
          transform 170ms ${easeOut} !important;
      }

      .menu-group.is-active .menu-group__heading {
        opacity: 1 !important;
      }

      .menu-group__heading.is-overlapping::before {
        opacity: 1 !important;
      }

      .menu-group__heading.is-leaving,
      .menu-group.is-active .menu-group__heading.is-leaving {
        opacity: 0 !important;
        transform: translate3d(0, -6px, 0) !important;
      }

      .menu-group__heading.is-leaving::before,
      .menu-group.is-active .menu-group__heading.is-overlapping.is-leaving::before {
        opacity: 0 !important;
      }

      .menu-group__exit-sentinel {
        display: block;
        width: 1px;
        height: 1px;
        margin-top: -1px;
        pointer-events: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menu-group__heading {
        transition-duration: 100ms !important;
      }

      .menu-group__heading.is-leaving,
      .menu-group.is-active .menu-group__heading.is-leaving {
        transform: translate3d(0, -2px, 0) !important;
      }
    }
  `;
  document.head.append(style);

  const menuGroups = document.querySelector('[data-menu-groups]');
  const menuIntroHeading = document.querySelector('.menu-section__intro h2');
  if (!menuGroups) return;

  document.querySelector('.menu-mobile-sticky')?.remove();

  let contentObserver = null;
  let revealObserver = null;
  let exitObservers = [];
  let resizeFrame = 0;

  const getGroups = () => Array.from(menuGroups.querySelectorAll('[data-menu-group]'));

  const animateOnce = (element, keyframes, options) => {
    if (!element || typeof element.animate !== 'function') return;

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

  const setupScrollReveals = (groups) => {
    revealObserver?.disconnect();
    revealObserver = null;

    if (!('IntersectionObserver' in window)) return;

    const candidates = [];
    if (menuIntroHeading && !menuIntroHeading.dataset.motionReady) {
      menuIntroHeading.dataset.motionReady = 'true';
      candidates.push({ element: menuIntroHeading, type: 'intro', delay: 0 });
    }

    groups.forEach((group) => {
      const leadingItems = Array.from(group.querySelectorAll('.menu-item')).slice(0, 3);
      leadingItems.forEach((item, index) => {
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

    const candidateByElement = new Map();
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

        const candidate = candidateByElement.get(entry.target);
        if (!candidate) return;

        observer.unobserve(entry.target);
        const isIntro = candidate.type === 'intro';
        const duration = reducedMotion.matches ? 150 : isIntro ? 360 : 260;
        const distance = reducedMotion.matches ? 3 : isIntro ? 14 : 8;

        animateOnce(entry.target, [
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
      threshold: .08
    });

    candidates.forEach(({ element }) => revealObserver.observe(element));
  };

  const disconnectExitObservers = (groups) => {
    exitObservers.forEach((observer) => observer.disconnect());
    exitObservers = [];
    groups.forEach((group) => {
      group.querySelector('.menu-group__heading')?.classList.remove('is-leaving');
    });
  };

  const setupStickyExitAnimations = (groups) => {
    disconnectExitObservers(groups);
    if (!mobileQuery.matches || !('IntersectionObserver' in window)) return;

    groups.forEach((group) => {
      const heading = group.querySelector('.menu-group__heading');
      const items = group.querySelector('.menu-group__items');
      if (!heading || !items) return;

      let sentinel = group.querySelector('.menu-group__exit-sentinel');
      if (!sentinel) {
        sentinel = document.createElement('span');
        sentinel.className = 'menu-group__exit-sentinel';
        sentinel.setAttribute('aria-hidden', 'true');
        group.append(sentinel);
      }

      const headingHeight = Math.ceil(heading.getBoundingClientRect().height);
      const exitLead = reducedMotion.matches ? 8 : 24;
      const observer = new IntersectionObserver(([entry]) => {
        const leaving =
          !entry.isIntersecting &&
          entry.boundingClientRect.top <= headingHeight + exitLead;
        heading.classList.toggle('is-leaving', leaving);
      }, {
        rootMargin: `-${headingHeight + exitLead}px 0px 0px 0px`,
        threshold: 0
      });

      observer.observe(sentinel);
      exitObservers.push(observer);
    });
  };

  const scheduleStickySetup = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      setupStickyExitAnimations(getGroups());
    });
  };

  const install = () => {
    const groups = getGroups();
    if (!groups.length) return false;

    setupScrollReveals(groups);
    setupStickyExitAnimations(groups);
    return true;
  };

  if (!install()) {
    contentObserver = new MutationObserver(() => {
      if (install()) contentObserver?.disconnect();
    });
    contentObserver.observe(menuGroups, { childList: true, subtree: true });
  }

  mobileQuery.addEventListener?.('change', scheduleStickySetup);
  window.addEventListener('resize', scheduleStickySetup, { passive: true });
  document.fonts?.ready.then(scheduleStickySetup).catch(() => undefined);
})();
