import { query, queryAll } from '../shared/dom';

const LOADING_MESSAGE = 'CARGANDO IMAGEN';
const ERROR_MESSAGE = 'IMAGEN NO DISPONIBLE';
const CLOSE_FALLBACK_MS = 320;
const REDUCED_CLOSE_FALLBACK_MS = 170;
const PRELOAD_CONCURRENCY = 3;
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

const preloadPieceImages = (triggers: readonly HTMLElement[]): void => {
  const sources = Array.from(new Set(
    triggers
      .map((trigger) => trigger.dataset.pieceImage?.trim())
      .filter((source): source is string => Boolean(source))
  ));

  if (!sources.length) return;

  const pending = new Set<HTMLImageElement>();
  let cursor = 0;
  let active = 0;

  const pump = (): void => {
    while (active < PRELOAD_CONCURRENCY && cursor < sources.length) {
      const source = sources[cursor];
      cursor += 1;
      if (!source) continue;

      const preload = new Image();
      active += 1;
      pending.add(preload);
      preload.decoding = 'async';
      preload.fetchPriority = 'low';

      const settle = (): void => {
        preload.onload = null;
        preload.onerror = null;
        pending.delete(preload);
        active -= 1;
        pump();
      };

      preload.onload = settle;
      preload.onerror = settle;
      preload.src = source;
    }
  };

  window.requestAnimationFrame(() => {
    window.setTimeout(pump, 0);
  });
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

  preloadPieceImages(pieceItems);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobilePieces = window.matchMedia(MOBILE_PIECE_QUERY);
  let activeTrigger: HTMLElement | null = null;
  let closeTimer = 0;
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
      status.hidden = true;
    });
  };

  const setErrorState = (): void => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
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
    if (openFrame) window.cancelAnimationFrame(openFrame);
    if (imageFrame) window.cancelAnimationFrame(imageFrame);
    closeTimer = 0;
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
  syncInteractivity();
};
