import { queryAll } from '../shared/dom';
import { setMenuBackground } from './data';
import type { MenuData, MenuItemData } from './types';

export interface MenuElements {
  root: HTMLElement;
  heading: HTMLElement;
  groups: HTMLElement;
  status: HTMLElement;
}

const createTextElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  value: string
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
};

const keepLastTwoWordsTogether = (value: string): string => {
  const normalized = value.trim();
  return normalized.replace(/\s+(\S+)$/, '\u00A0$1');
};

const parseSectionPieces = (quantity: string): number | null => {
  const value = Number.parseInt(quantity, 10);
  return Number.isFinite(value) ? value : null;
};

const createBadge = (label: string, modifier: 'diet' | 'pieces'): HTMLSpanElement =>
  createTextElement('span', `menu-item__badge menu-item__badge--${modifier}`, label);

const renderItem = (entry: MenuItemData, sectionPieces: number | null): HTMLElement => {
  const item = document.createElement('article');
  item.className = `menu-item${entry.description ? '' : ' menu-item--simple'}`;

  const itemHeader = document.createElement('div');
  itemHeader.className = 'menu-item__header';
  itemHeader.append(createTextElement('h4', 'menu-item__name', entry.name));

  const badges = document.createElement('div');
  badges.className = 'menu-item__badges';

  if (entry.diet === 'veggie' || entry.diet === 'vegan') {
    badges.append(createBadge(entry.diet, 'diet'));
  }

  const itemPieces = Number(entry.pieces);
  if (Number.isFinite(itemPieces) && itemPieces > 0 && itemPieces !== sectionPieces) {
    badges.append(createBadge(`${itemPieces}U`, 'pieces'));
  }

  if (badges.childElementCount) itemHeader.append(badges);
  item.append(itemHeader);

  if (entry.description) {
    item.append(
      createTextElement(
        'p',
        'menu-item__description',
        keepLastTwoWordsTogether(entry.description)
      )
    );
  }

  return item;
};

export const renderMenu = (data: MenuData, elements: MenuElements): HTMLElement[] => {
  elements.heading.textContent = data.title;
  setMenuBackground(elements.root, data.background);
  elements.groups.replaceChildren();

  const fragment = document.createDocumentFragment();

  data.sections.forEach((section, sectionIndex) => {
    const sectionPieces = parseSectionPieces(section.quantity);
    const group = document.createElement('article');
    const groupId = section.id || String(sectionIndex + 1);
    group.className = 'menu-group';
    group.id = `menu-${groupId}`;
    group.dataset.menuGroup = groupId;
    group.dataset.itemCount = String(section.items.length);
    group.style.setProperty('--menu-item-count', String(Math.max(1, section.items.length)));

    const heading = document.createElement('h3');
    heading.className = 'menu-group__heading';
    const titleLine = document.createElement('span');
    titleLine.className = 'menu-group__title-line';
    titleLine.append(createTextElement('span', 'menu-group__title', section.title));
    if (section.quantity) {
      titleLine.append(createTextElement('span', 'menu-group__quantity', section.quantity));
    }
    heading.append(titleLine);

    const items = document.createElement('div');
    items.className = 'menu-group__items';
    const sentinel = document.createElement('span');
    sentinel.className = 'menu-group__overlap-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    items.append(sentinel);

    section.items.forEach((entry) => {
      items.append(renderItem(entry, sectionPieces));
    });

    group.append(heading, items);
    fragment.append(group);
  });

  elements.groups.append(fragment);
  elements.status.hidden = true;
  return queryAll<HTMLElement>('[data-menu-group]', elements.groups);
};