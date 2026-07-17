import { query, queryAll } from '../shared/dom';

const MOBILE_DOCK_QUERY = '(max-width: 820px)';
const VIEWPORT_SETTLE_DURATION = 900;
const VIEWPORT_EPSILON = 0.1;

export const setupBookingDockLayout = (): void => {
  const dock = query<HTMLElement>('.booking-dock');
  const metadata = queryAll<HTMLElement>('.booking-dock__meta');
  const countdown = query<HTMLElement>('.countdown');
  const cta = query<HTMLElement>('.booking-dock__cta');
  const firstMeta = metadata[0];
  const secondMeta = metadata[1];

  if (!dock || !firstMeta || !secondMeta || !countdown || !cta) return;

  const mobileDock = window.matchMedia(MOBILE_DOCK_QUERY);
  const visualViewport = window.visualViewport;
  let stacked: boolean | null = null;
  let layoutFrame = 0;
  let viewportFrame = 0;
  let viewportPollUntil = 0;
  let viewportModeActive = false;
  let lastViewportHeight = -1;
  let lastViewportOffsetTop = -1;

  const clearResponsiveStyles = (): void => {
    dock.style.gridTemplateColumns = '';
    dock.style.gridTemplateRows = '';
    dock.style.rowGap = '';

    metadata.forEach((item) => {
      item.style.gridColumn = '';
      item.style.gridRow = '';
      item.style.padding = '';
    });

    countdown.style.gridColumn = '';
    countdown.style.gridRow = '';
    cta.style.gridColumn = '';
    cta.style.gridRow = '';
  };

  const applyStackedLayout = (): void => {
    dock.style.gridTemplateColumns = 'minmax(148px, 1.25fr) minmax(0, 2.4fr) 104px';
    dock.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
    dock.style.rowGap = '0';

    firstMeta.style.gridColumn = '1';
    firstMeta.style.gridRow = '1';
    secondMeta.style.gridColumn = '1';
    secondMeta.style.gridRow = '2';
    metadata.forEach((item) => {
      item.style.padding = '0 8px';
    });

    countdown.style.gridColumn = '2';
    countdown.style.gridRow = '1 / span 2';
    cta.style.gridColumn = '3';
    cta.style.gridRow = '1 / span 2';
  };

  const syncLayout = (): void => {
    const shouldStack = window.matchMedia('(min-width: 621px)').matches && dock.clientWidth < 760;
    if (shouldStack !== stacked) {
      stacked = shouldStack;
      if (shouldStack) applyStackedLayout();
      else clearResponsiveStyles();
    }

    scheduleViewportSync(false);
  };

  const scheduleLayoutSync = (): void => {
    if (layoutFrame) return;
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = 0;
      syncLayout();
    });
  };

  const clearViewportPositioning = (): void => {
    if (!viewportModeActive) return;

    viewportModeActive = false;
    lastViewportHeight = -1;
    lastViewportOffsetTop = -1;
    dock.style.removeProperty('--dock-visual-height');
    dock.style.removeProperty('--dock-visual-offset-top');
    dock.style.position = '';
    dock.style.top = '';
    dock.style.right = '';
    dock.style.bottom = '';
    dock.style.left = '';
    dock.style.margin = '';
    dock.style.transform = '';
    dock.style.willChange = '';
  };

  const applyViewportPositioning = (): void => {
    if (!viewportModeActive) {
      viewportModeActive = true;
      dock.style.position = 'fixed';
      dock.style.top = '0';
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
      dock.style.left = '50%';
      dock.style.margin = '0';
      dock.style.transform = 'translate3d(-50%, calc(var(--dock-visual-offset-top) + var(--dock-visual-height) - var(--dock-height) - var(--dock-bottom)), 0)';
      dock.style.willChange = 'transform';
    }

    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportOffsetTop = visualViewport?.offsetTop ?? 0;

    if (Math.abs(viewportHeight - lastViewportHeight) >= VIEWPORT_EPSILON) {
      lastViewportHeight = viewportHeight;
      dock.style.setProperty('--dock-visual-height', `${viewportHeight.toFixed(3)}px`);
    }

    if (Math.abs(viewportOffsetTop - lastViewportOffsetTop) >= VIEWPORT_EPSILON) {
      lastViewportOffsetTop = viewportOffsetTop;
      dock.style.setProperty('--dock-visual-offset-top', `${viewportOffsetTop.toFixed(3)}px`);
    }
  };

  const syncViewportDock = (): void => {
    viewportFrame = 0;

    if (!mobileDock.matches) {
      clearViewportPositioning();
      return;
    }

    applyViewportPositioning();

    if (performance.now() < viewportPollUntil) {
      viewportFrame = window.requestAnimationFrame(syncViewportDock);
    }
  };

  function scheduleViewportSync(keepPolling = true): void {
    if (keepPolling) {
      viewportPollUntil = Math.max(
        viewportPollUntil,
        performance.now() + VIEWPORT_SETTLE_DURATION
      );
    }

    if (viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(syncViewportDock);
  }

  const scheduleInteractionSync = (): void => {
    scheduleViewportSync(true);
  };

  syncLayout();
  scheduleViewportSync(true);

  window.addEventListener('resize', () => {
    scheduleLayoutSync();
    scheduleViewportSync(true);
  }, { passive: true });
  window.addEventListener('scroll', scheduleInteractionSync, { passive: true });
  window.addEventListener('orientationchange', scheduleInteractionSync, { passive: true });
  window.addEventListener('pageshow', scheduleInteractionSync, { passive: true });
  window.addEventListener('touchstart', scheduleInteractionSync, { passive: true });
  window.addEventListener('touchmove', scheduleInteractionSync, { passive: true });
  window.addEventListener('touchend', scheduleInteractionSync, { passive: true });

  visualViewport?.addEventListener('resize', scheduleInteractionSync, { passive: true });
  visualViewport?.addEventListener('scroll', scheduleInteractionSync, { passive: true });
  mobileDock.addEventListener('change', () => {
    scheduleLayoutSync();
    scheduleViewportSync(true);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleViewportSync(true);
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      scheduleLayoutSync();
      scheduleViewportSync(true);
    });
    observer.observe(dock);
  }

  document.fonts.ready.then(() => {
    scheduleLayoutSync();
    scheduleViewportSync(true);
  }).catch(() => undefined);
};
