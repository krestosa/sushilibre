import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';

const EXPECTED_STYLE_HASH = '5b08d0f9d38e866223ac61e1d001bcb1c8551ad08bac5072302d1930d7e09d85';
const EXPECTED_DECLARATION_COUNT = 670;

const normalize = (value) => value.trim().replace(/\s+/g, ' ');

const skipWhitespace = (source, start) => {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
};

const findBlockEnd = (source, openIndex) => {
  let depth = 1;
  let quote = '';
  let escaped = false;

  for (let index = openIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error('Unclosed CSS block');
};

const splitDeclarations = (body) => {
  const segments = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let parenthesisDepth = 0;

  for (let index = 0; index <= body.length; index += 1) {
    const character = body[index] ?? ';';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') parenthesisDepth += 1;
    if (character === ')') parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    if (character === ';' && parenthesisDepth === 0) {
      segments.push(body.slice(start, index));
      start = index + 1;
    }
  }

  return segments;
};

const findDeclarationColon = (segment) => {
  let quote = '';
  let escaped = false;
  let parenthesisDepth = 0;

  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') parenthesisDepth += 1;
    if (character === ')') parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    if (character === ':' && parenthesisDepth === 0) return index;
  }

  return -1;
};

const parseDeclarations = (body, context, selector, output) => {
  for (const rawSegment of splitDeclarations(body)) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    const colon = findDeclarationColon(segment);
    if (colon < 1) continue;

    const property = segment.slice(0, colon).trim();
    let value = normalize(segment.slice(colon + 1));
    const important = /\s*!important$/i.test(value);
    if (important) value = value.replace(/\s*!important$/i, '').trim();

    output.push([context, selector, property, value, important]);
  }
};

const parseRules = (source, context = [], output = []) => {
  let index = 0;

  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (index >= source.length) break;

    let quote = '';
    let escaped = false;
    let openIndex = -1;

    for (let cursor = index; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === '{') {
        openIndex = cursor;
        break;
      }
      if (character === ';') {
        index = cursor + 1;
        openIndex = -2;
        break;
      }
    }

    if (openIndex === -2) continue;
    if (openIndex < 0) break;

    const prelude = normalize(source.slice(index, openIndex));
    const closeIndex = findBlockEnd(source, openIndex);
    const body = source.slice(openIndex + 1, closeIndex);

    if (prelude.startsWith('@')) {
      const match = /^@([^\s]+)\s*(.*)$/.exec(prelude);
      if (match) {
        parseRules(body, [...context, [match[1].toLowerCase(), normalize(match[2])]], output);
      }
    } else {
      parseDeclarations(body, context, prelude, output);
    }

    index = closeIndex + 1;
  }

  return output;
};

test('compiled Sass preserves the complete declaration contract', async () => {
  const css = (await readFile(new URL('../dist/app.css', import.meta.url), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = parseRules(css);
  declarations.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  const hash = createHash('sha256')
    .update(JSON.stringify(declarations))
    .digest('hex');

  const diagnosticsDirectory = new URL('../build-diagnostics/', import.meta.url);
  await mkdir(diagnosticsDirectory, { recursive: true });
  await writeFile(
    new URL('style-contract.json', diagnosticsDirectory),
    `${JSON.stringify({ declarationCount: declarations.length, hash }, null, 2)}\n`
  );

  assert.equal(declarations.length, EXPECTED_DECLARATION_COUNT);
  assert.equal(hash, EXPECTED_STYLE_HASH);
});
