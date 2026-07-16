(() => {
  const root = document.documentElement;
  const isFirefox = /Firefox\//i.test(navigator.userAgent);
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const compactViewport = window.matchMedia('(max-width: 820px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.toggle('is-firefox', isFirefox);
  root.classList.toggle('is-coarse-pointer', coarsePointer.matches);

  const performanceStyle = document.createElement('style');
  performanceStyle.dataset.runtimePerformance = '';
  performanceStyle.textContent = `
    :root {
      --video-mix-duration: 900ms;
    }

    .hero__video {
      transition-duration: var(--video-mix-duration) !important;
    }

    .hero__video-stack {
      contain: paint;
    }

    @media (max-width: 820px), (pointer: coarse) {
      :root {
        --video-mix-duration: 650ms;
      }

      .booking-dock {
        background: rgba(9, 7, 6, .95) !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, .32) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .hero__grain,
      .menu-section__background::after {
        display: none !important;
      }

      .menu-section__background {
        contain: paint;
      }

      .title-word--sushi,
      .title-word--libre {
        animation-name: stage-title-in-lite !important;
      }

      .booking-dock__cta > i[aria-hidden="true"] {
        filter: blur(3px) !important;
      }
    }

    html.is-firefox .booking-dock {
      background: rgba(9, 7, 6, .95) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    html.is-firefox .hero__grain,
    html.is-firefox .menu-section__background::after {
      display: none !important;
    }

    html.is-firefox .menu-section__background {
      contain: paint;
    }

    @keyframes stage-title-in-lite {
      from {
        opacity: 0;
        transform: translate3d(0, 12px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }
  `;
  document.head.append(performanceStyle);

  coarsePointer.addEventListener?.('change', (event) => {
    root.classList.toggle('is-coarse-pointer', event.matches);
  });

  const target = new Date('2026-07-30T20:00:00-03:00').getTime();
  const countdownNodes = {
    days: document.querySelector('[data-countdown="days"]'),
    hours: document.querySelector('[data-countdown="hours"]'),
    minutes: document.querySelector('[data-countdown="minutes"]'),
    seconds: document.querySelector('[data-countdown="seconds"]')
  };

  const pad = (value) => String(value).padStart(2, '0');

  const renderCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const values = {
      days: Math.floor(remaining / 86_400_000),
      hours: Math.floor((remaining % 86_400_000) / 3_600_000),
      minutes: Math.floor((remaining % 3_600_000) / 60_000),
      seconds: Math.floor((remaining % 60_000) / 1_000)
    };

    Object.entries(values).forEach(([key, value]) => {
      const node = countdownNodes[key];
      const nextValue = pad(value);
      if (node && node.textContent !== nextValue) node.textContent = nextValue;
    });

    return remaining;
  };

  if (renderCountdown() > 0) {
    const timerId = window.setInterval(() => {
      if (renderCountdown() === 0) window.clearInterval(timerId);
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
      const shouldStack = isDesktopDock && dock.clientWidth < 760;

      if (shouldStack === stacked) return;
      stacked = shouldStack;
      if (shouldStack) applyStackedLayout();
      else clearResponsiveStyles();
    };

    const scheduleSync = () => {
      if (scheduledFrame) return;
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

  const setupBookingCtaSheen = () => {
    const cta = document.querySelector('.booking-dock__cta');
    if (!cta || reducedMotion.matches || typeof cta.animate !== 'function') return;

    cta.style.filter = 'none';
    const runtimeStyle = document.createElement('style');
    runtimeStyle.textContent = '.booking-dock__cta::before{animation:none!important;opacity:0!important;}';
    document.head.append(runtimeStyle);

    const sheen = document.createElement('i');
    sheen.setAttribute('aria-hidden', 'true');
    Object.assign(sheen.style, {
      position: 'absolute',
      zIndex: '1',
      top: '-42%',
      bottom: '-42%',
      left: '0',
      width: '72%',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translate3d(-135%, 0, 0) skewX(-18deg)',
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 12%, rgba(255,255,255,.14) 26%, rgba(255,255,255,.36) 42%, rgba(255,255,255,.58) 50%, rgba(255,255,255,.36) 58%, rgba(255,255,255,.14) 74%, rgba(255,255,255,.04) 88%, transparent 100%)',
      filter: 'blur(5px)',
      willChange: 'transform, opacity'
    });
    cta.prepend(sheen);

    const initialDelay = 2_350;
    const regularDelay = 4_700;
    const duration = compactViewport.matches || coarsePointer.matches ? 850 : 1_050;
    let timerId = 0;
    let activeAnimation = null;
    let interactionArmed = true;
    let initialPending = true;

    const clearTimer = () => {
      if (!timerId) return;
      window.clearTimeout(timerId);
      timerId = 0;
    };

    const scheduleRegularLoop = (delay = regularDelay) => {
      clearTimer();
      timerId = window.setTimeout(() => {
        timerId = 0;
        runSheen();
      }, delay);
    };

    const runSheen = () => {
      clearTimer();
      activeAnimation?.cancel();

      activeAnimation = sheen.animate([
        { transform: 'translate3d(-135%, 0, 0) skewX(-18deg)', opacity: 0 },
        { transform: 'translate3d(-112%, 0, 0) skewX(-18deg)', opacity: 0, offset: .08 },
        { transform: 'translate3d(-72%, 0, 0) skewX(-18deg)', opacity: .68, offset: .24 },
        { transform: 'translate3d(170%, 0, 0) skewX(-18deg)', opacity: .46, offset: .82 },
        { transform: 'translate3d(205%, 0, 0) skewX(-18deg)', opacity: 0 }
      ], {
        duration,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'none'
      });

      activeAnimation.addEventListener('finish', () => {
        activeAnimation = null;
        scheduleRegularLoop();
      }, { once: true });
    };

    const triggerInteractionSheen = () => {
      if (!interactionArmed || document.hidden) return;
      interactionArmed = false;
      initialPending = false;
      runSheen();
    };

    timerId = window.setTimeout(() => {
      timerId = 0;
      initialPending = false;
      runSheen();
    }, initialDelay);

    cta.addEventListener('pointerenter', triggerInteractionSheen, { passive: true });
    cta.addEventListener('pointerleave', () => {
      interactionArmed = true;
    }, { passive: true });
    cta.addEventListener('focus', triggerInteractionSheen);
    cta.addEventListener('blur', () => {
      interactionArmed = true;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimer();
        activeAnimation?.cancel();
        activeAnimation = null;
        return;
      }
      scheduleRegularLoop(initialPending ? 650 : regularDelay);
    });
  };

  const setupEfficientSmoothScroll = () => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reducedMotion.matches) return;

    if (isFirefox || !finePointer.matches) return;

    let targetY = window.scrollY;
    let frameId = 0;

    const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      targetY = window.scrollY;
    };

    const step = () => {
      const currentY = window.scrollY;
      const distance = targetY - currentY;

      if (Math.abs(distance) < .6) {
        window.scrollTo(0, targetY);
        frameId = 0;
        return;
      }

      window.scrollTo(0, currentY + distance * .24);
      frameId = window.requestAnimationFrame(step);
    };

    const onWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const isCoarseWheel = event.deltaMode !== 0 || Math.abs(event.deltaY) >= 50;
      if (!isCoarseWheel) return;

      event.preventDefault();
      if (!frameId) targetY = window.scrollY;

      const unit = event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
      const delta = clamp(event.deltaY * unit, -240, 240);
      targetY = clamp(targetY + delta * .9, 0, maximumScroll());
      if (!frameId) frameId = window.requestAnimationFrame(step);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', stop, { passive: true });
    window.addEventListener('resize', () => {
      targetY = clamp(targetY, 0, maximumScroll());
    }, { passive: true });
    window.addEventListener('scroll', () => {
      if (!frameId) targetY = window.scrollY;
    }, { passive: true });
  };

  const setupVideoLoop = () => {
    const hero = document.querySelector('.hero');
    const videos = Array.from(document.querySelectorAll('[data-loop-video]'));
    if (!videos.length) return;

    const compactPlayback = compactViewport.matches || coarsePointer.matches;
    const mixDuration = compactPlayback ? 650 : 900;
    const mixLead = mixDuration / 1_000 + .24;
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
      let suspendedTime = 0;
      let heroVisible = true;

      const syncPlayback = () => {
        if (!document.hidden && heroVisible) {
          try { video.currentTime = suspendedTime; } catch {}
          video.play().catch(() => undefined);
        } else {
          suspendedTime = Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
          video.pause();
        }
      };

      if (hero && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          heroVisible = entry.isIntersecting;
          syncPlayback();
        }, { rootMargin: '80px 0px', threshold: 0 }).observe(hero);
      }

      document.addEventListener('visibilitychange', syncPlayback);
      video.play().catch(() => undefined);
      return;
    }

    let activeIndex = 0;
    let transitionInProgress = false;
    let boundaryTimerId = 0;
    let mixTimerId = 0;
    let mixGeneration = 0;
    let suspendedState = null;
    let heroVisible = true;

    const canPlay = () => !document.hidden && heroVisible;

    const clearBoundaryTimer = () => {
      if (!boundaryTimerId) return;
      window.clearTimeout(boundaryTimerId);
      boundaryTimerId = 0;
    };

    const clearMixTimer = () => {
      if (!mixTimerId) return;
      window.clearTimeout(mixTimerId);
      mixTimerId = 0;
    };

    const setCurrentTimeSafely = (video, requestedTime) => {
      const applyTime = () => {
        const duration = video.duration;
        const maximum = Number.isFinite(duration) && duration > 0
          ? Math.max(0, duration - .05)
          : Math.max(0, requestedTime);
        const nextTime = Math.min(Math.max(0, requestedTime), maximum);
        try { video.currentTime = nextTime; } catch {}
      };

      if (video.readyState >= 1) applyTime();
      else video.addEventListener('loadedmetadata', applyTime, { once: true });
    };

    const activateSingleVideo = (index, time) => {
      clearBoundaryTimer();
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

    const scheduleBoundary = () => {
      clearBoundaryTimer();
      if (!canPlay() || transitionInProgress) return;

      const activeVideo = videos[activeIndex];
      const duration = activeVideo.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        activeVideo.addEventListener('loadedmetadata', scheduleBoundary, { once: true });
        return;
      }

      const playbackRate = Math.max(.1, Math.abs(activeVideo.playbackRate || 1));
      const remaining = duration - activeVideo.currentTime;
      const delay = Math.max(0, ((remaining - mixLead) / playbackRate) * 1_000);

      boundaryTimerId = window.setTimeout(() => {
        boundaryTimerId = 0;
        const currentRemaining = activeVideo.duration - activeVideo.currentTime;
        if (currentRemaining <= mixLead + .16) mixLoopBoundary();
        else scheduleBoundary();
      }, delay);
    };

    const mixLoopBoundary = async () => {
      if (transitionInProgress || !canPlay()) return;

      transitionInProgress = true;
      clearBoundaryTimer();
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
        outgoing.play().then(scheduleBoundary).catch(() => undefined);
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
      activateSingleVideo(suspendedState.index, suspendedState.time);
    };

    const resumePlayback = () => {
      if (!canPlay()) return;

      const state = suspendedState ?? {
        index: activeIndex,
        time: Number.isFinite(videos[activeIndex].currentTime) ? videos[activeIndex].currentTime : 0
      };
      suspendedState = null;

      const activeVideo = activateSingleVideo(state.index, state.time);
      activeVideo.play().then(scheduleBoundary).catch(() => undefined);
    };

    videos.forEach((video) => {
      video.addEventListener('playing', scheduleBoundary, { passive: true });
      video.addEventListener('seeked', scheduleBoundary, { passive: true });
      video.addEventListener('ratechange', scheduleBoundary, { passive: true });
      video.addEventListener('waiting', clearBoundaryTimer, { passive: true });
    });

    if (hero && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(([entry]) => {
        const nextVisible = entry.isIntersecting;
        if (nextVisible === heroVisible) return;
        heroVisible = nextVisible;
        if (heroVisible && !document.hidden) resumePlayback();
        else suspendPlayback();
      }, { rootMargin: '80px 0px', threshold: 0 });
      heroObserver.observe(hero);
    }

    videos[activeIndex].play().then(scheduleBoundary).catch(() => undefined);

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

  setupBookingDockLayout();
  setupBookingCtaSheen();
  setupEfficientSmoothScroll();
  setupVideoLoop();
})();