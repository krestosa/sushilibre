import { query, queryAll } from '../shared/dom';
import type { RuntimeContext } from '../shared/runtime';

interface SuspendedVideoState {
  index: number;
  time: number;
}

export const setupVideoLoop = ({
  root,
  compactViewport,
  coarsePointer
}: RuntimeContext): void => {
  const hero = query<HTMLElement>('.hero');
  const videos = queryAll<HTMLVideoElement>('[data-loop-video]');
  if (!videos.length) return;

  const compactPlayback = compactViewport.matches || coarsePointer.matches;
  const mixDuration = compactPlayback ? 650 : 900;
  const mixLead = mixDuration / 1_000 + 0.24;
  root.style.setProperty('--video-mix-duration', `${mixDuration}ms`);

  videos.forEach((video, index) => {
    video.loop = videos.length < 2;
    video.muted = true;
    video.playsInline = true;
    video.preload = index === 0 ? 'auto' : 'metadata';
    video.classList.toggle('is-active', index === 0);
    video.classList.remove('is-mixing-in');
  });

  if (videos.length < 2) {
    const video = videos[0];
    if (!video) return;
    let suspendedTime = 0;
    let heroVisible = true;

    const syncPlayback = (): void => {
      if (!document.hidden && heroVisible) {
        try {
          video.currentTime = suspendedTime;
        } catch {
          // Browsers may reject seeks before metadata is ready.
        }
        void video.play().catch(() => undefined);
      } else {
        suspendedTime = Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
        video.pause();
      }
    };

    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        heroVisible = entry.isIntersecting;
        syncPlayback();
      }, { rootMargin: '80px 0px', threshold: 0 }).observe(hero);
    }

    document.addEventListener('visibilitychange', syncPlayback);
    void video.play().catch(() => undefined);
    return;
  }

  let activeIndex = 0;
  let transitionInProgress = false;
  let boundaryTimerId = 0;
  let mixTimerId = 0;
  let mixGeneration = 0;
  let suspendedState: SuspendedVideoState | null = null;
  let heroVisible = true;

  const canPlay = (): boolean => !document.hidden && heroVisible;
  const getVideo = (index: number): HTMLVideoElement | null => videos[index] ?? null;

  const clearBoundaryTimer = (): void => {
    if (!boundaryTimerId) return;
    window.clearTimeout(boundaryTimerId);
    boundaryTimerId = 0;
  };

  const clearMixTimer = (): void => {
    if (!mixTimerId) return;
    window.clearTimeout(mixTimerId);
    mixTimerId = 0;
  };

  const setCurrentTimeSafely = (video: HTMLVideoElement, requestedTime: number): void => {
    const applyTime = (): void => {
      const duration = video.duration;
      const maximum = Number.isFinite(duration) && duration > 0
        ? Math.max(0, duration - 0.05)
        : Math.max(0, requestedTime);
      const nextTime = Math.min(Math.max(0, requestedTime), maximum);
      try {
        video.currentTime = nextTime;
      } catch {
        // Ignore transient media seek failures.
      }
    };

    if (video.readyState >= 1) applyTime();
    else video.addEventListener('loadedmetadata', applyTime, { once: true });
  };

  const activateSingleVideo = (index: number, time: number): HTMLVideoElement | null => {
    clearBoundaryTimer();
    clearMixTimer();
    mixGeneration += 1;
    transitionInProgress = false;

    videos.forEach((video) => {
      video.pause();
      video.classList.remove('is-active', 'is-mixing-in');
    });

    const activeVideo = getVideo(index);
    if (!activeVideo) return null;
    activeIndex = index;
    activeVideo.classList.add('is-active');
    setCurrentTimeSafely(activeVideo, time);
    return activeVideo;
  };

  const scheduleBoundary = (): void => {
    clearBoundaryTimer();
    if (!canPlay() || transitionInProgress) return;

    const activeVideo = getVideo(activeIndex);
    if (!activeVideo) return;
    const duration = activeVideo.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      activeVideo.addEventListener('loadedmetadata', scheduleBoundary, { once: true });
      return;
    }

    const playbackRate = Math.max(0.1, Math.abs(activeVideo.playbackRate || 1));
    const remaining = duration - activeVideo.currentTime;
    const delay = Math.max(0, ((remaining - mixLead) / playbackRate) * 1_000);

    boundaryTimerId = window.setTimeout(() => {
      boundaryTimerId = 0;
      const currentRemaining = activeVideo.duration - activeVideo.currentTime;
      if (currentRemaining <= mixLead + 0.16) void mixLoopBoundary();
      else scheduleBoundary();
    }, delay);
  };

  async function mixLoopBoundary(): Promise<void> {
    if (transitionInProgress || !canPlay()) return;

    const outgoing = getVideo(activeIndex);
    const nextIndex = (activeIndex + 1) % videos.length;
    const incoming = getVideo(nextIndex);
    if (!outgoing || !incoming) return;

    transitionInProgress = true;
    clearBoundaryTimer();
    const generation = ++mixGeneration;

    try {
      incoming.pause();
      setCurrentTimeSafely(incoming, 0);
      incoming.classList.remove('is-active');
      incoming.classList.add('is-mixing-in');
      await incoming.play();

      if (generation !== mixGeneration || !canPlay()) {
        incoming.pause();
        incoming.classList.remove('is-mixing-in');
        return;
      }

      window.requestAnimationFrame(() => {
        if (generation === mixGeneration && canPlay()) incoming.classList.add('is-active');
      });

      mixTimerId = window.setTimeout(() => {
        if (generation !== mixGeneration || !canPlay()) return;

        outgoing.classList.remove('is-active');
        outgoing.pause();
        setCurrentTimeSafely(outgoing, 0);
        incoming.classList.remove('is-mixing-in');
        activeIndex = nextIndex;
        transitionInProgress = false;
        mixTimerId = 0;
        scheduleBoundary();
      }, mixDuration + 50);
    } catch {
      incoming.pause();
      incoming.classList.remove('is-active', 'is-mixing-in');
      if (generation !== mixGeneration) return;

      setCurrentTimeSafely(outgoing, 0);
      outgoing.classList.add('is-active');
      transitionInProgress = false;
      void outgoing.play().then(scheduleBoundary).catch(() => undefined);
    }
  }

  const suspendPlayback = (): void => {
    if (suspendedState) return;

    const incomingIndex = videos.findIndex((video) =>
      video.classList.contains('is-active') && video.classList.contains('is-mixing-in')
    );
    const visibleIndex = incomingIndex >= 0 ? incomingIndex : activeIndex;
    const visibleVideo = getVideo(visibleIndex);
    if (!visibleVideo) return;

    suspendedState = {
      index: visibleIndex,
      time: Number.isFinite(visibleVideo.currentTime) ? visibleVideo.currentTime : 0
    };
    activateSingleVideo(suspendedState.index, suspendedState.time);
  };

  const resumePlayback = (): void => {
    if (!canPlay()) return;

    const currentVideo = getVideo(activeIndex);
    const state = suspendedState ?? {
      index: activeIndex,
      time: currentVideo && Number.isFinite(currentVideo.currentTime) ? currentVideo.currentTime : 0
    };
    suspendedState = null;

    const activeVideo = activateSingleVideo(state.index, state.time);
    if (activeVideo) void activeVideo.play().then(scheduleBoundary).catch(() => undefined);
  };

  videos.forEach((video) => {
    video.addEventListener('playing', scheduleBoundary, { passive: true });
    video.addEventListener('seeked', scheduleBoundary, { passive: true });
    video.addEventListener('ratechange', scheduleBoundary, { passive: true });
    video.addEventListener('waiting', clearBoundaryTimer, { passive: true });
  });

  if (hero && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextVisible = entry.isIntersecting;
      if (nextVisible === heroVisible) return;
      heroVisible = nextVisible;
      if (heroVisible && !document.hidden) resumePlayback();
      else suspendPlayback();
    }, { rootMargin: '80px 0px', threshold: 0 });
    heroObserver.observe(hero);
  }

  const firstVideo = getVideo(activeIndex);
  if (firstVideo) void firstVideo.play().then(scheduleBoundary).catch(() => undefined);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendPlayback();
    else resumePlayback();
  });
  window.addEventListener('pagehide', suspendPlayback);
  window.addEventListener('pageshow', () => {
    if (!document.hidden) resumePlayback();
  });
  document.addEventListener('freeze', suspendPlayback);
  document.addEventListener('resume', () => {
    if (!document.hidden) resumePlayback();
  });
};
