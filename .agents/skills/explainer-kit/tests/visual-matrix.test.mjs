import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

test('every bundled style resolves to valid light and dark CSS', async () => {
  const styles = await jsonNames(new URL('../styles/', import.meta.url));
  assert.deepEqual(styles, [
    'business-corporate',
    'clean-neutral',
    'dark-edgy',
    'navy-ocean',
  ]);

  const hashes = new Set();
  for (const style of styles) {
    const { theme } = await resolveTheme({ style });
    hashes.add(theme.bundleHash);
    assert.equal(validateContract('theme', theme).valid, true, style);
    for (const mode of ['light', 'dark']) {
      const css = themeCss(theme, mode);
      assert.match(css, /--surface-canvas:#[0-9a-f]{6}/i);
      assert.match(css, /--ink-primary:#[0-9a-f]{6}/i);
      assert.match(css, /--accent-primary:#[0-9a-f]{6}/i);
    }
  }
  assert.equal(hashes.size, styles.length);
});

test('every bundled palette and profile combination resolves to theme CSS', async () => {
  const [palettes, profiles] = await Promise.all([
    jsonNames(new URL('../palettes/', import.meta.url)),
    jsonNames(new URL('../profiles/', import.meta.url)),
  ]);

  for (const palette of palettes) {
    for (const visualProfile of profiles) {
      const { theme } = await resolveTheme({ palette, visualProfile });
      assert.equal(validateContract('theme', theme).valid, true);
      assert.match(themeCss(theme, theme.defaultMode), /:root\{/);
    }
  }
});

function themeCss(theme, mode) {
  const colors = theme.modes[mode];
  return [
    ':root{',
    `--surface-canvas:${colors.surface.canvas};`,
    `--surface-panel:${colors.surface.panel};`,
    `--ink-primary:${colors.ink.primary};`,
    `--ink-muted:${colors.ink.muted};`,
    `--accent-primary:${colors.accent.primary};`,
    '}',
  ].join('');
}

async function jsonNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}
