(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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

      /* One proxy spans the complete menu, avoiding the end-of-section push
         that affected individual sticky headings. */
      .menu-mobile-sticky {
        position: sticky;
        z-index: 10;
        top: 0;
        display: block;
        height: 0;
        overflow: visible;
        pointer-events: none;
      }

      .menu-mobile-sticky__inner {
        position: relative;
        isolation: isolate;
        display: flex;
        align-items: baseline;
        gap: 10px;
        width: 100%;
        padding: 16px 0 22px;
        opacity: 0;
        transform: translate3d(0, 0, 0);
        transition: opacity 120ms ease-out;
      }

      .menu-mobile-sticky.is-ready .menu-mobile-sticky__inner {
        opacity: 1;
      }

      .menu-mobile-sticky__inner::before {
        content: "";
        position: absolute;
        z-index: -1;
        top: 0;
        right: -16px;
        bottom: -58px;
        left: -16px;
        opacity: 0;
        pointer-events: none;
        background: linear-gradient(
          180deg,
          #000 0%,
          rgba(0, 0, 0, .99) 46%,
          rgba(0, 0, 0, .92) 62%,
          rgba(0, 0, 0, .68) 78%,
          rgba(0, 0, 0, .28) 91%,
          rgba(0, 0, 0, 0) 100%
        );
        transition: opacity 150ms ease-out;
      }

      .menu-mobile-sticky.is-overlapping .menu-mobile-sticky__inner::before {
        opacity: 1;
      }

      .menu-mobile-sticky__title {
        color: #fff;
        font-size: clamp(58px, 17vw, 86px);
        font-weight: 500;
        line-height: .78;
        letter-spacing: -.072em;
        text-transform: uppercase;
        text-shadow: 0 0 3px rgba(255,255,255,.55), 0 0 15px rgba(255,255,255,.13);
        white-space: nowrap;
      }

      .menu-mobile-sticky__quantity {
        color: rgba(255,255,255,.82);
        font-size: clamp(16px, 5vw, 24px);
        font-weight: 500;
        line-height: 1;
        letter-spacing: -.055em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .menu-mobile-sticky__quantity:empty {
        display: none;
      }

      .menu-group__heading {
        position: relative !important;
        top: auto !important;
        z-index: 1 !important;
        visibility: hidden;
        opacity: 0 !important;
        transform: none !important;
        pointer-events: none;
      }

      .menu-group__heading::before {
        display: none !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menu-mobile-sticky__inner,
      .menu-mobile-sticky__inner::before {
        transition-duration: 100ms;
      }
    }
  `;
  document.head.append(style);

  const menuRoot = document.querySelector('[data-menu-root]');
  const menuGroups = document.querySelector('[data-menu-groups]');
  const menuIntroHeading = document.querySelector('.menu-section__intro h2');
  if (!menuRoot || !menuGroups) return;

  let proxy = null;
  let proxyInner = null;
  let proxyTitle = null;
  let proxyQuantity = null;
  let stateObserver = null;
  let contentObserver = null;
  let revealObserver = null;
  let swapAnimation = null;
  let swapGeneration = 0;

  const disconnectStateObservers = () => {
    stateObserver?.disconnect();
    contentObserver?.disconnect();
    stateObserver = null;
    contentObserver = null;
  };

  const getGroups = () => Array.from(menuGroups.querySelectorAll('[data-menu-group]'));

  const ensureProxy = () => {
    if (proxy) return;

    proxy = document.createElement('div');
    proxy.className = 'menu-mobile-sticky';
    proxy.setAttribute('aria-hidden', 'true');

    proxyInner = document.createElement('div');
    proxyInner.className = 'menu-mobile-sticky__inner';

    proxyTitle = document.createElement('span');
    proxyTitle.className = 'menu-mobile-sticky__title';

    proxyQuantity = document.createElement('span');
    proxyQuantity.className = 'menu-mobile-sticky__quantity';

    proxyInner.append(proxyTitle, proxyQuantity);
    proxy.append(proxyInner);
    menuGroups.prepend(proxy);
  };

  const setProxyText = (title, quantity) => {
    proxyTitle.textContent = title;
    proxyQuantity.textContent = quantity;
  };

  const animateProxySwap = (title, quantity) => {
    const currentTitle = proxyTitle.textContent;
    const currentQuantity = proxyQuantity.textContent;
    if (currentTitle === title && currentQuantity === quantity) return;

    const firstRender = !proxy.classList.contains('is-ready') || !currentTitle;
    if (firstRender || typeof proxyInner.animate !== 'function') {
      swapAnimation?.cancel();
      setProxyText(title, quantity);
      return;
    }

    swapAnimation?.cancel();
    const generation = ++swapGeneration;
    const outDuration = reducedMotion.matches ? 60 : 80;
    const inDuration = reducedMotion.matches ? 90 : 130;
    const travel = reducedMotion.matches ? 3 : 6;

    const outgoing = proxyInner.animate([
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      { opacity: 0, transform: `translate3d(0, -${travel}px, 0)` }
    ], {
      duration: outDuration,
      easing: 'ease-out',
      fill: 'forwards'
    });
    swapAnimation = outgoing;

    outgoing.finished
      .then(() => {
        if (generation !== swapGeneration) return;
        setProxyText(title, quantity);

        const incoming = proxyInner.animate([
          { opacity: 0, transform: `translate3d(0, ${travel}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], {
          duration: inDuration,
          easing: easeOut,
          fill: 'forwards'
        });
        swapAnimation = incoming;
        return incoming.finished;
      })
      .then(() => {
        if (generation !== swapGeneration) return;
        swapAnimation = null;
        proxyInner.style.opacity = '';
        proxyInner.style.transform = '';
      })
      .catch(() => undefined);
  };

  const syncProxy = () => {
    const groups = getGroups();
    if (!groups.length || !proxy) return;

    const activeId = menuRoot.dataset.activeMenu || groups[0].dataset.menuGroup;
    const activeGroup = groups.find((group) => group.dataset.menuGroup === activeId) || groups[0];
    const heading = activeGroup.querySelector('.menu-group__heading');
    const title = heading?.querySelector('.menu-group__title')?.textContent?.trim() || '';
    const quantity = heading?.querySelector('.menu-group__quantity')?.textContent?.trim() || '';

    animateProxySwap(title, quantity);
    proxy.classList.toggle('is-overlapping', Boolean(heading?.classList.contains('is-overlapping')));
    proxy.classList.toggle('is-ready', Boolean(title));
  };

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

  const install = () => {
    const groups = getGroups();
    if (!groups.length) return false;

    ensureProxy();
    disconnectStateObservers();

    stateObserver = new MutationObserver(syncProxy);
    stateObserver.observe(menuRoot, {
      attributes: true,
      attributeFilter: ['data-active-menu']
    });

    groups.forEach((group) => {
      const heading = group.querySelector('.menu-group__heading');
      if (heading) {
        stateObserver.observe(heading, {
          attributes: true,
          attributeFilter: ['class']
        });
      }
    });

    setupScrollReveals(groups);
    syncProxy();
    return true;
  };

  if (!install()) {
    contentObserver = new MutationObserver(() => {
      if (install()) contentObserver?.disconnect();
    });
    contentObserver.observe(menuGroups, { childList: true, subtree: true });
  }
})();
