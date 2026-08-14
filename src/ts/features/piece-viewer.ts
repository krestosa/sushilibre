import { query, queryAll } from '../shared/dom';

const LOADING_MESSAGE = 'CARGANDO IMAGEN';
const ERROR_MESSAGE = 'IMAGEN NO DISPONIBLE';
const CLOSE_FALLBACK_MS = 320;
const REDUCED_CLOSE_FALLBACK_MS = 170;
const STATUS_FADE_MS = 150;
const PRELOAD_CONCURRENCY = 2;
const MOBILE_PIECE_QUERY = '(max-width: 720px)';
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
  'Spacebar'
]);

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest(
    'a[href], button, input, textarea, select, [contenteditable="true"]'
  ));

const setupProgressivePreload = (pieceItems: readonly HTMLElement[]): (() => void) => {
  const queued = new Set<string>();
  const completed = new Set<string>();
  const queue: string[] = [];
  const pendingImages = new Set<HTMLImageElement>();
  const listeners: Array<{ element: HTMLElement; type: string; handler: EventListener }> = [];
  let active = 0;

  const pump = (): void => {
    while (active < PRELOAD_CONCURRENCY && queue.length) {
      const source = queue.shift();
      if (!source || completed.has(source)) continue;

      const preload = new Image();
      active += 1;
      pendingImages.add(preload);
      preload.decoding = 'async';
      preload.fetchPriority = 'low';

      const settle = (): void => {
        preload.onload = null;
        preload.onerror = null;
        pendingImages.delete(preload);
        completed.add(source);
        active -= 1;
        pump();
      };

      preload.onload = settle;
      preload.onerror = settle;
      preload.src = source;
    }
  };

  const enqueueSource = (source?: string): void => {
    const normalized = source?.trim();
    if (!normalized || queued.has(normalized) || completed.has(normalized)) return;
    queued.add(normalized);
    queue.push(normalized);
    window.setTimeout(pump, 0);
  };

  const enqueueItems = (items: readonly HTMLElement[]): void => {
    items.forEach((item) => enqueueSource(item.dataset.pieceImage));
  };

  const groups = queryAll<HTMLElement>('[data-menu-group]');
  const groupObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const group = entry.target as HTMLElement;
          enqueueItems(queryAll<HTMLElement>('[data-piece-item]', group));
          observer.unobserve(group);
        });
      }, { rootMargin: '70% 0px 70% 0px', threshold: 0 })
    : null;

  if (groupObserver) groups.forEach((group) => groupObserver.observe(group));

  pieceItems.forEach((item) => {
    const preloadOwnImage = (): void => enqueueSource(item.dataset.pieceImage);
    ['pointerenter', 'pointerdown', 'focusin'].forEach((type) => {
      item.addEventListener(type, preloadOwnImage, { passive: true });
      listeners.push({ element: item, type, handler: preloadOwnImage });
    });
  });

  if (!groupObserver) {
    const firstGroup = groups[0];
    if (firstGroup) enqueueItems(queryAll<HTMLElement>('[data-piece-item]', firstGroup));
  }

  return () => {
    groupObserver?.disconnect();
    listeners.forEach(({ element, type, handler }) => element.removeEventListener(type, handler));
    queue.length = 0;
    pendingImages.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
    pendingImages.clear();
  };
};

export const setupPieceViewer = (): void => {
  const root = document.documentElement;
  const dialog = query<HTMLDialogElement>('[data-piece-viewer]');
  const image = query<HTMLImageElement>('[data-piece-viewer-image]', dialog ?? undefined);
  const status = query<HTMLElement>('[data-piece-viewer-status]', dialog ?? undefined);
  const statusText = query<HTMLElement>('[data-piece-viewer-status-text]', dialog ?? undefined);
  const closeButton = query<HTMLButtonElement>('[data-piece-viewer-close]', dialog ?? undefined);
  const openButtons = queryAll<HTMLButtonElement>('[data-piece-viewer-open]');
  const pieceItems = queryAll<HTMLElement>('[data-piece-item]');

  if (!dialog || !image || !status || !statusText || !closeButton || !pieceItems.length) return;

  const cleanupPreload = setupProgressivePreload(pieceItems);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobilePieces = window.matchMedia(MOBILE_PIECE_QUERY);
  let activeTrigger: HTMLElement | null = null;
  let closeTimer = 0;
  let statusFadeTimer = 0;
  let openFrame = 0;
  let imageFrame = 0;
  let scrollCorrectionFrame = 0;
  let lockedScrollY = 0;
  let backgroundLocked = false;

  const syncInteractivity = (): void => {
    pieceItems.forEach((item) => {
      const name = item.dataset.pieceName?.trim() || 'pieza';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.setAttribute('aria-haspopup', 'dialog');
      item.setAttribute('aria-controls', 'piece-viewer');
      item.setAttribute('aria-label', `Ver imagen de ${name}`);
    });

    openButtons.forEach((button) => {
      button.tabIndex = mobilePieces.matches ? 0 : -1;
      if (mobilePieces.matches) button.removeAttribute('aria-hidden');
      else button.setAttribute('aria-hidden', 'true');
    });
  };

  const preventBackgroundScroll = (event: Event): void => {
    if (event.cancelable) event.preventDefault();
  };

  const preventBackgroundScrollKey = (event: KeyboardEvent): void => {
    if (!SCROLL_KEYS.has(event.key) || isInteractiveTarget(event.target)) return;
    event.preventDefault();
  };

  const enforceLockedScroll = (): void => {
    if (!backgroundLocked || scrollCorrectionFrame) return;

    scrollCorrectionFrame = window.requestAnimationFrame(() => {
      scrollCorrectionFrame = 0;
      if (!backgroundLocked || Math.abs(window.scrollY - lockedScrollY) < 0.5) return;
      window.scrollTo(0, lockedScrollY);
    });
  };

  const lockBackground = (): void => {
    if (backgroundLocked) return;

    lockedScrollY = window.scrollY;
    backgroundLocked = true;
    root.classList.add('has-piece-viewer');

    window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    window.addEventListener('scroll', enforceLockedScroll, { passive: true });
    document.addEventListener('keydown', preventBackgroundScrollKey, true);
    enforceLockedScroll();
  };

  const unlockBackground = (): void => {
    if (!backgroundLocked) return;

    backgroundLocked = false;
    window.removeEventListener('wheel', preventBackgroundScroll);
    window.removeEventListener('touchmove', preventBackgroundScroll);
    window.removeEventListener('scroll', enforceLockedScroll);
    document.removeEventListener('keydown', preventBackgroundScrollKey, true);

    if (scrollCorrectionFrame) window.cancelAnimationFrame(scrollCorrectionFrame);
    scrollCorrectionFrame = 0;

    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    root.classList.remove('has-piece-viewer');
    window.scrollTo(0, lockedScrollY);
    root.style.scrollBehavior = previousScrollBehavior;
  };

  const setLoadingState = (): void => {
    if (imageFrame) window.cancelAnimationFrame(imageFrame);
    if (statusFadeTimer) window.clearTimeout(statusFadeTimer);
    statusFadeTimer = 0;
    dialog.dataset.state = 'loading';
    statusText.textContent = LOADING_MESSAGE;
    status.hidden = false;
    image.hidden = true;
  };

  const setReadyState = (): void => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;

    image.hidden = false;
    imageFrame = window.requestAnimationFrame(() => {
      imageFrame = 0;
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
      dialog.dataset.state = 'ready';
      statusFadeTimer = window.setTimeout(() => {
        statusFadeTimer = 0;
        if (dialog.dataset.state === 'ready') status.hidden = true;
      }, reducedMotion.matches ? 90 : STATUS_FADE_MS);
    });
  };

  const setErrorState = (): void => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (statusFadeTimer) window.clearTimeout(statusFadeTimer);
    statusFadeTimer = 0;
    dialog.dataset.state = 'error';
    statusText.textContent = ERROR_MESSAGE;
    status.hidden = false;
    image.hidden = true;
  };

  const openDialog = (): void => {
    if (dialog.open) return;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }

    dialog.setAttribute('open', '');
  };

  const clearMotionSchedules = (): void => {
    if (closeTimer) window.clearTimeout(closeTimer);
    if (statusFadeTimer) window.clearTimeout(statusFadeTimer);
    if (openFrame) window.cancelAnimationFrame(openFrame);
    if (imageFrame) window.cancelAnimationFrame(imageFrame);
    closeTimer = 0;
    statusFadeTimer = 0;
    openFrame = 0;
    imageFrame = 0;
    dialog.removeEventListener('transitionend', handleCloseTransition);
  };

  const cleanup = (): void => {
    clearMotionSchedules();
    unlockBackground();
    dialog.classList.remove('is-open', 'is-closing');
    dialog.setAttribute('aria-label', 'Vista de pieza');
    image.removeAttribute('src');
    image.alt = '';
    statusText.textContent = LOADING_MESSAGE;
    status.hidden = false;
    image.hidden = true;
    delete dialog.dataset.state;

    const trigger = activeTrigger;
    activeTrigger = null;
    trigger?.focus({ preventScroll: true });
  };

  const finishClose = (): void => {
    clearMotionSchedules();
    if (!dialog.open) return;

    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      cleanup();
    }
  };

  function handleCloseTransition(event: TransitionEvent): void {
    if (event.target !== dialog || event.propertyName !== 'opacity') return;
    finishClose();
  }

  const closeDialog = (): void => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;

    if (openFrame) window.cancelAnimationFrame(openFrame);
    openFrame = 0;
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    dialog.addEventListener('transitionend', handleCloseTransition);
    closeTimer = window.setTimeout(
      finishClose,
      reducedMotion.matches ? REDUCED_CLOSE_FALLBACK_MS : CLOSE_FALLBACK_MS
    );
  };

  const beginOpenAnimation = (source: string): void => {
    openFrame = window.requestAnimationFrame(() => {
      openFrame = 0;
      if (!dialog.open || dialog.classList.contains('is-closing')) return;

      void dialog.getBoundingClientRect();
      openFrame = window.requestAnimationFrame(() => {
        openFrame = 0;
        if (!dialog.open || dialog.classList.contains('is-closing')) return;

        dialog.classList.add('is-open');
        image.fetchPriority = 'high';
        image.src = source;
        enforceLockedScroll();
      });
    });
  };

  const openPiece = (trigger: HTMLElement): void => {
    const name = trigger.dataset.pieceName?.trim();
    const source = trigger.dataset.pieceImage?.trim();
    if (!name || !source) return;

    clearMotionSchedules();
    activeTrigger = trigger;
    dialog.setAttribute('aria-label', `Imagen de ${name}`);
    image.alt = name;
    image.removeAttribute('src');
    setLoadingState();
    lockBackground();
    dialog.classList.remove('is-open', 'is-closing');
    openDialog();
    beginOpenAnimation(source);
  };

  pieceItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-piece-viewer-open]')
        : null;
      openPiece(button ?? item);
    });

    item.addEventListener('keydown', (event) => {
      if (event.target !== item) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPiece(item);
    });
  });

  image.addEventListener('load', setReadyState);
  image.addEventListener('error', setErrorState);
  closeButton.addEventListener('click', closeDialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });

  dialog.addEventListener('close', cleanup);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });

  mobilePieces.addEventListener('change', syncInteractivity);
  window.addEventListener('pagehide', cleanupPreload, { once: true });
  syncInteractivity();
};
