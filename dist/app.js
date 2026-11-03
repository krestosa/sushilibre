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
    const ctas = queryAll("[data-booking-cta], .menu-final-cta__action");
    if (!ctas.length || reducedMotion2.matches) return;
    const compact = compactViewport.matches || coarsePointer.matches;
    ctas.forEach((cta) => {
      if (typeof cta.animate !== "function") return;
      const isFinalCta = cta.classList.contains("menu-final-cta__action");
      cta.style.filter = "none";
      cta.style.overflow = "hidden";
      cta.style.isolation = "isolate";
      cta.classList.add("has-runtime-sheen");
      let label = cta.querySelector(":scope > span");
      if (!label) {
        label = document.createElement("span");
        while (cta.firstChild) label.append(cta.firstChild);
        cta.append(label);
      }
      setStyles(label, {
        position: "relative",
        zIndex: "2"
      });
      const sheen = document.createElement("i");
      sheen.setAttribute("aria-hidden", "true");
      setStyles(sheen, {
        position: "absolute",
        zIndex: "1",
        top: "-48%",
        bottom: "-48%",
        left: "0",
        width: "88%",
        opacity: "0",
        pointerEvents: "none",
        transform: "translate3d(-145%, 0, 0) skewX(-18deg)",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.05) 10%, rgba(255,255,255,.18) 24%, rgba(255,255,255,.46) 42%, rgba(255,255,255,.82) 50%, rgba(255,255,255,.46) 58%, rgba(255,255,255,.18) 76%, rgba(255,255,255,.05) 90%, transparent 100%)",
        filter: "blur(6px)",
        willChange: "transform, opacity"
      });
      cta.prepend(sheen);
      const initialDelay = isFinalCta ? 550 : 1500;
      const regularDelay = 7400;
      const duration = compact ? 1450 : 1800;
      let timerId = 0;
      let activeAnimation = null;
      let activeGlow = null;
      let interactionArmed = true;
      let initialPending = true;
      let visible = !isFinalCta;
      const clearTimer = () => {
        if (!timerId) return;
        window.clearTimeout(timerId);
        timerId = 0;
      };
      const stopAnimations = () => {
        activeAnimation?.cancel();
        activeGlow?.cancel();
        activeAnimation = null;
        activeGlow = null;
      };
      const scheduleRegularLoop = (delay = regularDelay) => {
        clearTimer();
        if (!visible || document.hidden) return;
        timerId = window.setTimeout(() => {
          timerId = 0;
          runSheen();
        }, delay);
      };
      function runSheen() {
        if (!visible || document.hidden) return;
        clearTimer();
        stopAnimations();
        const animation = sheen.animate([
          { transform: "translate3d(-145%, 0, 0) skewX(-18deg)", opacity: 0 },
          { transform: "translate3d(-122%, 0, 0) skewX(-18deg)", opacity: 0, offset: 0.1 },
          { transform: "translate3d(-78%, 0, 0) skewX(-18deg)", opacity: 0.82, offset: 0.28 },
          { transform: "translate3d(172%, 0, 0) skewX(-18deg)", opacity: 0.58, offset: 0.82 },
          { transform: "translate3d(215%, 0, 0) skewX(-18deg)", opacity: 0 }
        ], {
          duration,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "none"
        });
        const glow = cta.animate([
          { boxShadow: "0 0 0 rgba(0,26,197,0)", filter: "brightness(1)" },
          { boxShadow: "0 0 0 rgba(0,26,197,0)", filter: "brightness(1)", offset: 0.18 },
          { boxShadow: "0 0 28px rgba(0,26,197,.34)", filter: "brightness(1.08)", offset: 0.55 },
          { boxShadow: "0 0 0 rgba(0,26,197,0)", filter: "brightness(1)" }
        ], {
          duration,
          easing: "ease-in-out",
          fill: "none"
        });
        activeAnimation = animation;
        activeGlow = glow;
        animation.addEventListener("finish", () => {
          if (activeAnimation === animation) activeAnimation = null;
          if (activeGlow === glow) activeGlow = null;
          scheduleRegularLoop();
        }, { once: true });
      }
      const triggerInteractionSheen = () => {
        if (!interactionArmed || !visible || document.hidden) return;
        interactionArmed = false;
        initialPending = false;
        runSheen();
      };
      const armInitial = (delay = initialDelay) => {
        if (!visible) return;
        clearTimer();
        timerId = window.setTimeout(() => {
          timerId = 0;
          initialPending = false;
          runSheen();
        }, delay);
      };
      let observer = null;
      if (isFinalCta && "IntersectionObserver" in window) {
        observer = new IntersectionObserver((entries) => {
          const nextVisible = Boolean(entries[0]?.isIntersecting);
          if (nextVisible === visible) return;
          visible = nextVisible;
          if (!visible) {
            clearTimer();
            stopAnimations();
            return;
          }
          armInitial(initialPending ? initialDelay : 650);
        }, { rootMargin: "140px 0px", threshold: 0 });
        observer.observe(cta);
      } else {
        visible = true;
        armInitial();
      }
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
          stopAnimations();
          return;
        }
        scheduleRegularLoop(initialPending ? 650 : regularDelay);
      });
      window.addEventListener("pagehide", () => {
        clearTimer();
        stopAnimations();
        observer?.disconnect();
      }, { once: true });
    });
  };

  // src/ts/features/booking-dock-layout.ts
  var isIosDevice = () => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/i.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  };
  var setupBookingDockLayout = () => {
    const dock2 = query(".booking-dock");
    const metadata = queryAll(".booking-dock__meta");
    const countdown = query(".countdown");
    const cta = query(".booking-dock__cta");
    const [venueMeta, dateMeta, timeMeta] = metadata;
    if (!dock2 || !venueMeta || !dateMeta || !timeMeta || !countdown || !cta) return;
    const root = document.documentElement;
    const ios = isIosDevice();
    const visualViewport = window.visualViewport;
    let activeMode = null;
    let activeLiveState = null;
    let activeSuppressedState = null;
    let scheduledFrame = 0;
    let viewportFrame = 0;
    const syncIosViewport = () => {
      viewportFrame = 0;
      if (!ios) return;
      const pageTop = visualViewport ? visualViewport.pageTop : window.scrollY;
      const viewportHeight = visualViewport ? visualViewport.height : window.innerHeight;
      const visualBottom = Math.max(0, pageTop + viewportHeight);
      root.style.setProperty("--ios-dock-visual-bottom", `${visualBottom.toFixed(2)}px`);
    };
    const scheduleIosViewportSync = () => {
      if (!ios || viewportFrame) return;
      viewportFrame = window.requestAnimationFrame(syncIosViewport);
    };
    if (ios) {
      root.classList.add("is-ios-mobile");
      syncIosViewport();
      window.addEventListener("scroll", scheduleIosViewportSync, { passive: true });
      window.addEventListener("resize", scheduleIosViewportSync, { passive: true });
      window.addEventListener("orientationchange", scheduleIosViewportSync, { passive: true });
      visualViewport?.addEventListener("scroll", scheduleIosViewportSync, { passive: true });
      visualViewport?.addEventListener("resize", scheduleIosViewportSync, { passive: true });
    }
    const placeMetadata = ({ row, padding }) => {
      const placements = [venueMeta, dateMeta, timeMeta];
      placements.forEach((item, index) => {
        item.style.gridColumn = String(index + 1);
        item.style.gridRow = row;
        item.style.justifySelf = "start";
        item.style.width = "max-content";
        item.style.maxWidth = "100%";
        item.style.minWidth = "0";
        item.style.padding = padding;
      });
    };
    const styleCountdownBoundary = (enabled) => {
      countdown.style.boxSizing = "border-box";
      countdown.style.marginLeft = enabled ? "4px" : "0";
      countdown.style.paddingLeft = enabled ? "14px" : "0";
      countdown.style.borderLeft = enabled ? "1px solid rgba(255, 255, 255, 0.12)" : "0";
    };
    const applySingleRowLayout = ({
      width,
      suppressedWidth,
      ctaWidth,
      ctaSuppressed,
      metaGap
    }) => {
      dock2.style.width = ctaSuppressed ? suppressedWidth : width;
      dock2.style.setProperty("--dock-cta-track", ctaSuppressed ? "0px" : ctaWidth);
      dock2.style.gridTemplateColumns = `max-content max-content max-content minmax(0, 1fr) var(--dock-cta-track)`;
      dock2.style.gridTemplateRows = "minmax(0, 1fr)";
      dock2.style.columnGap = metaGap;
      dock2.style.rowGap = "0";
      placeMetadata({ row: "1", padding: "0 4px" });
      countdown.style.gridColumn = "4";
      countdown.style.gridRow = "1";
      styleCountdownBoundary(true);
      cta.style.gridColumn = "5";
      cta.style.gridRow = "1";
    };
    const applyEventLiveSingleRowLayout = ({
      width,
      ctaWidth,
      metaGap
    }) => {
      dock2.style.width = width;
      dock2.style.setProperty("--dock-cta-track", ctaWidth);
      dock2.style.gridTemplateColumns = `repeat(3, minmax(0, 1fr)) var(--dock-cta-track)`;
      dock2.style.gridTemplateRows = "minmax(0, 1fr)";
      dock2.style.columnGap = metaGap;
      dock2.style.rowGap = "0";
      placeMetadata({ row: "1", padding: "0 4px" });
      countdown.style.gridColumn = "";
      countdown.style.gridRow = "";
      styleCountdownBoundary(false);
      cta.style.gridColumn = "4";
      cta.style.gridRow = "1";
    };
    const applyDesktopLayout = (eventLive, ctaSuppressed) => {
      if (eventLive) {
        applyEventLiveSingleRowLayout({
          width: "min(680px, calc(100vw - 48px))",
          ctaWidth: "108px",
          metaGap: "20px"
        });
        return;
      }
      applySingleRowLayout({
        width: "min(960px, calc(100vw - 48px))",
        suppressedWidth: "min(760px, calc(100vw - 96px))",
        ctaWidth: "108px",
        ctaSuppressed,
        metaGap: "20px"
      });
    };
    const applyCompactLayout = (eventLive, ctaSuppressed) => {
      if (eventLive) {
        applyEventLiveSingleRowLayout({
          width: "min(640px, calc(100vw - 32px))",
          ctaWidth: "104px",
          metaGap: "14px"
        });
        return;
      }
      applySingleRowLayout({
        width: "min(740px, calc(100vw - 32px))",
        suppressedWidth: "min(620px, calc(100vw - 64px))",
        ctaWidth: "104px",
        ctaSuppressed,
        metaGap: "14px"
      });
    };
    const applyMobileLayout = (eventLive, ctaSuppressed) => {
      const suppressReservation = ctaSuppressed && !eventLive;
      dock2.style.width = "min(680px, calc(100vw - 24px))";
      dock2.style.setProperty("--dock-cta-track", suppressReservation ? "0px" : "96px");
      dock2.style.gridTemplateColumns = "max-content max-content max-content minmax(0, 1fr) var(--dock-cta-track)";
      dock2.style.gridTemplateRows = eventLive ? "48px" : "48px 96px";
      dock2.style.columnGap = "12px";
      dock2.style.rowGap = "8px";
      placeMetadata({ row: "1", padding: "0 2px" });
      countdown.style.gridColumn = "1 / span 4";
      countdown.style.gridRow = "2";
      styleCountdownBoundary(false);
      cta.style.gridColumn = "5";
      cta.style.gridRow = eventLive ? "1" : "2";
    };
    const resolveMode = () => {
      if (window.matchMedia("(max-width: 840px)").matches) return "mobile";
      if (window.matchMedia("(max-width: 1100px)").matches) return "compact";
      return "desktop";
    };
    const syncLayout = () => {
      const nextMode = resolveMode();
      const nextLiveState = dock2.classList.contains("is-event-live");
      const nextSuppressedState = dock2.classList.contains("is-cta-collapsed") && !nextLiveState;
      if (nextMode === activeMode && nextLiveState === activeLiveState && nextSuppressedState === activeSuppressedState) return;
      activeMode = nextMode;
      activeLiveState = nextLiveState;
      activeSuppressedState = nextSuppressedState;
      if (nextMode === "mobile") applyMobileLayout(nextLiveState, nextSuppressedState);
      else if (nextMode === "compact") applyCompactLayout(nextLiveState, nextSuppressedState);
      else applyDesktopLayout(nextLiveState, nextSuppressedState);
    };
    const scheduleSync = () => {
      if (scheduledFrame) return;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        syncLayout();
        scheduleIosViewportSync();
      });
    };
    syncLayout();
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleSync);
      observer.observe(dock2);
    }
    if ("MutationObserver" in window) {
      const observer = new MutationObserver(scheduleSync);
      observer.observe(dock2, { attributes: true, attributeFilter: ["class"] });
    }
    document.fonts.ready.then(scheduleSync).catch(() => void 0);
    if (ios) {
      window.addEventListener("pagehide", () => {
        if (viewportFrame) window.cancelAnimationFrame(viewportFrame);
        window.removeEventListener("scroll", scheduleIosViewportSync);
        window.removeEventListener("resize", scheduleIosViewportSync);
        window.removeEventListener("orientationchange", scheduleIosViewportSync);
        visualViewport?.removeEventListener("scroll", scheduleIosViewportSync);
        visualViewport?.removeEventListener("resize", scheduleIosViewportSync);
      }, { once: true });
    }
  };

  // src/ts/features/countdown.ts
  var keys = ["days", "hours", "minutes", "seconds"];
  var target = (/* @__PURE__ */ new Date("2026-11-19T20:00:00-03:00")).getTime();
  var FINAL_CTA_DOCK_CLEARANCE_PX = 8;
  var DOCK_FADE_MS = 170;
  var replaceCtaLabel = (label, firstLine, secondLine) => {
    label.replaceChildren(
      document.createTextNode(firstLine),
      document.createElement("br"),
      document.createTextNode(secondLine)
    );
  };
  var setupCountdown = () => {
    const countdown = query(".countdown");
    const dock2 = query(".booking-dock");
    const cta = query("[data-booking-cta]");
    const ctaLabel = query("[data-booking-cta-label]", cta ?? void 0);
    const menu = query("#menu");
    const finalMenuCtaAction = query(".menu-final-cta__action");
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    let menuMode = false;
    let finalMenuCtaActionPassedDock = false;
    let finalMenuCtaTriggerScrollY = Number.POSITIVE_INFINITY;
    let measurementFrame = 0;
    let dockCollapseTimer = 0;
    let dockTransitionToken = 0;
    const nodes = {
      days: query('[data-countdown="days"]'),
      hours: query('[data-countdown="hours"]'),
      minutes: query('[data-countdown="minutes"]'),
      seconds: query('[data-countdown="seconds"]')
    };
    const syncDockCtaVisibility = () => {
      if (!cta) return;
      const shouldSuppress = finalMenuCtaActionPassedDock && !menuMode;
      const token = ++dockTransitionToken;
      window.clearTimeout(dockCollapseTimer);
      if (shouldSuppress) {
        cta.classList.add("is-suppressed");
        dock2?.classList.add("is-cta-suppressed");
        cta.setAttribute("tabindex", "-1");
        if (!dock2) return;
        if (reducedMotion2.matches) {
          dock2.classList.add("is-cta-collapsed");
          return;
        }
        dockCollapseTimer = window.setTimeout(() => {
          if (token !== dockTransitionToken || !dock2.classList.contains("is-cta-suppressed")) return;
          dock2.classList.add("is-cta-collapsed");
        }, DOCK_FADE_MS);
        return;
      }
      dock2?.classList.remove("is-cta-collapsed");
      const reveal3 = () => {
        if (token !== dockTransitionToken) return;
        cta.classList.remove("is-suppressed");
        dock2?.classList.remove("is-cta-suppressed");
        cta.removeAttribute("tabindex");
      };
      if (reducedMotion2.matches || !dock2) {
        reveal3();
        return;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(reveal3);
      });
    };
    const syncFinalMenuCtaActionPosition = () => {
      const nextPassedState = window.scrollY >= finalMenuCtaTriggerScrollY;
      if (nextPassedState === finalMenuCtaActionPassedDock) return;
      finalMenuCtaActionPassedDock = nextPassedState;
      syncDockCtaVisibility();
    };
    const measureFinalMenuCtaTrigger = () => {
      measurementFrame = 0;
      if (!finalMenuCtaAction || !dock2) return;
      const scrollY = window.scrollY;
      const actionRect = finalMenuCtaAction.getBoundingClientRect();
      const dockRect = dock2.getBoundingClientRect();
      finalMenuCtaTriggerScrollY = Math.max(
        0,
        scrollY + actionRect.bottom - dockRect.top + FINAL_CTA_DOCK_CLEARANCE_PX
      );
      syncFinalMenuCtaActionPosition();
    };
    const scheduleFinalMenuCtaTriggerMeasurement = () => {
      if (measurementFrame) return;
      measurementFrame = window.requestAnimationFrame(measureFinalMenuCtaTrigger);
    };
    if (finalMenuCtaAction && dock2) {
      measureFinalMenuCtaTrigger();
      window.addEventListener("scroll", syncFinalMenuCtaActionPosition, { passive: true });
      window.addEventListener("resize", scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
      window.addEventListener("orientationchange", scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
      window.visualViewport?.addEventListener("resize", scheduleFinalMenuCtaTriggerMeasurement, { passive: true });
      document.fonts.ready.then(scheduleFinalMenuCtaTriggerMeasurement).catch(() => void 0);
    }
    const handleMenuClick = (event) => {
      if (!menu) return;
      event.preventDefault();
      menu.scrollIntoView({
        behavior: reducedMotion2.matches ? "auto" : "smooth",
        block: "start"
      });
      window.history.replaceState(null, "", "#menu");
    };
    const activateMenuMode = () => {
      if (menuMode || !cta || !ctaLabel) return;
      menuMode = true;
      document.documentElement.classList.add("event-live");
      dock2?.classList.add("is-event-live");
      cta.href = "#menu";
      cta.dataset.destination = "menu";
      cta.setAttribute("aria-label", "Ir al men\xFA");
      replaceCtaLabel(ctaLabel, "IR A", "MEN\xDA");
      cta.addEventListener("click", handleMenuClick);
      countdown?.setAttribute("aria-label", "El evento comenz\xF3");
      countdown?.setAttribute("data-state", "complete");
      syncDockCtaVisibility();
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
      if (remaining === 0) activateMenuMode();
      return remaining;
    };
    if (render() <= 0) return;
    const timerId = window.setInterval(() => {
      if (render() === 0) window.clearInterval(timerId);
    }, 1e3);
  };

  // src/ts/features/hero-intro-motion.ts
  var HERO_TITLE_ANIMATIONS = /* @__PURE__ */ new Set(["stage-title-in", "quiet-fade"]);
  var COMPLETION_FALLBACK_MS = 3400;
  var setupHeroIntroMotion = () => {
    const root = document.documentElement;
    const titleWords = queryAll(".title-word");
    if (!titleWords.length) return;
    let pending = new Set(titleWords);
    let fallbackTimer = 0;
    const cleanupListeners = () => {
      titleWords.forEach((element) => {
        element.removeEventListener("animationend", handleAnimationCompletion);
        element.removeEventListener("animationcancel", handleAnimationCompletion);
      });
    };
    const complete = () => {
      if (root.classList.contains("hero-intro-complete")) return;
      root.classList.add("hero-intro-complete");
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      cleanupListeners();
    };
    function handleAnimationCompletion(event) {
      if (!HERO_TITLE_ANIMATIONS.has(event.animationName)) return;
      pending.delete(event.currentTarget);
      if (!pending.size) complete();
    }
    titleWords.forEach((element) => {
      element.addEventListener("animationend", handleAnimationCompletion);
      element.addEventListener("animationcancel", handleAnimationCompletion);
    });
    window.requestAnimationFrame(() => {
      const animated = titleWords.filter(
        (element) => window.getComputedStyle(element).animationName.split(",").map((name) => name.trim()).some((name) => HERO_TITLE_ANIMATIONS.has(name))
      );
      pending = new Set(animated);
      if (!pending.size) complete();
    });
    fallbackTimer = window.setTimeout(complete, COMPLETION_FALLBACK_MS);
  };

  // src/ts/features/hero-title-scroll.ts
  var clamp = (n) => Math.max(0, Math.min(1, n));
  var ease = (n) => n * n * (3 - 2 * n);
  var setupHeroTitleScroll = () => {
    const hero = query(".hero");
    const lockup = query(".title-lockup");
    const sushi = query(".title-word--sushi");
    const libre = query(".title-word--libre");
    const kicker = query(".title-kicker");
    const heroCopy = query(".hero-copy");
    if (!hero || !lockup || !sushi || !libre || !kicker) return;
    let frame = 0;
    let heroTop = 0;
    let start = 0;
    let distance = 1;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    let kx = 0;
    let ky = 0;
    let finalScale = 1;
    let copyShiftY = 0;
    let mobileMotion = false;
    [sushi, libre, kicker].forEach((el) => {
      el.style.transformOrigin = "0 0";
      el.style.willChange = "transform";
    });
    kicker.style.willChange = "transform, opacity";
    if (heroCopy) heroCopy.style.willChange = "translate, opacity";
    const clear = () => {
      sushi.style.transform = "";
      libre.style.transform = "";
      kicker.style.transform = "";
      kicker.style.opacity = "";
      if (heroCopy) {
        heroCopy.style.translate = "";
        heroCopy.style.opacity = "";
      }
    };
    const measure = () => {
      clear();
      const box = lockup.getBoundingClientRect();
      const s = sushi.getBoundingClientRect();
      const l = libre.getBoundingClientRect();
      const k = kicker.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      const copy = heroCopy?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const mobile = viewportWidth <= 620;
      const tablet = !mobile && viewportWidth <= 900;
      const compact = lockup.classList.contains("is-stacked") || mobile;
      const gap = compact ? Math.max(4, Math.min(8, viewportWidth * 0.012)) : Math.max(6, Math.min(14, viewportWidth * 6e-3));
      mobileMotion = mobile;
      finalScale = compact ? Math.max(0.56, Math.min(1, (box.width - 16 - gap) / (s.width + l.width))) : 1;
      const sw = s.width * finalScale;
      const lw = l.width * finalScale;
      const sh = s.height * finalScale;
      const lh = l.height * finalScale;
      const rowH = Math.max(sh, lh);
      const joinedW = sw + gap + lw;
      const left = box.left + (box.width - joinedW) / 2;
      const drop = mobile ? Math.max(18, Math.min(24, viewportWidth * 0.058)) : 0;
      const top = (compact ? s.top : Math.min(s.top, l.top)) + drop;
      sx = left - s.left;
      sy = top + (rowH - sh) / 2 - s.top;
      lx = left + sw + gap - l.left;
      ly = top + (rowH - lh) / 2 - l.top;
      kx = box.left + (box.width - k.width) / 2 - k.left;
      ky = top + rowH + (compact ? 13 : 12) - k.top;
      const kickerBottom = k.bottom + ky;
      const safeGap = mobile ? 30 : tablet ? 26 : 30;
      copyShiftY = copy ? Math.max(0, kickerBottom + safeGap - copy.top) : 0;
      heroTop = window.scrollY + h.top;
      const height = Math.max(hero.offsetHeight, window.innerHeight);
      start = height * (mobile ? 4e-3 : tablet ? 6e-3 : 0.01);
      distance = height * (mobile ? 0.15 : tablet ? 0.17 : 0.23);
    };
    const render = () => {
      frame = 0;
      const raw = clamp((window.scrollY - heroTop - start) / distance);
      const p = ease(raw);
      const scale = 1 + (finalScale - 1) * p;
      sushi.style.transform = `translate3d(${sx * p}px, ${sy * p}px, 0) scale(${scale})`;
      libre.style.transform = `translate3d(${lx * p}px, ${ly * p}px, 0) scale(${scale})`;
      if (mobileMotion) {
        const kp = ease(clamp((raw - 0.08) / 0.76));
        const before = 1 - ease(clamp(raw / 0.2));
        const after = ease(clamp((raw - 0.68) / 0.24));
        kicker.style.transform = `translate3d(${kx * kp}px, ${ky * kp}px, 0)`;
        kicker.style.opacity = String(Math.max(before, after));
      } else {
        kicker.style.transform = `translate3d(${kx * p}px, ${ky * p}px, 0)`;
        kicker.style.opacity = "";
      }
      if (heroCopy) {
        const copyP = ease(clamp((raw - 0.18) / 0.7));
        heroCopy.style.translate = `0 ${copyShiftY * copyP}px`;
        heroCopy.style.opacity = String(1 - copyP * 0.82);
      }
    };
    const scheduleRender = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(render);
    };
    const refresh = () => {
      window.requestAnimationFrame(() => {
        measure();
        render();
      });
    };
    window.addEventListener("scroll", scheduleRender, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("orientationchange", refresh, { passive: true });
    document.fonts.ready.then(refresh).catch(() => void 0);
    refresh();
  };

  // src/ts/features/hero-title-layout.ts
  var STACKED_CLASS = "is-stacked";
  var INLINE_WIDTH = "min(1600px, calc(100vw - 48px))";
  var COLLISION_BUFFER_PX = 8;
  var RETURN_BUFFER_PX = 24;
  var setupHeroTitleLayout = () => {
    const hero = query(".hero");
    const lockup = query(".title-lockup");
    const sushi = query(".title-word--sushi");
    const kicker = query(".title-kicker");
    const libre = query(".title-word--libre");
    if (!hero || !lockup || !sushi || !kicker || !libre) return;
    let scheduledFrame = 0;
    const measureInlineFit = () => {
      const wasStacked = lockup.classList.contains(STACKED_CLASS);
      const previousWidth = lockup.style.width;
      if (wasStacked) lockup.classList.remove(STACKED_CLASS);
      lockup.style.width = INLINE_WIDTH;
      const style = window.getComputedStyle(lockup);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const available = lockup.clientWidth;
      const required = sushi.getBoundingClientRect().width + kicker.getBoundingClientRect().width + libre.getBoundingClientRect().width + gap * 2;
      lockup.style.width = previousWidth;
      if (wasStacked) lockup.classList.add(STACKED_CLASS);
      return { available, required };
    };
    const syncLayout = () => {
      const wasStacked = lockup.classList.contains(STACKED_CLASS);
      const { available, required } = measureInlineFit();
      const buffer = wasStacked ? RETURN_BUFFER_PX : COLLISION_BUFFER_PX;
      const shouldStack = required + buffer > available;
      lockup.classList.toggle(STACKED_CLASS, shouldStack);
      lockup.style.width = shouldStack ? "" : INLINE_WIDTH;
    };
    const scheduleSync = () => {
      if (scheduledFrame) return;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        syncLayout();
      });
    };
    scheduleSync();
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleSync);
      observer.observe(hero);
    }
    document.fonts.ready.then(scheduleSync).catch(() => void 0);
    setupHeroTitleScroll();
  };

  // src/ts/features/piece-cursor-prompt.ts
  var DESKTOP_PROMPT_QUERY = "(hover: hover) and (pointer: fine)";
  var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  var SPRING_STIFFNESS = 260;
  var SPRING_DAMPING = 30;
  var MAX_FRAME_DELTA = 1 / 30;
  var MAX_DEFORM_SPEED = 1450;
  var CURSOR_OFFSET_X = 14;
  var CURSOR_OFFSET_Y = 10;
  var EDGE_GUTTER = 10;
  var BLOB_POINTS = 18;
  var BLOB_RADIUS = 43;
  var BLOB_CENTER = 50;
  var MAX_STRETCH = 0.22;
  var MAX_SQUASH = 0.13;
  var LEADING_BELLY = 4.6;
  var TRAILING_CAVE = 2.8;
  var SIDE_BULGE = 1.35;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var clamp2 = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  var closedSplinePath = (points) => {
    if (points.length < 3) return "";
    const count = points.length;
    const first = points[0];
    if (!first) return "";
    let path = `M ${first.x.toFixed(3)} ${first.y.toFixed(3)}`;
    for (let index = 0; index < count; index += 1) {
      const previous = points[(index - 1 + count) % count];
      const current = points[index];
      const next = points[(index + 1) % count];
      const afterNext = points[(index + 2) % count];
      if (!previous || !current || !next || !afterNext) continue;
      const control1X = current.x + (next.x - previous.x) / 6;
      const control1Y = current.y + (next.y - previous.y) / 6;
      const control2X = next.x - (afterNext.x - current.x) / 6;
      const control2Y = next.y - (afterNext.y - current.y) / 6;
      path += ` C ${control1X.toFixed(3)} ${control1Y.toFixed(3)}, ${control2X.toFixed(3)} ${control2Y.toFixed(3)}, ${next.x.toFixed(3)} ${next.y.toFixed(3)}`;
    }
    return `${path} Z`;
  };
  var buildBlobPath = (deformation, directionX, directionY) => {
    const directionLength = Math.hypot(directionX, directionY) || 1;
    const dx = directionX / directionLength;
    const dy = directionY / directionLength;
    const px = -dy;
    const py = dx;
    const stretch = 1 + deformation * MAX_STRETCH;
    const squash = 1 - deformation * MAX_SQUASH;
    const points = [];
    for (let index = 0; index < BLOB_POINTS; index += 1) {
      const angle = index / BLOB_POINTS * Math.PI * 2;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const axial = ux * dx + uy * dy;
      const lateral = ux * px + uy * py;
      const leading = Math.max(0, axial) ** 2;
      const trailing = Math.max(0, -axial) ** 2;
      const side = Math.max(0, 1 - Math.abs(axial)) ** 1.6;
      const along = BLOB_RADIUS * axial * stretch;
      const across = BLOB_RADIUS * lateral * squash;
      let x = BLOB_CENTER + dx * along + px * across;
      let y = BLOB_CENTER + dy * along + py * across;
      const directionalPush = deformation * (LEADING_BELLY * leading - TRAILING_CAVE * trailing);
      const sidePush = deformation * SIDE_BULGE * side;
      x += dx * directionalPush + ux * sidePush;
      y += dy * directionalPush + uy * sidePush;
      points.push({ x, y });
    }
    return closedSplinePath(points);
  };
  var setupPieceCursorPrompt = () => {
    const menuRoot2 = query("[data-menu-root]");
    const itemZones = queryAll(".menu-group__items", menuRoot2 ?? void 0);
    const pieceItems = queryAll("[data-piece-item]", menuRoot2 ?? void 0);
    if (!menuRoot2 || !itemZones.length || !pieceItems.length) return;
    const desktopPrompt = window.matchMedia(DESKTOP_PROMPT_QUERY);
    const reducedMotion2 = window.matchMedia(REDUCED_MOTION_QUERY);
    const prompt = document.createElement("div");
    prompt.className = "piece-cursor-preview";
    prompt.setAttribute("aria-hidden", "true");
    const surface = document.createElementNS(SVG_NS, "svg");
    surface.classList.add("piece-cursor-preview__surface");
    surface.setAttribute("viewBox", "0 0 100 100");
    surface.setAttribute("aria-hidden", "true");
    surface.setAttribute("focusable", "false");
    const surfacePath = document.createElementNS(SVG_NS, "path");
    surfacePath.classList.add("piece-cursor-preview__shape");
    surfacePath.setAttribute("d", buildBlobPath(0, 1, 0));
    surface.append(surfacePath);
    const label = document.createElement("span");
    label.className = "piece-cursor-preview__label";
    label.textContent = "CLICKE\xC1";
    const icon = document.createElement("img");
    icon.className = "piece-cursor-preview__icon";
    icon.src = "assets/visibility.svg";
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    prompt.append(surface, label, icon);
    document.body.append(prompt);
    let activeZone = null;
    let frameId = 0;
    let lastFrameTime = 0;
    let lastPointerTime = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let targetX = pointerX;
    let targetY = pointerY;
    let currentX = pointerX;
    let currentY = pointerY;
    let velocityX = 0;
    let velocityY = 0;
    let deformation = 0;
    let directionX = 1;
    let directionY = 0;
    let promptRadius = 44;
    let hasPosition = false;
    let hasClicked = false;
    const measurePrompt = () => {
      const bounds = prompt.getBoundingClientRect();
      if (bounds.width > 0) promptRadius = Math.max(bounds.width, bounds.height) * 0.5;
    };
    const markAsUnderstood = () => {
      if (hasClicked) return;
      hasClicked = true;
      prompt.classList.add("has-clicked");
      window.requestAnimationFrame(measurePrompt);
    };
    const updateTarget = (event) => {
      const clientX = event.clientX;
      const clientY = event.clientY;
      pointerX = clientX;
      pointerY = clientY;
      if (lastPointerTime > 0) {
        const elapsed = Math.max(8, event.timeStamp - lastPointerTime) / 1e3;
        const rawVelocityX = (clientX - lastPointerX) / elapsed;
        const rawVelocityY = (clientY - lastPointerY) / elapsed;
        pointerVelocityX += (rawVelocityX - pointerVelocityX) * 0.48;
        pointerVelocityY += (rawVelocityY - pointerVelocityY) * 0.48;
      }
      lastPointerTime = event.timeStamp;
      lastPointerX = clientX;
      lastPointerY = clientY;
      targetX = clamp2(
        clientX + CURSOR_OFFSET_X,
        promptRadius + EDGE_GUTTER,
        Math.max(promptRadius + EDGE_GUTTER, window.innerWidth - promptRadius - EDGE_GUTTER)
      );
      targetY = clamp2(
        clientY + CURSOR_OFFSET_Y,
        promptRadius + EDGE_GUTTER,
        Math.max(promptRadius + EDGE_GUTTER, window.innerHeight - promptRadius - EDGE_GUTTER)
      );
      if (!hasPosition) {
        currentX = targetX;
        currentY = targetY;
        hasPosition = true;
      }
    };
    const shouldKeepAnimating = () => Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1 || Math.abs(velocityX) > 0.7 || Math.abs(velocityY) > 0.7 || Math.abs(pointerVelocityX) > 0.7 || Math.abs(pointerVelocityY) > 0.7 || deformation > 1e-3;
    const runFrame = (time) => {
      frameId = 0;
      const elapsed = lastFrameTime ? (time - lastFrameTime) / 1e3 : 1 / 60;
      const delta = clamp2(elapsed, 1 / 240, MAX_FRAME_DELTA);
      lastFrameTime = time;
      if (reducedMotion2.matches) {
        currentX = targetX;
        currentY = targetY;
        velocityX = 0;
        velocityY = 0;
        pointerVelocityX = 0;
        pointerVelocityY = 0;
        deformation = 0;
      } else {
        const accelerationX = (targetX - currentX) * SPRING_STIFFNESS - velocityX * SPRING_DAMPING;
        const accelerationY = (targetY - currentY) * SPRING_STIFFNESS - velocityY * SPRING_DAMPING;
        velocityX += accelerationX * delta;
        velocityY += accelerationY * delta;
        currentX += velocityX * delta;
        currentY += velocityY * delta;
        const motionX = velocityX * 0.76 + pointerVelocityX * 0.24;
        const motionY = velocityY * 0.76 + pointerVelocityY * 0.24;
        const kineticSpeed = Math.hypot(motionX, motionY);
        const deformationTarget = clamp2(kineticSpeed / MAX_DEFORM_SPEED, 0, 1);
        const deformationBlend = 1 - Math.exp(-delta * 14);
        deformation += (deformationTarget - deformation) * deformationBlend;
        if (kineticSpeed > 2) {
          const targetDirectionX = motionX / kineticSpeed;
          const targetDirectionY = motionY / kineticSpeed;
          const directionBlend = 1 - Math.exp(-delta * 11);
          directionX += (targetDirectionX - directionX) * directionBlend;
          directionY += (targetDirectionY - directionY) * directionBlend;
          const directionLength = Math.hypot(directionX, directionY) || 1;
          directionX /= directionLength;
          directionY /= directionLength;
        }
        const pointerDecay = Math.exp(-delta * 13);
        pointerVelocityX *= pointerDecay;
        pointerVelocityY *= pointerDecay;
      }
      prompt.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      surfacePath.setAttribute("d", buildBlobPath(deformation, directionX, directionY));
      if (shouldKeepAnimating()) frameId = window.requestAnimationFrame(runFrame);
      else lastFrameTime = 0;
    };
    const ensureAnimation = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(runFrame);
    };
    const resolveItem = (target2) => {
      if (!(target2 instanceof Element)) return null;
      return target2.closest("[data-piece-item]");
    };
    const activateZone = (zone, event) => {
      if (!desktopPrompt.matches) return;
      if (activeZone && activeZone !== zone) {
        activeZone.classList.remove("has-piece-cursor-prompt");
      }
      activeZone = zone;
      activeZone.classList.add("has-piece-cursor-prompt");
      updateTarget(event);
      prompt.classList.add("is-visible");
      ensureAnimation();
    };
    const hidePrompt = (zone) => {
      if (zone && activeZone !== zone) return;
      activeZone?.classList.remove("has-piece-cursor-prompt");
      activeZone = null;
      prompt.classList.remove("is-visible");
      pointerVelocityX = 0;
      pointerVelocityY = 0;
      lastPointerTime = 0;
      ensureAnimation();
    };
    itemZones.forEach((zone) => {
      zone.addEventListener("pointerenter", (event) => activateZone(zone, event), { passive: true });
      zone.addEventListener("pointermove", (event) => {
        if (!desktopPrompt.matches) return;
        if (activeZone !== zone || !prompt.classList.contains("is-visible")) {
          activateZone(zone, event);
          return;
        }
        updateTarget(event);
        ensureAnimation();
      }, { passive: true });
      zone.addEventListener("pointerleave", () => hidePrompt(zone), { passive: true });
    });
    menuRoot2.addEventListener("click", (event) => {
      if (!desktopPrompt.matches || !resolveItem(event.target)) return;
      markAsUnderstood();
    });
    const syncPromptMode = () => {
      if (desktopPrompt.matches) {
        measurePrompt();
        return;
      }
      hidePrompt();
    };
    desktopPrompt.addEventListener("change", syncPromptMode);
    reducedMotion2.addEventListener("change", ensureAnimation);
    window.addEventListener("resize", () => {
      measurePrompt();
      if (hasPosition) {
        targetX = clamp2(pointerX + CURSOR_OFFSET_X, promptRadius + EDGE_GUTTER, Math.max(promptRadius + EDGE_GUTTER, window.innerWidth - promptRadius - EDGE_GUTTER));
        targetY = clamp2(pointerY + CURSOR_OFFSET_Y, promptRadius + EDGE_GUTTER, Math.max(promptRadius + EDGE_GUTTER, window.innerHeight - promptRadius - EDGE_GUTTER));
      }
      ensureAnimation();
    }, { passive: true });
    window.requestAnimationFrame(measurePrompt);
  };

  // src/ts/features/piece-viewer.ts
  var LOADING_MESSAGE = "CARGANDO IMAGEN";
  var ERROR_MESSAGE = "IMAGEN NO DISPONIBLE";
  var CLOSE_FALLBACK_MS = 320;
  var REDUCED_CLOSE_FALLBACK_MS = 170;
  var PRELOAD_CONCURRENCY = 3;
  var MOBILE_PIECE_QUERY = "(max-width: 720px)";
  var SCROLL_KEYS = /* @__PURE__ */ new Set([
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
    " ",
    "Spacebar"
  ]);
  var isInteractiveTarget = (target2) => target2 instanceof Element && Boolean(target2.closest(
    'a[href], button, input, textarea, select, [contenteditable="true"]'
  ));
  var preloadPieceImages = (triggers) => {
    const sources = Array.from(new Set(
      triggers.map((trigger) => trigger.dataset.pieceImage?.trim()).filter((source) => Boolean(source))
    ));
    if (!sources.length) return;
    const pending = /* @__PURE__ */ new Set();
    let cursor = 0;
    let active = 0;
    const pump = () => {
      while (active < PRELOAD_CONCURRENCY && cursor < sources.length) {
        const source = sources[cursor];
        cursor += 1;
        if (!source) continue;
        const preload = new Image();
        active += 1;
        pending.add(preload);
        preload.decoding = "async";
        preload.fetchPriority = "low";
        const settle2 = () => {
          preload.onload = null;
          preload.onerror = null;
          pending.delete(preload);
          active -= 1;
          pump();
        };
        preload.onload = settle2;
        preload.onerror = settle2;
        preload.src = source;
      }
    };
    window.requestAnimationFrame(() => {
      window.setTimeout(pump, 0);
    });
  };
  var setupPieceViewer = () => {
    const root = document.documentElement;
    const dialog = query("[data-piece-viewer]");
    const image = query("[data-piece-viewer-image]", dialog ?? void 0);
    const status = query("[data-piece-viewer-status]", dialog ?? void 0);
    const statusText = query("[data-piece-viewer-status-text]", dialog ?? void 0);
    const closeButton = query("[data-piece-viewer-close]", dialog ?? void 0);
    const openButtons = queryAll("[data-piece-viewer-open]");
    const pieceItems = queryAll("[data-piece-item]");
    if (!dialog || !image || !status || !statusText || !closeButton || !pieceItems.length) return;
    preloadPieceImages(pieceItems);
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobilePieces = window.matchMedia(MOBILE_PIECE_QUERY);
    let activeTrigger = null;
    let closeTimer = 0;
    let openFrame = 0;
    let imageFrame = 0;
    let scrollCorrectionFrame = 0;
    let lockedScrollY = 0;
    let backgroundLocked = false;
    const syncInteractivity = () => {
      pieceItems.forEach((item) => {
        const name = item.dataset.pieceName?.trim() || "pieza";
        item.setAttribute("role", "button");
        item.tabIndex = 0;
        item.setAttribute("aria-haspopup", "dialog");
        item.setAttribute("aria-controls", "piece-viewer");
        item.setAttribute("aria-label", `Ver imagen de ${name}`);
      });
      openButtons.forEach((button) => {
        button.tabIndex = mobilePieces.matches ? 0 : -1;
        if (mobilePieces.matches) button.removeAttribute("aria-hidden");
        else button.setAttribute("aria-hidden", "true");
      });
    };
    const preventBackgroundScroll = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    const preventBackgroundScrollKey = (event) => {
      if (!SCROLL_KEYS.has(event.key) || isInteractiveTarget(event.target)) return;
      event.preventDefault();
    };
    const enforceLockedScroll = () => {
      if (!backgroundLocked || scrollCorrectionFrame) return;
      scrollCorrectionFrame = window.requestAnimationFrame(() => {
        scrollCorrectionFrame = 0;
        if (!backgroundLocked || Math.abs(window.scrollY - lockedScrollY) < 0.5) return;
        window.scrollTo(0, lockedScrollY);
      });
    };
    const lockBackground = () => {
      if (backgroundLocked) return;
      lockedScrollY = window.scrollY;
      backgroundLocked = true;
      root.classList.add("has-piece-viewer");
      window.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      window.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
      window.addEventListener("scroll", enforceLockedScroll, { passive: true });
      document.addEventListener("keydown", preventBackgroundScrollKey, true);
      enforceLockedScroll();
    };
    const unlockBackground = () => {
      if (!backgroundLocked) return;
      backgroundLocked = false;
      window.removeEventListener("wheel", preventBackgroundScroll);
      window.removeEventListener("touchmove", preventBackgroundScroll);
      window.removeEventListener("scroll", enforceLockedScroll);
      document.removeEventListener("keydown", preventBackgroundScrollKey, true);
      if (scrollCorrectionFrame) window.cancelAnimationFrame(scrollCorrectionFrame);
      scrollCorrectionFrame = 0;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      root.classList.remove("has-piece-viewer");
      window.scrollTo(0, lockedScrollY);
      root.style.scrollBehavior = previousScrollBehavior;
    };
    const setLoadingState = () => {
      if (imageFrame) window.cancelAnimationFrame(imageFrame);
      dialog.dataset.state = "loading";
      statusText.textContent = LOADING_MESSAGE;
      status.hidden = false;
      image.hidden = true;
    };
    const setReadyState = () => {
      if (!dialog.open || dialog.classList.contains("is-closing")) return;
      image.hidden = false;
      imageFrame = window.requestAnimationFrame(() => {
        imageFrame = 0;
        if (!dialog.open || dialog.classList.contains("is-closing")) return;
        dialog.dataset.state = "ready";
        status.hidden = true;
      });
    };
    const setErrorState = () => {
      if (!dialog.open || dialog.classList.contains("is-closing")) return;
      dialog.dataset.state = "error";
      statusText.textContent = ERROR_MESSAGE;
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
    const clearMotionSchedules = () => {
      if (closeTimer) window.clearTimeout(closeTimer);
      if (openFrame) window.cancelAnimationFrame(openFrame);
      if (imageFrame) window.cancelAnimationFrame(imageFrame);
      closeTimer = 0;
      openFrame = 0;
      imageFrame = 0;
      dialog.removeEventListener("transitionend", handleCloseTransition);
    };
    const cleanup = () => {
      clearMotionSchedules();
      unlockBackground();
      dialog.classList.remove("is-open", "is-closing");
      dialog.setAttribute("aria-label", "Vista de pieza");
      image.removeAttribute("src");
      image.alt = "";
      statusText.textContent = LOADING_MESSAGE;
      status.hidden = false;
      image.hidden = true;
      delete dialog.dataset.state;
      const trigger = activeTrigger;
      activeTrigger = null;
      trigger?.focus({ preventScroll: true });
    };
    const finishClose = () => {
      clearMotionSchedules();
      if (!dialog.open) return;
      if (typeof dialog.close === "function") dialog.close();
      else {
        dialog.removeAttribute("open");
        cleanup();
      }
    };
    function handleCloseTransition(event) {
      if (event.target !== dialog || event.propertyName !== "opacity") return;
      finishClose();
    }
    const closeDialog = () => {
      if (!dialog.open || dialog.classList.contains("is-closing")) return;
      if (openFrame) window.cancelAnimationFrame(openFrame);
      openFrame = 0;
      dialog.classList.remove("is-open");
      dialog.classList.add("is-closing");
      dialog.addEventListener("transitionend", handleCloseTransition);
      closeTimer = window.setTimeout(
        finishClose,
        reducedMotion2.matches ? REDUCED_CLOSE_FALLBACK_MS : CLOSE_FALLBACK_MS
      );
    };
    const beginOpenAnimation = (source) => {
      openFrame = window.requestAnimationFrame(() => {
        openFrame = 0;
        if (!dialog.open || dialog.classList.contains("is-closing")) return;
        void dialog.getBoundingClientRect();
        openFrame = window.requestAnimationFrame(() => {
          openFrame = 0;
          if (!dialog.open || dialog.classList.contains("is-closing")) return;
          dialog.classList.add("is-open");
          image.fetchPriority = "high";
          image.src = source;
          enforceLockedScroll();
        });
      });
    };
    const openPiece = (trigger) => {
      const name = trigger.dataset.pieceName?.trim();
      const source = trigger.dataset.pieceImage?.trim();
      if (!name || !source) return;
      clearMotionSchedules();
      activeTrigger = trigger;
      dialog.setAttribute("aria-label", `Imagen de ${name}`);
      image.alt = name;
      image.removeAttribute("src");
      setLoadingState();
      lockBackground();
      dialog.classList.remove("is-open", "is-closing");
      openDialog();
      beginOpenAnimation(source);
    };
    pieceItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("[data-piece-viewer-open]") : null;
        openPiece(button ?? item);
      });
      item.addEventListener("keydown", (event) => {
        if (event.target !== item) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openPiece(item);
      });
    });
    image.addEventListener("load", setReadyState);
    image.addEventListener("error", setErrorState);
    closeButton.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", cleanup);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog();
    });
    mobilePieces.addEventListener("change", syncInteractivity);
    syncInteractivity();
  };

  // src/ts/features/proposal-reveal.ts
  var RESPONSIVE_REVEAL_QUERY = "(max-width: 840px)";
  var DESKTOP_REVEAL_RATIO = 0.82;
  var REVEAL_DOCK_GAP_PX = 16;
  var MIN_VISIBLE_PX = 12;
  var MAX_VISIBLE_PX = 28;
  var VISIBLE_RATIO = 0.08;
  var LINE_SPLIT_SELECTOR = ".proposal__intro, .proposal__condition p";
  var LINE_TOP_TOLERANCE_PX = 3;
  var originalLineHtml = /* @__PURE__ */ new WeakMap();
  var reveal = (element) => {
    if (element.classList.contains("is-visible")) return;
    element.classList.remove("is-reveal-bypassed");
    element.classList.add("is-visible");
  };
  var bypassReveal = (element) => {
    element.classList.add("is-visible", "is-reveal-bypassed");
  };
  var getViewportBottom = () => {
    const viewport = window.visualViewport;
    return viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  };
  var getRevealBoundary = (dock2, responsiveReveal) => {
    const viewportBottom = getViewportBottom();
    if (!responsiveReveal.matches || !dock2) {
      return viewportBottom * DESKTOP_REVEAL_RATIO;
    }
    const dockBounds = dock2.getBoundingClientRect();
    const dockIsFixed = window.getComputedStyle(dock2).position === "fixed";
    const dockOverlapsViewport = dockBounds.bottom > 0 && dockBounds.top < viewportBottom;
    if (!dockIsFixed || !dockOverlapsViewport) {
      return viewportBottom * DESKTOP_REVEAL_RATIO;
    }
    return Math.max(0, dockBounds.top - REVEAL_DOCK_GAP_PX);
  };
  var hasCrossedRevealBoundary = (element, boundary) => {
    const bounds = element.getBoundingClientRect();
    const visibleDistance = Math.min(
      MAX_VISIBLE_PX,
      Math.max(MIN_VISIBLE_PX, bounds.height * VISIBLE_RATIO)
    );
    return bounds.bottom > 0 && bounds.top + visibleDistance <= boundary;
  };
  var wrapWords = (element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.data.trim()) textNodes.push(node);
    }
    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          return;
        }
        const mask = document.createElement("span");
        const word = document.createElement("span");
        mask.className = "proposal-line-mask";
        word.className = "proposal-line-word";
        word.textContent = token;
        mask.append(word);
        fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
  };
  var splitResponsiveLines = (element) => {
    const original = originalLineHtml.get(element) ?? element.innerHTML;
    const wasVisible = element.classList.contains("is-visible");
    originalLineHtml.set(element, original);
    element.innerHTML = original;
    element.classList.remove("has-line-split", "is-line-split-settled");
    wrapWords(element);
    const masks = queryAll(".proposal-line-mask", element);
    let lineIndex = -1;
    let lineTop = Number.NEGATIVE_INFINITY;
    masks.forEach((mask) => {
      const top = mask.getBoundingClientRect().top;
      if (lineIndex < 0 || Math.abs(top - lineTop) > LINE_TOP_TOLERANCE_PX) {
        lineIndex += 1;
        lineTop = top;
      }
      mask.style.setProperty("--proposal-line-index", String(lineIndex));
    });
    element.style.setProperty("--proposal-line-count", String(Math.max(0, lineIndex + 1)));
    element.classList.add("has-line-split");
    if (wasVisible) element.classList.add("is-line-split-settled");
  };
  var setupResponsiveLineSplits = (proposalRoot) => {
    const targets = queryAll(LINE_SPLIT_SELECTOR, proposalRoot);
    if (!targets.length) return () => void 0;
    let resizeTimer = 0;
    const splitAll = () => {
      targets.forEach(splitResponsiveLines);
    };
    const scheduleSplit = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(splitAll, 110);
    };
    splitAll();
    window.addEventListener("resize", scheduleSplit, { passive: true });
    window.addEventListener("orientationchange", scheduleSplit, { passive: true });
    document.fonts.ready.then(scheduleSplit).catch(() => void 0);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleSplit);
      window.removeEventListener("orientationchange", scheduleSplit);
    };
  };
  var setupProposalReveal = () => {
    const root = document.documentElement;
    const proposalRoot = query("[data-proposal-root]");
    root.setAttribute("data-proposal-reveal-ready", "");
    if (!proposalRoot) return;
    const cleanupLineSplits = setupResponsiveLineSplits(proposalRoot);
    const targets = queryAll("[data-proposal-reveal]", proposalRoot);
    if (!targets.length) return;
    const dock2 = query(".booking-dock");
    const responsiveReveal = window.matchMedia(RESPONSIVE_REVEAL_QUERY);
    const visualViewport = window.visualViewport;
    const pendingTargets = new Set(targets);
    let updateFrame = 0;
    const revealVisibleTargets = () => {
      updateFrame = 0;
      const boundary = getRevealBoundary(dock2, responsiveReveal);
      pendingTargets.forEach((element) => {
        if (element.classList.contains("is-visible")) {
          pendingTargets.delete(element);
          return;
        }
        if (!hasCrossedRevealBoundary(element, boundary)) return;
        reveal(element);
        pendingTargets.delete(element);
      });
      if (!pendingTargets.size) removeListeners();
    };
    const scheduleUpdate = () => {
      if (updateFrame) return;
      updateFrame = window.requestAnimationFrame(revealVisibleTargets);
    };
    const removeListeners = () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      responsiveReveal.removeEventListener("change", scheduleUpdate);
      visualViewport?.removeEventListener("resize", scheduleUpdate);
      visualViewport?.removeEventListener("scroll", scheduleUpdate);
    };
    if (root.classList.contains("proposal-reveal-fallback")) {
      const boundary = getRevealBoundary(dock2, responsiveReveal);
      pendingTargets.forEach((element) => {
        if (!hasCrossedRevealBoundary(element, boundary)) return;
        bypassReveal(element);
        pendingTargets.delete(element);
      });
      root.classList.remove("proposal-reveal-fallback");
    }
    if (!pendingTargets.size) {
      window.addEventListener("pagehide", cleanupLineSplits, { once: true });
      return;
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    responsiveReveal.addEventListener("change", scheduleUpdate);
    visualViewport?.addEventListener("resize", scheduleUpdate, { passive: true });
    visualViewport?.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("pagehide", cleanupLineSplits, { once: true });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(revealVisibleTargets);
    });
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
  var setupVideoLoop = ({
    root,
    compactViewport,
    coarsePointer
  }) => {
    const hero = query(".hero");
    const introVideo = query("[data-intro-video]");
    const loopVideos = queryAll("[data-loop-video]");
    if (!introVideo || loopVideos.length === 0) return;
    const allVideos = [introVideo, ...loopVideos];
    const compactPlayback = compactViewport.matches || coarsePointer.matches;
    const mixDuration = compactPlayback ? 650 : 900;
    const mixLead = mixDuration / 1e3 + 0.24;
    root.style.setProperty("--video-mix-duration", `${mixDuration}ms`);
    introVideo.hidden = false;
    introVideo.loop = false;
    introVideo.muted = true;
    introVideo.playsInline = true;
    introVideo.preload = "metadata";
    introVideo.classList.add("is-active");
    introVideo.classList.remove("is-mixing-in");
    loopVideos.forEach((video) => {
      video.hidden = false;
      video.loop = false;
      video.muted = true;
      video.playsInline = true;
      video.preload = "none";
      video.classList.remove("is-active", "is-mixing-in");
    });
    let phase = "intro";
    let introCompleted = false;
    let activeLoopIndex = 0;
    let transitionInProgress = false;
    let boundaryTimerId = 0;
    let mixTimerId = 0;
    let recoveryTimerId = 0;
    let mixGeneration = 0;
    let suspendedState = null;
    let heroVisible = true;
    let lastProgressVideo = introVideo;
    let lastMediaTime = 0;
    let lastProgressAt = performance.now();
    const canPlay = () => !document.hidden && heroVisible && navigator.onLine !== false;
    const getLoopVideo = (index) => loopVideos[index] ?? null;
    const currentVideo = () => phase === "intro" ? introVideo : getLoopVideo(activeLoopIndex) ?? introVideo;
    const nextLoopIndex = (index) => loopVideos.length > 1 ? (index + 1) % loopVideos.length : index;
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
    const resetVisualState = (activeVideo) => {
      allVideos.forEach((video) => {
        if (video !== activeVideo) video.pause();
        video.classList.remove("is-active", "is-mixing-in");
      });
      activeVideo.classList.add("is-active");
    };
    const activateIntro = (time) => {
      clearBoundaryTimer();
      clearMixTimer();
      mixGeneration += 1;
      transitionInProgress = false;
      phase = "intro";
      resetVisualState(introVideo);
      ensureVideoSource(introVideo);
      setCurrentTimeSafely(introVideo, time);
      return introVideo;
    };
    const activateLoop = (index, time) => {
      const video = getLoopVideo(index);
      if (!video || !ensureVideoSource(video)) return null;
      clearBoundaryTimer();
      clearMixTimer();
      mixGeneration += 1;
      transitionInProgress = false;
      phase = "loop";
      activeLoopIndex = index;
      resetVisualState(video);
      setCurrentTimeSafely(video, time);
      return video;
    };
    const primeLoop = (index) => {
      const video = getLoopVideo(index);
      if (!video) return null;
      video.preload = "auto";
      return ensureVideoSource(video) ? video : null;
    };
    const noteProgress = (video) => {
      if (video !== currentVideo()) return;
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : lastMediaTime;
      if (video !== lastProgressVideo || Math.abs(currentTime - lastMediaTime) >= 0.04 || currentTime < lastMediaTime) {
        lastProgressVideo = video;
        lastMediaTime = currentTime;
        lastProgressAt = performance.now();
      }
    };
    const scheduleBoundary = () => {
      clearBoundaryTimer();
      if (!canPlay() || transitionInProgress || phase !== "loop") return;
      const activeVideo = getLoopVideo(activeLoopIndex);
      if (!activeVideo) return;
      const duration = activeVideo.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        activeVideo.addEventListener("loadedmetadata", scheduleBoundary, { once: true });
        return;
      }
      const playbackRate = Math.max(0.1, Math.abs(activeVideo.playbackRate || 1));
      const remaining = duration - activeVideo.currentTime;
      const delay = Math.max(0, (remaining - mixLead) / playbackRate * 1e3);
      const scheduledIndex = activeLoopIndex;
      boundaryTimerId = window.setTimeout(() => {
        boundaryTimerId = 0;
        if (phase !== "loop" || activeLoopIndex !== scheduledIndex || transitionInProgress) return;
        const currentRemaining = activeVideo.duration - activeVideo.currentTime;
        if (currentRemaining <= mixLead + 0.16) {
          void transitionToLoop(nextLoopIndex(activeLoopIndex));
        } else {
          scheduleBoundary();
        }
      }, delay);
    };
    const recoverCurrentVideo = async (forceReload = false) => {
      clearRecoveryTimer();
      if (!canPlay()) return;
      if (phase === "intro" && introCompleted) {
        void transitionToLoop(0);
        return;
      }
      const video = currentVideo();
      if (!ensureVideoSource(video)) return;
      if (phase === "loop") {
        const duration = video.duration;
        const reachedBoundary = video.ended || Number.isFinite(duration) && duration > 0 && duration - video.currentTime < 0.12;
        if (reachedBoundary) setCurrentTimeSafely(video, 0);
      }
      if (forceReload || video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        const resumeTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        video.load();
        setCurrentTimeSafely(video, resumeTime);
      }
      try {
        await playWithTimeout(video);
        lastProgressVideo = video;
        lastMediaTime = video.currentTime;
        lastProgressAt = performance.now();
        if (phase === "loop") scheduleBoundary();
      } catch {
        if (canPlay()) {
          recoveryTimerId = window.setTimeout(() => {
            recoveryTimerId = 0;
            void recoverCurrentVideo(true);
          }, STALL_RECOVERY_DELAY);
        }
      }
    };
    const scheduleRecovery = (forceReload = false) => {
      if (!canPlay() || recoveryTimerId) return;
      recoveryTimerId = window.setTimeout(() => {
        recoveryTimerId = 0;
        void recoverCurrentVideo(forceReload);
      }, STALL_RECOVERY_DELAY);
    };
    async function transitionToLoop(index) {
      if (transitionInProgress || !canPlay()) return;
      const outgoing = currentVideo();
      const incoming = primeLoop(index);
      if (!incoming) {
        scheduleRecovery(true);
        return;
      }
      if (outgoing === incoming) {
        setCurrentTimeSafely(incoming, 0);
        try {
          await playWithTimeout(incoming);
          phase = "loop";
          activeLoopIndex = index;
          scheduleBoundary();
        } catch {
          scheduleRecovery(true);
        }
        return;
      }
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
          incoming.classList.remove("is-active", "is-mixing-in");
          return;
        }
        window.requestAnimationFrame(() => {
          if (generation === mixGeneration && canPlay()) incoming.classList.add("is-active");
        });
        mixTimerId = window.setTimeout(() => {
          if (generation !== mixGeneration || !canPlay()) return;
          outgoing.classList.remove("is-active");
          outgoing.pause();
          if (outgoing !== introVideo) setCurrentTimeSafely(outgoing, 0);
          incoming.classList.remove("is-mixing-in");
          phase = "loop";
          activeLoopIndex = index;
          transitionInProgress = false;
          mixTimerId = 0;
          lastProgressVideo = incoming;
          lastMediaTime = incoming.currentTime;
          lastProgressAt = performance.now();
          primeLoop(nextLoopIndex(index));
          scheduleBoundary();
        }, mixDuration + 50);
      } catch {
        incoming.pause();
        incoming.classList.remove("is-active", "is-mixing-in");
        if (generation !== mixGeneration) return;
        transitionInProgress = false;
        outgoing.classList.add("is-active");
        scheduleRecovery(true);
      }
    }
    const suspendPlayback = () => {
      clearBoundaryTimer();
      clearMixTimer();
      clearRecoveryTimer();
      const mixingLoopIndex = loopVideos.findIndex(
        (video) => video.classList.contains("is-active") && video.classList.contains("is-mixing-in")
      );
      const visibleVideo = mixingLoopIndex >= 0 ? getLoopVideo(mixingLoopIndex) : currentVideo();
      if (!visibleVideo) return;
      suspendedState = {
        phase: visibleVideo === introVideo ? "intro" : "loop",
        index: mixingLoopIndex >= 0 ? mixingLoopIndex : activeLoopIndex,
        time: Number.isFinite(visibleVideo.currentTime) ? visibleVideo.currentTime : 0
      };
      mixGeneration += 1;
      transitionInProgress = false;
      allVideos.forEach((video) => video.pause());
      resetVisualState(visibleVideo);
      if (suspendedState.phase === "loop") {
        phase = "loop";
        activeLoopIndex = suspendedState.index;
      } else {
        phase = "intro";
      }
    };
    const resumePlayback = () => {
      if (!canPlay()) return;
      const state = suspendedState;
      suspendedState = null;
      if (state?.phase === "loop") {
        const activeVideo2 = activateLoop(state.index, state.time);
        if (activeVideo2) {
          void playWithTimeout(activeVideo2).then(scheduleBoundary).catch(() => scheduleRecovery(true));
        }
        return;
      }
      if (introCompleted) {
        void transitionToLoop(0);
        return;
      }
      const introTime = state?.phase === "intro" ? state.time : Number.isFinite(introVideo.currentTime) ? introVideo.currentTime : 0;
      const activeVideo = activateIntro(introTime);
      void playWithTimeout(activeVideo).catch(() => scheduleRecovery(true));
    };
    introVideo.addEventListener("timeupdate", () => noteProgress(introVideo), { passive: true });
    introVideo.addEventListener("playing", () => {
      clearRecoveryTimer();
      lastProgressVideo = introVideo;
      lastProgressAt = performance.now();
    }, { passive: true });
    introVideo.addEventListener("canplay", () => {
      primeLoop(0);
    }, { once: true, passive: true });
    introVideo.addEventListener("ended", () => {
      introCompleted = true;
      if (phase === "intro") void transitionToLoop(0);
    }, { passive: true });
    introVideo.addEventListener("waiting", () => scheduleRecovery(false), { passive: true });
    introVideo.addEventListener("stalled", () => scheduleRecovery(true), { passive: true });
    introVideo.addEventListener("error", () => scheduleRecovery(true), { passive: true });
    loopVideos.forEach((video, index) => {
      video.addEventListener("timeupdate", () => noteProgress(video), { passive: true });
      video.addEventListener("playing", () => {
        clearRecoveryTimer();
        lastProgressAt = performance.now();
        if (phase === "loop" && index === activeLoopIndex) scheduleBoundary();
      }, { passive: true });
      video.addEventListener("seeked", () => {
        if (phase === "loop" && index === activeLoopIndex) scheduleBoundary();
      }, { passive: true });
      video.addEventListener("ratechange", () => {
        if (phase === "loop" && index === activeLoopIndex) scheduleBoundary();
      }, { passive: true });
      video.addEventListener("waiting", () => {
        if (phase === "loop" && index === activeLoopIndex) {
          clearBoundaryTimer();
          scheduleRecovery(false);
        }
      }, { passive: true });
      video.addEventListener("stalled", () => {
        if (phase === "loop" && index === activeLoopIndex) scheduleRecovery(true);
      }, { passive: true });
      video.addEventListener("error", () => {
        if (phase === "loop" && index === activeLoopIndex) scheduleRecovery(true);
      }, { passive: true });
      video.addEventListener("ended", () => {
        if (phase === "loop" && index === activeLoopIndex && !transitionInProgress) {
          void transitionToLoop(nextLoopIndex(index));
        }
      }, { passive: true });
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
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspendPlayback();
      else resumePlayback();
    });
    window.addEventListener("pagehide", suspendPlayback, { passive: true });
    window.addEventListener("pageshow", resumePlayback, { passive: true });
    window.addEventListener("online", resumePlayback, { passive: true });
    window.setInterval(() => {
      if (!canPlay()) return;
      const activeVideo = currentVideo();
      noteProgress(activeVideo);
      const stalledFor = performance.now() - lastProgressAt;
      const unexpectedlyPaused = activeVideo.paused && !activeVideo.ended;
      const bufferStarved = activeVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;
      if (unexpectedlyPaused || stalledFor >= HARD_STALL_THRESHOLD) {
        scheduleRecovery(bufferStarved || stalledFor >= HARD_STALL_THRESHOLD);
      }
    }, WATCHDOG_INTERVAL);
    ensureVideoSource(introVideo);
    primeLoop(0);
    void playWithTimeout(introVideo).catch(() => scheduleRecovery(true));
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
  var compactVideo = runtime.compactViewport.matches || runtime.coarsePointer.matches;
  setupProposalReveal();
  setupCountdown();
  setupBookingDockLayout();
  setupBookingCtaSheen(runtime);
  setupHeroTitleLayout();
  setupHeroIntroMotion();
  setupPieceViewer();
  setupPieceCursorPrompt();
  setupTapSearchGuard();
  if (compactVideo) {
    const intro = document.querySelector("[data-intro-video]");
    const loops = Array.from(document.querySelectorAll("[data-loop-video]"));
    if (intro && loops.length) {
      const mixDuration = 560;
      const mixLead = mixDuration / 1e3 + 0.22;
      runtime.root.style.setProperty("--video-mix-duration", `${mixDuration}ms`);
      const ensureSource = (video) => {
        if (video.currentSrc || video.hasAttribute("src") || video.querySelector("source[src]")) {
          return true;
        }
        const source = video.dataset.videoSource;
        if (!source) return false;
        video.src = source;
        video.load();
        return true;
      };
      const waitForMetadata = (video) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
        return new Promise((resolve) => video.addEventListener("loadedmetadata", () => resolve(), { once: true }));
      };
      const waitForPaintedFrame = (video) => new Promise((resolve) => {
        const frameVideo = video;
        if (frameVideo.requestVideoFrameCallback) {
          frameVideo.requestVideoFrameCallback(() => resolve());
          return;
        }
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
          return;
        }
        video.addEventListener("loadeddata", () => {
          window.requestAnimationFrame(() => resolve());
        }, { once: true });
      });
      const prepareFromStart = async (video) => {
        if (!ensureSource(video)) throw new Error("Missing compact loop video source.");
        await waitForMetadata(video);
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
        }
        await video.play();
        await waitForPaintedFrame(video);
      };
      intro.hidden = false;
      intro.muted = true;
      intro.playsInline = true;
      intro.loop = false;
      intro.classList.add("is-active");
      loops.forEach((video) => {
        video.hidden = false;
        video.muted = true;
        video.playsInline = true;
        video.loop = false;
        video.preload = "auto";
        video.classList.remove("is-active", "is-mixing-in");
        ensureSource(video);
      });
      let activeIndex = -1;
      let boundaryTimer = 0;
      let transitionInProgress = false;
      const clearBoundary = () => {
        if (!boundaryTimer) return;
        window.clearTimeout(boundaryTimer);
        boundaryTimer = 0;
      };
      const scheduleBoundary = () => {
        clearBoundary();
        if (activeIndex < 0 || transitionInProgress || document.hidden) return;
        const active = loops[activeIndex];
        if (!active) return;
        if (loops.length === 1) {
          active.loop = true;
          return;
        }
        const schedule = () => {
          const duration = active.duration;
          if (!Number.isFinite(duration) || duration <= 0) return;
          const remaining = Math.max(0, duration - active.currentTime);
          const delay = Math.max(0, (remaining - mixLead) * 1e3);
          const scheduledIndex = activeIndex;
          boundaryTimer = window.setTimeout(() => {
            boundaryTimer = 0;
            if (scheduledIndex !== activeIndex || transitionInProgress) return;
            void transitionTo((activeIndex + 1) % loops.length);
          }, delay);
        };
        if (active.readyState >= HTMLMediaElement.HAVE_METADATA) schedule();
        else active.addEventListener("loadedmetadata", schedule, { once: true });
      };
      const settleTransition = (incoming, outgoing, nextIndex) => {
        window.setTimeout(() => {
          outgoing.classList.remove("is-active", "is-mixing-in");
          outgoing.pause();
          if (outgoing !== intro) {
            try {
              outgoing.currentTime = 0;
            } catch {
            }
          }
          incoming.classList.remove("is-mixing-in");
          activeIndex = nextIndex;
          transitionInProgress = false;
          scheduleBoundary();
        }, outgoing === intro ? 0 : mixDuration + 40);
      };
      async function transitionTo(nextIndex) {
        if (transitionInProgress || document.hidden) return;
        const incoming = loops[nextIndex];
        if (!incoming) return;
        const outgoing = activeIndex >= 0 ? loops[activeIndex] : intro;
        if (incoming === outgoing) {
          incoming.loop = true;
          void incoming.play();
          activeIndex = nextIndex;
          return;
        }
        transitionInProgress = true;
        clearBoundary();
        incoming.classList.remove("is-active");
        incoming.classList.add("is-mixing-in");
        try {
          await prepareFromStart(incoming);
          if (document.hidden) {
            incoming.pause();
            incoming.classList.remove("is-mixing-in");
            transitionInProgress = false;
            return;
          }
          window.requestAnimationFrame(() => {
            incoming.classList.add("is-active");
            if (outgoing === intro) outgoing.classList.remove("is-active");
            settleTransition(incoming, outgoing, nextIndex);
          });
        } catch {
          incoming.pause();
          incoming.classList.remove("is-active", "is-mixing-in");
          transitionInProgress = false;
          outgoing.classList.add("is-active");
          window.setTimeout(() => void transitionTo(nextIndex), 900);
        }
      }
      loops.forEach((video, index) => {
        video.addEventListener("ended", () => {
          if (index !== activeIndex || transitionInProgress || loops.length < 2) return;
          void transitionTo((index + 1) % loops.length);
        }, { passive: true });
        video.addEventListener("playing", () => {
          if (index === activeIndex && !transitionInProgress) scheduleBoundary();
        }, { passive: true });
      });
      intro.addEventListener("ended", () => {
        void transitionTo(0);
      }, { once: true, passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          clearBoundary();
          loops.forEach((video) => video.pause());
          return;
        }
        if (activeIndex >= 0) {
          const active = loops[activeIndex];
          if (active) void active.play().then(scheduleBoundary).catch(() => void 0);
        } else if (intro.ended) {
          void transitionTo(0);
        } else {
          void intro.play().catch(() => void 0);
        }
      });
      if (intro.ended) void transitionTo(0);
    } else {
      setupVideoLoop(runtime);
    }
  } else {
    setupVideoLoop(runtime);
  }

  // src/ts/dock-reveal.ts
  var dock = query(".booking-dock");
  var heroTitle = query(".title-lockup");
  if (dock && heroTitle) {
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    const supportsIntersectionObserver = typeof globalThis.IntersectionObserver === "function";
    const easeOut2 = "cubic-bezier(.22, 1, .36, 1)";
    let resolved = false;
    let observer = null;
    const disconnect = () => {
      observer?.disconnect();
      observer = null;
    };
    const finishReveal = () => {
      resolved = true;
      disconnect();
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
      finishReveal();
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

  // src/ts/features/menu-reveal.ts
  var REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";
  var REVEAL_THRESHOLD = 0.01;
  var INITIAL_VIEWPORT_RATIO = 0.92;
  var reveal2 = (element) => {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");
  };
  var isInitiallyVisible = (element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < window.innerHeight * INITIAL_VIEWPORT_RATIO;
  };
  var setupMenuReveal = (menuRoot2, _groups) => {
    const root = document.documentElement;
    const targets = queryAll("[data-menu-reveal]", menuRoot2);
    const fallbackActive = root.classList.contains("menu-reveal-fallback");
    root.setAttribute("data-menu-reveal-ready", "");
    if (!targets.length) return;
    if (fallbackActive || !("IntersectionObserver" in window)) {
      targets.forEach(reveal2);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        reveal2(element);
        observer.unobserve(element);
      });
    }, {
      rootMargin: REVEAL_ROOT_MARGIN,
      threshold: REVEAL_THRESHOLD
    });
    window.requestAnimationFrame(() => {
      targets.forEach((target2) => {
        if (isInitiallyVisible(target2)) reveal2(target2);
        else observer.observe(target2);
      });
    });
  };

  // src/ts/menu/observers.ts
  var configureMobileOverlapShadows = (groups) => {
    const mobileQuery2 = window.matchMedia("(max-width: 720px)");
    const targets = groups.flatMap((group) => {
      const heading = query(".menu-group__heading", group);
      const sentinel = query(".menu-group__overlap-sentinel", group);
      return heading && sentinel ? [{ group, heading, sentinel }] : [];
    });
    const nearbyTargets = /* @__PURE__ */ new Set();
    const targetByGroup = new Map(targets.map((target2) => [target2.group, target2]));
    let updateFrame = 0;
    let resizeTimer = 0;
    let scrollListening = false;
    const updateOverlapState = () => {
      updateFrame = 0;
      if (!mobileQuery2.matches) return;
      nearbyTargets.forEach(({ heading, sentinel }) => {
        const headingBounds = heading.getBoundingClientRect();
        const sentinelBounds = sentinel.getBoundingClientRect();
        const overlaps = sentinelBounds.top <= headingBounds.bottom;
        heading.classList.toggle("is-overlapping", overlaps);
      });
    };
    const scheduleUpdate = () => {
      if (updateFrame || !mobileQuery2.matches || !nearbyTargets.size) return;
      updateFrame = window.requestAnimationFrame(updateOverlapState);
    };
    const scheduleResizeSettlement = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = 0;
        scheduleUpdate();
      }, 140);
    };
    const attachScrollListener = () => {
      if (scrollListening) return;
      scrollListening = true;
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
    };
    const detachScrollListener = () => {
      if (!scrollListening) return;
      scrollListening = false;
      window.removeEventListener("scroll", scheduleUpdate);
    };
    const syncViewportMode = () => {
      if (mobileQuery2.matches) {
        attachScrollListener();
        scheduleUpdate();
        return;
      }
      detachScrollListener();
      targets.forEach(({ heading }) => heading.classList.remove("is-overlapping"));
    };
    if ("IntersectionObserver" in window) {
      const proximityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const target2 = targetByGroup.get(entry.target);
          if (!target2) return;
          if (entry.isIntersecting) {
            nearbyTargets.add(target2);
          } else {
            nearbyTargets.delete(target2);
            target2.heading.classList.remove("is-overlapping");
          }
        });
        scheduleUpdate();
      }, {
        rootMargin: "20% 0px 20% 0px",
        threshold: 0
      });
      targets.forEach(({ group }) => proximityObserver.observe(group));
    } else {
      targets.forEach((target2) => nearbyTargets.add(target2));
    }
    syncViewportMode();
    mobileQuery2.addEventListener("change", syncViewportMode);
    window.addEventListener("resize", scheduleResizeSettlement, { passive: true });
    document.fonts.ready.then(scheduleUpdate).catch(() => void 0);
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
      setupMenuReveal(menuRoot, groups);
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
  var clamp3 = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
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
          progress = clamp3((triggerLine - sentinelTop) / headingHeight, 0, 1);
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

  // src/ts/features/final-cta-copy-guard.ts
  var setupFinalCtaCopyGuard = () => {
    const text = query(".menu-final-cta__text");
    if (!text) return;
    const words = (text.textContent ?? "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return;
    const last = words.pop();
    const penultimate = words.pop();
    if (!last || !penultimate) return;
    const prefix = words.length ? `${words.join(" ")} ` : "";
    text.textContent = `${prefix}${penultimate}\xA0${last}`;
  };

  // src/ts/features/final-cta-reveal.ts
  var TITLE_TEXT = "\xBFEST\xC1S PREPARADO?";
  var CTA_TEXT = "UNA EXPERIENCIA PARA RECORRER LOS SABORES M\xC1S REPRESENTATIVOS DE SUSHICLUB.";
  var LINE_TOP_TOLERANCE_PX2 = 3;
  var EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
  var clampValue = (min, value, max) => Math.min(max, Math.max(min, value));
  var wrapWords2 = (element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.data.trim()) textNodes.push(node);
    }
    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          return;
        }
        const mask = document.createElement("span");
        const word = document.createElement("span");
        mask.className = "final-cta-line-mask";
        word.className = "final-cta-line-word";
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        mask.style.verticalAlign = "baseline";
        word.style.display = "inline-block";
        word.textContent = token;
        mask.append(word);
        fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
  };
  var settle = (element) => {
    element.style.opacity = "1";
    element.style.transform = "none";
  };
  var animateIn = (element, distance, duration, delay = 0) => {
    const animation = element.animate([
      { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
      { opacity: 1, transform: "translate3d(0, 0, 0)" }
    ], {
      duration,
      delay,
      easing: EASE_OUT,
      fill: "forwards"
    });
    animation.onfinish = () => {
      settle(element);
      animation.cancel();
    };
  };
  var setupFinalCtaReveal = () => {
    const root = query(".menu-final-cta");
    if (!root) return;
    const copy = query(".menu-final-cta__copy", root);
    const title = query(".menu-final-cta__title", root);
    const text = query(".menu-final-cta__text", root);
    const eyebrow = query(".menu-final-cta__eyebrow", root);
    const action = query(".menu-final-cta__action", root);
    if (!copy || !title || !text || !action) return;
    title.textContent = TITLE_TEXT;
    text.textContent = CTA_TEXT;
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    const originalText = text.innerHTML;
    let resizeTimer = 0;
    let revealed = false;
    const fitTitle = (mobile, compact) => {
      const desiredSize = mobile ? clampValue(56, window.innerWidth * 0.18, 86) : compact ? clampValue(82, window.innerWidth * 0.12, 132) : clampValue(104, window.innerWidth * 0.114, 214);
      title.style.width = "max-content";
      title.style.maxWidth = "none";
      title.style.fontSize = `${desiredSize}px`;
      title.style.whiteSpace = "nowrap";
      const availableWidth = Math.max(1, copy.getBoundingClientRect().width - (mobile ? 2 : 8));
      const renderedWidth = title.getBoundingClientRect().width;
      if (renderedWidth > availableWidth) {
        title.style.fontSize = `${desiredSize * (availableWidth / renderedWidth) * 0.995}px`;
      }
      title.style.width = "auto";
    };
    const applyLayout = () => {
      const mobile = window.innerWidth <= 720;
      const compact = window.innerWidth <= 1100;
      root.style.background = "#050505";
      root.style.gridTemplateColumns = "1fr";
      root.style.gridTemplateRows = "auto auto";
      root.style.alignContent = "center";
      root.style.alignItems = "center";
      root.style.rowGap = mobile ? "22px" : "clamp(24px, 3vh, 34px)";
      root.style.setProperty("--cta-content-inset", mobile ? "0px" : compact ? "clamp(0px, 10vw, 96px)" : "clamp(0px, 18vw, 320px)");
      root.style.setProperty("--cta-main-top", mobile ? "86px" : compact ? "clamp(100px, 10vh, 118px)" : "clamp(108px, 12vh, 136px)");
      root.style.display = mobile ? "flex" : "grid";
      if (mobile) {
        root.style.flexDirection = "column";
        root.style.alignItems = "center";
      }
      copy.style.width = mobile ? "100%" : "calc(100% - var(--cta-content-inset))";
      copy.style.marginLeft = mobile ? "0" : "var(--cta-content-inset)";
      copy.style.paddingTop = "var(--cta-main-top)";
      copy.style.display = "flex";
      copy.style.flexDirection = "column";
      copy.style.alignItems = "center";
      copy.style.textAlign = "center";
      title.style.maxWidth = "none";
      title.style.marginInline = "auto";
      title.style.lineHeight = mobile ? "0.86" : "0.78";
      title.style.letterSpacing = mobile ? "0.006em" : "0.012em";
      title.style.textAlign = "center";
      title.style.whiteSpace = "nowrap";
      fitTitle(mobile, compact);
      text.style.maxWidth = mobile ? "34ch" : "52ch";
      text.style.marginTop = mobile ? "20px" : "clamp(22px, 2vw, 30px)";
      text.style.marginInline = "auto";
      text.style.fontSize = mobile ? "clamp(13px, 3.7vw, 16px)" : "clamp(15px, 1.1vw, 20px)";
      text.style.lineHeight = mobile ? "1.22" : "1.2";
      text.style.textAlign = "center";
      text.style.textWrap = "balance";
      action.style.justifySelf = "center";
      action.style.alignSelf = "center";
      action.style.width = mobile ? "min(100%, 320px)" : "clamp(220px, 17vw, 292px)";
      action.style.minHeight = mobile ? "68px" : "clamp(72px, 5.4vw, 88px)";
      action.style.margin = "0 auto";
      action.style.padding = mobile ? "16px 22px" : "18px 28px";
      action.style.background = "var(--orange)";
      action.style.border = "1px solid rgba(255, 255, 255, 0.16)";
      action.style.borderRadius = "6px";
      action.style.boxShadow = "0 12px 30px rgba(var(--orange-rgb), 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12)";
      action.style.fontFamily = '"Inter", sans-serif';
      action.style.fontSize = "16px";
      action.style.fontWeight = "700";
      action.style.lineHeight = "0.92";
      action.style.letterSpacing = "-0.04em";
    };
    const splitLines = () => {
      text.innerHTML = originalText;
      wrapWords2(text);
      const masks = queryAll(".final-cta-line-mask", text);
      let lineIndex = -1;
      let lineTop = Number.NEGATIVE_INFINITY;
      masks.forEach((mask) => {
        const top = mask.getBoundingClientRect().top;
        if (lineIndex < 0 || Math.abs(top - lineTop) > LINE_TOP_TOLERANCE_PX2) {
          lineIndex += 1;
          lineTop = top;
        }
        const word = query(".final-cta-line-word", mask);
        if (!word) return;
        word.dataset.finalCtaLine = String(lineIndex);
        if (revealed || reducedMotion2.matches) settle(word);
        else {
          word.style.opacity = "0";
          word.style.transform = "translate3d(0, 112%, 0)";
        }
      });
    };
    const prepare = () => {
      applyLayout();
      splitLines();
      if (!revealed && !reducedMotion2.matches) {
        [eyebrow, title, action].forEach((element) => {
          if (!element) return;
          element.style.opacity = "0";
          element.style.transform = `translate3d(0, ${element === title ? 46 : 14}px, 0)`;
        });
      }
    };
    const reveal3 = () => {
      if (revealed) return;
      revealed = true;
      if (reducedMotion2.matches) {
        [eyebrow, title, action, ...queryAll(".final-cta-line-word", text)].forEach((element) => {
          if (element) settle(element);
        });
        return;
      }
      if (eyebrow) animateIn(eyebrow, 14, 460, 0);
      animateIn(title, 46, 760, 40);
      queryAll(".final-cta-line-word", text).forEach((word) => {
        const line = Number.parseInt(word.dataset.finalCtaLine ?? "0", 10) || 0;
        animateIn(word, Math.max(12, word.getBoundingClientRect().height * 1.12), 680, 150 + line * 58);
      });
      animateIn(action, 14, 460, 250);
    };
    const schedulePrepare = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(prepare, 110);
    };
    prepare();
    window.addEventListener("resize", schedulePrepare, { passive: true });
    window.addEventListener("orientationchange", schedulePrepare, { passive: true });
    document.fonts.ready.then(schedulePrepare).catch(() => void 0);
    if (!("IntersectionObserver" in window)) {
      reveal3();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      reveal3();
      observer.disconnect();
    }, {
      rootMargin: "0px 0px -18% 0px",
      threshold: 0.04
    });
    observer.observe(root);
    window.addEventListener("pagehide", () => {
      observer.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", schedulePrepare);
      window.removeEventListener("orientationchange", schedulePrepare);
    }, { once: true });
  };

  // src/ts/features/ios-dock-smoothing.ts
  var SETTLE_EPSILON = 0.12;
  var RESPONSE_MS = 42;
  var FAST_RESPONSE_MS = 28;
  var FAST_THRESHOLD_PX = 72;
  var setupIosDockSmoothing = () => {
    const root = document.documentElement;
    const dock2 = query(".booking-dock");
    if (!dock2 || !root.classList.contains("is-ios-mobile")) return;
    const visualViewport = window.visualViewport;
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let currentOffset = null;
    let lastTime = 0;
    const readViewportBottomOffset = () => {
      if (!visualViewport) return window.innerHeight;
      return visualViewport.pageTop - window.scrollY + visualViewport.height;
    };
    const write = (offset) => {
      const visualBottom = Math.max(0, window.scrollY + offset);
      root.style.setProperty("--ios-dock-smoothed-bottom", `${visualBottom.toFixed(2)}px`);
    };
    const tick = (now) => {
      frame = 0;
      const targetOffset = readViewportBottomOffset();
      if (currentOffset === null) currentOffset = targetOffset;
      const dt = lastTime ? Math.min(50, Math.max(1, now - lastTime)) : 16.67;
      lastTime = now;
      if (reducedMotion2.matches) {
        currentOffset = targetOffset;
      } else {
        const distance = Math.abs(targetOffset - currentOffset);
        const response = distance > FAST_THRESHOLD_PX ? FAST_RESPONSE_MS : RESPONSE_MS;
        const alpha = 1 - Math.exp(-dt / response);
        currentOffset += (targetOffset - currentOffset) * alpha;
        if (Math.abs(targetOffset - currentOffset) <= SETTLE_EPSILON) {
          currentOffset = targetOffset;
        }
      }
      write(currentOffset);
      if (Math.abs(targetOffset - currentOffset) > SETTLE_EPSILON) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(tick);
    };
    const snap = () => {
      currentOffset = readViewportBottomOffset();
      lastTime = 0;
      write(currentOffset);
    };
    snap();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    visualViewport?.addEventListener("scroll", schedule, { passive: true });
    visualViewport?.addEventListener("resize", schedule, { passive: true });
    reducedMotion2.addEventListener("change", schedule);
    window.addEventListener("pagehide", () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
      visualViewport?.removeEventListener("resize", schedule);
      reducedMotion2.removeEventListener("change", schedule);
    }, { once: true });
  };

  // src/ts/features/menu-depth.ts
  var setupMenuDepth = () => {
    const section = query(".menu-section");
    const background = query(".menu-section__background");
    if (!section || !background) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    let frame = 0;
    let active = false;
    const update = () => {
      frame = 0;
      if (!active || reduce.matches) return;
      const rect = section.getBoundingClientRect();
      const viewport = Math.max(1, window.innerHeight);
      const distance = Math.max(1, rect.height - viewport);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const centered = progress * 2 - 1;
      const touch = coarse.matches;
      const y = centered * (touch ? 16 : 30);
      const x = Math.sin(progress * Math.PI * 2) * (touch ? 2 : 4);
      const scale = (touch ? 1.055 : 1.07) + Math.sin(progress * Math.PI) * (touch ? 7e-3 : 0.01);
      background.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    };
    const schedule = () => {
      if (active && !reduce.matches && !frame) frame = requestAnimationFrame(update);
    };
    const syncMotion = () => {
      if (reduce.matches) {
        background.style.transform = "none";
        background.style.willChange = "auto";
        return;
      }
      background.style.willChange = active ? "transform" : "auto";
      schedule();
    };
    background.style.transformOrigin = "center";
    const observer = new IntersectionObserver((entries) => {
      active = Boolean(entries[0]?.isIntersecting);
      background.style.willChange = active && !reduce.matches ? "transform" : "auto";
      if (active) schedule();
    }, { rootMargin: "120px 0px", threshold: 0 });
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    reduce.addEventListener("change", syncMotion);
    coarse.addEventListener("change", schedule);
    window.addEventListener("pagehide", () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      reduce.removeEventListener("change", syncMotion);
      coarse.removeEventListener("change", schedule);
    }, { once: true });
  };

  // src/ts/features/mobile-hero-follow-v2.ts
  var clamp4 = (n) => Math.max(0, Math.min(1, n));
  var ease2 = (n) => n * n * (3 - 2 * n);
  var setupMobileHeroFollowV2 = () => {
    const hero = query(".hero");
    const lockup = query(".title-lockup");
    if (!hero || !lockup) return;
    let frame = 0;
    let heroTop = 0;
    let heroHeight = 1;
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      heroTop = window.scrollY + rect.top;
      heroHeight = Math.max(hero.offsetHeight, window.innerHeight);
    };
    const render = () => {
      frame = 0;
      if (window.innerWidth > 620) {
        lockup.style.translate = "";
        return;
      }
      const heroProgress = clamp4((window.scrollY - heroTop) / heroHeight);
      const progress = ease2(clamp4((heroProgress - 0.1) / 0.34));
      lockup.style.translate = `0 ${progress * 72}px`;
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(render);
    };
    const refresh = () => {
      measure();
      render();
    };
    refresh();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("orientationchange", refresh, { passive: true });
  };

  // src/ts/features/smooth-scroll.ts
  var FRAME_MS = 1e3 / 60;
  var LERP = 0.1;
  var WHEEL_MULTIPLIER = 1;
  var MAX_WHEEL_DELTA = 480;
  var FINISH_EPSILON = 0.35;
  var NATIVE_SCROLL_SELECTOR = [
    "dialog[open]",
    "textarea",
    "select",
    '[contenteditable="true"]',
    "[data-native-scroll]"
  ].join(",");
  var VERTICAL_KEYS = /* @__PURE__ */ new Set([
    "ArrowDown",
    "ArrowUp",
    "PageDown",
    "PageUp",
    "Home",
    "End",
    " "
  ]);
  var clamp5 = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  var getScrollLimit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  var normalizeWheelDelta = (event) => {
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
    return clamp5(event.deltaY * unit, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
  };
  var shouldUseNativeScroll = (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return true;
    const target2 = event.target instanceof Element ? event.target : null;
    return Boolean(target2?.closest(NATIVE_SCROLL_SELECTOR));
  };
  var setupEfficientSmoothScroll = () => {
    const root = document.documentElement;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialInlineScrollBehavior = root.style.scrollBehavior;
    let enabled = false;
    let frameId = 0;
    let lastFrameTime = 0;
    let animatedY = window.scrollY;
    let targetY = animatedY;
    const syncPosition = () => {
      animatedY = window.scrollY;
      targetY = animatedY;
      lastFrameTime = 0;
    };
    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      syncPosition();
    };
    const render = (time) => {
      frameId = 0;
      if (!enabled || document.hidden) {
        syncPosition();
        return;
      }
      const deltaTime = lastFrameTime ? Math.min(50, Math.max(1, time - lastFrameTime)) : FRAME_MS;
      lastFrameTime = time;
      const frameRatio = deltaTime / FRAME_MS;
      const alpha = 1 - Math.pow(1 - LERP, frameRatio);
      const distance = targetY - animatedY;
      if (Math.abs(distance) <= FINISH_EPSILON) {
        animatedY = targetY;
        window.scrollTo(0, animatedY);
        lastFrameTime = 0;
        return;
      }
      animatedY += distance * alpha;
      window.scrollTo(0, animatedY);
      frameId = window.requestAnimationFrame(render);
    };
    const requestRender = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(render);
    };
    const scrollToTarget = (nextTarget) => {
      const limit = getScrollLimit();
      if (!frameId) animatedY = window.scrollY;
      targetY = clamp5(nextTarget, 0, limit);
      requestRender();
    };
    const onWheel = (event) => {
      if (shouldUseNativeScroll(event)) return;
      const delta = normalizeWheelDelta(event);
      if (Math.abs(delta) < 0.01) return;
      event.preventDefault();
      if (!frameId) syncPosition();
      scrollToTarget(targetY + delta * WHEEL_MULTIPLIER);
    };
    const onScroll = () => {
      if (!frameId) syncPosition();
    };
    const onResize = () => {
      const limit = getScrollLimit();
      targetY = clamp5(targetY, 0, limit);
      animatedY = clamp5(animatedY, 0, limit);
    };
    const onKeyDown = (event) => {
      if (!VERTICAL_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      const target2 = event.target instanceof Element ? event.target : null;
      if (target2?.closest('input, textarea, select, [contenteditable="true"]')) return;
      stop();
    };
    const onAnchorClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const target2 = event.target instanceof Element ? event.target : null;
      const anchor = target2?.closest('a[href^="#"]');
      if (!anchor || anchor.hasAttribute("download") || anchor.target === "_blank") return;
      const hash = anchor.getAttribute("href") ?? "";
      let destination = 0;
      if (hash && hash !== "#") {
        const id = decodeURIComponent(hash.slice(1));
        const element = document.getElementById(id);
        if (!element) return;
        destination = window.scrollY + element.getBoundingClientRect().top;
      }
      event.preventDefault();
      if (hash && hash !== window.location.hash) history.pushState(null, "", hash);
      scrollToTarget(destination);
    };
    const enable = () => {
      if (enabled) return;
      enabled = true;
      root.style.scrollBehavior = "auto";
      syncPosition();
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("pointerdown", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("click", onAnchorClick);
    };
    const disable = () => {
      if (!enabled) return;
      enabled = false;
      stop();
      root.style.scrollBehavior = initialInlineScrollBehavior;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("touchstart", stop);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("click", onAnchorClick);
    };
    const syncMode = () => {
      if (finePointer.matches && !coarsePointer.matches && !reducedMotion2.matches) enable();
      else disable();
    };
    finePointer.addEventListener("change", syncMode);
    coarsePointer.addEventListener("change", syncMode);
    reducedMotion2.addEventListener("change", syncMode);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else syncPosition();
    });
    window.addEventListener("pagehide", () => {
      disable();
      finePointer.removeEventListener("change", syncMode);
      coarsePointer.removeEventListener("change", syncMode);
      reducedMotion2.removeEventListener("change", syncMode);
    }, { once: true });
    syncMode();
  };

  // src/ts/features/scroll-marquee-boosted.ts
  var BASE_SPEED = 68;
  var MAX_SPEED = 820;
  var SCROLL_GAIN = 0.42;
  var IMPULSE_HOLD_MS = 150;
  var ACTIVE_RESPONSE = 30;
  var REVERSE_RESPONSE = 50;
  var IDLE_RESPONSE = 5.2;
  var MAX_FRAME_DELTA2 = 1 / 30;
  var wrap = (value, size) => {
    if (size <= 0) return 0;
    return (value % size + size) % size;
  };
  var setupScrollMarquee = () => {
    const root = query("[data-scroll-marquee]");
    if (!root) return;
    const track = query("[data-scroll-marquee-track]", root);
    const firstGroup = query("[data-scroll-marquee-group]", root);
    if (!track || !firstGroup) return;
    const reducedMotion2 = window.matchMedia("(prefers-reduced-motion: reduce)");
    let groupWidth = 0;
    let offset = 0;
    let velocity = BASE_SPEED;
    let targetVelocity = BASE_SPEED;
    let lastScrollY = window.scrollY;
    let lastScrollAt = performance.now();
    let lastFrameAt = 0;
    let frameId = 0;
    let isVisible = false;
    const measure = () => {
      groupWidth = firstGroup.getBoundingClientRect().width;
      offset = wrap(offset, groupWidth);
    };
    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameAt = 0;
    };
    const frame = (now) => {
      frameId = 0;
      if (!isVisible || reducedMotion2.matches || groupWidth <= 0) return;
      if (!lastFrameAt) lastFrameAt = now;
      const deltaTime = Math.min(MAX_FRAME_DELTA2, Math.max(0, (now - lastFrameAt) / 1e3));
      lastFrameAt = now;
      const idle = now - lastScrollAt > IMPULSE_HOLD_MS;
      const desiredVelocity = idle ? BASE_SPEED : targetVelocity;
      const reversing = !idle && velocity * desiredVelocity < 0;
      const response = idle ? IDLE_RESPONSE : reversing ? REVERSE_RESPONSE : ACTIVE_RESPONSE;
      const blend = 1 - Math.exp(-response * deltaTime);
      velocity += (desiredVelocity - velocity) * blend;
      offset = wrap(offset + velocity * deltaTime, groupWidth);
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      frameId = window.requestAnimationFrame(frame);
    };
    const start = () => {
      if (frameId || !isVisible || reducedMotion2.matches || groupWidth <= 0) return;
      lastFrameAt = 0;
      frameId = window.requestAnimationFrame(frame);
    };
    const onScroll = () => {
      const now = performance.now();
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;
      lastScrollY = nextScrollY;
      if (Math.abs(delta) < 0.5) return;
      const elapsed = Math.max(12, now - lastScrollAt);
      const scrollVelocity = Math.abs(delta) / (elapsed / 1e3);
      const boost = Math.min(MAX_SPEED - BASE_SPEED, scrollVelocity * SCROLL_GAIN);
      targetVelocity = (delta > 0 ? 1 : -1) * (BASE_SPEED + boost);
      lastScrollAt = now;
      start();
    };
    const syncMotionPreference = () => {
      if (reducedMotion2.matches) {
        stop();
        track.style.transform = "translate3d(0, 0, 0)";
        return;
      }
      start();
    };
    measure();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => {
      measure();
      start();
    }) : null;
    resizeObserver?.observe(firstGroup);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        if (isVisible) start();
        else stop();
      }, { rootMargin: "180px 0px", threshold: 0 });
      observer.observe(root);
    } else {
      isVisible = true;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    reducedMotion2.addEventListener("change", syncMotionPreference);
    document.fonts?.ready.then(() => {
      measure();
      start();
    }).catch(() => void 0);
    start();
  };

  // src/ts/main.ts
  setupEfficientSmoothScroll();
  setupMobileHeroFollowV2();
  setupIosDockSmoothing();
  setupMenuDepth();
  setupScrollMarquee();
  setupFinalCtaCopyGuard();
  setupFinalCtaReveal();
})();
