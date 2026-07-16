(() => {
  const target = new Date("2026-07-30T20:00:00-03:00").getTime();
  const nodes = {
    days: document.querySelector('[data-countdown="days"]'),
    hours: document.querySelector('[data-countdown="hours"]'),
    minutes: document.querySelector('[data-countdown="minutes"]'),
    seconds: document.querySelector('[data-countdown="seconds"]')
  };

  const pad = (value) => String(value).padStart(2, "0");

  const renderCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1_000);

    nodes.days.textContent = pad(days);
    nodes.hours.textContent = pad(hours);
    nodes.minutes.textContent = pad(minutes);
    nodes.seconds.textContent = pad(seconds);

    return remaining;
  };

  if (renderCountdown() > 0) {
    const timerId = window.setInterval(() => {
      if (renderCountdown() === 0) {
        window.clearInterval(timerId);
      }
    }, 1_000);
  }

  const setupBookingDockLayout = () => {
    const dock = document.querySelector('.booking-dock');
    const metadata = Array.from(document.querySelectorAll('.booking-dock__meta'));
    const countdown = document.querySelector('.countdown');
    const cta = document.querySelector('.booking-dock__cta');

    if (!dock || metadata.length < 2 || !countdown || !cta) return;

    let stacked = null;
    let scheduledFrame = 0;

    const clearResponsiveStyles = () => {
      dock.style.gridTemplateColumns = '';
      dock.style.gridTemplateRows = '';
      dock.style.rowGap = '';

      metadata.forEach((item) => {
        item.style.gridColumn = '';
        item.style.gridRow = '';
        item.style.padding = '';
      });

      countdown.style.gridColumn = '';
      countdown.style.gridRow = '';
      cta.style.gridColumn = '';
      cta.style.gridRow = '';
    };

    const applyStackedLayout = () => {
      dock.style.gridTemplateColumns = 'minmax(148px, 1.25fr) minmax(0, 2.4fr) 104px';
      dock.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      dock.style.rowGap = '0';

      metadata[0].style.gridColumn = '1';
      metadata[0].style.gridRow = '1';
      metadata[1].style.gridColumn = '1';
      metadata[1].style.gridRow = '2';

      metadata.forEach((item) => {
        item.style.padding = '0 8px';
      });

      countdown.style.gridColumn = '2';
      countdown.style.gridRow = '1 / span 2';
      cta.style.gridColumn = '3';
      cta.style.gridRow = '1 / span 2';
    };

    const syncLayout = () => {
      const isDesktopDock = window.matchMedia('(min-width: 621px)').matches;
      const shouldStack = isDesktopDock && dock.getBoundingClientRect().width < 760;

      if (shouldStack === stacked) return;
      stacked = shouldStack;

      if (shouldStack) {
        applyStackedLayout();
      } else {
        clearResponsiveStyles();
      }
    };

    const scheduleSync = () => {
      if (scheduledFrame) window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        syncLayout();
      });
    };

    syncLayout();
    window.addEventListener('resize', scheduleSync, { passive: true });

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scheduleSync);
      observer.observe(dock);
    }

    document.fonts?.ready.then(scheduleSync).catch(() => undefined);
  };

  setupBookingDockLayout();

  const videos = Array.from(document.querySelectorAll('[data-loop-video]'));
  if (videos.length < 2) {
    const video = videos[0];
    let suspendedTime = 0;

    video?.play().catch(() => undefined);

    document.addEventListener('visibilitychange', () => {
      if (!video) return;

      if (document.hidden) {
        suspendedTime = video.currentTime;
        video.pause();
        return;
      }

      try {
        video.currentTime = suspendedTime;
      } catch {
        // Metadata may still be loading; playback will resume at the retained position.
      }
      video.play().catch(() => undefined);
    });
    return;
  }

  const mixDuration = 1_000;
  const mixLead = 1.2;
  let activeIndex = 0;
  let transitionInProgress = false;
  let animationFrameId = 0;
  let mixTimeoutId = 0;
  let mixGeneration = 0;
  let suspendedState = null;

  videos.forEach((video, index) => {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.classList.toggle('is-active', index === activeIndex);
  });

  const stopMonitor = () => {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  };

  const clearMixTimer = () => {
    if (mixTimeoutId) {
      window.clearTimeout(mixTimeoutId);
      mixTimeoutId = 0;
    }
  };

  const setCurrentTimeSafely = (video, requestedTime) => {
    const applyTime = () => {
      const duration = video.duration;
      const maximum = Number.isFinite(duration) && duration > 0
        ? Math.max(0, duration - 0.05)
        : Math.max(0, requestedTime);
      const nextTime = Math.min(Math.max(0, requestedTime), maximum);

      try {
        video.currentTime = nextTime;
      } catch {
        // Some browsers reject seeking until metadata is available.
      }
    };

    if (video.readyState >= 1) {
      applyTime();
    } else {
      video.addEventListener('loadedmetadata', applyTime, { once: true });
    }
  };

  const activateSingleVideo = (index, time) => {
    clearMixTimer();
    mixGeneration += 1;
    transitionInProgress = false;

    videos.forEach((video) => {
      video.pause();
      video.classList.remove('is-active', 'is-mixing-in');
    });

    activeIndex = index;
    const activeVideo = videos[activeIndex];
    activeVideo.classList.add('is-active');
    setCurrentTimeSafely(activeVideo, time);

    return activeVideo;
  };

  const monitorLoop = () => {
    const activeVideo = videos[activeIndex];
    const duration = activeVideo.duration;

    if (
      !document.hidden &&
      !transitionInProgress &&
      Number.isFinite(duration) &&
      duration > 0 &&
      duration - activeVideo.currentTime <= mixLead
    ) {
      mixLoopBoundary();
    }

    animationFrameId = window.requestAnimationFrame(monitorLoop);
  };

  const startMonitor = () => {
    stopMonitor();
    animationFrameId = window.requestAnimationFrame(monitorLoop);
  };

  const mixLoopBoundary = async () => {
    if (transitionInProgress || document.hidden) return;

    transitionInProgress = true;
    const generation = ++mixGeneration;
    const outgoing = videos[activeIndex];
    const nextIndex = (activeIndex + 1) % videos.length;
    const incoming = videos[nextIndex];

    try {
      incoming.pause();
      setCurrentTimeSafely(incoming, 0);
      incoming.classList.remove('is-active');
      incoming.classList.add('is-mixing-in');
      await incoming.play();

      if (generation !== mixGeneration || document.hidden) {
        incoming.pause();
        incoming.classList.remove('is-mixing-in');
        return;
      }

      incoming.getBoundingClientRect();

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (generation !== mixGeneration || document.hidden) return;
          incoming.classList.add('is-active');
        });
      });

      mixTimeoutId = window.setTimeout(() => {
        if (generation !== mixGeneration || document.hidden) return;

        outgoing.classList.remove('is-active');
        outgoing.pause();
        setCurrentTimeSafely(outgoing, 0);

        incoming.classList.remove('is-mixing-in');
        activeIndex = nextIndex;
        transitionInProgress = false;
        mixTimeoutId = 0;
      }, mixDuration + 80);
    } catch {
      if (generation === mixGeneration) {
        incoming.classList.remove('is-active', 'is-mixing-in');
        transitionInProgress = false;
      }
    }
  };

  const suspendPlayback = () => {
    if (suspendedState) return;

    const incomingIndex = videos.findIndex((video) =>
      video.classList.contains('is-active') && video.classList.contains('is-mixing-in')
    );
    const visibleIndex = incomingIndex >= 0 ? incomingIndex : activeIndex;
    const visibleVideo = videos[visibleIndex];

    suspendedState = {
      index: visibleIndex,
      time: Number.isFinite(visibleVideo.currentTime) ? visibleVideo.currentTime : 0
    };

    stopMonitor();
    activateSingleVideo(suspendedState.index, suspendedState.time);
  };

  const resumePlayback = () => {
    const state = suspendedState ?? {
      index: activeIndex,
      time: Number.isFinite(videos[activeIndex].currentTime)
        ? videos[activeIndex].currentTime
        : 0
    };

    suspendedState = null;
    const activeVideo = activateSingleVideo(state.index, state.time);
    activeVideo.play().catch(() => undefined);
    startMonitor();
  };

  videos[activeIndex].play().catch(() => undefined);
  startMonitor();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendPlayback();
    } else {
      resumePlayback();
    }
  });

  window.addEventListener('pagehide', suspendPlayback);
  window.addEventListener('pageshow', () => {
    if (!document.hidden) resumePlayback();
  });

  document.addEventListener('freeze', suspendPlayback);
  document.addEventListener('resume', () => {
    if (!document.hidden) resumePlayback();
  });
})();