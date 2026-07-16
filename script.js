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

  const fadeDuration = 720;
  const fadeLead = .9;
  let activeIndex = 0;
  let transitionInProgress = false;
  let animationFrameId = 0;

  videos.forEach((video, index) => {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.classList.toggle('is-active', index === activeIndex);
  });

  const crossfade = async () => {
    if (transitionInProgress) return;
    transitionInProgress = true;

    const outgoing = videos[activeIndex];
    const nextIndex = (activeIndex + 1) % videos.length;
    const incoming = videos[nextIndex];

    try {
      incoming.pause();
      incoming.currentTime = 0;
      await incoming.play();

      window.requestAnimationFrame(() => {
        incoming.classList.add('is-active');
        outgoing.classList.remove('is-active');
      });

      window.setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
        activeIndex = nextIndex;
        transitionInProgress = false;
      }, fadeDuration + 60);
    } catch {
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
      duration - activeVideo.currentTime <= fadeLead
    ) {
      crossfade();
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