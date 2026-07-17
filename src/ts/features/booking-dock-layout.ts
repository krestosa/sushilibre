import { query, queryAll } from '../shared/dom';

type DockLayoutMode = 'desktop' | 'compact' | 'mobile';

export const setupBookingDockLayout = (): void => {
  const dock = query<HTMLElement>('.booking-dock');
  const metadata = queryAll<HTMLElement>('.booking-dock__meta');
  const countdown = query<HTMLElement>('.countdown');
  const cta = query<HTMLElement>('.booking-dock__cta');
  const [venueMeta, dateMeta, timeMeta] = metadata;

  if (!dock || !venueMeta || !dateMeta || !timeMeta || !countdown || !cta) return;

  let activeMode: DockLayoutMode | null = null;
  let scheduledFrame = 0;

  const placeMetadata = ({
    row,
    padding
  }: {
    row: string;
    padding: string;
  }): void => {
    metadata.forEach((item, index) => {
      item.style.gridColumn = String(index + 1);
      item.style.gridRow = row;
      item.style.padding = padding;
    });
  };

  const applySingleRowLayout = ({
    width,
    columns
  }: {
    width: string;
    columns: string;
  }): void => {
    dock.style.width = width;
    dock.style.gridTemplateColumns = columns;
    dock.style.gridTemplateRows = 'minmax(0, 1fr)';
    dock.style.gap = '9px';
    dock.style.rowGap = '9px';

    placeMetadata({ row: '1', padding: '0 8px' });
    countdown.style.gridColumn = '4';
    countdown.style.gridRow = '1';
    cta.style.gridColumn = '5';
    cta.style.gridRow = '1';
  };

  const applyDesktopLayout = (): void => {
    applySingleRowLayout({
      width: 'min(1040px, calc(100vw - 48px))',
      columns: 'minmax(158px, 1.16fr) minmax(150px, 1.08fr) minmax(86px, 0.68fr) minmax(0, 2.55fr) 108px'
    });
  };

  const applyCompactLayout = (): void => {
    applySingleRowLayout({
      width: 'min(920px, calc(100vw - 32px))',
      columns: 'minmax(142px, 1.1fr) minmax(132px, 1fr) minmax(78px, 0.62fr) minmax(0, 2.3fr) 104px'
    });
  };

  const applyMobileLayout = (): void => {
    dock.style.width = '';
    dock.style.gridTemplateColumns = 'minmax(0, 1.28fr) minmax(0, 1.05fr) minmax(0, 0.72fr) 96px';
    dock.style.gridTemplateRows = '48px 96px';
    dock.style.gap = '8px';
    dock.style.rowGap = '8px';

    placeMetadata({ row: '1', padding: '0 5px' });
    countdown.style.gridColumn = '1 / span 3';
    countdown.style.gridRow = '2';
    cta.style.gridColumn = '4';
    cta.style.gridRow = '1 / span 2';
  };

  const resolveMode = (): DockLayoutMode => {
    if (window.matchMedia('(max-width: 840px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1100px)').matches) return 'compact';
    return 'desktop';
  };

  const syncLayout = (): void => {
    const nextMode = resolveMode();
    if (nextMode === activeMode) return;

    activeMode = nextMode;
    if (nextMode === 'mobile') applyMobileLayout();
    else if (nextMode === 'compact') applyCompactLayout();
    else applyDesktopLayout();
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
  window.addEventListener('orientationchange', scheduleSync, { passive: true });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(dock);
  }

  document.fonts.ready.then(scheduleSync).catch(() => undefined);
};
