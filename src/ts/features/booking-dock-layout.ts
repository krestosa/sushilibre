import { query, queryAll } from '../shared/dom';

const MOBILE_DOCK_QUERY = '(max-width: 820px)';
const CHROME_TRANSITION_DURATION = 190;
const SCROLL_DIRECTION_THRESHOLD = 0.75;
const TOUCH_DIRECTION_THRESHOLD = 2;
const VIEWPORT_EPSILON = 0.5;
const KEYBOARD_HEIGHT_RATIO = 0.74;

type ViewportUnit = 'svh' | 'lvh' | 'dvh';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const createViewportProbe = (unit: ViewportUnit): HTMLElement | null => {
  if (!CSS.supports('height', `100${unit}`)) return null;

  const probe = document.createElement('i');
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'fixed',
    zIndex: '-2147483648',
    top: '0',
    left: '0',
    width: '0',
    height: `100${unit}`,
    visibility: 'hidden',
    pointerEvents: 'none',
    contain: 'strict'
  });
  document.body.append(probe);
  return probe;
};

const readProbeHeight = (probe: HTMLElement | null, fallback: number): number => {
  const height = probe?.getBoundingClientRect().height ?? 0;
  return Number.isFinite(height) && height > 0 ? height : fallback;
};

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
  const smallViewportProbe = createViewportProbe('svh');
  const largeViewportProbe = createViewportProbe('lvh');
  const dynamicViewportProbe = createViewportProbe('dvh');

  let stacked: boolean | null = null;
  let layoutFrame = 0;
  let chromeFrame = 0;
  let chromeProgress = 0;
  let chromeTarget = 0;
  let chromeTransitionFrom = 0;
  let chromeTransitionStartedAt = 0;
  let smallViewportHeight = window.innerHeight;
  let largeViewportHeight = window.innerHeight;
  let lastDynamicViewportHeight = -1;
  let lastAppliedBottom = -1;
  let viewportModeActive = false;
  let lastScrollY = window.scrollY;
  let lastTouchY: number | null = null;

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

  const clearViewportPositioning = (): void => {
    if (!viewportModeActive) return;

    viewportModeActive = false;
    lastAppliedBottom = -1;
    dock.style.removeProperty('--dock-effective-bottom');
    dock.style.position = '';
    dock.style.top = '';
    dock.style.right = '';
    dock.style.bottom = '';
    dock.style.left = '';
    dock.style.margin = '';
    dock.style.transform = '';
    dock.style.willChange = '';
  };

  const ensureViewportPositioning = (): void => {
    if (viewportModeActive) return;

    viewportModeActive = true;
    dock.style.position = 'fixed';
    dock.style.top = '0';
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
    dock.style.left = '50%';
    dock.style.margin = '0';
    dock.style.transform = 'translate3d(-50%, calc(var(--dock-effective-bottom) - var(--dock-height) - var(--dock-bottom)), 0)';
    dock.style.willChange = 'transform';
  };

  const measureViewportBounds = (acceptDynamicSignal: boolean): void => {
    const visualHeight = visualViewport?.height ?? window.innerHeight;
    const measuredSmall = readProbeHeight(
      smallViewportProbe,
      Math.min(window.innerHeight, visualHeight)
    );
    const measuredLarge = readProbeHeight(
      largeViewportProbe,
      Math.max(window.innerHeight, visualHeight)
    );

    smallViewportHeight = Math.min(measuredSmall, measuredLarge);
    largeViewportHeight = Math.max(measuredSmall, measuredLarge);

    const dynamicHeight = readProbeHeight(
      dynamicViewportProbe,
      Math.min(Math.max(visualHeight, smallViewportHeight), largeViewportHeight)
    );
    const range = largeViewportHeight - smallViewportHeight;

    if (range <= VIEWPORT_EPSILON) {
      chromeProgress = 0;
      chromeTarget = 0;
      lastDynamicViewportHeight = dynamicHeight;
      return;
    }

    if (lastDynamicViewportHeight < 0) {
      const initialProgress = clamp(
        (dynamicHeight - smallViewportHeight) / range,
        0,
        1
      );
      chromeProgress = initialProgress;
      chromeTarget = initialProgress;
      lastDynamicViewportHeight = dynamicHeight;
      return;
    }

    const dynamicChanged = Math.abs(dynamicHeight - lastDynamicViewportHeight) >= VIEWPORT_EPSILON;
    lastDynamicViewportHeight = dynamicHeight;

    if (acceptDynamicSignal && dynamicChanged) {
      const measuredProgress = clamp(
        (dynamicHeight - smallViewportHeight) / range,
        0,
        1
      );
      chromeProgress = measuredProgress;
      chromeTarget = measuredProgress;
      chromeTransitionStartedAt = 0;
    }
  };

  const visualViewportNeedsExactPosition = (): boolean => {
    if (!visualViewport) return false;
    if (Math.abs(visualViewport.scale - 1) > 0.01) return true;
    return visualViewport.height < smallViewportHeight * KEYBOARD_HEIGHT_RATIO;
  };

  const getEffectiveViewportBottom = (): number => {
    if (visualViewportNeedsExactPosition() && visualViewport) {
      return visualViewport.offsetTop + visualViewport.height;
    }

    return smallViewportHeight +
      (largeViewportHeight - smallViewportHeight) * chromeProgress;
  };

  const applyViewportPosition = (): void => {
    if (!mobileDock.matches) {
      clearViewportPositioning();
      return;
    }

    ensureViewportPositioning();
    const effectiveBottom = getEffectiveViewportBottom();
    if (Math.abs(effectiveBottom - lastAppliedBottom) < 0.1) return;

    lastAppliedBottom = effectiveBottom;
    dock.style.setProperty('--dock-effective-bottom', `${effectiveBottom.toFixed(3)}px`);
  };

  const stepChromeTransition = (now: number): void => {
    chromeFrame = 0;

    if (!mobileDock.matches || visualViewportNeedsExactPosition()) {
      applyViewportPosition();
      return;
    }

    const elapsed = now - chromeTransitionStartedAt;
    const linearProgress = clamp(elapsed / CHROME_TRANSITION_DURATION, 0, 1);
    const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
    chromeProgress = chromeTransitionFrom +
      (chromeTarget - chromeTransitionFrom) * easedProgress;
    applyViewportPosition();

    if (linearProgress < 1) {
      chromeFrame = window.requestAnimationFrame(stepChromeTransition);
    } else {
      chromeProgress = chromeTarget;
      applyViewportPosition();
    }
  };

  const setChromeTarget = (target: number, immediate = false): void => {
    const nextTarget = clamp(target, 0, 1);
    chromeTarget = nextTarget;

    if (chromeFrame) {
      window.cancelAnimationFrame(chromeFrame);
      chromeFrame = 0;
    }

    if (immediate || Math.abs(chromeProgress - nextTarget) < 0.001) {
      chromeProgress = nextTarget;
      chromeTransitionStartedAt = 0;
      applyViewportPosition();
      return;
    }

    chromeTransitionFrom = chromeProgress;
    chromeTransitionStartedAt = performance.now();
    chromeFrame = window.requestAnimationFrame(stepChromeTransition);
  };

  const syncLayout = (): void => {
    const shouldStack = window.matchMedia('(min-width: 621px)').matches && dock.clientWidth < 760;
    if (shouldStack !== stacked) {
      stacked = shouldStack;
      if (shouldStack) applyStackedLayout();
      else clearResponsiveStyles();
    }

    measureViewportBounds(false);
    applyViewportPosition();
  };

  const scheduleLayoutSync = (): void => {
    if (layoutFrame) return;
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = 0;
      syncLayout();
    });
  };

  const handleScrollDirection = (): void => {
    const nextScrollY = window.scrollY;
    const delta = nextScrollY - lastScrollY;
    lastScrollY = nextScrollY;

    if (!mobileDock.matches || visualViewportNeedsExactPosition()) {
      applyViewportPosition();
      return;
    }

    if (delta > SCROLL_DIRECTION_THRESHOLD) setChromeTarget(1);
    else if (delta < -SCROLL_DIRECTION_THRESHOLD) setChromeTarget(0);
    else applyViewportPosition();
  };

  const handleTouchStart = (event: TouchEvent): void => {
    lastTouchY = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent): void => {
    const currentTouchY = event.touches[0]?.clientY;
    if (currentTouchY === undefined || lastTouchY === null) return;

    const fingerTravel = lastTouchY - currentTouchY;
    lastTouchY = currentTouchY;

    if (!mobileDock.matches || visualViewportNeedsExactPosition()) return;
    if (fingerTravel > TOUCH_DIRECTION_THRESHOLD) setChromeTarget(1);
    else if (fingerTravel < -TOUCH_DIRECTION_THRESHOLD) setChromeTarget(0);
  };

  const handleTouchEnd = (): void => {
    lastTouchY = null;
  };

  const handleViewportSignal = (): void => {
    measureViewportBounds(true);
    applyViewportPosition();
  };

  measureViewportBounds(true);
  syncLayout();

  window.addEventListener('resize', () => {
    measureViewportBounds(true);
    scheduleLayoutSync();
  }, { passive: true });
  window.addEventListener('scroll', handleScrollDirection, { passive: true });
  window.addEventListener('orientationchange', () => {
    lastDynamicViewportHeight = -1;
    window.requestAnimationFrame(() => {
      measureViewportBounds(true);
      scheduleLayoutSync();
    });
  }, { passive: true });
  window.addEventListener('pageshow', () => {
    lastScrollY = window.scrollY;
    measureViewportBounds(true);
    applyViewportPosition();
  }, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  visualViewport?.addEventListener('resize', handleViewportSignal, { passive: true });
  visualViewport?.addEventListener('scroll', handleViewportSignal, { passive: true });
  mobileDock.addEventListener('change', () => {
    measureViewportBounds(true);
    scheduleLayoutSync();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastScrollY = window.scrollY;
      measureViewportBounds(true);
      applyViewportPosition();
    }
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayoutSync);
    observer.observe(dock);
  }

  document.fonts.ready.then(() => {
    measureViewportBounds(true);
    scheduleLayoutSync();
  }).catch(() => undefined);
};
