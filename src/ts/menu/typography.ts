import { queryAll } from '../shared/dom';

const DESCRIPTION_SELECTOR = '.menu-item__description';
const NON_BREAKING_SPACE = '\u00A0';
const WIDTH_EPSILON = 0.5;
const MINIMUM_FILL_RATIO = 0.62;
const MAXIMUM_FILL_RATIO = 0.78;
const PREFERRED_FILL_RATIO = 0.72;

interface BalancedLine {
  words: string[];
  width: number;
}

interface BalancedLayout {
  lines: BalancedLine[];
  cost: number;
}

interface DescriptionMetrics {
  element: HTMLElement;
  source: string;
  words: string[];
  maxWidth: number;
  totalWidth: number;
  measure: TextMeasure;
}

type TextMeasure = (value: string) => number;

let measurementNode: HTMLSpanElement | null = null;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const median = (values: number[]): number => {
  if (!values.length) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return 0;

  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1] ?? upper;
  return (lower + upper) / 2;
};

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
  const styles = {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontStyle: computed.fontStyle,
    fontStretch: computed.fontStretch,
    fontVariant: computed.fontVariant,
    fontWeight: computed.fontWeight,
    letterSpacing: computed.letterSpacing,
    wordSpacing: computed.wordSpacing,
    textTransform: computed.textTransform
  };
  const cache = new Map<string, number>();

  return (value: string): number => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;

    Object.assign(node.style, styles);
    node.textContent = value;
    const width = node.getBoundingClientRect().width;
    cache.set(value, width);
    return width;
  };
};

const calculateGlobalTargetWidth = (metrics: DescriptionMetrics[]): number => {
  const commonMaximumWidth = median(metrics.map(({ maxWidth }) => maxWidth));
  if (commonMaximumWidth <= 0) return 0;

  const individualIdealWidths = metrics.map(({ words, totalWidth, maxWidth }) => {
    const minimumLineCount = words.length >= 4 ? 2 : 1;
    const maximumLineCount = Math.max(minimumLineCount, Math.floor(words.length / 2));
    const estimatedLineCount = clamp(
      Math.round(totalWidth / Math.max(maxWidth * PREFERRED_FILL_RATIO, 1)),
      minimumLineCount,
      maximumLineCount
    );

    return totalWidth / Math.max(estimatedLineCount, 1);
  });

  return clamp(
    median(individualIdealWidths),
    commonMaximumWidth * MINIMUM_FILL_RATIO,
    commonMaximumWidth * MAXIMUM_FILL_RATIO
  );
};

const calculateLayoutCost = (
  lines: BalancedLine[],
  maxWidth: number,
  targetWidth: number
): number => {
  const widths = lines.map((line) => line.width);
  const mean = widths.reduce((total, width) => total + width, 0) / widths.length;
  const normalizeByMaximum = (value: number): number => value / Math.max(maxWidth, 1);
  const normalizeByTarget = (value: number): number => value / Math.max(targetWidth, 1);

  const localVariance = widths.reduce((total, width) => {
    const delta = normalizeByMaximum(width - mean);
    return total + delta * delta;
  }, 0) / widths.length;

  const adjacentDifference = widths.slice(1).reduce((total, width, index) => {
    const previous = widths[index];
    if (previous === undefined) return total;
    const delta = normalizeByMaximum(previous - width);
    return total + delta * delta;
  }, 0) / Math.max(widths.length - 1, 1);

  const targetDeviation = widths.reduce((total, width) => {
    const delta = normalizeByTarget(width - targetWidth);
    return total + delta * delta;
  }, 0) / widths.length;

  const meanTargetDeviation = normalizeByTarget(mean - targetWidth);
  const widest = Math.max(...widths);
  const narrowest = Math.min(...widths);
  const range = normalizeByMaximum(widest - narrowest);
  const lastWidth = widths[widths.length - 1] ?? mean;
  const lastLineShortfall = normalizeByTarget(Math.max(0, targetWidth * 0.82 - lastWidth));

  return (
    targetDeviation * 3.2 +
    meanTargetDeviation * meanTargetDeviation * 2.4 +
    localVariance * 0.75 +
    adjacentDifference * 0.4 +
    range * range * 0.65 +
    lastLineShortfall * lastLineShortfall * 2.2
  );
};

const findBalancedLayout = (
  words: string[],
  lineCount: number,
  maxWidth: number,
  targetWidth: number,
  measure: TextMeasure
): BalancedLayout | null => {
  let best: BalancedLayout | null = null;
  const current: BalancedLine[] = [];
  const minimumWordsPerLine = lineCount > 1 ? 2 : 1;

  const visit = (start: number, remainingLines: number): void => {
    if (remainingLines === 1) {
      const finalWords = words.slice(start);
      if (finalWords.length < minimumWordsPerLine) return;

      const value = finalWords.join(' ');
      const width = measure(value);
      if (width > maxWidth + WIDTH_EPSILON) return;

      const lines = [...current, { words: finalWords, width }];
      const cost = calculateLayoutCost(lines, maxWidth, targetWidth);
      if (!best || cost < best.cost) best = { lines, cost };
      return;
    }

    const minimumWordsForFollowingLines = (remainingLines - 1) * minimumWordsPerLine;
    const maximumEnd = words.length - minimumWordsForFollowingLines;

    for (let end = start + minimumWordsPerLine; end <= maximumEnd; end += 1) {
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
  metrics: DescriptionMetrics,
  globalTargetWidth: number
): string[][] => {
  const { words, maxWidth, totalWidth, measure } = metrics;
  if (words.length <= 1) return [words];

  const targetWidth = Math.min(globalTargetWidth, maxWidth * MAXIMUM_FILL_RATIO);
  const minimumLineCount = words.length >= 4 ? 2 : 1;
  const maximumLineCount = Math.max(minimumLineCount, Math.floor(words.length / 2));
  const preferredLineCount = clamp(
    Math.round(totalWidth / Math.max(targetWidth, 1)),
    minimumLineCount,
    maximumLineCount
  );

  let best: BalancedLayout | null = null;

  for (let lineCount = minimumLineCount; lineCount <= maximumLineCount; lineCount += 1) {
    const layout = findBalancedLayout(words, lineCount, maxWidth, targetWidth, measure);
    if (!layout) continue;

    const lineCountDistance = lineCount - preferredLineCount;
    const lineCountPenalty = lineCountDistance * lineCountDistance * 0.18;
    const candidate = {
      lines: layout.lines,
      cost: layout.cost + lineCountPenalty
    };

    if (!best || candidate.cost < best.cost) best = candidate;
  }

  return best ? best.lines.map((line) => line.words) : [words];
};

const renderBalancedLines = (element: HTMLElement, lines: string[][]): void => {
  const fragment = document.createDocumentFragment();

  lines.forEach((words, index) => {
    if (index > 0) fragment.append(document.createElement('br'));
    fragment.append(document.createTextNode(words.join(NON_BREAKING_SPACE)));
  });

  element.replaceChildren(fragment);
};

const collectMetrics = (descriptions: HTMLElement[]): DescriptionMetrics[] =>
  descriptions.flatMap((element) => {
    const source = element.dataset.balanceText?.trim();
    const maxWidth = element.getBoundingClientRect().width;
    if (!source || maxWidth <= 0) return [];

    const words = source.split(/\s+/).filter(Boolean);
    const measure = createTextMeasure(element);

    return [{
      element,
      source,
      words,
      maxWidth,
      totalWidth: measure(words.join(' ')),
      measure
    }];
  });

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

    const widthChanged = descriptions.some((description) => {
      const width = description.getBoundingClientRect().width;
      const previousWidth = measuredWidths.get(description);
      measuredWidths.set(description, width);
      return previousWidth === undefined || Math.abs(previousWidth - width) >= WIDTH_EPSILON;
    });

    if (!force && !widthChanged) return;

    const metrics = collectMetrics(descriptions);
    const globalTargetWidth = calculateGlobalTargetWidth(metrics);
    if (globalTargetWidth <= 0) return;

    metrics.forEach((descriptionMetrics) => {
      const lines = calculateBalancedLines(descriptionMetrics, globalTargetWidth);
      renderBalancedLines(descriptionMetrics.element, lines);
      descriptionMetrics.element.setAttribute('aria-label', descriptionMetrics.source);
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
