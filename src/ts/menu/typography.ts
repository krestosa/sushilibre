import { queryAll } from '../shared/dom';

const DESCRIPTION_SELECTOR = '.menu-item__description';
const NON_BREAKING_SPACE = '\u00A0';
const WIDTH_EPSILON = 0.5;
const MINIMUM_TARGET_WORDS = 8;
const MAXIMUM_WORDS_PER_LINE = 10;
const MINIMUM_WORDS_PER_WRAPPED_LINE = 2;

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

const calculateGlobalTargetWords = (metrics: DescriptionMetrics[]): number => {
  const estimatedCapacities = metrics.map(({ words, totalWidth, maxWidth }) => {
    if (!words.length || totalWidth <= 0 || maxWidth <= 0) return MINIMUM_TARGET_WORDS;

    const averageWordAdvance = totalWidth / words.length;
    return clamp(
      Math.floor(maxWidth / Math.max(averageWordAdvance, 1)),
      MINIMUM_WORDS_PER_WRAPPED_LINE,
      MAXIMUM_WORDS_PER_LINE
    );
  });

  return clamp(
    Math.round(median(estimatedCapacities)),
    MINIMUM_TARGET_WORDS,
    MAXIMUM_WORDS_PER_LINE
  );
};

const calculateLayoutCost = (
  lines: BalancedLine[],
  maxWidth: number,
  globalTargetWords: number
): number => {
  const widths = lines.map((line) => line.width);
  const wordCounts = lines.map((line) => line.words.length);
  const meanWidth = widths.reduce((total, width) => total + width, 0) / widths.length;
  const meanWordCount = wordCounts.reduce((total, count) => total + count, 0) / wordCounts.length;
  const normalizeWidth = (value: number): number => value / Math.max(maxWidth, 1);
  const normalizeWords = (value: number): number => value / Math.max(globalTargetWords, 1);

  const widthVariance = widths.reduce((total, width) => {
    const delta = normalizeWidth(width - meanWidth);
    return total + delta * delta;
  }, 0) / widths.length;

  const wordCountVariance = wordCounts.reduce((total, count) => {
    const delta = normalizeWords(count - meanWordCount);
    return total + delta * delta;
  }, 0) / wordCounts.length;

  const targetWordDeviation = wordCounts.reduce((total, count) => {
    const delta = normalizeWords(count - globalTargetWords);
    return total + delta * delta;
  }, 0) / wordCounts.length;

  const adjacentWidthDifference = widths.slice(1).reduce((total, width, index) => {
    const previous = widths[index];
    if (previous === undefined) return total;
    const delta = normalizeWidth(previous - width);
    return total + delta * delta;
  }, 0) / Math.max(widths.length - 1, 1);

  const widest = Math.max(...widths);
  const narrowest = Math.min(...widths);
  const widthRange = normalizeWidth(widest - narrowest);
  const lastWordCount = wordCounts[wordCounts.length - 1] ?? meanWordCount;
  const lastLineShortfall = normalizeWords(
    Math.max(0, Math.min(globalTargetWords, meanWordCount) * 0.78 - lastWordCount)
  );

  return (
    targetWordDeviation * 2.4 +
    wordCountVariance * 2 +
    widthVariance * 1.15 +
    adjacentWidthDifference * 0.55 +
    widthRange * widthRange * 0.8 +
    lastLineShortfall * lastLineShortfall * 3
  );
};

const findBalancedLayout = (
  words: string[],
  lineCount: number,
  maxWidth: number,
  globalTargetWords: number,
  measure: TextMeasure
): BalancedLayout | null => {
  let best: BalancedLayout | null = null;
  const current: BalancedLine[] = [];
  const minimumWordsPerLine = lineCount > 1 ? MINIMUM_WORDS_PER_WRAPPED_LINE : 1;

  const visit = (start: number, remainingLines: number): void => {
    const remainingWords = words.length - start;
    const minimumRequired = remainingLines * minimumWordsPerLine;
    const maximumAllowed = remainingLines * MAXIMUM_WORDS_PER_LINE;
    if (remainingWords < minimumRequired || remainingWords > maximumAllowed) return;

    if (remainingLines === 1) {
      const finalWords = words.slice(start);
      if (
        finalWords.length < minimumWordsPerLine ||
        finalWords.length > MAXIMUM_WORDS_PER_LINE
      ) {
        return;
      }

      const value = finalWords.join(' ');
      const width = measure(value);
      if (width > maxWidth + WIDTH_EPSILON) return;

      const lines = [...current, { words: finalWords, width }];
      const cost = calculateLayoutCost(lines, maxWidth, globalTargetWords);
      if (!best || cost < best.cost) best = { lines, cost };
      return;
    }

    const followingLines = remainingLines - 1;
    const minimumWordsForFollowingLines = followingLines * minimumWordsPerLine;
    const maximumWordsForFollowingLines = followingLines * MAXIMUM_WORDS_PER_LINE;
    const minimumEnd = Math.max(
      start + minimumWordsPerLine,
      words.length - maximumWordsForFollowingLines
    );
    const maximumEnd = Math.min(
      start + MAXIMUM_WORDS_PER_LINE,
      words.length - minimumWordsForFollowingLines
    );

    for (let end = minimumEnd; end <= maximumEnd; end += 1) {
      const lineWords = words.slice(start, end);
      const value = lineWords.join(' ');
      const width = measure(value);
      if (width > maxWidth + WIDTH_EPSILON) break;

      current.push({ words: lineWords, width });
      visit(end, followingLines);
      current.pop();
    }
  };

  visit(0, lineCount);
  return best;
};

const calculateBalancedLines = (
  metrics: DescriptionMetrics,
  globalTargetWords: number
): string[][] => {
  const { words, maxWidth, measure } = metrics;
  if (words.length <= 1) return [words];

  const minimumLineCount = Math.max(
    1,
    Math.ceil(words.length / MAXIMUM_WORDS_PER_LINE)
  );
  const maximumLineCount = Math.max(
    minimumLineCount,
    Math.floor(words.length / MINIMUM_WORDS_PER_WRAPPED_LINE)
  );

  for (let lineCount = minimumLineCount; lineCount <= maximumLineCount; lineCount += 1) {
    const layout = findBalancedLayout(
      words,
      lineCount,
      maxWidth,
      globalTargetWords,
      measure
    );

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
    const globalTargetWords = calculateGlobalTargetWords(metrics);
    if (globalTargetWords <= 0) return;

    metrics.forEach((descriptionMetrics) => {
      const lines = calculateBalancedLines(descriptionMetrics, globalTargetWords);
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
