import { query } from '../shared/dom';
import { addScrollListener } from '../shared/scroll-root';

interface OverlapTarget {
  group: HTMLElement;
  heading: HTMLElement;
  sentinel: HTMLElement;
}

const SHADOW_FADE_DISTANCE_PX = 36;
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

      // Antes de alcanzar el top sticky el progreso permanece en 0. Una vez
      // fijado, entra durante una distancia corta y reversible de scroll.
      const enterProgress = clamp01(
        (stickyTop - naturalHeadingTop) / SHADOW_FADE_DISTANCE_PX
      );

      // Cuando el siguiente grupo empuja este heading fuera del sticky, la
      // misma distancia hace el fade inverso y mantiene el handoff continuo.
      const exitProgress = clamp01(
        (headingBounds.top - stickyTop + SHADOW_FADE_DISTANCE_PX) /
          SHADOW_FADE_DISTANCE_PX
      );

      const overlaps = sentinelBounds.top <= headingBounds.bottom;
      const stickyProgress = Math.min(enterProgress, exitProgress);
      const shadowProgress = overlaps && enterProgress > 0
        ? exitProgress
        : stickyProgress;

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
