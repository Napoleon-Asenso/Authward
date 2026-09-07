#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_INPUT = path.join(__dirname, 'matisse-tokens-all.json');
const DEFAULT_OUTPUT = path.join(__dirname, 'matisse-tokens.css');

const LIGHT_SELECTOR = ':root';
const DARK_SELECTOR = 'html[data-theme="dark"]';
const DARK_SCHEME_KEY = 'dark';
const LIGHT_SCHEME_KEY = 'light';

const CATEGORY_LABELS = {
  typography: 'Typography',
  spacing: 'Spacing',
  borderRadius: 'Border Radius',
  shadows: 'Shadows',
  elevation: 'Elevation',
  color: 'Color',
};

const usage = () => [
  'Usage: node matisse-tokens-to-css.js [options] [input.json]',
  '',
  'Converts a flat nested design-token JSON file into CSS custom properties.',
  '',
  'Options:',
  '  -i, --input <file>   JSON file to convert (default: matisse-tokens-all.json)',
  '  -o, --output <file>  CSS output file (default: matisse-tokens.css)',
  '      --media          Also emit a @media (prefers-color-scheme: dark) block',
  '      --stdout         Print the generated CSS to stdout instead of a file',
  '  -h, --help           Show this help',
].join('\n');

function parseArgs(argv) {
  const opts = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, media: false, stdout: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-i':
      case '--input':
        if (argv[i + 1] === undefined) fail(`Option ${arg} requires a value.`);
        opts.input = argv[(i += 1)];
        break;
      case '-o':
      case '--output':
        if (argv[i + 1] === undefined) fail(`Option ${arg} requires a value.`);
        opts.output = argv[(i += 1)];
        break;
      case '--media':
        opts.media = true;
        break;
      case '--stdout':
        opts.stdout = true;
        break;
      default:
        if (arg.startsWith('-')) {
          fail(`Unknown option: ${arg}\n\n${usage()}`);
        }
        opts.input = arg;
    }
  }

  return opts;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Token collection
 * ------------------------------------------------------------------ */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenTokens(node, pathParts = [], leaves = []) {
  for (const [key, value] of Object.entries(node)) {
    const next = [...pathParts, key];
    if (isPlainObject(value)) {
      flattenTokens(value, next, leaves);
    } else {
      leaves.push({ path: next, name: key, value });
    }
  }
  return leaves;
}

/* CSS custom-property names are <dashed-ident>: only letters, digits,
 * hyphens, underscores and non-ASCII are safe in an unescaped name.
 * Dots (e.g. `spacing-0.5`) are replaced so the name stays valid. */
function toCssVarName(raw) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatValue(name, value) {
  let str = String(value);
  if (name.includes('font-family') && /\s/.test(str) && !/^['"]/.test(str)) {
    str = `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

function humanize(s) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || humanize(category);
}

function normalizeLeaf(leaf) {
  return {
    path: leaf.path.join('.'),
    name: toCssVarName(leaf.name),
    value: formatValue(leaf.name, leaf.value),
  };
}

/* Splits the token tree into `:root` groups (light scheme + every non-color
 * category) and dark-scheme groups. Returns { rootGroups, darkGroups } where
 * each value is `{ [sectionLabel]: [normalizedLeaf, ...] }`. */
function collectGroups(tokens) {
  const rootGroups = {};
  const darkGroups = {};

  function push(target, label, leaves) {
    const normalized = leaves.map(normalizeLeaf);
    target[label] = (target[label] || []).concat(normalized);
  }

  for (const [category, value] of Object.entries(tokens)) {
    if (category === 'color' && isPlainObject(value)) {
      for (const [scheme, palette] of Object.entries(value)) {
        const label = `${categoryLabel('color')} ${humanize(scheme)}`;
        const leaves = isPlainObject(palette) ? flattenTokens(palette) : [{ path: ['color', scheme], name: scheme, value: palette }];
        if (scheme === DARK_SCHEME_KEY) {
          push(darkGroups, label, leaves);
        } else {
          push(rootGroups, label, leaves);
        }
      }
      continue;
    }

    if (isPlainObject(value)) {
      push(rootGroups, categoryLabel(category), flattenTokens(value));
    } else {
      push(rootGroups, 'Root', [{ path: [category], name: category, value }]);
    }
  }

  return { rootGroups, darkGroups };
}

/* ------------------------------------------------------------------ *
 * CSS rendering
 * ------------------------------------------------------------------ */

function assertUnique(groupMap, blockLabel) {
  const seen = new Map();
  for (const leaves of Object.values(groupMap)) {
    for (const leaf of leaves) {
      if (seen.has(leaf.name)) {
        fail(
          `Token name collision in ${blockLabel}: "${leaf.name}" is defined by both ` +
            `"${seen.get(leaf.name)}" and "${leaf.path}". Namespace one of them ` +
            '(e.g. rename the leaf key) and re-run.'
        );
      }
      seen.set(leaf.name, leaf.path);
    }
  }
}

function buildBlock(groupMap, selector, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [`${pad}${selector} {`];

  for (const [label, leaves] of Object.entries(groupMap)) {
    lines.push(`${pad}  /* ${label} */`);
    for (const leaf of leaves) {
      lines.push(`${pad}  --${leaf.name}: ${leaf.value};`);
    }
  }

  lines.push(`${pad}}`);
  return lines.join('\n');
}

function headerComment(inputFile) {
  return [
    '/* ============================================================',
    ' * GENERATED FILE — DO NOT EDIT BY HAND.',
    ` * Source: ${path.basename(inputFile)}`,
    ' * Run:    node matisse-tokens-to-css.js',
    ' * ============================================================',
    ' */',
  ].join('\n');
}

function validate(css, expectedDeclarations) {
  const count = (css.match(/^\s*--[a-z0-9-]+:\s*.+;\s*$/gm) || []).length;

  if (count !== expectedDeclarations) {
    fail(`Validation failed: expected ${expectedDeclarations} declarations, generated ${count}.`);
  }

  const declarationLine = /^\s*--[a-z0-9-]+:\s*.+;\s*$/;
  const malformed = css
    .split('\n')
    .filter((line) => /^\s*--/.test(line) && !declarationLine.test(line));
  if (malformed.length) {
    fail(`Malformed declaration(s) generated:\n${malformed.map((l) => `  ${l}`).join('\n')}`);
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(usage());
    return;
  }

  let raw;
  try {
    raw = fs.readFileSync(opts.input, 'utf8');
  } catch (err) {
    fail(`Cannot read input file "${opts.input}": ${err.message}`);
  }

  let tokens;
  try {
    tokens = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (err) {
    fail(`Invalid JSON in "${opts.input}": ${err.message}`);
  }

  const { rootGroups, darkGroups } = collectGroups(tokens);

  assertUnique(rootGroups, ':root');
  assertUnique(darkGroups, DARK_SELECTOR);

  const rootCount = Object.values(rootGroups).reduce((n, g) => n + g.length, 0);
  const darkCount = Object.values(darkGroups).reduce((n, g) => n + g.length, 0);

  if (rootCount + darkCount === 0) {
    fail('No tokens found in input.');
  }

  const sections = [headerComment(opts.input), buildBlock(rootGroups, LIGHT_SELECTOR)];

  if (darkCount > 0) {
    sections.push(buildBlock(darkGroups, DARK_SELECTOR));
    if (opts.media) {
      sections.push('@media (prefers-color-scheme: dark) {\n' + buildBlock(darkGroups, LIGHT_SELECTOR, 1) + '\n}');
    }
  }

  const css = `${sections.join('\n\n')}\n`;
  validate(css, rootCount + (opts.media && darkCount > 0 ? darkCount * 2 : darkCount));

  if (opts.stdout) {
    process.stdout.write(css);
    return;
  }

  fs.mkdirSync(path.dirname(opts.output), { recursive: true });
  fs.writeFileSync(opts.output, css, 'utf8');

  console.log(`OK: generated ${rootCount + darkCount} CSS variables -> ${opts.output}`);
  for (const [label, group] of Object.entries(rootGroups)) {
    console.log(`  :root            ${label.padEnd(16)} ${String(group.length).padStart(3)}`);
  }
  if (darkCount > 0) {
    for (const [label, group] of Object.entries(darkGroups)) {
      console.log(`  ${DARK_SELECTOR}   ${label.padEnd(16)} ${String(group.length).padStart(3)}`);
    }
  }
}

main();