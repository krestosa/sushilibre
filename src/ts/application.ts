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
  const loops = Array.from(document.querySelectorAll<HTMLVideoElement>('[data-loop-video]'));

  if (intro && loops.length) {
    const mixDuration = 560;
    const mixLead = mixDuration / 1_000 + 0.22;
    runtime.root.style.setProperty('--video-mix-duration', `${mixDuration}ms`);

    type FrameVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };

    const ensureSource = (video: HTMLVideoElement): boolean => {
      if (video.currentSrc || video.hasAttribute('src') || video.querySelector('source[src]')) {
        return true;
      }

      const source = video.dataset.videoSource;
      if (!source) return false;
      video.src = source;
      video.load();
      return true;
    };

    const waitForMetadata = (video: HTMLVideoElement): Promise<void> => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
      return new Promise((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
    };

    const waitForPaintedFrame = (video: HTMLVideoElement): Promise<void> => new Promise((resolve) => {
      const frameVideo = video as FrameVideo;
      if (frameVideo.requestVideoFrameCallback) {
        frameVideo.requestVideoFrameCallback(() => resolve());
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        return;
      }

      video.addEventListener('loadeddata', () => {
        window.requestAnimationFrame(() => resolve());
      }, { once: true });
    });

    const prepareFromStart = async (video: HTMLVideoElement): Promise<void> => {
      if (!ensureSource(video)) throw new Error('Missing compact loop video source.');
      await waitForMetadata(video);
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // Keep the outgoing frame visible if a mobile browser delays the seek.
      }
      await video.play();
      await waitForPaintedFrame(video);
    };

    intro.hidden = false;
    intro.muted = true;
    intro.playsInline = true;
    intro.loop = false;
    intro.classList.add('is-active');

    loops.forEach((video) => {
      video.hidden = false;
      video.muted = true;
      video.playsInline = true;
      video.loop = false;
      video.preload = 'auto';
      video.classList.remove('is-active', 'is-mixing-in');
      ensureSource(video);
    });

    let activeIndex = -1;
    let boundaryTimer = 0;
    let transitionInProgress = false;

    const clearBoundary = (): void => {
      if (!boundaryTimer) return;
      window.clearTimeout(boundaryTimer);
      boundaryTimer = 0;
    };

    const scheduleBoundary = (): void => {
      clearBoundary();
      if (activeIndex < 0 || transitionInProgress || document.hidden) return;

      const active = loops[activeIndex];
      if (!active) return;

      if (loops.length === 1) {
        active.loop = true;
        return;
      }

      const schedule = (): void => {
        const duration = active.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const remaining = Math.max(0, duration - active.currentTime);
        const delay = Math.max(0, (remaining - mixLead) * 1_000);
        const scheduledIndex = activeIndex;

        boundaryTimer = window.setTimeout(() => {
          boundaryTimer = 0;
          if (scheduledIndex !== activeIndex || transitionInProgress) return;
          void transitionTo((activeIndex + 1) % loops.length);
        }, delay);
      };

      if (active.readyState >= HTMLMediaElement.HAVE_METADATA) schedule();
      else active.addEventListener('loadedmetadata', schedule, { once: true });
    };

    const settleTransition = (
      incoming: HTMLVideoElement,
      outgoing: HTMLVideoElement,
      nextIndex: number
    ): void => {
      window.setTimeout(() => {
        outgoing.classList.remove('is-active', 'is-mixing-in');
        outgoing.pause();
        if (outgoing !== intro) {
          try {
            outgoing.currentTime = 0;
          } catch {
            // The next reuse will seek again after metadata is available.
          }
        }

        incoming.classList.remove('is-mixing-in');
        activeIndex = nextIndex;
        transitionInProgress = false;
        scheduleBoundary();
      }, outgoing === intro ? 0 : mixDuration + 40);
    };

    async function transitionTo(nextIndex: number): Promise<void> {
      if (transitionInProgress || document.hidden) return;

      const incoming = loops[nextIndex];
      if (!incoming) return;
      const outgoing: HTMLVideoElement = activeIndex >= 0
        ? loops[activeIndex] ?? intro!
        : intro!;

      if (incoming === outgoing) {
        incoming.loop = true;
        void incoming.play();
        activeIndex = nextIndex;
        return;
      }

      transitionInProgress = true;
      clearBoundary();
      incoming.classList.remove('is-active');
      incoming.classList.add('is-mixing-in');

      try {
        // The outgoing video remains fully visible until the incoming player has
        // actually decoded/painted its first frame. This removes the mobile
        // black flash while preserving the fade between the two loop layers.
        await prepareFromStart(incoming);
        if (document.hidden) {
          incoming.pause();
          incoming.classList.remove('is-mixing-in');
          transitionInProgress = false;
          return;
        }

        window.requestAnimationFrame(() => {
          incoming.classList.add('is-active');
          if (outgoing === intro) outgoing.classList.remove('is-active');
          settleTransition(incoming, outgoing, nextIndex);
        });
      } catch {
        incoming.pause();
        incoming.classList.remove('is-active', 'is-mixing-in');
        transitionInProgress = false;
        outgoing.classList.add('is-active');
        window.setTimeout(() => void transitionTo(nextIndex), 900);
      }
    }

    loops.forEach((video, index) => {
      video.addEventListener('ended', () => {
        if (index !== activeIndex || transitionInProgress || loops.length < 2) return;
        void transitionTo((index + 1) % loops.length);
      }, { passive: true });

      video.addEventListener('playing', () => {
        if (index === activeIndex && !transitionInProgress) scheduleBoundary();
      }, { passive: true });
    });

    intro.addEventListener('ended', () => {
      void transitionTo(0);
    }, { once: true, passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearBoundary();
        loops.forEach((video) => video.pause());
        return;
      }

      if (activeIndex >= 0) {
        const active = loops[activeIndex];
        if (active) void active.play().then(scheduleBoundary).catch(() => undefined);
      } else if (intro.ended) {
        void transitionTo(0);
      } else {
        void intro.play().catch(() => undefined);
      }
    });

    if (intro.ended) void transitionTo(0);
  } else {
    setupVideoLoop(runtime);
  }
} else {
  setupVideoLoop(runtime);
}
