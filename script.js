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
  };

  const loadBackgroundVideo = async () => {
    const video = document.querySelector('.hero__video');
    const parts = Array.from({ length: 13 }, (_, index) =>
      `assets/bg2.webm.${String(index + 1).padStart(2, "0")}.b64`
    );

    try {
      const encodedParts = await Promise.all(
        parts.map(async (path) => {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`Unable to load ${path}`);
          return response.text();
        })
      );

      const encoded = encodedParts.join('').trim();
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const source = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
      video.src = source;
      video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
      await video.play();
    } catch (error) {
      video.classList.add('is-unavailable');
      console.error('Background WebM could not be loaded.', error);
    }
  };

  renderCountdown();
  window.setInterval(renderCountdown, 1_000);
  loadBackgroundVideo();
})();