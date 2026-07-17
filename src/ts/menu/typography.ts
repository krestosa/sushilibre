import { queryAll } from '../shared/dom';

const DESCRIPTION_SELECTOR = '.menu-item__description';
const NON_BREAKING_SPACE = '\u00A0';
const WIDTH_EPSILON = 0.5;

interface BalancedLine {
  words: string[];
  width: number;
}

interface BalancedLayout {
  lines: BalancedLine[];
  cost: number;
}

type TextMeasure = (value: string) => number;

let measurementNode: HTMLSpanElement | null = null;

const getMeasurementNode = (): HTMLSpanElement => {
  if (measurementNode) return measurementNode;

  measurementNode = document.createElement('span');
  Object.assign(measurementNode.style, {
    position: 'fixed',
    top: '0',
    left: '-100000px',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    contain: 'layout style paint'
  });
  measurementNode.setAttribute('aria-hidden', 'true');
  document.body.append(measurementNode);
  return measurementNode;
};

const createTextMeasure = (element: HTMLElement): TextMeasure => {
  const computed = window.getComputedStyle(element);
  const node = getMeasurementNode();

  node.style.fontFamily = computed.fontFamily;
  node.style.fontSize = computed.fontSize;
  node.style.fontStyle = computed.fontStyle;
  node.style.fontStretch = computed.fontStretch;
  node.style.fontVariant = computed.fontVariant;
  node.style.fontWeight = computed.fontWeight;
  node.style.letterSpacing = computed.letterSpacing;
  node.style.wordSpacing = computed.wordSpacing;
  node.style.textTransform = computed.textTransform;

  const cache = new Map<string, number>();

  return (value: string): number => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;

    node.textContent = value;
    const width = node.getBoundingClientRect().width;
    cache.set(value, width);
    return width;
  };
};

const calculateLayoutCost = (lines: BalancedLine[], maxWidth: number): number => {
  const widths = lines.map((line) => line.width);
  const mean = widths.reduce((total, width) => total + width, 0) / widths.length;
  const normalize = (value: number): number => value / Math.max(maxWidth, 1);

  const variance = widths.reduce((total, width) => {
    const delta = normalize(width - mean);
    return total + delta * delta;
  }, 0);

  const adjacentDifference = widths.slice(1).reduce((total, width, index) => {
    const previous = widths[index];
    if (previous === undefined) return total;
    const delta = normalize(previous - width);
    return total + delta * delta;
  }, 0);

  const widest = Math.max(...widths);
  const narrowest = Math.min(...widths);
  const range = normalize(widest - narrowest);
  const lastWidth = widths[widths.length - 1] ?? mean;
  const lastLineShortfall = normalize(Math.max(0, mean * 0.9 - lastWidth));
  const isolatedWordPenalty = lines.filter((line) => line.words.length === 1).length * 0.35;

  return (
    variance +
    adjacentDifference * 0.45 +
    range * range * 0.75 +
    lastLineShortfall * lastLineShortfall * 2 +
    isolatedWordPenalty
  );
};

const findBalancedLayout = (
  words: string[],
  lineCount: number,
  maxWidth: number,
  measure: TextMeasure
): BalancedLayout | null => {
  let best: BalancedLayout | null = null;
  const current: BalancedLine[] = [];

  const visit = (start: number, remainingLines: number): void => {
    if (remainingLines === 1) {
      const finalWords = words.slice(start);
      if (lineCount > 1 && finalWords.length < 2) return;

      const value = finalWords.join(' ');
      const width = measure(value);
      if (width > maxWidth + WIDTH_EPSILON) return;

      const lines = [...current, { words: finalWords, width }];
      const cost = calculateLayoutCost(lines, maxWidth);
      if (!best || cost < best.cost) best = { lines, cost };
      return;
    }

    const minimumWordsForRemainingLines = remainingLines;
    const maximumEnd = words.length - minimumWordsForRemainingLines;

    for (let end = start + 1; end <= maximumEnd; end += 1) {
      const lineWords = words.slice(start, end);
      const value = lineWords.join(' ');
      const width = measure(value);
      if (width > maxWidth + WIDTH_EPSILON) break;

      current.push({ words: lineWords, width });
      visit(end, remainingLines - 1);
      current.pop();
    }
  };

  visit(0, lineCount);
  return best;
};

const calculateBalancedLines = (
  value: string,
  maxWidth: number,
  measure: TextMeasure
): string[][] => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words];

  for (let lineCount = 1; lineCount < words.length; lineCount += 1) {
    const layout = findBalancedLayout(words, lineCount, maxWidth, measure);
    if (layout) return layout.lines.map((line) => line.words);
  }

  return [words];
};

const renderBalancedLines = (element: HTMLElement, lines: string[][]): void => {
  const fragment = document.createDocumentFragment();

  lines.forEach((words, index) => {
    if (index > 0) fragment.append(document.createElement('br'));
    fragment.append(document.createTextNode(words.join(NON_BREAKING_SPACE)));
  });

  element.replaceChildren(fragment);
};

const balanceDescription = (element: HTMLElement): void => {
  const source = element.dataset.balanceText?.trim();
  const maxWidth = element.getBoundingClientRect().width;
  if (!source || maxWidth <= 0) return;

  const measure = createTextMeasure(element);
  const lines = calculateBalancedLines(source, maxWidth, measure);
  renderBalancedLines(element, lines);
  element.setAttribute('aria-label', source);
};

export const observeBalancedMenuDescriptions = (root: ParentNode): void => {
  const descriptions = queryAll<HTMLElement>(DESCRIPTION_SELECTOR, root);
  if (!descriptions.length) return;

  const measuredWidths = new WeakMap<HTMLElement, number>();
  let animationFrame = 0;
  let forceNextPass = true;

  const balanceAll = (): void => {
    animationFrame = 0;
    const force = forceNextPass;
    forceNextPass = false;

    descriptions.forEach((description) => {
      const width = description.getBoundingClientRect().width;
      const previousWidth = measuredWidths.get(description);
      if (!force && previousWidth !== undefined && Math.abs(previousWidth - width) < WIDTH_EPSILON) {
        return;
      }

      measuredWidths.set(description, width);
      balanceDescription(description);
    });
  };

  const scheduleBalance = (force = false): void => {
    forceNextPass ||= force;
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(balanceAll);
  };

  scheduleBalance(true);

  const supportsResizeObserver = typeof ResizeObserver !== 'undefined';
  if (supportsResizeObserver) {
    const observer = new ResizeObserver(() => scheduleBalance());
    descriptions.forEach((description) => observer.observe(description));
  } else {
    window.addEventListener('resize', () => scheduleBalance(), { passive: true });
  }

  void document.fonts.ready.then(() => scheduleBalance(true));
};
