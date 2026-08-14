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

  const placeMetadata = ({ row, padding }: { row: string; padding: string }): void => {
    const placements = [venueMeta, dateMeta, timeMeta];

    placements.forEach((item, index) => {
      item.style.gridColumn = String(index + 1);
      item.style.gridRow = row;
      item.style.justifySelf = 'start';
      item.style.width = 'max-content';
      item.style.maxWidth = '100%';
      item.style.minWidth = '0';
      item.style.padding = padding;
    });
  };

  const styleCountdownBoundary = (enabled: boolean): void => {
    countdown.style.boxSizing = 'border-box';
    countdown.style.marginLeft = enabled ? '4px' : '0';
    countdown.style.paddingLeft = enabled ? '14px' : '0';
    countdown.style.borderLeft = enabled ? '1px solid rgba(255, 255, 255, 0.12)' : '0';
  };

  const applySingleRowLayout = ({
    width,
    ctaWidth,
    metaGap
  }: {
    width: string;
    ctaWidth: string;
    metaGap: string;
  }): void => {
    dock.style.width = width;
    dock.style.setProperty('--dock-cta-track', ctaWidth);
    dock.style.gridTemplateColumns = `max-content max-content max-content minmax(0, 1fr) var(--dock-cta-track)`;
    dock.style.gridTemplateRows = 'minmax(0, 1fr)';
    dock.style.columnGap = metaGap;
    dock.style.rowGap = '0';

    placeMetadata({ row: '1', padding: '0 4px' });
    countdown.style.gridColumn = '4';
    countdown.style.gridRow = '1';
    styleCountdownBoundary(true);
    cta.style.gridColumn = '5';
    cta.style.gridRow = '1';
  };

  const applyEventLiveSingleRowLayout = ({
    width,
    ctaWidth,
    metaGap
  }: {
    width: string;
    ctaWidth: string;
    metaGap: string;
  }): void => {
    dock.style.width = width;
    dock.style.setProperty('--dock-cta-track', ctaWidth);
    dock.style.gridTemplateColumns = `max-content max-content max-content var(--dock-cta-track)`;
    dock.style.gridTemplateRows = 'minmax(0, 1fr)';
    dock.style.columnGap = metaGap;
    dock.style.rowGap = '0';

    placeMetadata({ row: '1', padding: '0 4px' });
    countdown.style.gridColumn = '';
    countdown.style.gridRow = '';
    styleCountdownBoundary(false);
    cta.style.gridColumn = '4';
    cta.style.gridRow = '1';
  };

  const applyDesktopLayout = (eventLive: boolean): void => {
    if (eventLive) {
      applyEventLiveSingleRowLayout({
        width: 'min(680px, calc(100vw - 48px))',
        ctaWidth: '108px',
        metaGap: '20px'
      });
      return;
    }

    applySingleRowLayout({
      width: 'min(960px, calc(100vw - 48px))',
      ctaWidth: '108px',
      metaGap: '20px'
    });
  };

  const applyCompactLayout = (eventLive: boolean): void => {
    if (eventLive) {
      applyEventLiveSingleRowLayout({
        width: 'min(640px, calc(100vw - 32px))',
        ctaWidth: '104px',
        metaGap: '14px'
      });
      return;
    }

    applySingleRowLayout({
      width: 'min(740px, calc(100vw - 32px))',
      ctaWidth: '104px',
      metaGap: '14px'
    });
  };

  const applyMobileLayout = (eventLive: boolean): void => {
    dock.style.width = 'min(680px, calc(100vw - 24px))';
    dock.style.setProperty('--dock-cta-track', '96px');
    dock.style.gridTemplateColumns = 'max-content max-content max-content minmax(0, 1fr) var(--dock-cta-track)';
    dock.style.gridTemplateRows = eventLive ? '48px' : '48px 96px';
    dock.style.columnGap = '8px';
    dock.style.rowGap = '8px';

    placeMetadata({ row: '1', padding: '0 2px' });
    countdown.style.gridColumn = '1 / span 4';
    countdown.style.gridRow = '2';
    styleCountdownBoundary(false);
    cta.style.gridColumn = '5';
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
