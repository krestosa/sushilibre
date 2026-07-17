"use strict";
(() => {
  // src/ts/shared/dom.ts
  var query = (selector, root = document) => root.querySelector(selector);
  var queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  var setStyles = (element, styles) => {
    Object.assign(element.style, styles);
  };

  // src/ts/features/booking-cta-sheen.ts
  var setupBookingCtaSheen = ({
    reducedMotion: reducedMotion2,
    compactViewport,
    coarsePointer
  }) => {
    const cta = query(".booking-dock__cta");
    if (!cta || reducedMotion2.matches || typeof cta.animate !== "function") return;
    cta.style.filter = "none";
    cta.classList.add("has-runtime-sheen");
    const sheen = document.createElement("i");
    sheen.setAttribute("aria-hidden", "true");
    setStyles(sheen, {
      position: "absolute",
      zIndex: "1",
      top: "-42%",
      bottom: "-42%",
      left: "0",
      width: "72%",
      opacity: "0",
      pointerEvents: "none",
      transform: "translate3d(-135%, 0, 0) skewX(-18deg)",
      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 12%, rgba(255,255,255,.14) 26%, rgba(255,255,255,.36) 42%, rgba(255,255,255,.58) 50%, rgba(255,255,255,.36) 58%, rgba(255,255,255,.14) 74%, rgba(255,255,255,.04) 88%, transparent 100%)",
      filter: "blur(5px)",
      willChange: "transform, opacity"
    });
    cta.prepend(sheen);
    const initialDelay = 2350;
    const regularDelay = 4700;
    const duration = compactViewport.matches || coarsePointer.matches ? 850 : 1050;
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
    function runSheen() {
      clearTimer();
      activeAnimation?.cancel();
      const animation = sheen.animate([
        { transform: "translate3d(-135%, 0, 0) skewX(-18deg)", opacity: 0 },
        { transform: "translate3d(-112%, 0, 0) skewX(-18deg)", opacity: 0, offset: 0.08 },
        { transform: "translate3d(-72%, 0, 0) skewX(-18deg)", opacity: 0.68, offset: 0.24 },
        { transform: "translate3d(170%, 0, 0) skewX(-18deg)", opacity: 0.46, offset: 0.82 },
        { transform: "translate3d(205%, 0, 0) skewX(-18deg)", opacity: 0 }
      ], {
        duration,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "none"
      });
      activeAnimation = animation;
      animation.addEventListener("finish", () => {
        if (activeAnimation === animation) activeAnimation = null;
        scheduleRegularLoop();
      }, { once: true });
    }
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
    cta.addEventListener("pointerenter", triggerInteractionSheen, { passive: true });
    cta.addEventListener("pointerleave", () => {
      interactionArmed = true;
    }, { passive: true });
    cta.addEventListener("focus", triggerInteractionSheen);
    cta.addEventListener("blur", () => {
      interactionArmed = true;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimer();
        activeAnimation?.cancel();
        activeAnimation = null;
        return;
      }
      scheduleRegularLoop(initialPending ? 650 : regularDelay);
    });
  };

  // src/ts/features/booking-dock-layout.ts
  var setupBookingDockLayout = () => {
    const dock2 = query(".booking-dock");
    const metadata = queryAll(".booking-dock__meta");
    const countdown = query(".countdown");
    const cta = query(".booking-dock__cta");
    const [venueMeta, dateMeta, timeMeta] = metadata;
    if (!dock2 || !venueMeta || !dateMeta || !timeMeta || !countdown || !cta) return;
    let activeMode = null;
    let scheduledFrame = 0;
    const placeMetadata = ({
      row,
      padding
    }) => {
      metadata.forEach((item, index) => {
        item.style.gridColumn = String(index + 1);
        item.style.gridRow = row;
        item.style.padding = padding;
      });
    };
    const applySingleRowLayout = ({
      width,
      columns
    }) => {
      dock2.style.width = width;
      dock2.style.gridTemplateColumns = columns;
      dock2.style.gridTemplateRows = "minmax(0, 1fr)";
      dock2.style.gap = "9px";
      dock2.style.rowGap = "9px";
      placeMetadata({ row: "1", padding: "0 8px" });
      countdown.style.gridColumn = "4";
      countdown.style.gridRow = "1";
      cta.style.gridColumn = "5";
      cta.style.gridRow = "1";
    };
    const applyDesktopLayout = () => {
      applySingleRowLayout({
        width: "min(1040px, calc(100vw - 48px))",
        columns: "minmax(158px, 1.16fr) minmax(150px, 1.08fr) minmax(86px, 0.68fr) minmax(0, 2.55fr) 108px"
      });
    };
    const applyCompactLayout = () => {
      applySingleRowLayout({
        width: "min(920px, calc(100vw - 32px))",
        columns: "minmax(142px, 1.1fr) minmax(132px, 1fr) minmax(78px, 0.62fr) minmax(0, 2.3fr) 104px"
      });
    };
    const applyMobileLayout = () => {
      dock2.style.width = "";
      dock2.style.gridTemplateColumns = "minmax(0, 1.28fr) minmax(0, 1.05fr) minmax(0, 0.72fr) 96px";
      dock2.style.gridTemplateRows = "48px 96px";
      dock2.style.gap = "8px";
      dock2.style.rowGap = "8px";
      placeMetadata({ row: "1", padding: "0 5px" });
      countdown.style.gridColumn = "1 / span 3";
      countdown.style.gridRow = "2";
      cta.style.gridColumn = "4";
      cta.style.gridRow = "1 / span 2";
    };
    const resolveMode = () => {
      if (window.matchMedia("(max-width: 840px)").matches) return "mobile";
      if (window.matchMedia("(max-width: 1100px)").matches) return "compact";
      return "desktop";
    };
    const syncLayout = () => {
      const nextMode = resolveMode();
      if (nextMode === activeMode) return;
      activeMode = nextMode;
      if (nextMode === "mobile") applyMobileLayout();
      else if (nextMode === "compact") applyCompactLayout();
      else applyDesktopLayout();
    };
    const scheduleSync = () => {
      if (scheduledFrame) return;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        syncLayout();
      });
    };
    syncLayout();
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleSync);
      observer.observe(dock2);
    }
    document.fonts.ready.then(scheduleSync).catch(() => void 0);
  };

  // src/ts/features/countdown.ts
  var keys = ["days", "hours", "minutes", "seconds"];
  var target = (/* @__PURE__ */ new Date("2026-07-30T20:00:00-03:00")).getTime();
  var setupCountdown = () => {
    const nodes = {
      days: query('[data-countdown="days"]'),
      hours: query('[data-countdown="hours"]'),
      minutes: query('[data-countdown="minutes"]'),
      seconds: query('[data-countdown="seconds"]')
    };
    const pad = (value) => String(value).padStart(2, "0");
    const render = () => {
      const remaining = Math.max(0, target - Date.now());
      const values = {
        days: Math.floor(remaining / 864e5),
        hours: Math.floor(remaining % 864e5 / 36e5),
        minutes: Math.floor(remaining % 36e5 / 6e4),
        seconds: Math.floor(remaining % 6e4 / 1e3)
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
    }, 1e3);
  };

  // src/ts/features/piece-viewer.ts
  var LOADING_MESSAGE = "CARGANDO IMAGEN";
  var ERROR_MESSAGE = "IMAGEN NO DISPONIBLE";
  var setupPieceViewer = () => {
    const dialog = query("[data-piece-viewer]");
    const image = query("[data-piece-viewer-image]", dialog ?? void 0);
    const title = query("[data-piece-viewer-title]", dialog ?? void 0);
    const status = query("[data-piece-viewer-status]", dialog ?? void 0);
    const closeButton = query("[data-piece-viewer-close]", dialog ?? void 0);
    const openButtons = queryAll("[data-piece-viewer-open]");
    if (!dialog || !image || !title || !status || !closeButton || !openButtons.length) return;
    let activeButton = null;
    const setLoadingState = () => {
      dialog.dataset.state = "loading";
      status.textContent = LOADING_MESSAGE;
      status.hidden = false;
      image.hidden = true;
    };
    const setReadyState = () => {
      dialog.dataset.state = "ready";
      status.hidden = true;
      image.hidden = false;
    };
    const setErrorState = () => {
      dialog.dataset.state = "error";
      status.textContent = ERROR_MESSAGE;
      status.hidden = false;
      image.hidden = true;
    };
    const openDialog = () => {
      if (dialog.open) return;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
        return;
      }
      dialog.setAttribute("open", "");
    };
    const closeDialog = () => {
      if (!dialog.open) return;
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    };
    const openPiece = (button) => {
      const name = button.dataset.pieceName?.trim();
      const source = button.dataset.pieceImage?.trim();
      if (!name || !source) return;
      activeButton = button;
      title.textContent = name;
      image.alt = `${name} \u2014 SushiClub`;
      setLoadingState();
      document.documentElement.classList.add("has-piece-viewer");
      openDialog();
      image.removeAttribute("src");
      window.requestAnimationFrame(() => {
        image.src = source;
      });
    };
    const cleanup = () => {
      document.documentElement.classList.remove("has-piece-viewer");
      image.removeAttribute("src");
      image.alt = "";
      title.textContent = "";
      status.textContent = LOADING_MESSAGE;
      status.hidden = false;
      image.hidden = true;
      delete dialog.dataset.state;
      const button = activeButton;
      activeButton = null;
      button?.focus({ preventScroll: true });
    };
    openButtons.forEach((button) => {
      button.addEventListener("click", () => openPiece(button));
    });
    image.addEventListener("load", setReadyState);
    image.addEventListener("error", setErrorState);
    closeButton.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", cleanup);
    dialog.addEventListener("cancel", () => {
      window.requestAnimationFrame(() => {
        if (!dialog.open) cleanup();
      });
    });
  };

  // src/ts/features/smooth-scroll.ts
  var setupEfficientSmoothScroll = ({
    isFirefox,
    reducedMotion: reducedMotion2
  }) => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reducedMotion2.matches || isFirefox || !finePointer.matches) return;
    let targetY = window.scrollY;
    let frameId = 0;
    const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clamp2 = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      targetY = window.scrollY;
    };
    const step = () => {
      const currentY = window.scrollY;
      const distance = targetY - currentY;
      if (Math.abs(distance) < 0.6) {
        window.scrollTo(0, targetY);
        frameId = 0;
        return;
      }
      window.scrollTo(0, currentY + distance * 0.24);
      frameId = window.requestAnimationFrame(step);
    };
    const onWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const isCoarseWheel = event.deltaMode !== 0 || Math.abs(event.deltaY) >= 50;
      if (!isCoarseWheel) return;
      event.preventDefault();
      if (!frameId) targetY = window.scrollY;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = clamp2(event.deltaY * unit, -240, 240);
      targetY = clamp2(targetY + delta * 0.9, 0, maximumScroll());
      if (!frameId) frameId = window.requestAnimationFrame(step);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("resize", () => {
      targetY = clamp2(targetY, 0, maximumScroll());
    }, { passive: true });
    window.addEventListener("scroll", () => {
      if (!frameId) targetY = window.scrollY;
    }, { passive: true });
  };

  // src/ts/features/tap-search-guard.ts
  var TAP_MAX_DURATION = 380;
  var TAP_MOVEMENT_TOLERANCE = 12;
  var SELECTION_SUPPRESSION_DURATION = 700;
  var getElement = (target2) => {
    if (target2 instanceof Element) return target2;
    if (target2 instanceof Node) return target2.parentElement;
    return null;
  };
  var isEditableTarget = (target2) => Boolean(target2?.closest(
    'input, textarea, select, option, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
  ));
  var findTouch = (touches, identifier) => {
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === identifier) return touch;
    }
    return null;
  };
  var setupTapSearchGuard = () => {
    if (navigator.maxTouchPoints <= 0) return;
    let gesture = null;
    let suppressSelectionUntil = 0;
    let suppressedTarget = null;
    let cleanupTimer = 0;
    const selectionSuppressionIsActive = () => performance.now() <= suppressSelectionUntil;
    const clearSuppression = () => {
      suppressSelectionUntil = 0;
      suppressedTarget = null;
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = 0;
      }
    };
    const selectionTouchesSuppressedTarget = () => {
      if (!suppressedTarget) return false;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return true;
      const anchor = getElement(selection.anchorNode);
      const focus = getElement(selection.focusNode);
      return [anchor, focus].some((element) => Boolean(
        element && (suppressedTarget?.contains(element) || element.contains(suppressedTarget))
      ));
    };
    const clearTapSelection = () => {
      if (!selectionSuppressionIsActive()) return;
      if (!selectionTouchesSuppressedTarget()) return;
      const selection = window.getSelection();
      if (selection?.rangeCount) selection.removeAllRanges();
    };
    const armSelectionSuppression = (target2) => {
      if (isEditableTarget(target2)) return;
      suppressSelectionUntil = performance.now() + SELECTION_SUPPRESSION_DURATION;
      suppressedTarget = target2;
      clearTapSelection();
      queueMicrotask(clearTapSelection);
      window.requestAnimationFrame(() => {
        clearTapSelection();
        window.requestAnimationFrame(clearTapSelection);
      });
      window.setTimeout(clearTapSelection, 80);
      window.setTimeout(clearTapSelection, 240);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      cleanupTimer = window.setTimeout(clearSuppression, SELECTION_SUPPRESSION_DURATION + 40);
    };
    document.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) {
        gesture = null;
        clearSuppression();
        return;
      }
      const touch = event.touches.item(0);
      const target2 = getElement(event.target);
      if (!touch || !target2 || isEditableTarget(target2)) {
        gesture = null;
        return;
      }
      gesture = {
        identifier: touch.identifier,
        startedAt: performance.now(),
        startX: touch.clientX,
        startY: touch.clientY,
        moved: false,
        target: target2
      };
    }, { passive: true, capture: true });
    document.addEventListener("touchmove", (event) => {
      if (!gesture) return;
      const touch = findTouch(event.touches, gesture.identifier);
      if (!touch) {
        gesture = null;
        return;
      }
      const distance = Math.hypot(
        touch.clientX - gesture.startX,
        touch.clientY - gesture.startY
      );
      if (distance > TAP_MOVEMENT_TOLERANCE) gesture.moved = true;
    }, { passive: true, capture: true });
    document.addEventListener("touchend", (event) => {
      if (!gesture) return;
      const completedGesture = gesture;
      gesture = null;
      const touch = findTouch(event.changedTouches, completedGesture.identifier);
      if (!touch) return;
      const duration = performance.now() - completedGesture.startedAt;
      const distance = Math.hypot(
        touch.clientX - completedGesture.startX,
        touch.clientY - completedGesture.startY
      );
      if (duration <= TAP_MAX_DURATION && !completedGesture.moved && distance <= TAP_MOVEMENT_TOLERANCE) {
        armSelectionSuppression(completedGesture.target);
      }
    }, { passive: true, capture: true });
    document.addEventListener("touchcancel", () => {
      gesture = null;
    }, { passive: true, capture: true });
    document.addEventListener("selectstart", (event) => {
      if (!selectionSuppressionIsActive()) return;
      const target2 = getElement(event.target);
      if (!target2 || isEditableTarget(target2) || !suppressedTarget) return;
      if (!suppressedTarget.contains(target2) && !target2.contains(suppressedTarget)) {
        return;
      }
      if (event.cancelable) event.preventDefault();
      clearTapSelection();
    }, { capture: true });
    document.addEventListener("selectionchange", clearTapSelection);
  };

  // src/ts/features/video-loop.ts
  var STALL_RECOVERY_DELAY = 2400;
  var HARD_STALL_THRESHOLD = 6500;
  var WATCHDOG_INTERVAL = 2e3;
  var PLAY_START_TIMEOUT = 4500;
  var MAX_SOFT_RELOADS = 2;
  var ensureVideoSource = (video) => {
    if (video.currentSrc || video.hasAttribute("src") || Boolean(video.querySelector("source[src]"))) {
      return true;
    }
    const source = video.dataset.videoSource;
    if (!source) return false;
    video.src = source;
    video.load();
    return true;
  };
  var releaseVideoSource = (video) => {
    video.pause();
    video.removeAttribute("src");
    queryAll("source", video).forEach((source) => source.removeAttribute("src"));
    video.load();
  };
  var setCurrentTimeSafely = (video, requestedTime) => {
    const applyTime = () => {
      const duration = video.duration;
      const maximum = Number.isFinite(duration) && duration > 0 ? Math.max(0, duration - 0.05) : Math.max(0, requestedTime);
      const nextTime = Math.min(Math.max(0, requestedTime), maximum);
      try {
        video.currentTime = nextTime;
      } catch {
      }
    };
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) applyTime();
    else video.addEventListener("loadedmetadata", applyTime, { once: true });
  };
  var playWithTimeout = async (video, timeout = PLAY_START_TIMEOUT) => {
    let timeoutId = 0;
    try {
      await Promise.race([
        video.play(),
        new Promise((_resolve, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error("Video playback did not start in time.")),
            timeout
          );
        })
      ]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };
  var setupSingleVideoLoop = (video, unusedVideos, hero) => {
    unusedVideos.forEach((unusedVideo) => {
      unusedVideo.hidden = true;
      unusedVideo.classList.remove("is-active", "is-mixing-in");
      releaseVideoSource(unusedVideo);
    });
    video.hidden = false;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.classList.add("is-active");
    video.classList.remove("is-mixing-in");
    ensureVideoSource(video);
    let heroVisible = true;
    let suspendedTime = 0;
    let recoveryTimer = 0;
    let recoveryInProgress = false;
    let reloadAttempts = 0;
    let lastMediaTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    let lastProgressAt = performance.now();
    const canPlay = () => !document.hidden && heroVisible && navigator.onLine !== false;
    const clearRecoveryTimer = () => {
      if (!recoveryTimer) return;
      window.clearTimeout(recoveryTimer);
      recoveryTimer = 0;
    };
    const noteProgress = () => {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : lastMediaTime;
      const advanced = Math.abs(currentTime - lastMediaTime) >= 0.04;
      if (advanced || currentTime < lastMediaTime) {
        lastMediaTime = currentTime;
        lastProgressAt = performance.now();
        reloadAttempts = 0;
      }
    };
    const rebuildBuffer = () => {
      const duration = video.duration;
      const nearBoundary = Number.isFinite(duration) && duration > 0 ? duration - video.currentTime < 0.45 : false;
      const resumeTime = reloadAttempts >= MAX_SOFT_RELOADS || nearBoundary ? 0 : Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
      reloadAttempts += 1;
      video.load();
      setCurrentTimeSafely(video, resumeTime);
    };
    const recoverPlayback = async (forceReload = false) => {
      clearRecoveryTimer();
      if (!canPlay() || recoveryInProgress) return;
      recoveryInProgress = true;
      try {
        ensureVideoSource(video);
        const duration = video.duration;
        const reachedBoundary = video.ended || Number.isFinite(duration) && duration > 0 && duration - video.currentTime < 0.12;
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
    const scheduleRecovery = (forceReload = false) => {
      if (!canPlay() || recoveryTimer || recoveryInProgress) return;
      recoveryTimer = window.setTimeout(() => {
        recoveryTimer = 0;
        void recoverPlayback(forceReload);
      }, STALL_RECOVERY_DELAY);
    };
    const suspendPlayback = () => {
      clearRecoveryTimer();
      suspendedTime = Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
      video.pause();
    };
    const resumePlayback = () => {
      if (!canPlay()) return;
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        setCurrentTimeSafely(video, suspendedTime);
      }
      void recoverPlayback(false);
    };
    video.addEventListener("timeupdate", noteProgress, { passive: true });
    video.addEventListener("playing", () => {
      clearRecoveryTimer();
      lastProgressAt = performance.now();
      noteProgress();
    }, { passive: true });
    video.addEventListener("canplay", () => {
      clearRecoveryTimer();
      if (canPlay() && video.paused) void recoverPlayback(false);
    }, { passive: true });
    video.addEventListener("waiting", () => scheduleRecovery(false), { passive: true });
    video.addEventListener("stalled", () => scheduleRecovery(true), { passive: true });
    video.addEventListener("suspend", () => {
      if (!video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        scheduleRecovery(false);
      }
    }, { passive: true });
    video.addEventListener("ended", () => {
      setCurrentTimeSafely(video, 0);
      void recoverPlayback(false);
    }, { passive: true });
    video.addEventListener("error", () => scheduleRecovery(true), { passive: true });
    if (hero && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        heroVisible = entry.isIntersecting;
        if (heroVisible && !document.hidden) resumePlayback();
        else suspendPlayback();
      }, { rootMargin: "80px 0px", threshold: 0 });
      observer.observe(hero);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspendPlayback();
      else resumePlayback();
    });
    window.addEventListener("pagehide", suspendPlayback, { passive: true });
    window.addEventListener("pageshow", resumePlayback, { passive: true });
    window.addEventListener("online", resumePlayback, { passive: true });
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
  var setupVideoLoop = ({
    root,
    compactViewport,
    coarsePointer
  }) => {
    const hero = query(".hero");
    const videos = queryAll("[data-loop-video]");
    const firstVideo = videos[0];
    if (!firstVideo) return;
    const compactPlayback = compactViewport.matches || coarsePointer.matches;
    const mixDuration = compactPlayback ? 650 : 900;
    const mixLead = mixDuration / 1e3 + 0.24;
    root.style.setProperty("--video-mix-duration", `${mixDuration}ms`);
    if (compactPlayback || videos.length < 2) {
      setupSingleVideoLoop(firstVideo, videos.slice(1), hero);
      return;
    }
    videos.forEach((video, index) => {
      video.hidden = false;
      video.loop = false;
      video.muted = true;
      video.playsInline = true;
      video.preload = index === 0 ? "metadata" : "none";
      video.classList.toggle("is-active", index === 0);
      video.classList.remove("is-mixing-in");
    });
    let activeIndex = 0;
    let transitionInProgress = false;
    let boundaryTimerId = 0;
    let mixTimerId = 0;
    let recoveryTimerId = 0;
    let mixGeneration = 0;
    let suspendedState = null;
    let heroVisible = true;
    let lastMediaTime = 0;
    let lastProgressAt = performance.now();
    const canPlay = () => !document.hidden && heroVisible && navigator.onLine !== false;
    const getVideo = (index) => videos[index] ?? null;
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
    const clearRecoveryTimer = () => {
      if (!recoveryTimerId) return;
      window.clearTimeout(recoveryTimerId);
      recoveryTimerId = 0;
    };
    const activateSingleVideo = (index, time) => {
      clearBoundaryTimer();
      clearMixTimer();
      mixGeneration += 1;
      transitionInProgress = false;
      videos.forEach((video) => {
        video.pause();
        video.classList.remove("is-active", "is-mixing-in");
      });
      const activeVideo = getVideo(index);
      if (!activeVideo) return null;
      ensureVideoSource(activeVideo);
      activeIndex = index;
      activeVideo.classList.add("is-active");
      setCurrentTimeSafely(activeVideo, time);
      return activeVideo;
    };
    const scheduleBoundary = () => {
      clearBoundaryTimer();
      if (!canPlay() || transitionInProgress) return;
      const activeVideo = getVideo(activeIndex);
      if (!activeVideo) return;
      const duration = activeVideo.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        activeVideo.addEventListener("loadedmetadata", scheduleBoundary, { once: true });
        return;
      }
      const playbackRate = Math.max(0.1, Math.abs(activeVideo.playbackRate || 1));
      const remaining = duration - activeVideo.currentTime;
      const delay = Math.max(0, (remaining - mixLead) / playbackRate * 1e3);
      boundaryTimerId = window.setTimeout(() => {
        boundaryTimerId = 0;
        const currentRemaining = activeVideo.duration - activeVideo.currentTime;
        if (currentRemaining <= mixLead + 0.16) void mixLoopBoundary();
        else scheduleBoundary();
      }, delay);
    };
    const recoverActiveVideo = async (forceReload = false) => {
      clearRecoveryTimer();
      if (!canPlay()) return;
      const currentVideo = getVideo(activeIndex);
      if (!currentVideo) return;
      const duration = currentVideo.duration;
      const nearBoundary = Number.isFinite(duration) && duration > 0 ? duration - currentVideo.currentTime < 0.35 : false;
      const resumeTime = nearBoundary ? 0 : Number.isFinite(currentVideo.currentTime) ? currentVideo.currentTime : 0;
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
    const scheduleRecovery = (forceReload = false) => {
      if (!canPlay() || recoveryTimerId) return;
      recoveryTimerId = window.setTimeout(() => {
        recoveryTimerId = 0;
        void recoverActiveVideo(forceReload);
      }, STALL_RECOVERY_DELAY);
    };
    async function mixLoopBoundary() {
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
        incoming.classList.remove("is-active");
        incoming.classList.add("is-mixing-in");
        await playWithTimeout(incoming);
        if (generation !== mixGeneration || !canPlay()) {
          incoming.pause();
          incoming.classList.remove("is-mixing-in");
          return;
        }
        window.requestAnimationFrame(() => {
          if (generation === mixGeneration && canPlay()) incoming.classList.add("is-active");
        });
        mixTimerId = window.setTimeout(() => {
          if (generation !== mixGeneration || !canPlay()) return;
          outgoing.classList.remove("is-active");
          outgoing.pause();
          setCurrentTimeSafely(outgoing, 0);
          incoming.classList.remove("is-mixing-in");
          activeIndex = nextIndex;
          transitionInProgress = false;
          mixTimerId = 0;
          lastMediaTime = incoming.currentTime;
          lastProgressAt = performance.now();
          scheduleBoundary();
        }, mixDuration + 50);
      } catch {
        incoming.pause();
        incoming.classList.remove("is-active", "is-mixing-in");
        if (generation !== mixGeneration) return;
        transitionInProgress = false;
        setCurrentTimeSafely(outgoing, 0);
        outgoing.classList.add("is-active");
        void recoverActiveVideo(false);
      }
    }
    const suspendPlayback = () => {
      if (suspendedState) return;
      const incomingIndex = videos.findIndex(
        (video) => video.classList.contains("is-active") && video.classList.contains("is-mixing-in")
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
    const resumePlayback = () => {
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
      video.addEventListener("timeupdate", () => {
        if (index !== activeIndex) return;
        const currentTime = video.currentTime;
        if (Math.abs(currentTime - lastMediaTime) >= 0.04 || currentTime < lastMediaTime) {
          lastMediaTime = currentTime;
          lastProgressAt = performance.now();
        }
      }, { passive: true });
      video.addEventListener("playing", () => {
        clearRecoveryTimer();
        lastProgressAt = performance.now();
        scheduleBoundary();
      }, { passive: true });
      video.addEventListener("seeked", scheduleBoundary, { passive: true });
      video.addEventListener("ratechange", scheduleBoundary, { passive: true });
      video.addEventListener("waiting", () => {
        clearBoundaryTimer();
        if (index === activeIndex) scheduleRecovery(false);
      }, { passive: true });
      video.addEventListener("stalled", () => {
        if (index === activeIndex) scheduleRecovery(true);
      }, { passive: true });
      video.addEventListener("error", () => {
        if (index === activeIndex) scheduleRecovery(true);
      }, { passive: true });
      video.addEventListener("ended", () => {
        if (index === activeIndex) void mixLoopBoundary();
      }, { passive: true });
    });
    firstVideo.addEventListener("canplay", () => {
      const secondaryVideo = getVideo(1);
      if (!secondaryVideo) return;
      secondaryVideo.preload = "metadata";
      ensureVideoSource(secondaryVideo);
    }, { once: true, passive: true });
    if (hero && "IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const nextVisible = entry.isIntersecting;
        if (nextVisible === heroVisible) return;
        heroVisible = nextVisible;
        if (heroVisible && !document.hidden) resumePlayback();
        else suspendPlayback();
      }, { rootMargin: "80px 0px", threshold: 0 });
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
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspendPlayback();
      else resumePlayback();
    });
    window.addEventListener("pagehide", suspendPlayback, { passive: true });
    window.addEventListener("pageshow", resumePlayback, { passive: true });
    window.addEventListener("online", resumePlayback, { passive: true });
  };

  // src/ts/shared/runtime.ts
  var createRuntimeContext = () => {
    const root = document.documentElement;
    const isFirefox = /Firefox\//i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const compactViewport = window.matchMedia("(max-width: 820px)");
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.toggle("is-firefox", isFirefox);
    root.classList.toggle("is-coarse-pointer", coarsePointer.matches);
    coarsePointer.addEventListener("change", ({ matches }) => {
      root.classList.toggle("is-coarse-pointer", matches);
    });
    return {
      root,
      isFirefox,
      coarsePointer,
      compactViewport,
      reducedMotion: reducedMotion2
    };
  };

  // src/ts/application.ts
  var runtime = createRuntimeContext();
  setupCountdown();
  setupBookingDockLayout();
  setupBookingCtaSheen(runtime);
  setupPieceViewer();
  setupTapSearchGuard();
  setupEfficientSmoothScroll(runtime);
  setupVideoLoop(runtime);

  // src/ts/dock-reveal.ts
  var dock = query(".booking-dock");
  var heroTitle = query(".title-lockup");
  if (dock && heroTitle) {
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    const supportsIntersectionObserver = typeof globalThis.IntersectionObserver === "function";
    const easeOut2 = "cubic-bezier(.22, 1, .36, 1)";
    let resolved = false;
    let observer = null;
    let contentRevealed = false;
    const metadata = queryAll(".booking-dock__meta", dock);
    const countdownUnits = queryAll(".countdown__unit", dock);
    const ctaLabel = query(".booking-dock__cta > span", dock);
    const revealTargets = [
      ...metadata.map((element, index) => ({ element, order: index })),
      ...countdownUnits.map((element, index) => ({ element, order: metadata.length + index })),
      ...ctaLabel ? [{ element: ctaLabel, order: metadata.length + countdownUnits.length }] : []
    ];
    revealTargets.forEach(({ element }) => {
      element.style.opacity = "0";
      element.style.transform = reducedMotion2.matches ? "translate3d(0, 2px, 0)" : "translate3d(0, 6px, 0)";
    });
    const disconnect = () => {
      observer?.disconnect();
      observer = null;
    };
    const revealDockContent = ({ fast = false } = {}) => {
      if (contentRevealed) return;
      contentRevealed = true;
      const baseDuration = reducedMotion2.matches ? 120 : fast ? 170 : 230;
      const stagger = reducedMotion2.matches ? 0 : fast ? 22 : 34;
      const distance = reducedMotion2.matches ? 2 : fast ? 4 : 6;
      revealTargets.forEach(({ element, order }) => {
        const animation = element.animate([
          { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
          { opacity: 1, transform: "translate3d(0, 0, 0)" }
        ], {
          duration: baseDuration,
          delay: order * stagger,
          easing: easeOut2,
          fill: "both"
        });
        animation.addEventListener("finish", () => {
          element.style.opacity = "1";
          element.style.transform = "translate3d(0, 0, 0)";
          animation.cancel();
        }, { once: true });
      });
    };
    const finishReveal = ({ fast = false } = {}) => {
      resolved = true;
      disconnect();
      revealDockContent({ fast });
    };
    const revealImmediately = () => {
      if (resolved) return;
      resolved = true;
      disconnect();
      const computed = window.getComputedStyle(dock);
      const startOpacity = Number.parseFloat(computed.opacity);
      const startTranslate = computed.translate === "none" ? "0 8px" : computed.translate;
      const startScale = computed.scale === "none" ? "0.992" : computed.scale;
      dock.style.opacity = Number.isFinite(startOpacity) ? String(startOpacity) : "0";
      dock.style.translate = startTranslate;
      dock.style.scale = startScale;
      dock.style.willChange = "opacity, translate, scale";
      dock.getAnimations().forEach((animation2) => animation2.cancel());
      if (reducedMotion2.matches) {
        dock.style.opacity = "1";
        dock.style.translate = "0 0";
        dock.style.scale = "1";
        dock.style.willChange = "";
        revealDockContent({ fast: true });
        return;
      }
      const animation = dock.animate([
        {
          opacity: Number.isFinite(startOpacity) ? startOpacity : 0,
          translate: startTranslate,
          scale: startScale
        },
        {
          opacity: 1,
          translate: "0 0",
          scale: 1
        }
      ], {
        duration: 190,
        easing: easeOut2,
        fill: "both"
      });
      animation.addEventListener("finish", () => {
        dock.style.opacity = "1";
        dock.style.translate = "0 0";
        dock.style.scale = "1";
        dock.style.willChange = "";
        animation.cancel();
        revealDockContent({ fast: true });
      }, { once: true });
    };
    const titleIsOutsideViewport = () => {
      const rect = heroTitle.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top >= window.innerHeight;
    };
    const prioritizeWhenNeeded = () => {
      if (!resolved && window.scrollY > 0 && titleIsOutsideViewport()) revealImmediately();
    };
    dock.addEventListener("animationend", (event) => {
      if (event.target === dock && (event.animationName === "dock-in" || event.animationName === "stage-dock-in")) {
        finishReveal();
      }
    });
    const activeDockAnimation = dock.getAnimations().some(
      (animation) => animation.playState === "running"
    );
    if (!activeDockAnimation && Number.parseFloat(getComputedStyle(dock).opacity) >= 0.99) {
      finishReveal({ fast: true });
    } else if (supportsIntersectionObserver) {
      const nextObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && !entry.isIntersecting && window.scrollY > 0) revealImmediately();
      }, { threshold: 0 });
      observer = nextObserver;
      nextObserver.observe(heroTitle);
    } else {
      let frameId = 0;
      window.addEventListener("scroll", () => {
        if (frameId || resolved) return;
        frameId = window.requestAnimationFrame(() => {
          frameId = 0;
          prioritizeWhenNeeded();
        });
      }, { passive: true });
    }
    window.requestAnimationFrame(prioritizeWhenNeeded);
  }

  // src/ts/menu/observers.ts
  var configureMobileOverlapShadows = (groups) => {
    const mobileQuery2 = window.matchMedia("(max-width: 720px)");
    let observers = [];
    let resizeFrame = 0;
    const disconnectObservers = () => {
      observers.forEach((observer) => observer.disconnect());
      observers = [];
      groups.forEach((group) => {
        query(".menu-group__heading", group)?.classList.remove("is-overlapping");
      });
    };
    const configure = () => {
      disconnectObservers();
      if (!mobileQuery2.matches || !("IntersectionObserver" in window)) return;
      groups.forEach((group) => {
        const heading = query(".menu-group__heading", group);
        const sentinel = query(".menu-group__overlap-sentinel", group);
        if (!heading || !sentinel) return;
        const headingHeight = Math.ceil(heading.getBoundingClientRect().height);
        const observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          const overlaps = !entry.isIntersecting && entry.boundingClientRect.top <= headingHeight;
          heading.classList.toggle("is-overlapping", overlaps);
        }, {
          rootMargin: `-${headingHeight}px 0px 0px 0px`,
          threshold: 0
        });
        observer.observe(sentinel);
        observers.push(observer);
      });
    };
    const scheduleConfigure = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        configure();
      });
    };
    configure();
    mobileQuery2.addEventListener("change", scheduleConfigure);
    window.addEventListener("resize", scheduleConfigure, { passive: true });
    document.fonts.ready.then(scheduleConfigure).catch(() => void 0);
  };
  var observeActiveMenuGroup = (menuRoot2, groups) => {
    const firstGroup = groups[0];
    if (!firstGroup) return;
    firstGroup.classList.add("is-active");
    menuRoot2.dataset.activeMenu = firstGroup.dataset.menuGroup || "";
    if (!("IntersectionObserver" in window)) return;
    const visibility = new Map(groups.map((group) => [group, 0]));
    const updateActiveGroup = () => {
      let activeGroup = firstGroup;
      let activeRatio = -1;
      visibility.forEach((ratio, group) => {
        if (ratio > activeRatio) {
          activeRatio = ratio;
          activeGroup = group;
        }
      });
      groups.forEach((group) => group.classList.toggle("is-active", group === activeGroup));
      menuRoot2.dataset.activeMenu = activeGroup.dataset.menuGroup || "";
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const group = entry.target;
        visibility.set(group, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      updateActiveGroup();
    }, {
      rootMargin: "-18% 0px -42% 0px",
      threshold: [0, 0.12, 0.25, 0.4, 0.6, 0.8]
    });
    groups.forEach((group) => observer.observe(group));
  };

  // src/ts/menu/typography.ts
  var DESCRIPTION_SELECTOR = ".menu-item__description";
  var NON_BREAKING_SPACE = "\xA0";
  var WIDTH_EPSILON = 0.5;
  var TARGET_MINIMUM_WORDS = 8;
  var TARGET_IDEAL_WORDS = 9;
  var MAXIMUM_WORDS_PER_LINE = 10;
  var MINIMUM_NON_FINAL_WORDS = 2;
  var MINIMUM_FINAL_WORDS = 3;
  var MINIMUM_PREVIOUS_LINE_FILL = 0.58;
  var MINIMUM_PREVIOUS_LINE_WIDTH = 0.55;
  var ONE_LINE_MAXIMUM_FILL = 0.84;
  var MULTI_LINE_MAXIMUM_FILL = 0.9;
  var MULTI_LINE_MINIMUM_FILL = 0.54;
  var MAXIMUM_EXTRA_LINE_COUNTS = 1;
  var EXTRA_LINE_PENALTY = 0.42;
  var COHERENCE_LOWER_RATIO = 0.86;
  var COHERENCE_UPPER_RATIO = 1.16;
  var measurementNode = null;
  var median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    const upper = sorted[middle];
    if (upper === void 0) return 0;
    if (sorted.length % 2 === 1) return upper;
    return ((sorted[middle - 1] ?? upper) + upper) / 2;
  };
  var getMeasurementNode = () => {
    if (measurementNode) return measurementNode;
    measurementNode = document.createElement("span");
    Object.assign(measurementNode.style, {
      position: "fixed",
      top: "0",
      left: "-100000px",
      visibility: "hidden",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      contain: "layout style paint"
    });
    measurementNode.setAttribute("aria-hidden", "true");
    document.body.append(measurementNode);
    return measurementNode;
  };
  var createTextMeasure = (element) => {
    const computed = window.getComputedStyle(element);
    const node = getMeasurementNode();
    const styles = {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontStyle: computed.fontStyle,
      fontStretch: computed.fontStretch,
      fontVariant: computed.fontVariant,
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      wordSpacing: computed.wordSpacing,
      textTransform: computed.textTransform
    };
    const cache = /* @__PURE__ */ new Map();
    return (value) => {
      const cached = cache.get(value);
      if (cached !== void 0) return cached;
      Object.assign(node.style, styles);
      node.textContent = value;
      const width = node.getBoundingClientRect().width;
      cache.set(value, width);
      return width;
    };
  };
  var calculateLocalCost = (lines, maxWidth, extraLineCounts) => {
    const widths = lines.map((line) => line.width);
    const wordCounts = lines.map((line) => line.words.length);
    const meanWidth = widths.reduce((total, width) => total + width, 0) / widths.length;
    const meanWords = wordCounts.reduce((total, count) => total + count, 0) / wordCounts.length;
    const normalizeWidth = (value) => value / Math.max(maxWidth, 1);
    const normalizeWords = (value) => value / MAXIMUM_WORDS_PER_LINE;
    const nonFinalTargetPenalty = wordCounts.slice(0, -1).reduce((total, count) => {
      if (count >= TARGET_MINIMUM_WORDS) {
        const distance = normalizeWords(count - TARGET_IDEAL_WORDS);
        return total + distance * distance * 0.15;
      }
      const shortage = normalizeWords(TARGET_MINIMUM_WORDS - count);
      return total + shortage * shortage * 10;
    }, 0);
    const wordBalance = wordCounts.reduce((total, count) => {
      const delta = normalizeWords(count - meanWords);
      return total + delta * delta;
    }, 0) / wordCounts.length;
    const widthBalance = widths.reduce((total, width) => {
      const delta = normalizeWidth(width - meanWidth);
      return total + delta * delta;
    }, 0) / widths.length;
    const adjacentWidthDifference = widths.slice(1).reduce((total, width, index) => {
      const previous = widths[index];
      if (previous === void 0) return total;
      const delta = normalizeWidth(previous - width);
      return total + delta * delta;
    }, 0) / Math.max(widths.length - 1, 1);
    const requiredWidth = Math.max(...widths);
    const availableFill = requiredWidth / Math.max(maxWidth, 1);
    const maximumFill = lines.length === 1 ? ONE_LINE_MAXIMUM_FILL : MULTI_LINE_MAXIMUM_FILL;
    const overfill = Math.max(0, availableFill - maximumFill);
    const overfillPenalty = overfill * overfill * (lines.length === 1 ? 180 : 70);
    const underfill = lines.length > 1 ? Math.max(0, MULTI_LINE_MINIMUM_FILL - availableFill) : 0;
    const underfillPenalty = underfill * underfill * 4;
    let tailPenalty = 0;
    if (lines.length > 1) {
      const previousCount = wordCounts[wordCounts.length - 2] ?? meanWords;
      const finalCount = wordCounts[wordCounts.length - 1] ?? meanWords;
      const previousWidth = widths[widths.length - 2] ?? meanWidth;
      const finalWidth = widths[widths.length - 1] ?? meanWidth;
      const countRatio = finalCount / Math.max(previousCount, 1);
      const widthRatio = finalWidth / Math.max(previousWidth, 1);
      if (countRatio < MINIMUM_PREVIOUS_LINE_FILL) {
        const shortage = MINIMUM_PREVIOUS_LINE_FILL - countRatio;
        tailPenalty += shortage * shortage * 30;
      }
      if (widthRatio < MINIMUM_PREVIOUS_LINE_WIDTH) {
        const shortage = MINIMUM_PREVIOUS_LINE_WIDTH - widthRatio;
        tailPenalty += shortage * shortage * 24;
      }
      if (finalCount > previousCount) {
        const excess = normalizeWords(finalCount - previousCount);
        tailPenalty += excess * excess * 8;
      }
      if (finalWidth > previousWidth) {
        const excess = normalizeWidth(finalWidth - previousWidth);
        tailPenalty += excess * excess * 8;
      }
      if (finalCount === MINIMUM_FINAL_WORDS) tailPenalty += 0.4;
    }
    return nonFinalTargetPenalty + wordBalance * 1.1 + widthBalance * 1.5 + adjacentWidthDifference * 0.75 + overfillPenalty + underfillPenalty + tailPenalty + extraLineCounts * EXTRA_LINE_PENALTY;
  };
  var minimumWordsRequired = (remainingLines) => {
    if (remainingLines <= 0) return 0;
    if (remainingLines === 1) return MINIMUM_FINAL_WORDS;
    return (remainingLines - 1) * MINIMUM_NON_FINAL_WORDS + MINIMUM_FINAL_WORDS;
  };
  var generateLayoutsForLineCount = (words, lineCount, maxWidth, measure) => {
    const layouts = [];
    const current = [];
    const visit = (start, remainingLines) => {
      const remainingWords = words.length - start;
      const minimumRequired = lineCount === 1 ? 1 : minimumWordsRequired(remainingLines);
      const maximumAllowed = remainingLines * MAXIMUM_WORDS_PER_LINE;
      if (remainingWords < minimumRequired || remainingWords > maximumAllowed) return;
      if (remainingLines === 1) {
        const finalWords = words.slice(start);
        const minimumFinalWords = lineCount === 1 ? 1 : MINIMUM_FINAL_WORDS;
        if (finalWords.length < minimumFinalWords || finalWords.length > MAXIMUM_WORDS_PER_LINE) {
          return;
        }
        const width = measure(finalWords.join(" "));
        if (width > maxWidth + WIDTH_EPSILON) return;
        layouts.push([...current, { words: finalWords, width }]);
        return;
      }
      const followingLines = remainingLines - 1;
      const minimumEnd = start + MINIMUM_NON_FINAL_WORDS;
      const maximumEnd = Math.min(
        start + MAXIMUM_WORDS_PER_LINE,
        words.length - minimumWordsRequired(followingLines)
      );
      for (let end = minimumEnd; end <= maximumEnd; end += 1) {
        const lineWords = words.slice(start, end);
        const width = measure(lineWords.join(" "));
        if (width > maxWidth + WIDTH_EPSILON) break;
        current.push({ words: lineWords, width });
        visit(end, followingLines);
        current.pop();
      }
    };
    visit(0, lineCount);
    return layouts;
  };
  var generateIndividualCandidates = (metrics) => {
    const { words, maxWidth, measure } = metrics;
    if (!words.length) return [];
    const theoreticalMinimum = Math.max(1, Math.ceil(words.length / MAXIMUM_WORDS_PER_LINE));
    const maximumLineCount = words.length === 1 ? 1 : Math.max(
      theoreticalMinimum,
      1 + Math.floor((words.length - MINIMUM_FINAL_WORDS) / MINIMUM_NON_FINAL_WORDS)
    );
    let firstFeasibleLineCount = null;
    const candidates = [];
    for (let lineCount = theoreticalMinimum; lineCount <= maximumLineCount; lineCount += 1) {
      const geometries = generateLayoutsForLineCount(words, lineCount, maxWidth, measure);
      if (!geometries.length) continue;
      firstFeasibleLineCount ?? (firstFeasibleLineCount = lineCount);
      if (lineCount > firstFeasibleLineCount + MAXIMUM_EXTRA_LINE_COUNTS) break;
      const extraLineCounts = lineCount - firstFeasibleLineCount;
      geometries.forEach((lines) => {
        candidates.push({
          lines,
          localCost: calculateLocalCost(lines, maxWidth, extraLineCounts),
          requiredWidth: Math.max(...lines.map((line) => line.width))
        });
      });
    }
    return candidates;
  };
  var selectLowestLocalCost = (layouts) => {
    let selected = null;
    layouts.forEach((layout) => {
      if (!selected || layout.localCost < selected.localCost) selected = layout;
    });
    return selected;
  };
  var getCompositionKey = (wordCount, lineCount) => {
    const averageWordsPerLine = Math.max(1, Math.round(wordCount / Math.max(lineCount, 1)));
    return `${lineCount}:${averageWordsPerLine}`;
  };
  var selectCoherentLayout = (plan, referenceWidth) => {
    if (referenceWidth <= 0) return plan.localBest;
    const targetLineCount = plan.localBest.lines.length;
    const lowerGuide = referenceWidth * COHERENCE_LOWER_RATIO;
    const upperGuide = referenceWidth * COHERENCE_UPPER_RATIO;
    let selected = plan.localBest;
    let selectedCost = Number.POSITIVE_INFINITY;
    plan.candidates.forEach((candidate) => {
      if (candidate.lines.length !== targetLineCount) return;
      if (candidate.localCost > plan.localBest.localCost + 0.75) return;
      const belowBand = Math.max(0, lowerGuide - candidate.requiredWidth) / referenceWidth;
      const aboveBand = Math.max(0, candidate.requiredWidth - upperGuide) / referenceWidth;
      const distance = (candidate.requiredWidth - referenceWidth) / referenceWidth;
      const coherenceCost = distance * distance * 0.08 + (belowBand * belowBand + aboveBand * aboveBand) * 1.05;
      const combinedCost = candidate.localCost + coherenceCost;
      if (combinedCost < selectedCost) {
        selected = candidate;
        selectedCost = combinedCost;
      }
    });
    return selected;
  };
  var getAvailableDescriptionWidth = (element) => {
    const parent = element.parentElement;
    if (!parent) return element.getBoundingClientRect().width;
    const computed = window.getComputedStyle(parent);
    const horizontalPadding = Number.parseFloat(computed.paddingLeft || "0") + Number.parseFloat(computed.paddingRight || "0");
    return Math.max(0, parent.getBoundingClientRect().width - horizontalPadding);
  };
  var renderBalancedDescription = (metrics, layout) => {
    const fragment = document.createDocumentFragment();
    layout.lines.forEach((line, index) => {
      if (index > 0) fragment.append(document.createElement("br"));
      fragment.append(document.createTextNode(line.words.join(NON_BREAKING_SPACE)));
    });
    metrics.element.replaceChildren(fragment);
    metrics.element.style.maxWidth = "none";
    metrics.element.style.width = `${Math.ceil(Math.min(metrics.maxWidth, layout.requiredWidth + 1))}px`;
    metrics.element.setAttribute("aria-label", metrics.source);
  };
  var collectMetrics = (descriptions) => {
    descriptions.forEach((element) => {
      element.style.removeProperty("width");
      element.style.maxWidth = "none";
    });
    return descriptions.flatMap((element) => {
      const source = element.dataset.balanceText?.trim();
      const maxWidth = getAvailableDescriptionWidth(element);
      if (!source || maxWidth <= 0) return [];
      return [{
        element,
        source,
        words: source.split(/\s+/).filter(Boolean),
        maxWidth,
        measure: createTextMeasure(element)
      }];
    });
  };
  var createPlans = (metrics) => metrics.flatMap((descriptionMetrics) => {
    const candidates = generateIndividualCandidates(descriptionMetrics);
    const localBest = selectLowestLocalCost(candidates);
    if (!localBest) return [];
    return [{ metrics: descriptionMetrics, candidates, localBest }];
  });
  var createReferenceWidths = (plans) => {
    const compositionGroups = /* @__PURE__ */ new Map();
    const lineCountGroups = /* @__PURE__ */ new Map();
    plans.forEach(({ metrics, localBest }) => {
      const lineCount = localBest.lines.length;
      const compositionKey = getCompositionKey(metrics.words.length, lineCount);
      const compositionWidths = compositionGroups.get(compositionKey) ?? [];
      const lineWidths = lineCountGroups.get(lineCount) ?? [];
      compositionWidths.push(localBest.requiredWidth);
      lineWidths.push(localBest.requiredWidth);
      compositionGroups.set(compositionKey, compositionWidths);
      lineCountGroups.set(lineCount, lineWidths);
    });
    const byComposition = /* @__PURE__ */ new Map();
    const byLineCount = /* @__PURE__ */ new Map();
    compositionGroups.forEach((widths, key) => byComposition.set(key, median(widths)));
    lineCountGroups.forEach((widths, lineCount) => byLineCount.set(lineCount, median(widths)));
    return { byComposition, byLineCount };
  };
  var getReferenceWidth = (plan, references) => {
    const lineCount = plan.localBest.lines.length;
    const compositionKey = getCompositionKey(plan.metrics.words.length, lineCount);
    return references.byComposition.get(compositionKey) ?? references.byLineCount.get(lineCount) ?? plan.localBest.requiredWidth;
  };
  var observeBalancedMenuDescriptions = (root) => {
    const descriptions = queryAll(DESCRIPTION_SELECTOR, root);
    if (!descriptions.length) return;
    let animationFrame = 0;
    const balanceAll = () => {
      animationFrame = 0;
      const plans = createPlans(collectMetrics(descriptions));
      if (!plans.length) return;
      const references = createReferenceWidths(plans);
      plans.forEach((plan) => {
        const layout = selectCoherentLayout(plan, getReferenceWidth(plan, references));
        renderBalancedDescription(plan.metrics, layout);
      });
    };
    const scheduleBalance = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(balanceAll);
    };
    scheduleBalance();
    const supportsResizeObserver = typeof ResizeObserver !== "undefined";
    if (supportsResizeObserver) {
      const observedWidths = /* @__PURE__ */ new WeakMap();
      const observer = new ResizeObserver((entries) => {
        const widthChanged = entries.some((entry) => {
          const width = entry.contentRect.width;
          const previousWidth = observedWidths.get(entry.target);
          observedWidths.set(entry.target, width);
          return previousWidth === void 0 || Math.abs(previousWidth - width) >= WIDTH_EPSILON;
        });
        if (widthChanged) scheduleBalance();
      });
      if (root instanceof Element) observer.observe(root);
    } else {
      window.addEventListener("resize", scheduleBalance, { passive: true });
    }
    void document.fonts.ready.then(scheduleBalance);
  };

  // src/ts/menu-bootstrap.ts
  var menuRoot = query("[data-menu-root]");
  var menuGroups = query("[data-menu-groups]");
  if (menuRoot && menuGroups) {
    const groups = queryAll("[data-menu-group]", menuGroups);
    if (groups.length) {
      observeBalancedMenuDescriptions(menuGroups);
      configureMobileOverlapShadows(groups);
      observeActiveMenuGroup(menuRoot, groups);
    }
  }

  // src/ts/menu-motion.ts
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  var easeOut = "cubic-bezier(.22, 1, .36, 1)";
  var menuGroups2 = query("[data-menu-groups]");
  var menuIntroHeading = query(".menu-section__intro h2");
  var clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  if (menuGroups2) {
    query(".menu-mobile-sticky")?.remove();
    let revealObserver = null;
    let stickyExitFrame = 0;
    const groups = queryAll("[data-menu-group]", menuGroups2);
    const stickyExitTargets = groups.flatMap((group) => {
      const heading = query(".menu-group__heading", group);
      const sentinel = query(".menu-group__exit-sentinel", group);
      return heading && sentinel ? [{ heading, sentinel }] : [];
    });
    const animateOnce = (element, keyframes, options) => {
      const animation = element.animate(keyframes, {
        fill: "both",
        ...options
      });
      animation.addEventListener("finish", () => {
        element.style.opacity = "1";
        element.style.transform = "translate3d(0, 0, 0)";
        animation.cancel();
      }, { once: true });
    };
    const setupScrollReveals = () => {
      revealObserver?.disconnect();
      revealObserver = null;
      if (!("IntersectionObserver" in window)) return;
      const candidates = [];
      if (menuIntroHeading && !menuIntroHeading.dataset.motionReady) {
        menuIntroHeading.dataset.motionReady = "true";
        candidates.push({ element: menuIntroHeading, type: "intro", delay: 0 });
      }
      groups.forEach((group) => {
        queryAll(".menu-item", group).slice(0, 3).forEach((item, index) => {
          if (item.dataset.motionReady) return;
          item.dataset.motionReady = "true";
          candidates.push({
            element: item,
            type: "item",
            delay: reducedMotion.matches ? 0 : index * 40
          });
        });
      });
      if (!candidates.length) return;
      const candidateByElement = /* @__PURE__ */ new Map();
      candidates.forEach((candidate) => {
        candidateByElement.set(candidate.element, candidate);
        candidate.element.style.opacity = "0";
        candidate.element.style.transform = reducedMotion.matches ? "translate3d(0, 3px, 0)" : candidate.type === "intro" ? "translate3d(0, 14px, 0)" : "translate3d(0, 8px, 0)";
      });
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          const candidate = candidateByElement.get(element);
          if (!candidate) return;
          observer.unobserve(element);
          const isIntro = candidate.type === "intro";
          const duration = reducedMotion.matches ? 150 : isIntro ? 360 : 260;
          const distance = reducedMotion.matches ? 3 : isIntro ? 14 : 8;
          animateOnce(element, [
            { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
            { opacity: 1, transform: "translate3d(0, 0, 0)" }
          ], {
            duration,
            delay: candidate.delay,
            easing: easeOut
          });
        });
      }, {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.08
      });
      candidates.forEach(({ element }) => revealObserver?.observe(element));
    };
    const updateStickyExitProgress = () => {
      stickyExitFrame = 0;
      stickyExitTargets.forEach(({ heading, sentinel }) => {
        let progress = 0;
        if (mobileQuery.matches) {
          const computed = window.getComputedStyle(heading);
          const stickyTop = Number.parseFloat(computed.top || "0") || 0;
          const headingHeight = Math.max(1, heading.getBoundingClientRect().height);
          const triggerLine = stickyTop + headingHeight;
          const sentinelTop = sentinel.getBoundingClientRect().top;
          progress = clamp((triggerLine - sentinelTop) / headingHeight, 0, 1);
        }
        heading.style.setProperty(
          "--menu-heading-exit-offset",
          `${(-progress * 100).toFixed(3)}%`
        );
      });
    };
    const scheduleStickyExitUpdate = () => {
      if (stickyExitFrame) return;
      stickyExitFrame = window.requestAnimationFrame(updateStickyExitProgress);
    };
    if (groups.length) {
      setupScrollReveals();
      scheduleStickyExitUpdate();
    }
    mobileQuery.addEventListener("change", scheduleStickyExitUpdate);
    window.addEventListener("scroll", scheduleStickyExitUpdate, { passive: true });
    window.addEventListener("resize", scheduleStickyExitUpdate, { passive: true });
    document.fonts.ready.then(scheduleStickyExitUpdate).catch(() => void 0);
  }
})();
