import { query } from './shared/dom';

const dock = query<HTMLElement>('.booking-dock');

if (dock) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resolved = false;

  const cleanup = (): void => {
    window.removeEventListener('scroll', prioritizeScrollStability);
  };

  const finishReveal = (): void => {
    if (resolved) return;
    resolved = true;
    cleanup();
  };

  const settleImmediately = (): void => {
    if (resolved) return;

    dock.getAnimations().forEach((animation) => animation.cancel());
    dock.style.opacity = '1';
    dock.style.translate = '0 0';
    dock.style.scale = '1';
    dock.style.willChange = '';
    finishReveal();
  };

  function prioritizeScrollStability(): void {
    if (!resolved && window.scrollY > 0) settleImmediately();
  }

  dock.addEventListener('animationend', (event) => {
    if (
      event.target === dock
      && (event.animationName === 'dock-in'
        || event.animationName === 'stage-dock-in'
        || event.animationName === 'stage-dock-fade-in')
    ) {
      finishReveal();
    }
  });

  if (reducedMotion.matches) {
    settleImmediately();
  } else {
    const activeDockAnimation = dock.getAnimations().some(
      (animation) => animation.playState === 'running'
    );

    if (!activeDockAnimation && Number.parseFloat(getComputedStyle(dock).opacity) >= 0.99) {
      finishReveal();
    } else {
      window.addEventListener('scroll', prioritizeScrollStability, { passive: true });
      window.requestAnimationFrame(prioritizeScrollStability);
    }
  }
}
