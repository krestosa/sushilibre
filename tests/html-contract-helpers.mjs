export const compactHtml = (html) => html
  .replace(/\s+/g, ' ')
  .replace(/\s+>/g, '>')
  .trim();

export const visibleText = (html) => compactHtml(html.replace(/<[^>]*>/g, ' '));

export const openingTags = (html, tagName) => (
  compactHtml(html).match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? []
);

export const attributeValue = (tag, attribute) => {
  const match = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag);
  return match?.[2] ?? null;
};

export const hasAttribute = (tag, attribute) => (
  new RegExp(`\\b${attribute}(?:\\s*=|\\s|>)`, 'i').test(`${tag}>`)
);

export const hasClass = (tag, className) => (
  (attributeValue(tag, 'class') ?? '').split(/\s+/).includes(className)
);

export const findOpeningTag = (html, tagName, predicate) => (
  openingTags(html, tagName).find(predicate) ?? null
);

export const findTagIndexByClass = (html, tagName, className) => {
  const expression = new RegExp(`<${tagName}\\b[^>]*\\bclass\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\1[^>]*>`, 'i');
  return expression.exec(html)?.index ?? -1;
};
