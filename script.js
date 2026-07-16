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

  const videos = Array.from(document.querySelectorAll('[data-loop-video]'));
  if (videos.length < 2) {
    videos[0]?.play().catch(() => undefined);
    return;
  }

  const mixDuration = 1_000;
  const mixLead = 1.2;
  let activeIndex = 0;
  let transitionInProgress = false;
  let animationFrameId = 0;

  videos.forEach((video, index) => {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.classList.toggle('is-active', index === activeIndex);
  });

  const mixLoopBoundary = async () => {
    if (transitionInProgress) return;
    transitionInProgress = true;

    const outgoing = videos[activeIndex];
    const nextIndex = (activeIndex + 1) % videos.length;
    const incoming = videos[nextIndex];

    try {
      incoming.pause();
      incoming.currentTime = 0;
      incoming.classList.remove('is-active');
      incoming.classList.add('is-mixing-in');
      await incoming.play();

      // Force the initial transparent frame to be committed before starting the mix.
      incoming.getBoundingClientRect();

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          // Keep the outgoing layer fully opaque underneath while the first frame
          // of the incoming copy dissolves over it. This maintains constant luminance.
          incoming.classList.add('is-active');
        });
      });

      window.setTimeout(() => {
        // Incoming is now fully opaque, so removing the covered outgoing layer is invisible.
        outgoing.classList.remove('is-active');
        outgoing.pause();
        outgoing.currentTime = 0;

        incoming.classList.remove('is-mixing-in');
        activeIndex = nextIndex;
        transitionInProgress = false;
      }, mixDuration + 80);
    } catch {
      incoming.classList.remove('is-mixing-in');
      transitionInProgress = false;
    }
  };

  const monitorLoop = () => {
    const activeVideo = videos[activeIndex];
    const duration = activeVideo.duration;

    if (
      !transitionInProgress &&
      Number.isFinite(duration) &&
      duration > 0 &&
      duration - activeVideo.currentTime <= mixLead
    ) {
      mixLoopBoundary();
    }

    animationFrameId = window.requestAnimationFrame(monitorLoop);
  };

  videos[activeIndex].play().catch(() => undefined);
  animationFrameId = window.requestAnimationFrame(monitorLoop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;

    const activeVideo = videos[activeIndex];
    if (activeVideo.paused && !transitionInProgress) {
      activeVideo.play().catch(() => undefined);
    }
  });

  window.addEventListener('pagehide', () => {
    window.cancelAnimationFrame(animationFrameId);
  }, { once: true });
})();