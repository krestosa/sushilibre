const MENU_MARKER = '<!-- MENU_SECTION -->';
const PIECE_IMAGE_PATTERN = /^assets\/piezas\/[a-z0-9_/-]+\.webp$/;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requireString = (value, label, { allowEmpty = false } = {}) => {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new TypeError(`${label} must be a${allowEmpty ? '' : ' non-empty'} string.`);
  }
  return value;
};

const optionalPositiveNumber = (value, label) => {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive number.`);
  }
  return number;
};

const normalizeImagePath = (value, label) => {
  const path = requireString(value, label);
  if (!PIECE_IMAGE_PATTERN.test(path) || path.includes('..') || path.includes('\\')) {
    throw new TypeError(`${label} must point to a .webp file inside assets/piezas/.`);
  }
  return path;
};

const normalizeItem = (value, sectionIndex, itemIndex, sectionId) => {
  if (!isRecord(value)) {
    throw new TypeError(`sections[${sectionIndex}].items[${itemIndex}] must be an object.`);
  }

  const item = {
    name: requireString(value.name, `sections[${sectionIndex}].items[${itemIndex}].name`)
  };

  if (value.description !== undefined) {
    item.description = requireString(
      value.description,
      `sections[${sectionIndex}].items[${itemIndex}].description`
    );
  }

  if (value.diet !== undefined) {
    if (value.diet !== 'veggie' && value.diet !== 'vegan') {
      throw new TypeError(`sections[${sectionIndex}].items[${itemIndex}].diet is invalid.`);
    }
    item.diet = value.diet;
  }

  const pieces = optionalPositiveNumber(
    value.pieces,
    `sections[${sectionIndex}].items[${itemIndex}].pieces`
  );
  if (pieces !== undefined) item.pieces = pieces;

  if (sectionId !== 'bebidas') {
    item.image = normalizeImagePath(
      value.image,
      `sections[${sectionIndex}].items[${itemIndex}].image`
    );
  }

  return item;
};

export const parseMenuSource = (rawMenu) => {
  let parsed;
  try {
    parsed = JSON.parse(rawMenu);
  } catch (error) {
    throw new SyntaxError(`menu.json is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.sections)) {
    throw new TypeError('menu.json must contain a sections array.');
  }

  return {
    title: requireString(parsed.title, 'title'),
    background: requireString(parsed.background, 'background'),
    sections: parsed.sections.map((section, sectionIndex) => {
      if (!isRecord(section) || !Array.isArray(section.items)) {
        throw new TypeError(`sections[${sectionIndex}] must contain an items array.`);
      }

      const id = requireString(section.id, `sections[${sectionIndex}].id`);
      return {
        id,
        title: requireString(section.title, `sections[${sectionIndex}].title`),
        quantity: requireString(section.quantity, `sections[${sectionIndex}].quantity`, { allowEmpty: true }),
        items: section.items.map((item, itemIndex) => normalizeItem(item, sectionIndex, itemIndex, id))
      };
    })
  };
};

const escapeText = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const escapeAttribute = (value) => escapeText(value)
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const escapeCssUrl = (value) => String(value)
  .replaceAll('\\', '\\\\')
  .replaceAll('"', '\\"')
  .replace(/[\r\n\f]/g, '');

const parseSectionPieces = (quantity) => {
  const pieces = Number.parseInt(quantity, 10);
  return Number.isFinite(pieces) ? pieces : null;
};

const renderBadge = (label, modifier) =>
  `<span class="menu-item__badge menu-item__badge--${modifier}">${escapeText(label)}</span>`;

const renderViewButton = (item) => item.image
  ? `<button class="menu-item__badge menu-item__view" type="button" aria-haspopup="dialog" aria-controls="piece-viewer" data-piece-viewer-open data-piece-name="${escapeAttribute(item.name)}" data-piece-image="${escapeAttribute(item.image)}">VER PIEZA</button>`
  : '';

const renderMenuItem = (item, sectionPieces) => {
  const controls = [];
  if (item.diet) controls.push(renderBadge(item.diet, 'diet'));
  if (
    Number.isFinite(item.pieces) &&
    item.pieces > 0 &&
    item.pieces !== sectionPieces
  ) {
    controls.push(renderBadge(`${item.pieces}U`, 'pieces'));
  }

  const viewButton = renderViewButton(item);
  if (viewButton) controls.push(viewButton);

  const controlsMarkup = controls.length
    ? `<div class="menu-item__badges">${controls.join('')}</div>`
    : '';
  const descriptionMarkup = item.description
    ? `<p class="menu-item__description" data-balance-text="${escapeAttribute(item.description)}">${escapeText(item.description)}</p>`
    : '';
  const modifier = item.description ? '' : ' menu-item--simple';

  return [
    `          <article class="menu-item${modifier}">`,
    '            <div class="menu-item__header">',
    `              <div class="menu-item__identity"><h4 class="menu-item__name">${escapeText(item.name)}</h4>${controlsMarkup}</div>`,
    '            </div>',
    descriptionMarkup ? `            ${descriptionMarkup}` : '',
    '          </article>'
  ].filter(Boolean).join('\n');
};

const renderMenuGroup = (section) => {
  const sectionPieces = parseSectionPieces(section.quantity);
  const items = section.items
    .map((item) => renderMenuItem(item, sectionPieces))
    .join('\n');
  const quantity = section.quantity
    ? `<span class="menu-group__quantity">${escapeText(section.quantity)}</span>`
    : '';

  return [
    `      <article class="menu-group" id="menu-${escapeAttribute(section.id)}" data-menu-group="${escapeAttribute(section.id)}" data-item-count="${section.items.length}" style="--menu-item-count:${Math.max(1, section.items.length)}">`,
    '        <h3 class="menu-group__heading">',
    `          <span class="menu-group__title-line"><span class="menu-group__title">${escapeText(section.title)}</span>${quantity}</span>`,
    '        </h3>',
    '        <div class="menu-group__items">',
    '          <span class="menu-group__overlap-sentinel" aria-hidden="true"></span>',
    items,
    '          <span class="menu-group__exit-sentinel" aria-hidden="true"></span>',
    '        </div>',
    '      </article>'
  ].join('\n');
};

const renderPieceViewer = () => [
  '    <dialog class="piece-viewer" id="piece-viewer" data-piece-viewer aria-label="Vista de pieza">',
  '      <div class="piece-viewer__content">',
  '        <button class="piece-viewer__close" type="button" data-piece-viewer-close aria-label="Cerrar">×</button>',
  '        <img class="piece-viewer__image" data-piece-viewer-image alt="" decoding="async">',
  '        <p class="piece-viewer__status" data-piece-viewer-status>CARGANDO IMAGEN</p>',
  '        <p class="piece-viewer__disclaimer">Imagen ilustrativa. Cantidad de piezas según menú.</p>',
  '      </div>',
  '    </dialog>'
].join('\n');

export const renderMenuSection = (menu) => {
  const groups = menu.sections.map(renderMenuGroup).join('\n');
  const background = escapeAttribute(escapeCssUrl(menu.background));

  return [
    `    <section class="menu-section" id="menu" data-menu-root aria-labelledby="menu-heading" style="--menu-background-image:url(&quot;${background}&quot;)">`,
    '      <div class="menu-section__background" aria-hidden="true"></div>',
    '      <div class="menu-section__shell">',
    `        <header class="menu-section__intro"><h2 id="menu-heading">${escapeText(menu.title)}</h2></header>`,
    '        <div class="menu-section__groups" data-menu-groups>',
    groups,
    '        </div>',
    '      </div>',
    '    </section>',
    renderPieceViewer()
  ].join('\n');
};

export const renderStaticHtml = (template, menu) => {
  if (!template.includes(MENU_MARKER)) {
    throw new Error(`Static template must contain ${MENU_MARKER}.`);
  }

  return template.replace(MENU_MARKER, renderMenuSection(menu));
};
