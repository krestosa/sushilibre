import { query } from '../shared/dom';

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
  let scrollListening = false;

  const updateOverlapState = (): void => {
    updateFrame = 0;
    if (!mobileQuery.matches) return;

    nearbyTargets.forEach(({ heading, sentinel }) => {
      const headingBounds = heading.getBoundingClientRect();
      const sentinelBounds = sentinel.getBoundingClientRect();
      const overlaps = sentinelBounds.top <= headingBounds.bottom;
      heading.classList.toggle('is-overlapping', overlaps);
    });
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
    if (scrollListening) return;
    scrollListening = true;
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
  };

  const detachScrollListener = (): void => {
    if (!scrollListening) return;
    scrollListening = false;
    window.removeEventListener('scroll', scheduleUpdate);
  };

  const syncViewportMode = (): void => {
    if (mobileQuery.matches) {
      attachScrollListener();
      scheduleUpdate();
      return;
    }

    detachScrollListener();
    targets.forEach(({ heading }) => heading.classList.remove('is-overlapping'));
  };

  if ('IntersectionObserver' in window) {
    const proximityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = targetByGroup.get(entry.target as HTMLElement);
        if (!target) return;

        if (entry.isIntersecting) {
          nearbyTargets.add(target);
        } else {
          nearbyTargets.delete(target);
          target.heading.classList.remove('is-overlapping');
        }
      });
      scheduleUpdate();
    }, {
      rootMargin: '20% 0px 20% 0px',
      threshold: 0
    });

    targets.forEach(({ group }) => proximityObserver.observe(group));
  } else {
    targets.forEach((target) => nearbyTargets.add(target));
  }

  syncViewportMode();
  mobileQuery.addEventListener('change', syncViewportMode);
  window.addEventListener('resize', scheduleResizeSettlement, { passive: true });
  document.fonts.ready.then(scheduleUpdate).catch(() => undefined);
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
