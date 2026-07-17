import { query, queryAll } from '../shared/dom';

export const setupBookingDockLayout = (): void => {
  const dock = query<HTMLElement>('.booking-dock');
  const metadata = queryAll<HTMLElement>('.booking-dock__meta');
  const countdown = query<HTMLElement>('.countdown');
  const cta = query<HTMLElement>('.booking-dock__cta');
  const firstMeta = metadata[0];
  const secondMeta = metadata[1];

  if (!dock || !firstMeta || !secondMeta || !countdown || !cta) return;

  let stacked: boolean | null = null;
  let scheduledFrame = 0;

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
    if (shouldStack === stacked) return;

    stacked = shouldStack;
    if (shouldStack) applyStackedLayout();
    else clearResponsiveStyles();
  };

  const scheduleSync = (): void => {
    if (scheduledFrame) return;

    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = 0;
      syncLayout();
    });
  };

  syncLayout();
  window.addEventListener('resize', scheduleSync, { passive: true });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(dock);
  }

  document.fonts.ready.then(scheduleSync).catch(() => undefined);
};
