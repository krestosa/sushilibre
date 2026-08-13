import { query } from '../shared/dom';

export const setupFinalCtaCopyGuard = (): void => {
  const text = query<HTMLElement>('.menu-final-cta__text');
  if (!text) return;

  const words = (text.textContent ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return;

  const last = words.pop();
  const penultimate = words.pop();
  if (!last || !penultimate) return;

  const prefix = words.length ? `${words.join(' ')} ` : '';
  text.textContent = `${prefix}${penultimate}\u00a0${last}`;
};
