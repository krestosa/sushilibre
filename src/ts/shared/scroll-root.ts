import { query } from './dom';

const MOBILE_APP_SCROLL_QUERY = '(max-width: 840px) and (pointer: coarse)';
const mobileAppScroll = window.matchMedia(MOBILE_APP_SCROLL_QUERY);
const page = query<HTMLElement>('.page');

export const usesAppScrollRoot = (): boolean => Boolean(page && mobileAppScroll.matches);

export const getScrollY = (): number => (
  usesAppScrollRoot() && page ? page.scrollTop : window.scrollY
);

export const getViewportHeight = (): number => (
  usesAppScrollRoot() && page ? page.clientHeight : window.innerHeight
);

export const addScrollListener = (listener: EventListener): (() => void) => {
  const options: AddEventListenerOptions = { passive: true };
  window.addEventListener('scroll', listener, options);
  page?.addEventListener('scroll', listener, options);

  return () => {
    window.removeEventListener('scroll', listener);
    page?.removeEventListener('scroll', listener);
  };
};

export const scrollToY = (
  top: number,
  behavior: ScrollBehavior = 'auto'
): void => {
  if (usesAppScrollRoot() && page) {
    page.scrollTo({ top, behavior });
    return;
  }

  window.scrollTo({ top, behavior });
};
