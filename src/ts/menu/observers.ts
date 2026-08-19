import { query } from '../shared/dom';
import { addScrollListener } from '../shared/scroll-root';

interface OverlapTarget {
  group: HTMLElement;
  heading: HTMLElement;
  sentinel: HTMLElement;
}

export const configureMobileOverlapShadows = (groups: HTMLElement[]): void => {
  const mobileQuery = window.matchMedia('(max-width: 720px)');
  const targets = groups.flatMap((group): OverlapTarget[] => {
    const heading = query<HTMLElement>('.menu-group__heading', group);
    const sentinel = query<HTMLElement>('.menu-group__overlap-sentinel', group);
    return heading && sentinel ? [{ group, heading, sentinel }] : [];
  });
  const nearbyTargets = new Set<OverlapTarget>();
  const targetByGroup = new Map(targets.map((target) => [target.group, target]));
  let updateFrame = 0;
  let resizeTimer = 0;
  let removeScrollListener: (() => void) | null = null;
  let previousHeading: HTMLElement | null = null;

  const currentTarget = (): OverlapTarget | null => {
    for (const target of nearbyTargets) {
      if (target.group.classList.contains('is-active')) return target;
    }

    return nearbyTargets.values().next().value ?? null;
  };

  const updateOverlapState = (): void => {
    updateFrame = 0;
    if (!mobileQuery.matches) return;

    const target = currentTarget();
    if (!target) return;

    if (previousHeading && previousHeading !== target.heading) {
      previousHeading.classList.remove('is-overlapping');
    }

    const headingBounds = target.heading.getBoundingClientRect();
    const sentinelBounds = target.sentinel.getBoundingClientRect();
    const overlaps = sentinelBounds.top <= headingBounds.bottom;
    target.heading.classList.toggle('is-overlapping', overlaps);
    previousHeading = target.heading;
  };

  const scheduleUpdate = (): void => {
    if (updateFrame || !mobileQuery.matches || !nearbyTargets.size) return;
    updateFrame = window.requestAnimationFrame(updateOverlapState);
  };

  const scheduleResizeSettlement = (): void => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      scheduleUpdate();
    }, 140);
  };

  const attachScrollListener = (): void => {
    if (removeScrollListener) return;
    removeScrollListener = addScrollListener(scheduleUpdate);
  };

  const detachScrollListener = (): void => {
    removeScrollListener?.();
    removeScrollListener = null;
  };

  const syncScrollTracking = (): void => {
    if (mobileQuery.matches && nearbyTargets.size) {
      attachScrollListener();
      scheduleUpdate();
      return;
    }

    detachScrollListener();
  };

  const syncViewportMode = (): void => {
    if (!mobileQuery.matches) {
      detachScrollListener();
      previousHeading = null;
      targets.forEach(({ heading }) => heading.classList.remove('is-overlapping'));
      return;
    }

    syncScrollTracking();
  };

  const proximityObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const target = targetByGroup.get(entry.target as HTMLElement);
          if (!target) return;

          if (entry.isIntersecting) {
            nearbyTargets.add(target);
          } else {
            nearbyTargets.delete(target);
            target.heading.classList.remove('is-overlapping');
            if (previousHeading === target.heading) previousHeading = null;
          }
        });
        syncScrollTracking();
      }, {
        rootMargin: '20% 0px 20% 0px',
        threshold: 0
      })
    : null;

  if (proximityObserver) {
    targets.forEach(({ group }) => proximityObserver.observe(group));
  } else {
    targets.forEach((target) => nearbyTargets.add(target));
  }

  syncViewportMode();
  mobileQuery.addEventListener('change', syncViewportMode);
  window.addEventListener('resize', scheduleResizeSettlement, { passive: true });
  document.fonts.ready.then(scheduleUpdate).catch(() => undefined);

  window.addEventListener('pagehide', () => {
    if (updateFrame) window.cancelAnimationFrame(updateFrame);
    if (resizeTimer) window.clearTimeout(resizeTimer);
    detachScrollListener();
    proximityObserver?.disconnect();
    mobileQuery.removeEventListener('change', syncViewportMode);
    window.removeEventListener('resize', scheduleResizeSettlement);
  }, { once: true });
};

export const observeActiveMenuGroup = (
  menuRoot: HTMLElement,
  groups: HTMLElement[]
): void => {
  const firstGroup = groups[0];
  if (!firstGroup) return;

  firstGroup.classList.add('is-active');
  menuRoot.dataset.activeMenu = firstGroup.dataset.menuGroup || '';
  if (!('IntersectionObserver' in window)) return;

  const visibility = new Map<HTMLElement, number>(groups.map((group) => [group, 0]));

  const updateActiveGroup = (): void => {
    let activeGroup = firstGroup;
    let activeRatio = -1;

    visibility.forEach((ratio, group) => {
      if (ratio > activeRatio) {
        activeRatio = ratio;
        activeGroup = group;
      }
    });

    groups.forEach((group) => group.classList.toggle('is-active', group === activeGroup));
    menuRoot.dataset.activeMenu = activeGroup.dataset.menuGroup || '';
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const group = entry.target as HTMLElement;
      visibility.set(group, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    updateActiveGroup();
  }, {
    rootMargin: '-18% 0px -42% 0px',
    threshold: [0, 0.12, 0.25, 0.4, 0.6, 0.8]
  });

  groups.forEach((group) => observer.observe(group));
};
