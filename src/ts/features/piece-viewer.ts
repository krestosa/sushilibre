import { query, queryAll } from '../shared/dom';

const LOADING_MESSAGE = 'CARGANDO IMAGEN';
const ERROR_MESSAGE = 'IMAGEN NO DISPONIBLE';
const CLOSE_FALLBACK_MS = 320;
const REDUCED_CLOSE_FALLBACK_MS = 170;

export const setupPieceViewer = (): void => {
  const dialog = query<HTMLDialogElement>('[data-piece-viewer]');
  const image = query<HTMLImageElement>('[data-piece-viewer-image]', dialog ?? undefined);
  const status = query<HTMLElement>('[data-piece-viewer-status]', dialog ?? undefined);
  const statusText = query<HTMLElement>('[data-piece-viewer-status-text]', dialog ?? undefined);
  const closeButton = query<HTMLButtonElement>('[data-piece-viewer-close]', dialog ?? undefined);
  const openButtons = queryAll<HTMLButtonElement>('[data-piece-viewer-open]');

  if (!dialog || !image || !status || !statusText || !closeButton || !openButtons.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeButton: HTMLButtonElement | null = null;
  let closeTimer = 0;
  let openFrame = 0;
  let imageFrame = 0;

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
    document.documentElement.classList.remove('has-piece-viewer');
    dialog.classList.remove('is-open', 'is-closing');
    dialog.setAttribute('aria-label', 'Vista de pieza');
    image.removeAttribute('src');
    image.alt = '';
    statusText.textContent = LOADING_MESSAGE;
    status.hidden = false;
    image.hidden = true;
    delete dialog.dataset.state;

    const button = activeButton;
    activeButton = null;
    button?.focus({ preventScroll: true });
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

  const openPiece = (button: HTMLButtonElement): void => {
    const name = button.dataset.pieceName?.trim();
    const source = button.dataset.pieceImage?.trim();
    if (!name || !source) return;

    clearMotionSchedules();
    activeButton = button;
    dialog.setAttribute('aria-label', `Imagen de ${name}`);
    image.alt = name;
    setLoadingState();
    document.documentElement.classList.add('has-piece-viewer');
    dialog.classList.remove('is-open', 'is-closing');
    openDialog();

    image.removeAttribute('src');
    openFrame = window.requestAnimationFrame(() => {
      openFrame = 0;
      dialog.classList.add('is-open');
      image.src = source;
    });
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', () => openPiece(button));
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
};
