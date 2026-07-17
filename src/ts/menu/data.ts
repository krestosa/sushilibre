import { query } from '../shared/dom';
import { isMenuData, type MenuData } from './types';

const readEmbeddedData = (): MenuData | null => {
  const embeddedData = query<HTMLScriptElement>('#menu-data');
  if (!embeddedData?.textContent) return null;

  try {
    const parsed: unknown = JSON.parse(embeddedData.textContent);
    return isMenuData(parsed) ? parsed : null;
  } catch (error) {
    console.error('Embedded menu JSON is invalid.', error);
    return null;
  }
};

export const loadMenuData = async (): Promise<MenuData> => {
  const fallback = readEmbeddedData();
  const canRequestFile = ['http:', 'https:'].includes(window.location.protocol);

  if (!canRequestFile || typeof window.fetch !== 'function') {
    if (fallback) return fallback;
    throw new Error('No menu data source is available.');
  }

  try {
    const response = await window.fetch('menu.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Menu request failed with ${response.status}.`);
    const parsed: unknown = await response.json();
    if (!isMenuData(parsed)) throw new TypeError('Invalid menu data.');
    return parsed;
  } catch (error) {
    if (fallback) return fallback;
    throw error;
  }
};

export const setMenuBackground = (
  menuRoot: HTMLElement,
  requestedPath?: string
): void => {
  const candidates = Array.from(new Set(
    [requestedPath, 'assets/menu_bg.png', 'menu_bg.png'].filter((value): value is string => Boolean(value))
  ));

  const tryCandidate = (index: number): void => {
    const path = candidates[index];
    if (!path) return;

    const image = new Image();
    image.onload = () => {
      const safePath = path.replace(/["\\]/g, '\\$&');
      menuRoot.style.setProperty('--menu-background-image', `url("${safePath}")`);
    };
    image.onerror = () => tryCandidate(index + 1);
    image.src = path;
  };

  tryCandidate(0);
};
