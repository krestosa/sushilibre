import { queryAll } from '../shared/dom';

const DESCRIPTION_SELECTOR = '.menu-item__description';
const NON_BREAKING_SPACE = '\u00A0';
const WIDTH_EPSILON = 0.5;
const PREFERRED_MINIMUM_WORDS = 8;
const MAXIMUM_WORDS_PER_LINE = 10;
const MINIMUM_WORDS_PER_WRAPPED_LINE = 2;
const COHERENCE_LOWER_RATIO = 0.84;
const COHERENCE_UPPER_RATIO = 1.18;
const COHERENCE_WEIGHT = 1.35;

interface BalancedLine {
  words: string[];
  width: number;
}

interface BalancedLayout {
  lines: BalancedLine[];
  cost: number;
  requiredWidth: number;
}

interface DescriptionMetrics {
  element: HTMLElement;
  source: string;
  words: string[];
  maxWidth: number;
  measure: TextMeasure;
}

interface DescriptionPlan {
  metrics: DescriptionMetrics;
  candidates: BalancedLayout[];
  localBest: BalancedLayout;
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

const calculateLocalCost = (lines: BalancedLine[], maxWidth: number): number => {
  const widths = lines.map((line) => line.width);
  const wordCounts = lines.map((line) => line.words.length);
  const meanWidth = widths.reduce((total, width) => total + width, 0) / widths.length;
  const meanWordCount = wordCounts.reduce((total, count) => total + count, 0) / wordCounts.length;
  const normalizeWidth = (value: number): number => value / Math.max(maxWidth, 1);
  const normalizeWords = (value: number): number => value / MAXIMUM_WORDS_PER_LINE;

  const wordBalance = wordCounts.reduce((total, count) => {
    const delta = normalizeWords(count - meanWordCount);
    return total + delta * delta;
  }, 0) / wordCounts.length;

  const widthBalance = widths.reduce((total, width) => {
    const delta = normalizeWidth(width - meanWidth);
    return total + delta * delta;
  }, 0) / widths.length;

  const preferredWordPenalty = wordCounts.reduce((total, count) => {
    if (count >= PREFERRED_MINIMUM_WORDS) {
      const delta = normalizeWords(count - 9);
      return total + delta * delta * 0.2;
    }

    const shortage = normalizeWords(PREFERRED_MINIMUM_WORDS - count);
    return total + shortage * shortage * 2.6;
  }, 0) / wordCounts.length;

  const adjacentWidthDifference = widths.slice(1).reduce((total, width, index) => {
    const previous = widths[index];
    if (previous === undefined) return total;
    const delta = normalizeWidth(previous - width);
    return total + delta * delta;
  }, 0) / Math.max(widths.length - 1, 1);

  const lastWordCount = wordCounts[wordCounts.length - 1] ?? meanWordCount;
  const lastLineShortfall = normalizeWords(Math.max(0, meanWordCount * 0.78 - lastWordCount));
  const twoWordTailPenalty = lastWordCount === 2 && meanWordCount > 3 ? 1.8 : 0;

  return (
    wordBalance * 2.8 +
    widthBalance * 1.35 +
    preferredWordPenalty +
    adjacentWidthDifference * 0.7 +
    lastLineShortfall * lastLineShortfall * 4 +
    twoWordTailPenalty
  );
};

const generateLayoutsForLineCount = (
  words: string[],
  lineCount: number,
  maxWidth: number,
  measure: TextMeasure
): BalancedLayout[] => {
  const layouts: BalancedLayout[] = [];
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

      const width = measure(finalWords.join(' '));
      if (width > maxWidth + WIDTH_EPSILON) return;

      const lines = [...current, { words: finalWords, width }];
      layouts.push({
        lines,
        cost: calculateLocalCost(lines, maxWidth),
        requiredWidth: Math.max(...lines.map((line) => line.width))
      });
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
      const width = measure(lineWords.join(' '));
      if (width > maxWidth + WIDTH_EPSILON) break;

      current.push({ words: lineWords, width });
      visit(end, followingLines);
      current.pop();
    }
  };

  visit(0, lineCount);
  return layouts;
};

const generateIndividualCandidates = (metrics: DescriptionMetrics): BalancedLayout[] => {
  const { words, maxWidth, measure } = metrics;
  if (!words.length) return [];

  const minimumLineCount = Math.max(1, Math.ceil(words.length / MAXIMUM_WORDS_PER_LINE));
  const maximumLineCount = words.length === 1
    ? 1
    : Math.max(minimumLineCount, Math.floor(words.length / MINIMUM_WORDS_PER_WRAPPED_LINE));

  for (let lineCount = minimumLineCount; lineCount <= maximumLineCount; lineCount += 1) {
    const layouts = generateLayoutsForLineCount(words, lineCount, maxWidth, measure);
    if (layouts.length) return layouts;
  }

  return [];
};

const selectLowestCost = (layouts: BalancedLayout[]): BalancedLayout | null => {
  let selected: BalancedLayout | null = null;

  layouts.forEach((layout) => {
    if (!selected || layout.cost < selected.cost) selected = layout;
  });

  return selected;
};

const selectCoherentLayout = (
  plan: DescriptionPlan,
  referenceWidth: number
): BalancedLayout => {
  if (referenceWidth <= 0) return plan.localBest;

  const lowerGuide = referenceWidth * COHERENCE_LOWER_RATIO;
  const upperGuide = referenceWidth * COHERENCE_UPPER_RATIO;
  let selected = plan.localBest;
  let selectedCost = Number.POSITIVE_INFINITY;

  plan.candidates.forEach((candidate) => {
    const normalizedDifference = (candidate.requiredWidth - referenceWidth) / referenceWidth;
    const belowBand = Math.max(0, lowerGuide - candidate.requiredWidth) / referenceWidth;
    const aboveBand = Math.max(0, candidate.requiredWidth - upperGuide) / referenceWidth;
    const coherenceCost =
      normalizedDifference * normalizedDifference * COHERENCE_WEIGHT +
      (belowBand * belowBand + aboveBand * aboveBand) * 3;
    const combinedCost = candidate.cost + coherenceCost;

    if (combinedCost < selectedCost) {
      selected = candidate;
      selectedCost = combinedCost;
    }
  });

  return selected;
};

const calculateIndividualWidth = (
  layout: BalancedLayout,
  referenceWidth: number,
  maxWidth: number
): number => {
  const naturalWidth = layout.requiredWidth + 1;
  if (referenceWidth <= 0 || naturalWidth >= referenceWidth) {
    return Math.min(maxWidth, naturalWidth);
  }

  const relativeWidth = naturalWidth / referenceWidth;
  const pullStrength = relativeWidth < 0.7 ? 0.52 : 0.34;
  const coherentWidth = naturalWidth + (referenceWidth - naturalWidth) * pullStrength;

  return clamp(coherentWidth, naturalWidth, maxWidth);
};

const renderBalancedDescription = (
  metrics: DescriptionMetrics,
  layout: BalancedLayout,
  referenceWidth: number
): void => {
  const fragment = document.createDocumentFragment();

  layout.lines.forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement('br'));
    fragment.append(document.createTextNode(line.words.join(NON_BREAKING_SPACE)));
  });

  metrics.element.replaceChildren(fragment);
  metrics.element.style.width = `${Math.ceil(
    calculateIndividualWidth(layout, referenceWidth, metrics.maxWidth)
  )}px`;
  metrics.element.setAttribute('aria-label', metrics.source);
};

const collectMetrics = (descriptions: HTMLElement[]): DescriptionMetrics[] => {
  descriptions.forEach((element) => element.style.removeProperty('width'));

  return descriptions.flatMap((element) => {
    const source = element.dataset.balanceText?.trim();
    const maxWidth = element.getBoundingClientRect().width;
    if (!source || maxWidth <= 0) return [];

    return [{
      element,
      source,
      words: source.split(/\s+/).filter(Boolean),
      maxWidth,
      measure: createTextMeasure(element)
    }];
  });
};

const createPlans = (metrics: DescriptionMetrics[]): DescriptionPlan[] =>
  metrics.flatMap((descriptionMetrics) => {
    const candidates = generateIndividualCandidates(descriptionMetrics);
    const localBest = selectLowestCost(candidates);
    if (!localBest) return [];

    return [{
      metrics: descriptionMetrics,
      candidates,
      localBest
    }];
  });

export const observeBalancedMenuDescriptions = (root: ParentNode): void => {
  const descriptions = queryAll<HTMLElement>(DESCRIPTION_SELECTOR, root);
  if (!descriptions.length) return;

  let animationFrame = 0;

  const balanceAll = (): void => {
    animationFrame = 0;
    const plans = createPlans(collectMetrics(descriptions));
    if (!plans.length) return;

    const referenceWidth = median(plans.map(({ localBest }) => localBest.requiredWidth));

    plans.forEach((plan) => {
      const layout = selectCoherentLayout(plan, referenceWidth);
      renderBalancedDescription(plan.metrics, layout, referenceWidth);
    });
  };

  const scheduleBalance = (): void => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(balanceAll);
  };

  scheduleBalance();

  const supportsResizeObserver = typeof ResizeObserver !== 'undefined';
  if (supportsResizeObserver) {
    const observedWidths = new WeakMap<Element, number>();
    const observer = new ResizeObserver((entries) => {
      const widthChanged = entries.some((entry) => {
        const width = entry.contentRect.width;
        const previousWidth = observedWidths.get(entry.target);
        observedWidths.set(entry.target, width);
        return previousWidth === undefined || Math.abs(previousWidth - width) >= WIDTH_EPSILON;
      });

      if (widthChanged) scheduleBalance();
    });

    if (root instanceof Element) {
      observer.observe(root);
    } else {
      const parents = new Set<Element>();
      descriptions.forEach((description) => {
        if (description.parentElement) parents.add(description.parentElement);
      });
      parents.forEach((parent) => observer.observe(parent));
    }
  } else {
    window.addEventListener('resize', scheduleBalance, { passive: true });
  }

  void document.fonts.ready.then(scheduleBalance);
};
