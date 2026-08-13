import { setupBookingCtaSheen } from './features/booking-cta-sheen';
import { setupBookingDockLayout } from './features/booking-dock-layout';
import { setupCountdown } from './features/countdown';
import { setupHeroIntroMotion } from './features/hero-intro-motion';
import { setupHeroTitleLayout } from './features/hero-title-layout';
import { setupPieceCursorPreview } from './features/piece-cursor-preview';
import { setupPieceViewer } from './features/piece-viewer';
import { setupProposalReveal } from './features/proposal-reveal';
import { setupTapSearchGuard } from './features/tap-search-guard';
import { setupVideoLoop } from './features/video-loop';
import { createRuntimeContext } from './shared/runtime';

const runtime = createRuntimeContext();
const compactVideo = runtime.compactViewport.matches || runtime.coarsePointer.matches;

setupProposalReveal();
setupCountdown();
setupBookingDockLayout();
setupBookingCtaSheen(runtime);
setupHeroTitleLayout();
setupHeroIntroMotion();
setupPieceViewer();
setupPieceCursorPreview();
setupTapSearchGuard();

if (compactVideo) {
  const intro = document.querySelector<HTMLVideoElement>('[data-intro-video]');
  const loop = document.querySelector<HTMLVideoElement>('[data-loop-video]');

  if (intro && loop) {
    const source = loop.dataset.videoSource;
    loop.muted = true;
    loop.playsInline = true;
    loop.loop = true;
    loop.preload = 'auto';
    if (source && !loop.currentSrc && !loop.hasAttribute('src')) {
      loop.src = source;
      loop.load();
    }

    intro.addEventListener('ended', () => {
      void loop.play().then(() => {
        loop.classList.add('is-active');
        intro.classList.remove('is-active');
      });
    }, { once: true, passive: true });
  } else {
    setupVideoLoop(runtime);
  }
} else {
  setupVideoLoop(runtime);
}
