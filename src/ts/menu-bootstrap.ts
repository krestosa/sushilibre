import { query } from './shared/dom';
import { loadMenuData } from './menu/data';
import { configureMobileOverlapShadows, observeActiveMenuGroup } from './menu/observers';
import { renderMenu } from './menu/render';

const menuRoot = query<HTMLElement>('[data-menu-root]');
const menuHeading = query<HTMLElement>('[data-menu-heading]');
const menuGroups = query<HTMLElement>('[data-menu-groups]');
const menuStatus = query<HTMLElement>('[data-menu-status]');

if (menuRoot && menuHeading && menuGroups && menuStatus) {
  void loadMenuData()
    .then((data) => {
      const groups = renderMenu(data, {
        root: menuRoot,
        heading: menuHeading,
        groups: menuGroups,
        status: menuStatus
      });

      if (!groups.length) return;
      configureMobileOverlapShadows(groups);
      observeActiveMenuGroup(menuRoot, groups);
    })
    .catch((error: unknown) => {
      menuStatus.textContent = 'NO SE PUDO CARGAR EL MENÚ.';
      console.error(error);
    });
}
