import { query, queryAll } from '../shared/dom';

const LOADING_MESSAGE = 'CARGANDO IMAGEN';
const ERROR_MESSAGE = 'IMAGEN NO DISPONIBLE';

export const setupPieceViewer = (): void => {
  const dialog = query<HTMLDialogElement>('[data-piece-viewer]');
  const image = query<HTMLImageElement>('[data-piece-viewer-image]', dialog ?? undefined);
  const status = query<HTMLElement>('[data-piece-viewer-status]', dialog ?? undefined);
  const closeButton = query<HTMLButtonElement>('[data-piece-viewer-close]', dialog ?? undefined);
  const openButtons = queryAll<HTMLButtonElement>('[data-piece-viewer-open]');

  if (!dialog || !image || !status || !closeButton || !openButtons.length) return;

  let activeButton: HTMLButtonElement | null = null;

  const setLoadingState = (): void => {
    dialog.dataset.state = 'loading';
    status.textContent = LOADING_MESSAGE;
    status.hidden = false;
    image.hidden = true;
  };

  const setReadyState = (): void => {
    dialog.dataset.state = 'ready';
    status.hidden = true;
    image.hidden = false;
  };

  const setErrorState = (): void => {
    dialog.dataset.state = 'error';
    status.textContent = ERROR_MESSAGE;
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

  const closeDialog = (): void => {
    if (!dialog.open) return;

    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };

  const openPiece = (button: HTMLButtonElement): void => {
    const name = button.dataset.pieceName?.trim();
    const source = button.dataset.pieceImage?.trim();
    if (!name || !source) return;

    activeButton = button;
    dialog.setAttribute('aria-label', `Imagen de ${name}`);
    image.alt = name;
    setLoadingState();
    document.documentElement.classList.add('has-piece-viewer');
    openDialog();

    image.removeAttribute('src');
    window.requestAnimationFrame(() => {
      image.src = source;
    });
  };

  const cleanup = (): void => {
    document.documentElement.classList.remove('has-piece-viewer');
    dialog.setAttribute('aria-label', 'Vista de pieza');
    image.removeAttribute('src');
    image.alt = '';
    status.textContent = LOADING_MESSAGE;
    status.hidden = false;
    image.hidden = true;
    delete dialog.dataset.state;

    const button = activeButton;
    activeButton = null;
    button?.focus({ preventScroll: true });
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
  dialog.addEventListener('cancel', () => {
    window.requestAnimationFrame(() => {
      if (!dialog.open) cleanup();
    });
  });
};
