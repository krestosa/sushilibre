import { query } from '../shared/dom';
import { addScrollListener } from '../shared/scroll-root';

interface OverlapTarget {
  group: HTMLElement;
  heading: HTMLElement;
  sentinel: HTMLElement;
}

const SHADOW_FADE_DISTANCE_PX = 36;
const STICKY_EPSILON_PX = 0.75;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const configureMobileOverlapShadows = (groups: HTMLElement[]): void => {
  const mobileQuery = window.matchMedia('(max-width: 720px)');
  const targets = groups.flatMap((group): OverlapTarget[] => {
    const heading = query<HTMLElement>('.menu-group__heading', group);
    const sentinel = query<HTMLElement>('.menu-group__overlap-sentinel', group);
    return heading && sentinel ? [{ group, heading, sentinel }] : [];
  });
  let updateFrame = 0;
  let resizeTimer = 0;
  let removeScrollListener: (() => void) | null = null;

  const clearShadowProgress = (): void => {
    targets.forEach(({ heading }) => {
      heading.classList.remove('is-overlapping');
      heading.style.removeProperty('--menu-heading-shadow-progress');
    });
  };

  const updateOverlapState = (): void => {
    updateFrame = 0;
    if (!mobileQuery.matches) return;

    targets.forEach(({ group, heading, sentinel }) => {
      const groupBounds = group.getBoundingClientRect();
      const headingBounds = heading.getBoundingClientRect();
      const sentinelBounds = sentinel.getBoundingClientRect();
      const groupStyle = window.getComputedStyle(group);
      const headingStyle = window.getComputedStyle(heading);
      const groupPaddingTop = Number.parseFloat(groupStyle.paddingTop) || 0;
      const stickyTop = Number.parseFloat(headingStyle.top) || 0;
      const naturalHeadingTop = groupBounds.top + groupPaddingTop;
      const hasReachedSticky = headingBounds.top <= stickyTop + STICKY_EPSILON_PX;
      const stickyDepth = Math.max(0, stickyTop - naturalHeadingTop);
      const shadowProgress = hasReachedSticky
        ? clamp01(stickyDepth / SHADOW_FADE_DISTANCE_PX)
        : 0;
      const overlaps = sentinelBounds.top <= headingBounds.bottom;

      // La sombra sólo empieza cuando el heading ya alcanzó el sticky. Una vez
      // activada no se apaga al ser empujada hacia arriba por la categoría
      // siguiente; al volver hacia arriba, stickyDepth recorre el mismo tramo
      // en sentido inverso hasta llegar nuevamente a 0.
      if (!hasReachedSticky && !overlaps && shadowProgress === 0) {
        heading.style.removeProperty('--menu-heading-shadow-progress');
        return;
      }

      heading.style.setProperty(
        '--menu-heading-shadow-progress',
        shadowProgress.toFixed(3)
      );
    });
  };

  const scheduleUpdate = (): void => {
    if (updateFrame || !mobileQuery.matches) return;
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

  const syncViewportMode = (): void => {
    if (mobileQuery.matches) {
      attachScrollListener();
      scheduleUpdate();
      return;
    }

    detachScrollListener();
    clearShadowProgress();
  };

  syncViewportMode();
  mobileQuery.addEventListener('change', syncViewportMode);
  window.addEventListener('resize', scheduleResizeSettlement, { passive: true });
  document.fonts.ready.then(scheduleUpdate).catch(() => undefined);

  window.addEventListener('pagehide', () => {
    if (updateFrame) window.cancelAnimationFrame(updateFrame);
    if (resizeTimer) window.clearTimeout(resizeTimer);
    detachScrollListener();
    clearShadowProgress();
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
