import { query } from '../shared/dom';

type CountdownKey = 'days' | 'hours' | 'minutes' | 'seconds';

const keys: CountdownKey[] = ['days', 'hours', 'minutes', 'seconds'];
const target = new Date('2026-07-30T20:00:00-03:00').getTime();

export const setupCountdown = (): void => {
  const nodes: Record<CountdownKey, HTMLElement | null> = {
    days: query<HTMLElement>('[data-countdown="days"]'),
    hours: query<HTMLElement>('[data-countdown="hours"]'),
    minutes: query<HTMLElement>('[data-countdown="minutes"]'),
    seconds: query<HTMLElement>('[data-countdown="seconds"]')
  };

  const pad = (value: number): string => String(value).padStart(2, '0');

  const render = (): number => {
    const remaining = Math.max(0, target - Date.now());
    const values: Record<CountdownKey, number> = {
      days: Math.floor(remaining / 86_400_000),
      hours: Math.floor((remaining % 86_400_000) / 3_600_000),
      minutes: Math.floor((remaining % 3_600_000) / 60_000),
      seconds: Math.floor((remaining % 60_000) / 1_000)
    };

    keys.forEach((key) => {
      const node = nodes[key];
      const nextValue = pad(values[key]);
      if (node && node.textContent !== nextValue) node.textContent = nextValue;
    });

    return remaining;
  };

  if (render() <= 0) return;
  const timerId = window.setInterval(() => {
    if (render() === 0) window.clearInterval(timerId);
  }, 1_000);
};
