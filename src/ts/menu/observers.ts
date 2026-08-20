import { query } from '../shared/dom';
import { addScrollListener } from '../shared/scroll-root';

const SHADOW_FADE_DISTANCE_PX = 36;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const configureMobileOverlapShadows = (groups: HTMLElement[]): void => {
  const firstGroup = groups[0];
  const shadowHost = firstGroup?.parentElement;
  const heading = firstGroup
    ? query<HTMLElement>('.menu-group__heading', firstGroup)
    : null;
  const sentinel = firstGroup
    ? query<HTMLElement>('.menu-group__overlap-sentinel', firstGroup)
    : null;
  if (!firstGroup || !shadowHost || !heading || !sentinel) return;

  const mobileQuery = window.matchMedia('(max-width: 720px)');
  let updateFrame = 0;
  let resizeTimer = 0;
  let removeScrollListener: (() => void) | null = null;

  const clearShadowProgress = (): void => {
    shadowHost.style.removeProperty('--menu-sticky-shadow-progress');
  };

  const updateOverlapState = (): void => {
    updateFrame = 0;
    if (!mobileQuery.matches) return;

    const groupBounds = firstGroup.getBoundingClientRect();
    const headingBounds = heading.getBoundingClientRect();
    const sentinelBounds = sentinel.getBoundingClientRect();
    const groupStyle = window.getComputedStyle(firstGroup);
    const headingStyle = window.getComputedStyle(heading);
    const groupPaddingTop = Number.parseFloat(groupStyle.paddingTop) || 0;
    const stickyTop = Number.parseFloat(headingStyle.top) || 0;
    const naturalHeadingTop = groupBounds.top + groupPaddingTop;
    const overlaps = sentinelBounds.top <= headingBounds.bottom;
    const shadowProgress = clamp01(
      (stickyTop - naturalHeadingTop) / SHADOW_FADE_DISTANCE_PX
    );

    // El primer umbral sticky controla una única sombra fija para todo el menú.
    // Al bajar, una vez alcanzado el valor 1 no existe ningún reset por cambio
    // de categoría. Al volver hacia arriba, la misma geometría invierte el fade
    // únicamente cuando el primer heading abandona el sticky.
    if (!overlaps && shadowProgress === 0) {
      clearShadowProgress();
      return;
    }

    shadowHost.style.setProperty(
      '--menu-sticky-shadow-progress',
      shadowProgress.toFixed(3)
    );
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
