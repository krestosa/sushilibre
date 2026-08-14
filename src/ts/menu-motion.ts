import { query, queryAll } from './shared/dom';

interface StickyExitTarget {
  group: HTMLElement;
  heading: HTMLElement;
  sentinel: HTMLElement;
  stickyTop: number;
  headingHeight: number;
  lastOffset: string;
}

const mobileQuery = window.matchMedia('(max-width: 720px)');
const menuGroups = query<HTMLElement>('[data-menu-groups]');
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

if (menuGroups) {
  query<HTMLElement>('.menu-mobile-sticky')?.remove();

  const groups = queryAll<HTMLElement>('[data-menu-group]', menuGroups);
  const targets = groups.flatMap((group): StickyExitTarget[] => {
    const heading = query<HTMLElement>('.menu-group__heading', group);
    const sentinel = query<HTMLElement>('.menu-group__exit-sentinel', group);
    return heading && sentinel
      ? [{ group, heading, sentinel, stickyTop: 0, headingHeight: 1, lastOffset: '0%' }]
      : [];
  });

  const nearbyTargets = new Set<StickyExitTarget>();
  const targetByGroup = new Map(targets.map((target) => [target.group, target]));
  let frame = 0;
  let resizeTimer = 0;
  let scrollListening = false;

  const resetTarget = (target: StickyExitTarget): void => {
    if (target.lastOffset === '0%') return;
    target.lastOffset = '0%';
    target.heading.style.setProperty('--menu-heading-exit-offset', '0%');
  };

  const measureTargets = (): void => {
    if (!mobileQuery.matches) return;
    targets.forEach((target) => {
      const computed = window.getComputedStyle(target.heading);
      target.stickyTop = Number.parseFloat(computed.top || '0') || 0;
      target.headingHeight = Math.max(1, target.heading.getBoundingClientRect().height);
    });
  };

  const updateStickyExitProgress = (): void => {
    frame = 0;
    if (!mobileQuery.matches || !nearbyTargets.size) return;

    nearbyTargets.forEach((target) => {
      const triggerLine = target.stickyTop + target.headingHeight;
      const sentinelTop = target.sentinel.getBoundingClientRect().top;
      const progress = clamp(
        (triggerLine - sentinelTop) / target.headingHeight,
        0,
        1
      );
      const offset = `${(-progress * 100).toFixed(3)}%`;
      if (offset === target.lastOffset) return;
      target.lastOffset = offset;
      target.heading.style.setProperty('--menu-heading-exit-offset', offset);
    });
  };

  const scheduleUpdate = (): void => {
    if (!mobileQuery.matches || !nearbyTargets.size || frame) return;
    frame = window.requestAnimationFrame(updateStickyExitProgress);
  };

  const attachScroll = (): void => {
    if (scrollListening) return;
    scrollListening = true;
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
  };

  const detachScroll = (): void => {
    if (!scrollListening) return;
    scrollListening = false;
    window.removeEventListener('scroll', scheduleUpdate);
  };

  const syncMode = (): void => {
    if (mobileQuery.matches) {
      measureTargets();
      attachScroll();
      scheduleUpdate();
      return;
    }

    detachScroll();
    nearbyTargets.clear();
    targets.forEach(resetTarget);
  };

  const scheduleMeasure = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      measureTargets();
      scheduleUpdate();
    }, 100);
  };

  const proximityObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const target = targetByGroup.get(entry.target as HTMLElement);
          if (!target) return;
          if (entry.isIntersecting && mobileQuery.matches) nearbyTargets.add(target);
          else {
            nearbyTargets.delete(target);
            resetTarget(target);
          }
        });
        scheduleUpdate();
      }, { rootMargin: '100% 0px 100% 0px', threshold: 0 })
    : null;

  if (proximityObserver) targets.forEach(({ group }) => proximityObserver.observe(group));
  else targets.forEach((target) => nearbyTargets.add(target));

  mobileQuery.addEventListener('change', syncMode);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleMeasure, { passive: true });
  document.fonts.ready.then(scheduleMeasure).catch(() => undefined);

  window.addEventListener('pagehide', () => {
    proximityObserver?.disconnect();
    detachScroll();
    if (frame) window.cancelAnimationFrame(frame);
    window.clearTimeout(resizeTimer);
    mobileQuery.removeEventListener('change', syncMode);
    window.removeEventListener('resize', scheduleMeasure);
    window.removeEventListener('orientationchange', scheduleMeasure);
    window.visualViewport?.removeEventListener('resize', scheduleMeasure);
  }, { once: true });

  syncMode();
}
