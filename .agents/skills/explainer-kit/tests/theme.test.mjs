import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { canonicalHash, validateContract } from '../scripts/lib/contracts.mjs';
import { initializeRun } from '../scripts/lib/records.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

const PALETTES = ['neutral', 'ocean', 'ember', 'forest', 'violet'];
const PROFILES = ['clean', 'editorial', 'technical'];
const STYLES = [
  'clean-neutral',
  'business-corporate',
  'navy-ocean',
  'dark-edgy',
];
const COLOR_ROLES = ['surface', 'ink', 'accent', 'status', 'diagramSeries'];
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

test('uses clean-neutral by default with a visible warning', async () => {
  const resolved = await resolveTheme();

  assert.equal(resolved.theme.name, 'clean-neutral');
  assert.equal(resolved.theme.defaultMode, 'light');
  assert.deepEqual(resolved.theme.provenance, {
    style: 'clean-neutral',
    derived: false,
  });
  assert.equal(resolved.renderStrategy, 'default-only');
  assert.deepEqual(resolved.presentationModes, ['light']);
  assert.ok(
    resolved.warnings.some((warning) =>
      /default.*clean-neutral/i.test(warning),
    ),
  );
  assert.equal(validateContract('theme', resolved.theme).valid, true);
});

test('ships four distinct whole-system styles', async () => {
  const themes = await Promise.all(
    STYLES.map(async (style) => (await resolveTheme({ style })).theme),
  );

  assert.deepEqual(
    themes.map(({ name }) => name),
    STYLES,
  );
  assert.equal(new Set(themes.map(({ bundleHash }) => bundleHash)).size, 4);
  assert.deepEqual(
    themes.map(({ provenance }) => provenance.style),
    STYLES,
  );
  assert.equal(
    themes.find(({ name }) => name === 'dark-edgy').modes.dark.surface.canvas,
    '#0d1117',
  );
  assert.doesNotMatch(
    JSON.stringify(themes.find(({ name }) => name === 'dark-edgy')),
    /dot texture|radial-gradient/i,
  );
  await assert.rejects(resolveTheme({ style: 'vintage' }), /style/i);
});

test('keeps the curated palette and profile matrix as a deprecated compatibility path', async () => {
  for (const palette of PALETTES) {
    for (const visualProfile of PROFILES) {
      const { theme, warnings } = await resolveTheme({
        palette,
        visualProfile,
      });
      assert.equal(theme.name, `${palette}-${visualProfile}`);
      assert.equal(theme.provenance.palette, palette);
      assert.equal(theme.provenance.visualProfile, visualProfile);
      assert.ok(warnings.some((warning) => /deprecated/i.test(warning)));
    }
  }

  await assert.rejects(resolveTheme({ palette: 'corporate' }), /palette/i);
  await assert.rejects(
    resolveTheme({ visualProfile: 'cinematic' }),
    /profile/i,
  );
});

test('supplied bundles win over style, and style wins over legacy matrix fields', async () => {
  const styled = await resolveTheme({
    style: 'navy-ocean',
    palette: 'ember',
    visualProfile: 'technical',
  });
  assert.equal(styled.theme.name, 'navy-ocean');
  assert.ok(styled.warnings.some((warning) => /style wins/i.test(warning)));
  assert.ok(styled.warnings.some((warning) => /deprecated/i.test(warning)));

  const directory = await mkdtemp(join(tmpdir(), 'explainer-style-'));
  tempDirs.push(directory);
  const suppliedPath = join(directory, 'supplied.json');
  const supplied = (await resolveTheme({ style: 'business-corporate' })).theme;
  await writeFile(suppliedPath, JSON.stringify(supplied), 'utf8');
  const resolved = await resolveTheme({
    suppliedBundlePath: suppliedPath,
    style: 'dark-edgy',
  });

  assert.equal(resolved.theme.name, 'business-corporate');
  assert.ok(
    resolved.warnings.some((warning) => /supplied bundle wins/i.test(warning)),
  );
});

test('all palettes contain closed complete modes and required AA pairs', async () => {
  for (const palette of PALETTES) {
    const { theme } = await resolveTheme({ palette });
    assert.deepEqual(Object.keys(theme.modes).sort(), ['dark', 'light']);

    for (const mode of Object.values(theme.modes)) {
      assert.deepEqual(Object.keys(mode), COLOR_ROLES);
      for (const surface of Object.values(mode.surface)) {
        assert.ok(contrast(mode.ink.primary, surface) >= 4.5);
        assert.ok(contrast(mode.ink.muted, surface) >= 4.5);
      }
      for (const background of [
        ...Object.values(mode.accent),
        ...Object.values(mode.status),
      ]) {
        assert.ok(contrast(mode.ink.inverse, background) >= 4.5);
      }
    }
  }
});

test('canonical bundle hashes exclude themselves and presentation strategy', async () => {
  const defaultOnly = await resolveTheme({
    palette: 'ocean',
    visualProfile: 'technical',
    renderStrategy: 'default-only',
  });
  const switchable = await resolveTheme({
    palette: 'ocean',
    visualProfile: 'technical',
    renderStrategy: 'user-switchable',
  });
  const { bundleHash, ...identity } = defaultOnly.theme;

  assert.equal(bundleHash, canonicalHash(identity));
  assert.deepEqual(switchable.theme, defaultOnly.theme);
  assert.equal(switchable.renderStrategy, 'user-switchable');
  assert.deepEqual(switchable.presentationModes, ['light', 'dark']);
  assert.equal('renderStrategy' in switchable.theme, false);
  assert.equal('renderStrategy' in switchable.theme.provenance, false);
});

test('default mode controls default-only presentation without removing either mode', async () => {
  const resolved = await resolveTheme({
    defaultMode: 'dark',
    renderStrategy: 'default-only',
  });

  assert.equal(resolved.theme.defaultMode, 'dark');
  assert.deepEqual(Object.keys(resolved.theme.modes).sort(), ['dark', 'light']);
  assert.deepEqual(resolved.presentationModes, ['dark']);
});

test('art direction is hashed, redacted, deterministic, and changes the bundle', async () => {
  const artDirection = 'Use broad geometry and measured motion for the launch.';
  const first = await resolveTheme({ artDirection });
  const second = await resolveTheme({ artDirection });
  const plain = await resolveTheme();

  assert.equal(first.theme.provenance.derived, true);
  assert.equal(
    first.theme.provenance.instructionHash,
    canonicalHash(artDirection),
  );
  assert.deepEqual(first.theme, second.theme);
  assert.notEqual(first.theme.bundleHash, plain.theme.bundleHash);
  assert.equal(JSON.stringify(first).includes(artDirection), false);
});

test('a supplied bundle wins over named and art-direction inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'explainer-theme-'));
  tempDirs.push(directory);
  const suppliedPath = join(directory, 'supplied.json');
  const source = (await resolveTheme({ palette: 'forest' })).theme;
  await writeFile(suppliedPath, JSON.stringify(source), 'utf8');

  const resolved = await resolveTheme({
    suppliedBundlePath: suppliedPath,
    palette: 'ember',
    visualProfile: 'editorial',
    artDirection: 'This text must not survive.',
    defaultMode: 'dark',
  });
  const suppliedHash = canonicalHash(source);

  assert.equal(resolved.theme.name, source.name);
  assert.equal(resolved.theme.defaultMode, source.defaultMode);
  assert.equal(resolved.theme.provenance.suppliedBundleHash, suppliedHash);
  assert.equal(
    resolved.theme.bundleHash,
    canonicalHash(withoutBundleHash(resolved.theme)),
  );
  assert.equal(
    JSON.stringify(resolved).includes('This text must not survive.'),
    false,
  );
  assert.ok(
    resolved.warnings.some((warning) => /supplied bundle wins/i.test(warning)),
  );
  assert.equal(validateContract('theme', resolved.theme).valid, true);
});

test('normalized requests and build records persist render strategy separately', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'explainer-theme-record-'));
  tempDirs.push(outputRoot);
  const request = {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: 'project-explainer', version: '1' },
    slug: 'theme-demo',
    outputRoot,
    factBase: {
      mode: 'supplied',
      path: 'facts.json',
      freshnessPolicy: 'live-wins',
    },
    theme: {
      palette: 'violet',
      renderStrategy: 'user-switchable',
    },
    mode: 'interactive',
  };

  const run = await initializeRun(request);
  const persistedRequest = JSON.parse(await readFile(run.requestPath, 'utf8'));
  const buildRecord = JSON.parse(await readFile(run.buildRecordPath, 'utf8'));
  const resolved = await resolveTheme(run.request.theme);

  assert.equal(persistedRequest.theme.renderStrategy, 'user-switchable');
  assert.equal(buildRecord.renderStrategy, 'user-switchable');
  assert.equal(resolved.renderStrategy, 'user-switchable');
  assert.equal('renderStrategy' in resolved.theme, false);
});

function withoutBundleHash(theme) {
  const copy = structuredClone(theme);
  delete copy.bundleHash;
  return copy;
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
