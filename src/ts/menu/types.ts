export type MenuDiet = 'veggie' | 'vegan';

export interface MenuItemData {
  name: string;
  description?: string;
  pieces?: number;
  diet?: MenuDiet;
}

export interface MenuSectionData {
  id: string;
  title: string;
  quantity: string;
  items: MenuItemData[];
}

export interface MenuData {
  title: string;
  background?: string;
  sections: MenuSectionData[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMenuItem = (value: unknown): value is MenuItemData => {
  if (!isRecord(value) || typeof value.name !== 'string') return false;
  if (value.description !== undefined && typeof value.description !== 'string') return false;
  if (value.pieces !== undefined && typeof value.pieces !== 'number') return false;
  if (value.diet !== undefined && value.diet !== 'veggie' && value.diet !== 'vegan') return false;
  return true;
};

const isMenuSection = (value: unknown): value is MenuSectionData =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.quantity === 'string' &&
  Array.isArray(value.items) &&
  value.items.every(isMenuItem);

export const isMenuData = (value: unknown): value is MenuData =>
  isRecord(value) &&
  typeof value.title === 'string' &&
  (value.background === undefined || typeof value.background === 'string') &&
  Array.isArray(value.sections) &&
  value.sections.every(isMenuSection);
