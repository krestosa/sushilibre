import { query, queryAll } from '../shared/dom';

const DESKTOP_PROMPT_QUERY = '(hover: hover) and (pointer: fine)';
const EXIT_CLEANUP_MS = 210;

export const setupPieceCursorEntryMotion = (): void => {
  const prompt = query<HTMLElement>('.piece-cursor-preview');
  const menuRoot = query<HTMLElement>('[data-menu-root]');
  const zones = queryAll<HTMLElement>('.menu-group__items', menuRoot ?? undefined);
  if (!prompt || !menuRoot || !zones.length) return;

  const desktopPrompt = window.matchMedia(DESKTOP_PROMPT_QUERY);
  let revealFrame = 0;
  let revealFrame2 = 0;
  let cleanupTimer = 0;
  let entryX = 0;
  let entryY = 0;

  const clearSchedules = (): void => {
    if (revealFrame) window.cancelAnimationFrame(revealFrame);
    if (revealFrame2) window.cancelAnimationFrame(revealFrame2);
    if (cleanupTimer) window.clearTimeout(cleanupTimer);
    revealFrame = 0;
    revealFrame2 = 0;
    cleanupTimer = 0;
  };

  const centerOffsetTo = (clientX: number, clientY: number): { x: number; y: number } => {
    const bounds = prompt.getBoundingClientRect();
    return {
      x: clientX - (bounds.left + bounds.width * 0.5),
      y: clientY - (bounds.top + bounds.height * 0.5)
    };
  };

  const stageEntry = (event: PointerEvent): void => {
    if (!desktopPrompt.matches) return;

    clearSchedules();
    entryX = event.clientX;
    entryY = event.clientY;
    prompt.classList.remove('is-exiting-to-pointer');
    prompt.classList.add('is-entering-from-pointer');

    // Keep the helper at scale 0 while its existing spring retargets from any
    // previous hidden position. On the following paint, reveal from the exact
    // pointer boundary point instead of from that stale position.
    revealFrame = window.requestAnimationFrame(() => {
      revealFrame = 0;
      revealFrame2 = window.requestAnimationFrame(() => {
        revealFrame2 = 0;
        if (!prompt.classList.contains('is-visible')) return;

        const offset = centerOffsetTo(entryX, entryY);
        prompt.style.setProperty('--piece-entry-x', `${offset.x}px`);
        prompt.style.setProperty('--piece-entry-y', `${offset.y}px`);
        prompt.classList.remove('is-entering-from-pointer');
      });
    });
  };

  const stageExit = (event: PointerEvent): void => {
    if (!desktopPrompt.matches) return;

    clearSchedules();
    prompt.classList.remove('is-entering-from-pointer');
    const offset = centerOffsetTo(event.clientX, event.clientY);
    prompt.style.setProperty('--piece-exit-x', `${offset.x}px`);
    prompt.style.setProperty('--piece-exit-y', `${offset.y}px`);
    prompt.classList.add('is-exiting-to-pointer');

    cleanupTimer = window.setTimeout(() => {
      cleanupTimer = 0;
      prompt.classList.remove('is-exiting-to-pointer');
    }, EXIT_CLEANUP_MS);
  };

  zones.forEach((zone) => {
    zone.addEventListener('pointerenter', stageEntry, { capture: true, passive: true });
    zone.addEventListener('pointerleave', stageExit, { capture: true, passive: true });
  });

  desktopPrompt.addEventListener('change', () => {
    clearSchedules();
    prompt.classList.remove('is-entering-from-pointer', 'is-exiting-to-pointer');
  });
};
