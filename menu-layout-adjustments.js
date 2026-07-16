(() => {
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

    .menu-mobile-sticky {
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

      /* A single sticky proxy spans the full menu list. Individual category
         headings stay in flow only as layout placeholders, so they cannot be
         pushed downward by the end boundary of their own section. */
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
        transition: none;
      }
    }
  `;
  document.head.append(style);

  const menuRoot = document.querySelector('[data-menu-root]');
  const menuGroups = document.querySelector('[data-menu-groups]');
  if (!menuRoot || !menuGroups) return;

  let proxy = null;
  let proxyTitle = null;
  let proxyQuantity = null;
  let stateObserver = null;
  let contentObserver = null;

  const disconnect = () => {
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

    const inner = document.createElement('div');
    inner.className = 'menu-mobile-sticky__inner';

    proxyTitle = document.createElement('span');
    proxyTitle.className = 'menu-mobile-sticky__title';

    proxyQuantity = document.createElement('span');
    proxyQuantity.className = 'menu-mobile-sticky__quantity';

    inner.append(proxyTitle, proxyQuantity);
    proxy.append(inner);
    menuGroups.prepend(proxy);
  };

  const syncProxy = () => {
    const groups = getGroups();
    if (!groups.length || !proxy) return;

    const activeId = menuRoot.dataset.activeMenu || groups[0].dataset.menuGroup;
    const activeGroup = groups.find((group) => group.dataset.menuGroup === activeId) || groups[0];
    const heading = activeGroup.querySelector('.menu-group__heading');
    const title = heading?.querySelector('.menu-group__title')?.textContent?.trim() || '';
    const quantity = heading?.querySelector('.menu-group__quantity')?.textContent?.trim() || '';

    if (proxyTitle.textContent !== title) proxyTitle.textContent = title;
    if (proxyQuantity.textContent !== quantity) proxyQuantity.textContent = quantity;

    proxy.classList.toggle('is-overlapping', Boolean(heading?.classList.contains('is-overlapping')));
    proxy.classList.toggle('is-ready', Boolean(title));
  };

  const install = () => {
    const groups = getGroups();
    if (!groups.length) return false;

    ensureProxy();
    disconnect();

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
