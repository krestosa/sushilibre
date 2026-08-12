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
  let activeLiveState: boolean | null = null;
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
      item.style.width = '100%';
      item.style.minWidth = '0';
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

  const applyEventLiveSingleRowLayout = ({
    width,
    ctaWidth
  }: {
    width: string;
    ctaWidth: string;
  }): void => {
    dock.style.width = width;
    dock.style.gridTemplateColumns = `repeat(3, minmax(0, 1fr)) ${ctaWidth}`;
    dock.style.gridTemplateRows = 'minmax(0, 1fr)';
    dock.style.gap = '9px';
    dock.style.rowGap = '9px';

    placeMetadata({ row: '1', padding: '0 8px' });
    countdown.style.gridColumn = '';
    countdown.style.gridRow = '';
    cta.style.gridColumn = '4';
    cta.style.gridRow = '1';
  };

  const applyDesktopLayout = (eventLive: boolean): void => {
    if (eventLive) {
      applyEventLiveSingleRowLayout({
        width: 'min(760px, calc(100vw - 48px))',
        ctaWidth: '108px'
      });
      return;
    }

    applySingleRowLayout({
      width: 'min(1040px, calc(100vw - 48px))',
      columns: 'repeat(3, minmax(0, 1fr)) minmax(0, 2.55fr) 108px'
    });
  };

  const applyCompactLayout = (eventLive: boolean): void => {
    if (eventLive) {
      applyEventLiveSingleRowLayout({
        width: 'min(700px, calc(100vw - 32px))',
        ctaWidth: '104px'
      });
      return;
    }

    applySingleRowLayout({
      width: 'min(920px, calc(100vw - 32px))',
      columns: 'repeat(3, minmax(0, 1fr)) minmax(0, 2.3fr) 104px'
    });
  };

  const applyMobileLayout = (eventLive: boolean): void => {
    dock.style.width = '';
    dock.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr)) 96px';
    dock.style.gridTemplateRows = eventLive ? '48px' : '48px 96px';
    dock.style.gap = '8px';
    dock.style.rowGap = '8px';

    placeMetadata({ row: '1', padding: '0 5px' });
    countdown.style.gridColumn = '1 / span 3';
    countdown.style.gridRow = '2';
    cta.style.gridColumn = '4';
    cta.style.gridRow = eventLive ? '1' : '1 / span 2';
  };

  const resolveMode = (): DockLayoutMode => {
    if (window.matchMedia('(max-width: 840px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1100px)').matches) return 'compact';
    return 'desktop';
  };

  const syncLayout = (): void => {
    const nextMode = resolveMode();
    const nextLiveState = dock.classList.contains('is-event-live');
    if (nextMode === activeMode && nextLiveState === activeLiveState) return;

    activeMode = nextMode;
    activeLiveState = nextLiveState;
    if (nextMode === 'mobile') applyMobileLayout(nextLiveState);
    else if (nextMode === 'compact') applyCompactLayout(nextLiveState);
    else applyDesktopLayout(nextLiveState);
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

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(scheduleSync);
    observer.observe(dock, { attributes: true, attributeFilter: ['class'] });
  }

  document.fonts.ready.then(scheduleSync).catch(() => undefined);
};
