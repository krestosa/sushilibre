import { query } from '../shared/dom';

export const configureMobileOverlapShadows = (groups: HTMLElement[]): void => {
  const mobileQuery = window.matchMedia('(max-width: 720px)');
  let observers: IntersectionObserver[] = [];
  let resizeFrame = 0;

  const disconnectObservers = (): void => {
    observers.forEach((observer) => observer.disconnect());
    observers = [];
    groups.forEach((group) => {
      query<HTMLElement>('.menu-group__heading', group)?.classList.remove('is-overlapping');
    });
  };

  const configure = (): void => {
    disconnectObservers();
    if (!mobileQuery.matches || !('IntersectionObserver' in window)) return;

    groups.forEach((group) => {
      const heading = query<HTMLElement>('.menu-group__heading', group);
      const sentinel = query<HTMLElement>('.menu-group__overlap-sentinel', group);
      if (!heading || !sentinel) return;

      const headingHeight = Math.ceil(heading.getBoundingClientRect().height);
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const overlaps = !entry.isIntersecting && entry.boundingClientRect.top <= headingHeight;
        heading.classList.toggle('is-overlapping', overlaps);
      }, {
        rootMargin: `-${headingHeight}px 0px 0px 0px`,
        threshold: 0
      });

      observer.observe(sentinel);
      observers.push(observer);
    });
  };

  const scheduleConfigure = (): void => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      configure();
    });
  };

  configure();
  mobileQuery.addEventListener('change', scheduleConfigure);
  window.addEventListener('resize', scheduleConfigure, { passive: true });
  document.fonts.ready.then(scheduleConfigure).catch(() => undefined);
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
