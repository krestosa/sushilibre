import { query, queryAll } from '../shared/dom';
import type { RuntimeContext } from '../shared/runtime';

interface SuspendedVideoState {
  index: number;
  time: number;
}

const STALL_RECOVERY_DELAY = 2_400;
const HARD_STALL_THRESHOLD = 6_500;
const WATCHDOG_INTERVAL = 2_000;
const PLAY_START_TIMEOUT = 4_500;
const MAX_SOFT_RELOADS = 2;

const ensureVideoSource = (video: HTMLVideoElement): boolean => {
  if (
    video.currentSrc ||
    video.hasAttribute('src') ||
    Boolean(video.querySelector('source[src]'))
  ) {
    return true;
  }

  const source = video.dataset.videoSource;
  if (!source) return false;

  video.src = source;
  video.load();
  return true;
};

const releaseVideoSource = (video: HTMLVideoElement): void => {
  video.pause();
  video.removeAttribute('src');
  queryAll<HTMLSourceElement>('source', video).forEach((source) => source.removeAttribute('src'));
  video.load();
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
      // Media seeks can be rejected while the browser is rebuilding its buffer.
    }
  };

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) applyTime();
  else video.addEventListener('loadedmetadata', applyTime, { once: true });
};

const playWithTimeout = async (
  video: HTMLVideoElement,
  timeout = PLAY_START_TIMEOUT
): Promise<void> => {
  let timeoutId = 0;

  try {
    await Promise.race([
      video.play(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Video playback did not start in time.')),
          timeout
        );
      })
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const setupSingleVideoLoop = (
  video: HTMLVideoElement,
  unusedVideos: HTMLVideoElement[],
  hero: HTMLElement | null
): void => {
  unusedVideos.forEach((unusedVideo) => {
    unusedVideo.hidden = true;
    unusedVideo.classList.remove('is-active', 'is-mixing-in');
    releaseVideoSource(unusedVideo);
  });

  video.hidden = false;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.classList.add('is-active');
  video.classList.remove('is-mixing-in');
  ensureVideoSource(video);

  let heroVisible = true;
  let suspendedTime = 0;
  let recoveryTimer = 0;
  let recoveryInProgress = false;
  let reloadAttempts = 0;
  let lastMediaTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  let lastProgressAt = performance.now();

  const canPlay = (): boolean => !document.hidden && heroVisible && navigator.onLine !== false;

  const clearRecoveryTimer = (): void => {
    if (!recoveryTimer) return;
    window.clearTimeout(recoveryTimer);
    recoveryTimer = 0;
  };

  const noteProgress = (): void => {
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : lastMediaTime;
    const advanced = Math.abs(currentTime - lastMediaTime) >= 0.04;

    if (advanced || currentTime < lastMediaTime) {
      lastMediaTime = currentTime;
      lastProgressAt = performance.now();
      reloadAttempts = 0;
    }
  };

  const rebuildBuffer = (): void => {
    const duration = video.duration;
    const nearBoundary = Number.isFinite(duration) && duration > 0
      ? duration - video.currentTime < 0.45
      : false;
    const resumeTime = reloadAttempts >= MAX_SOFT_RELOADS || nearBoundary
      ? 0
      : Number.isFinite(video.currentTime)
        ? video.currentTime
        : suspendedTime;

    reloadAttempts += 1;
    video.load();
    setCurrentTimeSafely(video, resumeTime);
  };

  const recoverPlayback = async (forceReload = false): Promise<void> => {
    clearRecoveryTimer();
    if (!canPlay() || recoveryInProgress) return;

    recoveryInProgress = true;

    try {
      ensureVideoSource(video);

      const duration = video.duration;
      const reachedBoundary = video.ended || (
        Number.isFinite(duration) &&
        duration > 0 &&
        duration - video.currentTime < 0.12
      );

      if (reachedBoundary) setCurrentTimeSafely(video, 0);
      if (forceReload || video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        rebuildBuffer();
      }

      await playWithTimeout(video);
      lastProgressAt = performance.now();
    } catch {
      if (canPlay()) {
        recoveryTimer = window.setTimeout(() => {
          recoveryTimer = 0;
          void recoverPlayback(true);
        }, STALL_RECOVERY_DELAY);
      }
    } finally {
      recoveryInProgress = false;
    }
  };

  const scheduleRecovery = (forceReload = false): void => {
    if (!canPlay() || recoveryTimer || recoveryInProgress) return;

    recoveryTimer = window.setTimeout(() => {
      recoveryTimer = 0;
      void recoverPlayback(forceReload);
    }, STALL_RECOVERY_DELAY);
  };

  const suspendPlayback = (): void => {
    clearRecoveryTimer();
    suspendedTime = Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
    video.pause();
  };

  const resumePlayback = (): void => {
    if (!canPlay()) return;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setCurrentTimeSafely(video, suspendedTime);
    }
    void recoverPlayback(false);
  };

  video.addEventListener('timeupdate', noteProgress, { passive: true });
  video.addEventListener('playing', () => {
    clearRecoveryTimer();
    lastProgressAt = performance.now();
    noteProgress();
  }, { passive: true });
  video.addEventListener('canplay', () => {
    clearRecoveryTimer();
    if (canPlay() && video.paused) void recoverPlayback(false);
  }, { passive: true });
  video.addEventListener('waiting', () => scheduleRecovery(false), { passive: true });
  video.addEventListener('stalled', () => scheduleRecovery(true), { passive: true });
  video.addEventListener('suspend', () => {
    if (!video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      scheduleRecovery(false);
    }
  }, { passive: true });
  video.addEventListener('ended', () => {
    setCurrentTimeSafely(video, 0);
    void recoverPlayback(false);
  }, { passive: true });
  video.addEventListener('error', () => scheduleRecovery(true), { passive: true });

  if (hero && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      heroVisible = entry.isIntersecting;
      if (heroVisible && !document.hidden) resumePlayback();
      else suspendPlayback();
    }, { rootMargin: '80px 0px', threshold: 0 });

    observer.observe(hero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendPlayback();
    else resumePlayback();
  });
  window.addEventListener('pagehide', suspendPlayback, { passive: true });
  window.addEventListener('pageshow', resumePlayback, { passive: true });
  window.addEventListener('online', resumePlayback, { passive: true });

  window.setInterval(() => {
    if (!canPlay()) return;

    noteProgress();
    const stalledFor = performance.now() - lastProgressAt;
    const unexpectedlyPaused = video.paused && !video.ended;
    const bufferStarved = video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;

    if (unexpectedlyPaused || stalledFor >= HARD_STALL_THRESHOLD) {
      scheduleRecovery(bufferStarved || stalledFor >= HARD_STALL_THRESHOLD);
    }
  }, WATCHDOG_INTERVAL);

  void recoverPlayback(false);
};

export const setupVideoLoop = ({
  root,
  compactViewport,
  coarsePointer
}: RuntimeContext): void => {
  const hero = query<HTMLElement>('.hero');
  const videos = queryAll<HTMLVideoElement>('[data-loop-video]');
  const firstVideo = videos[0];
  if (!firstVideo) return;

  const compactPlayback = compactViewport.matches || coarsePointer.matches;
  const mixDuration = compactPlayback ? 650 : 900;
  const mixLead = mixDuration / 1_000 + 0.24;
  root.style.setProperty('--video-mix-duration', `${mixDuration}ms`);

  if (compactPlayback || videos.length < 2) {
    setupSingleVideoLoop(firstVideo, videos.slice(1), hero);
    return;
  }

  videos.forEach((video, index) => {
    video.hidden = false;
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = index === 0 ? 'metadata' : 'none';
    video.classList.toggle('is-active', index === 0);
    video.classList.remove('is-mixing-in');
  });

  let activeIndex = 0;
  let transitionInProgress = false;
  let boundaryTimerId = 0;
  let mixTimerId = 0;
  let recoveryTimerId = 0;
  let mixGeneration = 0;
  let suspendedState: SuspendedVideoState | null = null;
  let heroVisible = true;
  let lastMediaTime = 0;
  let lastProgressAt = performance.now();

  const canPlay = (): boolean => !document.hidden && heroVisible && navigator.onLine !== false;
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

  const clearRecoveryTimer = (): void => {
    if (!recoveryTimerId) return;
    window.clearTimeout(recoveryTimerId);
    recoveryTimerId = 0;
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

    ensureVideoSource(activeVideo);
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

  const recoverActiveVideo = async (forceReload = false): Promise<void> => {
    clearRecoveryTimer();
    if (!canPlay()) return;

    const currentVideo = getVideo(activeIndex);
    if (!currentVideo) return;

    const duration = currentVideo.duration;
    const nearBoundary = Number.isFinite(duration) && duration > 0
      ? duration - currentVideo.currentTime < 0.35
      : false;
    const resumeTime = nearBoundary ? 0 : Number.isFinite(currentVideo.currentTime)
      ? currentVideo.currentTime
      : 0;
    const activeVideo = activateSingleVideo(activeIndex, resumeTime);
    if (!activeVideo) return;

    if (forceReload || activeVideo.error) {
      activeVideo.load();
      setCurrentTimeSafely(activeVideo, resumeTime);
    }

    try {
      await playWithTimeout(activeVideo);
      lastMediaTime = activeVideo.currentTime;
      lastProgressAt = performance.now();
      scheduleBoundary();
    } catch {
      recoveryTimerId = window.setTimeout(() => {
        recoveryTimerId = 0;
        void recoverActiveVideo(true);
      }, STALL_RECOVERY_DELAY);
    }
  };

  const scheduleRecovery = (forceReload = false): void => {
    if (!canPlay() || recoveryTimerId) return;

    recoveryTimerId = window.setTimeout(() => {
      recoveryTimerId = 0;
      void recoverActiveVideo(forceReload);
    }, STALL_RECOVERY_DELAY);
  };

  async function mixLoopBoundary(): Promise<void> {
    if (transitionInProgress || !canPlay()) return;

    const outgoing = getVideo(activeIndex);
    const nextIndex = (activeIndex + 1) % videos.length;
    const incoming = getVideo(nextIndex);
    if (!outgoing || !incoming || !ensureVideoSource(incoming)) return;

    transitionInProgress = true;
    clearBoundaryTimer();
    clearRecoveryTimer();
    const generation = ++mixGeneration;

    try {
      incoming.pause();
      setCurrentTimeSafely(incoming, 0);
      incoming.classList.remove('is-active');
      incoming.classList.add('is-mixing-in');
      await playWithTimeout(incoming);

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
        lastMediaTime = incoming.currentTime;
        lastProgressAt = performance.now();
        scheduleBoundary();
      }, mixDuration + 50);
    } catch {
      incoming.pause();
      incoming.classList.remove('is-active', 'is-mixing-in');
      if (generation !== mixGeneration) return;

      transitionInProgress = false;
      setCurrentTimeSafely(outgoing, 0);
      outgoing.classList.add('is-active');
      void recoverActiveVideo(false);
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
    if (activeVideo) void playWithTimeout(activeVideo).then(scheduleBoundary).catch(() => scheduleRecovery(true));
  };

  videos.forEach((video, index) => {
    video.addEventListener('timeupdate', () => {
      if (index !== activeIndex) return;
      const currentTime = video.currentTime;
      if (Math.abs(currentTime - lastMediaTime) >= 0.04 || currentTime < lastMediaTime) {
        lastMediaTime = currentTime;
        lastProgressAt = performance.now();
      }
    }, { passive: true });
    video.addEventListener('playing', () => {
      clearRecoveryTimer();
      lastProgressAt = performance.now();
      scheduleBoundary();
    }, { passive: true });
    video.addEventListener('seeked', scheduleBoundary, { passive: true });
    video.addEventListener('ratechange', scheduleBoundary, { passive: true });
    video.addEventListener('waiting', () => {
      clearBoundaryTimer();
      if (index === activeIndex) scheduleRecovery(false);
    }, { passive: true });
    video.addEventListener('stalled', () => {
      if (index === activeIndex) scheduleRecovery(true);
    }, { passive: true });
    video.addEventListener('error', () => {
      if (index === activeIndex) scheduleRecovery(true);
    }, { passive: true });
    video.addEventListener('ended', () => {
      if (index === activeIndex) void mixLoopBoundary();
    }, { passive: true });
  });

  firstVideo.addEventListener('canplay', () => {
    const secondaryVideo = getVideo(1);
    if (!secondaryVideo) return;
    secondaryVideo.preload = 'metadata';
    ensureVideoSource(secondaryVideo);
  }, { once: true, passive: true });

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

  window.setInterval(() => {
    if (!canPlay()) return;
    const activeVideo = getVideo(activeIndex);
    if (!activeVideo) return;

    const stalledFor = performance.now() - lastProgressAt;
    const unexpectedlyPaused = activeVideo.paused && !activeVideo.ended;
    if (unexpectedlyPaused || stalledFor >= HARD_STALL_THRESHOLD) {
      scheduleRecovery(activeVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA);
    }
  }, WATCHDOG_INTERVAL);

  ensureVideoSource(firstVideo);
  void playWithTimeout(firstVideo).then(scheduleBoundary).catch(() => scheduleRecovery(true));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendPlayback();
    else resumePlayback();
  });
  window.addEventListener('pagehide', suspendPlayback, { passive: true });
  window.addEventListener('pageshow', resumePlayback, { passive: true });
  window.addEventListener('online', resumePlayback, { passive: true });
};
