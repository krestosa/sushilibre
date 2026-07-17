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
    const firstMeta = metadata[0];
    const secondMeta = metadata[1];
    if (!dock2 || !firstMeta || !secondMeta || !countdown || !cta) return;
    let stacked = null;
    let scheduledFrame = 0;
    const clearResponsiveStyles = () => {
      dock2.style.gridTemplateColumns = "";
      dock2.style.gridTemplateRows = "";
      dock2.style.rowGap = "";
      metadata.forEach((item) => {
        item.style.gridColumn = "";
        item.style.gridRow = "";
        item.style.padding = "";
      });
      countdown.style.gridColumn = "";
      countdown.style.gridRow = "";
      cta.style.gridColumn = "";
      cta.style.gridRow = "";
    };
    const applyStackedLayout = () => {
      dock2.style.gridTemplateColumns = "minmax(148px, 1.25fr) minmax(0, 2.4fr) 104px";
      dock2.style.gridTemplateRows = "repeat(2, minmax(0, 1fr))";
      dock2.style.rowGap = "0";
      firstMeta.style.gridColumn = "1";
      firstMeta.style.gridRow = "1";
      secondMeta.style.gridColumn = "1";
      secondMeta.style.gridRow = "2";
      metadata.forEach((item) => {
        item.style.padding = "0 8px";
      });
      countdown.style.gridColumn = "2";
      countdown.style.gridRow = "1 / span 2";
      cta.style.gridColumn = "3";
      cta.style.gridRow = "1 / span 2";
    };
    const syncLayout = () => {
      const shouldStack = window.matchMedia("(min-width: 621px)").matches && dock2.clientWidth < 760;
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
    window.addEventListener("resize", scheduleSync, { passive: true });
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
    const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
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
      const delta = clamp(event.deltaY * unit, -240, 240);
      targetY = clamp(targetY + delta * 0.9, 0, maximumScroll());
      if (!frameId) frameId = window.requestAnimationFrame(step);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("resize", () => {
      targetY = clamp(targetY, 0, maximumScroll());
    }, { passive: true });
    window.addEventListener("scroll", () => {
      if (!frameId) targetY = window.scrollY;
    }, { passive: true });
  };

  // src/ts/features/video-loop.ts
  var setupVideoLoop = ({
    root,
    compactViewport,
    coarsePointer
  }) => {
    const hero = query(".hero");
    const videos = queryAll("[data-loop-video]");
    if (!videos.length) return;
    const compactPlayback = compactViewport.matches || coarsePointer.matches;
    const mixDuration = compactPlayback ? 650 : 900;
    const mixLead = mixDuration / 1e3 + 0.24;
    root.style.setProperty("--video-mix-duration", `${mixDuration}ms`);
    videos.forEach((video, index) => {
      video.loop = videos.length < 2;
      video.muted = true;
      video.playsInline = true;
      video.preload = index === 0 ? "auto" : "metadata";
      video.classList.toggle("is-active", index === 0);
      video.classList.remove("is-mixing-in");
    });
    if (videos.length < 2) {
      const video = videos[0];
      if (!video) return;
      let suspendedTime = 0;
      let heroVisible2 = true;
      const syncPlayback = () => {
        if (!document.hidden && heroVisible2) {
          try {
            video.currentTime = suspendedTime;
          } catch {
          }
          void video.play().catch(() => void 0);
        } else {
          suspendedTime = Number.isFinite(video.currentTime) ? video.currentTime : suspendedTime;
          video.pause();
        }
      };
      if (hero && "IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          heroVisible2 = entry.isIntersecting;
          syncPlayback();
        }, { rootMargin: "80px 0px", threshold: 0 }).observe(hero);
      }
      document.addEventListener("visibilitychange", syncPlayback);
      void video.play().catch(() => void 0);
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
    const setCurrentTimeSafely = (video, requestedTime) => {
      const applyTime = () => {
        const duration = video.duration;
        const maximum = Number.isFinite(duration) && duration > 0 ? Math.max(0, duration - 0.05) : Math.max(0, requestedTime);
        const nextTime = Math.min(Math.max(0, requestedTime), maximum);
        try {
          video.currentTime = nextTime;
        } catch {
        }
      };
      if (video.readyState >= 1) applyTime();
      else video.addEventListener("loadedmetadata", applyTime, { once: true });
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
    async function mixLoopBoundary() {
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
        incoming.classList.remove("is-active");
        incoming.classList.add("is-mixing-in");
        await incoming.play();
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
          scheduleBoundary();
        }, mixDuration + 50);
      } catch {
        incoming.pause();
        incoming.classList.remove("is-active", "is-mixing-in");
        if (generation !== mixGeneration) return;
        setCurrentTimeSafely(outgoing, 0);
        outgoing.classList.add("is-active");
        transitionInProgress = false;
        void outgoing.play().then(scheduleBoundary).catch(() => void 0);
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
      if (activeVideo) void activeVideo.play().then(scheduleBoundary).catch(() => void 0);
    };
    videos.forEach((video) => {
      video.addEventListener("playing", scheduleBoundary, { passive: true });
      video.addEventListener("seeked", scheduleBoundary, { passive: true });
      video.addEventListener("ratechange", scheduleBoundary, { passive: true });
      video.addEventListener("waiting", clearBoundaryTimer, { passive: true });
    });
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
    const firstVideo = getVideo(activeIndex);
    if (firstVideo) void firstVideo.play().then(scheduleBoundary).catch(() => void 0);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspendPlayback();
      else resumePlayback();
    });
    window.addEventListener("pagehide", suspendPlayback);
    window.addEventListener("pageshow", () => {
      if (!document.hidden) resumePlayback();
    });
    document.addEventListener("freeze", suspendPlayback);
    document.addEventListener("resume", () => {
      if (!document.hidden) resumePlayback();
    });
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

  // src/ts/menu/types.ts
  var isRecord = (value) => typeof value === "object" && value !== null;
  var isMenuItem = (value) => {
    if (!isRecord(value) || typeof value.name !== "string") return false;
    if (value.description !== void 0 && typeof value.description !== "string") return false;
    if (value.pieces !== void 0 && typeof value.pieces !== "number") return false;
    if (value.diet !== void 0 && value.diet !== "veggie" && value.diet !== "vegan") return false;
    return true;
  };
  var isMenuSection = (value) => isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.quantity === "string" && Array.isArray(value.items) && value.items.every(isMenuItem);
  var isMenuData = (value) => isRecord(value) && typeof value.title === "string" && (value.background === void 0 || typeof value.background === "string") && Array.isArray(value.sections) && value.sections.every(isMenuSection);

  // src/ts/menu/data.ts
  var readEmbeddedData = () => {
    const embeddedData = query("#menu-data");
    if (!embeddedData?.textContent) return null;
    try {
      const parsed = JSON.parse(embeddedData.textContent);
      return isMenuData(parsed) ? parsed : null;
    } catch (error) {
      console.error("Embedded menu JSON is invalid.", error);
      return null;
    }
  };
  var loadMenuData = async () => {
    const fallback = readEmbeddedData();
    const canRequestFile = ["http:", "https:"].includes(window.location.protocol);
    if (!canRequestFile || typeof window.fetch !== "function") {
      if (fallback) return fallback;
      throw new Error("No menu data source is available.");
    }
    try {
      const response = await window.fetch("menu.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Menu request failed with ${response.status}.`);
      const parsed = await response.json();
      if (!isMenuData(parsed)) throw new TypeError("Invalid menu data.");
      return parsed;
    } catch (error) {
      if (fallback) return fallback;
      throw error;
    }
  };
  var setMenuBackground = (menuRoot2, requestedPath) => {
    const candidates = Array.from(new Set(
      [requestedPath, "assets/menu_bg.png", "menu_bg.png"].filter((value) => Boolean(value))
    ));
    const tryCandidate = (index) => {
      const path = candidates[index];
      if (!path) return;
      const image = new Image();
      image.onload = () => {
        const safePath = path.replace(/["\\]/g, "\\$&");
        menuRoot2.style.setProperty("--menu-background-image", `url("${safePath}")`);
      };
      image.onerror = () => tryCandidate(index + 1);
      image.src = path;
    };
    tryCandidate(0);
  };

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

  // src/ts/menu/render.ts
  var createTextElement = (tag, className, value) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  };
  var keepLastTwoWordsTogether = (value) => {
    const normalized = value.trim();
    return normalized.replace(/\s+(\S+)$/, "\xA0$1");
  };
  var parseSectionPieces = (quantity) => {
    const value = Number.parseInt(quantity, 10);
    return Number.isFinite(value) ? value : null;
  };
  var createBadge = (label, modifier) => createTextElement("span", `menu-item__badge menu-item__badge--${modifier}`, label);
  var renderItem = (entry, sectionPieces) => {
    const item = document.createElement("article");
    item.className = `menu-item${entry.description ? "" : " menu-item--simple"}`;
    const itemHeader = document.createElement("div");
    itemHeader.className = "menu-item__header";
    itemHeader.append(createTextElement("h4", "menu-item__name", entry.name));
    const badges = document.createElement("div");
    badges.className = "menu-item__badges";
    if (entry.diet === "veggie" || entry.diet === "vegan") {
      badges.append(createBadge(entry.diet, "diet"));
    }
    const itemPieces = Number(entry.pieces);
    if (Number.isFinite(itemPieces) && itemPieces > 0 && itemPieces !== sectionPieces) {
      badges.append(createBadge(`${itemPieces}U`, "pieces"));
    }
    if (badges.childElementCount) itemHeader.append(badges);
    item.append(itemHeader);
    if (entry.description) {
      const description = createTextElement(
        "p",
        "menu-item__description",
        keepLastTwoWordsTogether(entry.description)
      );
      description.dataset.balanceText = entry.description;
      item.append(description);
    }
    return item;
  };
  var renderMenu = (data, elements) => {
    elements.heading.textContent = data.title;
    setMenuBackground(elements.root, data.background);
    elements.groups.replaceChildren();
    const fragment = document.createDocumentFragment();
    data.sections.forEach((section, sectionIndex) => {
      const sectionPieces = parseSectionPieces(section.quantity);
      const group = document.createElement("article");
      const groupId = section.id || String(sectionIndex + 1);
      group.className = "menu-group";
      group.id = `menu-${groupId}`;
      group.dataset.menuGroup = groupId;
      group.dataset.itemCount = String(section.items.length);
      group.style.setProperty("--menu-item-count", String(Math.max(1, section.items.length)));
      const heading = document.createElement("h3");
      heading.className = "menu-group__heading";
      const titleLine = document.createElement("span");
      titleLine.className = "menu-group__title-line";
      titleLine.append(createTextElement("span", "menu-group__title", section.title));
      if (section.quantity) {
        titleLine.append(createTextElement("span", "menu-group__quantity", section.quantity));
      }
      heading.append(titleLine);
      const items = document.createElement("div");
      items.className = "menu-group__items";
      const sentinel = document.createElement("span");
      sentinel.className = "menu-group__overlap-sentinel";
      sentinel.setAttribute("aria-hidden", "true");
      items.append(sentinel);
      section.items.forEach((entry) => {
        items.append(renderItem(entry, sectionPieces));
      });
      group.append(heading, items);
      fragment.append(group);
    });
    elements.groups.append(fragment);
    elements.status.hidden = true;
    return queryAll("[data-menu-group]", elements.groups);
  };

  // src/ts/menu/typography.ts
  var DESCRIPTION_SELECTOR = ".menu-item__description";
  var NON_BREAKING_SPACE = "\xA0";
  var WIDTH_EPSILON = 0.5;
  var measurementNode = null;
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
    node.style.fontFamily = computed.fontFamily;
    node.style.fontSize = computed.fontSize;
    node.style.fontStyle = computed.fontStyle;
    node.style.fontStretch = computed.fontStretch;
    node.style.fontVariant = computed.fontVariant;
    node.style.fontWeight = computed.fontWeight;
    node.style.letterSpacing = computed.letterSpacing;
    node.style.wordSpacing = computed.wordSpacing;
    node.style.textTransform = computed.textTransform;
    const cache = /* @__PURE__ */ new Map();
    return (value) => {
      const cached = cache.get(value);
      if (cached !== void 0) return cached;
      node.textContent = value;
      const width = node.getBoundingClientRect().width;
      cache.set(value, width);
      return width;
    };
  };
  var calculateLayoutCost = (lines, maxWidth) => {
    const widths = lines.map((line) => line.width);
    const mean = widths.reduce((total, width) => total + width, 0) / widths.length;
    const normalize = (value) => value / Math.max(maxWidth, 1);
    const variance = widths.reduce((total, width) => {
      const delta = normalize(width - mean);
      return total + delta * delta;
    }, 0);
    const adjacentDifference = widths.slice(1).reduce((total, width, index) => {
      const previous = widths[index];
      if (previous === void 0) return total;
      const delta = normalize(previous - width);
      return total + delta * delta;
    }, 0);
    const widest = Math.max(...widths);
    const narrowest = Math.min(...widths);
    const range = normalize(widest - narrowest);
    const lastWidth = widths[widths.length - 1] ?? mean;
    const lastLineShortfall = normalize(Math.max(0, mean * 0.9 - lastWidth));
    const isolatedWordPenalty = lines.filter((line) => line.words.length === 1).length * 0.35;
    return variance + adjacentDifference * 0.45 + range * range * 0.75 + lastLineShortfall * lastLineShortfall * 2 + isolatedWordPenalty;
  };
  var findBalancedLayout = (words, lineCount, maxWidth, measure) => {
    let best = null;
    const current = [];
    const visit = (start, remainingLines) => {
      if (remainingLines === 1) {
        const finalWords = words.slice(start);
        if (lineCount > 1 && finalWords.length < 2) return;
        const value = finalWords.join(" ");
        const width = measure(value);
        if (width > maxWidth + WIDTH_EPSILON) return;
        const lines = [...current, { words: finalWords, width }];
        const cost = calculateLayoutCost(lines, maxWidth);
        if (!best || cost < best.cost) best = { lines, cost };
        return;
      }
      const minimumWordsForRemainingLines = remainingLines;
      const maximumEnd = words.length - minimumWordsForRemainingLines;
      for (let end = start + 1; end <= maximumEnd; end += 1) {
        const lineWords = words.slice(start, end);
        const value = lineWords.join(" ");
        const width = measure(value);
        if (width > maxWidth + WIDTH_EPSILON) break;
        current.push({ words: lineWords, width });
        visit(end, remainingLines - 1);
        current.pop();
      }
    };
    visit(0, lineCount);
    return best;
  };
  var calculateBalancedLines = (value, maxWidth, measure) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [words];
    for (let lineCount = 1; lineCount < words.length; lineCount += 1) {
      const layout = findBalancedLayout(words, lineCount, maxWidth, measure);
      if (layout) return layout.lines.map((line) => line.words);
    }
    return [words];
  };
  var renderBalancedLines = (element, lines) => {
    const fragment = document.createDocumentFragment();
    lines.forEach((words, index) => {
      if (index > 0) fragment.append(document.createElement("br"));
      fragment.append(document.createTextNode(words.join(NON_BREAKING_SPACE)));
    });
    element.replaceChildren(fragment);
  };
  var balanceDescription = (element) => {
    const source = element.dataset.balanceText?.trim();
    const maxWidth = element.getBoundingClientRect().width;
    if (!source || maxWidth <= 0) return;
    const measure = createTextMeasure(element);
    const lines = calculateBalancedLines(source, maxWidth, measure);
    renderBalancedLines(element, lines);
    element.setAttribute("aria-label", source);
  };
  var observeBalancedMenuDescriptions = (root) => {
    const descriptions = queryAll(DESCRIPTION_SELECTOR, root);
    if (!descriptions.length) return;
    const measuredWidths = /* @__PURE__ */ new WeakMap();
    let animationFrame = 0;
    let forceNextPass = true;
    const balanceAll = () => {
      animationFrame = 0;
      const force = forceNextPass;
      forceNextPass = false;
      descriptions.forEach((description) => {
        const width = description.getBoundingClientRect().width;
        const previousWidth = measuredWidths.get(description);
        if (!force && previousWidth !== void 0 && Math.abs(previousWidth - width) < WIDTH_EPSILON) {
          return;
        }
        measuredWidths.set(description, width);
        balanceDescription(description);
      });
    };
    const scheduleBalance = (force = false) => {
      forceNextPass || (forceNextPass = force);
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(balanceAll);
    };
    scheduleBalance(true);
    const supportsResizeObserver = typeof ResizeObserver !== "undefined";
    if (supportsResizeObserver) {
      const observer = new ResizeObserver(() => scheduleBalance());
      descriptions.forEach((description) => observer.observe(description));
    } else {
      window.addEventListener("resize", () => scheduleBalance(), { passive: true });
    }
    void document.fonts.ready.then(() => scheduleBalance(true));
  };

  // src/ts/menu-bootstrap.ts
  var menuRoot = query("[data-menu-root]");
  var menuHeading = query("[data-menu-heading]");
  var menuGroups = query("[data-menu-groups]");
  var menuStatus = query("[data-menu-status]");
  if (menuRoot && menuHeading && menuGroups && menuStatus) {
    void loadMenuData().then((data) => {
      const groups = renderMenu(data, {
        root: menuRoot,
        heading: menuHeading,
        groups: menuGroups,
        status: menuStatus
      });
      if (!groups.length) return;
      observeBalancedMenuDescriptions(menuGroups);
      configureMobileOverlapShadows(groups);
      observeActiveMenuGroup(menuRoot, groups);
    }).catch((error) => {
      menuStatus.textContent = "NO SE PUDO CARGAR EL MEN\xDA.";
      console.error(error);
    });
  }

  // src/ts/menu-motion.ts
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  var easeOut = "cubic-bezier(.22, 1, .36, 1)";
  var menuGroups2 = query("[data-menu-groups]");
  var menuIntroHeading = query(".menu-section__intro h2");
  if (menuGroups2) {
    query(".menu-mobile-sticky")?.remove();
    let contentObserver = null;
    let revealObserver = null;
    let exitObservers = [];
    let resizeFrame = 0;
    const getGroups = () => queryAll("[data-menu-group]", menuGroups2);
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
    const setupScrollReveals = (groups) => {
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
    const disconnectExitObservers = (groups) => {
      exitObservers.forEach((observer) => observer.disconnect());
      exitObservers = [];
      groups.forEach((group) => {
        query(".menu-group__heading", group)?.classList.remove("is-leaving");
      });
    };
    const setupStickyExitAnimations = (groups) => {
      disconnectExitObservers(groups);
      if (!mobileQuery.matches || !("IntersectionObserver" in window)) return;
      groups.forEach((group) => {
        const heading = query(".menu-group__heading", group);
        if (!heading) return;
        let sentinel = query(".menu-group__exit-sentinel", group);
        if (!sentinel) {
          sentinel = document.createElement("span");
          sentinel.className = "menu-group__exit-sentinel";
          sentinel.setAttribute("aria-hidden", "true");
          group.append(sentinel);
        }
        const headingHeight = Math.ceil(heading.getBoundingClientRect().height);
        const preExitBuffer = Math.max(12, Math.min(22, Math.round(window.innerHeight * 0.018)));
        const handoffLine = headingHeight + preExitBuffer;
        const bottomMargin = Math.max(0, window.innerHeight - handoffLine - 1);
        const observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          const leaving = entry.boundingClientRect.top <= handoffLine;
          heading.classList.toggle("is-leaving", leaving);
        }, {
          root: null,
          rootMargin: `-${handoffLine}px 0px -${bottomMargin}px 0px`,
          threshold: 0
        });
        observer.observe(sentinel);
        exitObservers.push(observer);
      });
    };
    const scheduleStickySetup = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        setupStickyExitAnimations(getGroups());
      });
    };
    const install = () => {
      const groups = getGroups();
      if (!groups.length) return false;
      setupScrollReveals(groups);
      setupStickyExitAnimations(groups);
      return true;
    };
    if (!install()) {
      contentObserver = new MutationObserver(() => {
        if (install()) {
          contentObserver?.disconnect();
          contentObserver = null;
        }
      });
      contentObserver.observe(menuGroups2, { childList: true, subtree: true });
    }
    mobileQuery.addEventListener("change", scheduleStickySetup);
    window.addEventListener("resize", scheduleStickySetup, { passive: true });
    document.fonts.ready.then(scheduleStickySetup).catch(() => void 0);
  }
})();
