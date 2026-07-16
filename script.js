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

  const video = document.querySelector('.hero__video');
  if (video) {
    video.play().catch(() => undefined);
  }

  if (renderCountdown() > 0) {
    const timerId = window.setInterval(() => {
      if (renderCountdown() === 0) {
        window.clearInterval(timerId);
      }
    }, 1_000);
  }
})();