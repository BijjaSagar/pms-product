#!/usr/bin/env node
/**
 * Palette guard.
 *
 * The product uses a controlled palette:
 *   - one active theme accent (primary / dark-accent / soft), and
 *   - five fixed semantic status tones (success, info, warning, danger, neutral).
 *
 * This script fails when source files use raw colours or Tailwind's stock
 * palette utilities directly. Legitimate brand colours (OTA logos, preset
 * definitions, design tokens) are allowlisted below, or may be marked inline
 * on the line above with `palette-allow`.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

const FILE_ALLOWLIST = new Set([
  'src/theme/tokens.css',
  'src/theme/presets.ts',
  'src/features/distribution/channel-manager/data.ts',
  'src/features/distribution/rate-management/data.ts',
  'src/features/distribution/channel-manager/ChannelLogo.tsx',
]);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RGB = /\brgba?\([^)]*\)/g;
const DARK = /\bdark:[^\s"'`]+/g;
const PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|shadow|fill|stroke|divide|placeholder|decoration|outline|accent|caret)-(?:slate|gray|zinc|neutral|stone|emerald|green|teal|lime|amber|orange|yellow|rose|red|pink|blue|sky|cyan|indigo|violet|purple|fuchsia)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const problems = [];
for (const file of walk(srcRoot)) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (FILE_ALLOWLIST.has(rel)) continue;

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const previous = index > 0 ? lines[index - 1] : '';
    if (line.includes('palette-allow') || previous.includes('palette-allow')) return;

    const report = (kind, value) =>
      problems.push(`${rel}:${index + 1}  ${kind}  ${value.trim()}`);

    for (const match of line.matchAll(HEX)) report('raw hex', match[0]);
    for (const match of line.matchAll(RGB)) report('raw rgb', match[0]);
    for (const match of line.matchAll(DARK)) report('dark variant', match[0]);
    for (const match of line.matchAll(PALETTE)) report('stock palette', match[0]);
  });
}

if (problems.length > 0) {
  console.error(`Palette check failed with ${problems.length} violation(s):\n`);
  for (const problem of problems) console.error('  ' + problem);
  console.error(
    '\nUse theme tokens or the semantic status tones. Brand colours may be kept ' +
      'with an inline `palette-allow` comment on the line above.',
  );
  process.exit(1);
}

console.log('Palette check passed: no uncontrolled colours found.');
