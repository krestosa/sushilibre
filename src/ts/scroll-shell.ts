import { query } from './shared/dom';

const mobileAppScroll = window.matchMedia('(max-width: 840px) and (pointer: coarse)');
const page = query<HTMLElement>('.page');
const dock = query<HTMLElement>('.booking-dock');

if (page && dock) {
  const syncDockHost = (): void => {
    if (mobileAppScroll.matches) {
      if (dock.parentElement === page) page.before(dock);
      return;
    }

    if (dock.parentElement !== page) page.prepend(dock);
  };

  syncDockHost();
  mobileAppScroll.addEventListener('change', syncDockHost);
}
