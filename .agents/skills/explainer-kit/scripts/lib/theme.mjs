import { readFile } from 'node:fs/promises';

import { canonicalHash, validateContract } from './contracts.mjs';

const PALETTE_NAMES = new Set([
  'neutral',
  'ocean',
  'ember',
  'forest',
  'violet',
]);
const PROFILE_NAMES = new Set(['clean', 'editorial', 'technical']);
const STYLE_NAMES = new Set([
  'clean-neutral',
  'business-corporate',
  'navy-ocean',
  'dark-edgy',
]);
const RENDER_STRATEGIES = new Set(['default-only', 'user-switchable']);
const DEFAULT_MODES = new Set(['light', 'dark']);
const MODE_ROLES = ['surface', 'ink', 'accent', 'status', 'diagramSeries'];

export async function resolveTheme(selection = {}) {
  assertSelection(selection);

  const renderStrategy = selection.renderStrategy ?? 'default-only';
  const warnings = [];
  let theme;
  const hasLegacySelection = ['palette', 'visualProfile'].some(
    (key) => selection[key] !== undefined,
  );
  if (hasLegacySelection) {
    warnings.push(
      'Palette and visual profile selection is deprecated; use a curated style.',
    );
  }

  if (selection.suppliedBundlePath !== undefined) {
    theme = await resolveSuppliedBundle(selection.suppliedBundlePath);
    if (
      ['style', 'palette', 'visualProfile', 'artDirection', 'defaultMode'].some(
        (key) => selection[key] !== undefined,
      )
    ) {
      warnings.push(
        'Supplied bundle wins over style, palette, visual profile, art direction, and default mode selections.',
      );
    }
  } else {
    theme = await resolveNamedTheme(selection, warnings);
  }

  assertResolvedTheme(theme);
  return {
    theme,
    renderStrategy,
    presentationModes:
      renderStrategy === 'user-switchable'
        ? [theme.defaultMode, oppositeMode(theme.defaultMode)]
        : [theme.defaultMode],
    warnings,
  };
}

async function resolveNamedTheme(selection, warnings) {
  if (
    selection.style !== undefined ||
    (selection.palette === undefined && selection.visualProfile === undefined)
  ) {
    const styleName = selection.style ?? 'clean-neutral';
    assertNamedSelection(styleName, STYLE_NAMES, 'style');
    if (selection.style === undefined) {
      warnings.push(
        'No explicit style was selected; defaulted to clean-neutral.',
      );
    }
    if (
      selection.style !== undefined &&
      (selection.palette !== undefined || selection.visualProfile !== undefined)
    ) {
      warnings.push(
        'Curated style wins over deprecated palette and visual profile selections.',
      );
    }
    const style = await loadBundledJson('styles', styleName);
    assertStyle(style, styleName);
    const theme = {
      schemaVersion: 'explainer-kit.theme/v1',
      name: style.name,
      defaultMode: selection.defaultMode ?? style.defaultMode,
      modes: structuredClone(style.modes),
      provenance: { style: styleName, derived: false },
      typography: structuredClone(style.typography),
      spacing: structuredClone(style.spacing),
      geometry: structuredClone(style.geometry),
      elevation: structuredClone(style.elevation),
      density: style.density,
      motion: structuredClone(style.motion),
      diagrams: structuredClone(style.diagrams),
    };
    if (selection.artDirection !== undefined) {
      applyArtDirection(theme, selection.artDirection);
    }
    theme.bundleHash = canonicalHash(theme);
    return theme;
  }

  const paletteName = selection.palette ?? 'neutral';
  const profileName = selection.visualProfile ?? 'clean';
  assertNamedSelection(paletteName, PALETTE_NAMES, 'palette');
  assertNamedSelection(profileName, PROFILE_NAMES, 'visual profile');

  const [palette, profile] = await Promise.all([
    loadBundledJson('palettes', paletteName),
    loadBundledJson('profiles', profileName),
  ]);
  assertPalette(palette, paletteName);
  assertProfile(profile, profileName);

  const theme = {
    schemaVersion: 'explainer-kit.theme/v1',
    name: `${paletteName}-${profileName}`,
    defaultMode: selection.defaultMode ?? 'light',
    modes: structuredClone(palette.modes),
    provenance: {
      palette: paletteName,
      visualProfile: profileName,
      derived: false,
    },
    typography: structuredClone(profile.typography),
    spacing: structuredClone(profile.spacing),
    geometry: structuredClone(profile.geometry),
    elevation: structuredClone(profile.elevation),
    density: profile.density,
    motion: structuredClone(profile.motion),
    diagrams: structuredClone(profile.diagrams),
  };

  if (selection.artDirection !== undefined) {
    applyArtDirection(theme, selection.artDirection);
  }
  theme.bundleHash = canonicalHash(theme);
  return theme;
}

async function resolveSuppliedBundle(suppliedBundlePath) {
  if (
    typeof suppliedBundlePath !== 'string' ||
    suppliedBundlePath.length === 0
  ) {
    throw new TypeError('Supplied bundle path must be a non-empty string.');
  }

  let source;
  try {
    source = JSON.parse(await readFile(suppliedBundlePath, 'utf8'));
  } catch (error) {
    throw new Error('Unable to read the supplied theme bundle.', {
      cause: error,
    });
  }

  assertResolvedTheme(source);
  const theme = structuredClone(source);
  theme.provenance.suppliedBundleHash = canonicalHash(source);
  theme.bundleHash = canonicalHash(withoutBundleHash(theme));
  return theme;
}

function applyArtDirection(theme, instruction) {
  if (typeof instruction !== 'string' || instruction.trim().length === 0) {
    throw new TypeError('Art direction must be a non-empty string.');
  }

  const instructionHash = canonicalHash(instruction.normalize('NFKC').trim());
  const variant = Number.parseInt(instructionHash.slice(-2), 16) % 3;
  const spacingFactor = [0.9, 1.05, 1.15][variant];
  const radiusFactor = [0.8, 1.1, 1.25][variant];

  theme.name = `${theme.name}-derived`;
  theme.provenance.derived = true;
  theme.provenance.instructionHash = instructionHash;
  theme.spacing.unit = round(theme.spacing.unit * spacingFactor);
  theme.spacing.scale = mapNumbers(theme.spacing.scale, spacingFactor);
  theme.geometry.radius = mapNumbers(theme.geometry.radius, radiusFactor);
  theme.diagrams.nodeGap = round(theme.diagrams.nodeGap * spacingFactor);
}

function assertSelection(selection) {
  if (!isObject(selection)) {
    throw new TypeError('Theme selection must be an object.');
  }
  const allowed = new Set([
    'style',
    'palette',
    'visualProfile',
    'suppliedBundlePath',
    'artDirection',
    'defaultMode',
    'renderStrategy',
  ]);
  const unknown = Object.keys(selection).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown theme selection field: ${unknown[0]}.`);
  }
  if (
    selection.renderStrategy !== undefined &&
    !RENDER_STRATEGIES.has(selection.renderStrategy)
  ) {
    throw new Error('Unsupported theme render strategy.');
  }
  if (
    selection.defaultMode !== undefined &&
    !DEFAULT_MODES.has(selection.defaultMode)
  ) {
    throw new Error('Unsupported theme default mode.');
  }
}

function assertStyle(style, expectedName) {
  const expectedKeys = [
    'name',
    'defaultMode',
    'modes',
    'typography',
    'spacing',
    'geometry',
    'elevation',
    'density',
    'motion',
    'diagrams',
  ];
  if (
    !isObject(style) ||
    style.name !== expectedName ||
    !hasExactKeys(style, expectedKeys) ||
    !DEFAULT_MODES.has(style.defaultMode) ||
    !isObject(style.modes) ||
    !hasExactKeys(style.modes, ['light', 'dark'])
  ) {
    throw new Error(`Bundled style ${expectedName} has an invalid shape.`);
  }
  for (const mode of Object.values(style.modes)) {
    assertMode(mode);
  }
  assertProfile(
    {
      name: expectedName,
      typography: style.typography,
      spacing: style.spacing,
      geometry: style.geometry,
      elevation: style.elevation,
      density: style.density,
      motion: style.motion,
      diagrams: style.diagrams,
    },
    expectedName,
  );
}

function assertNamedSelection(value, allowed, label) {
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new Error(`Unknown ${label}: ${String(value)}.`);
  }
}

async function loadBundledJson(directory, name) {
  return JSON.parse(
    await readFile(
      new URL(`../../${directory}/${name}.json`, import.meta.url),
      'utf8',
    ),
  );
}

function assertPalette(palette, expectedName) {
  if (
    !isObject(palette) ||
    palette.name !== expectedName ||
    !hasExactKeys(palette, ['name', 'modes']) ||
    !isObject(palette.modes) ||
    !hasExactKeys(palette.modes, ['light', 'dark'])
  ) {
    throw new Error(`Bundled palette ${expectedName} has an invalid shape.`);
  }
  for (const mode of Object.values(palette.modes)) {
    assertMode(mode);
  }
}

function assertMode(mode) {
  if (!isObject(mode) || !hasExactKeys(mode, MODE_ROLES)) {
    throw new Error('Theme mode must contain the closed semantic color roles.');
  }
  assertExactColorObject(mode.surface, ['canvas', 'panel', 'elevated']);
  assertExactColorObject(mode.ink, ['primary', 'muted', 'inverse']);
  assertExactColorObject(mode.accent, ['primary', 'secondary']);
  assertExactColorObject(mode.status, ['success', 'warning', 'danger', 'info']);
  if (
    !Array.isArray(mode.diagramSeries) ||
    mode.diagramSeries.length === 0 ||
    mode.diagramSeries.some((color) => !isNormalizedColor(color)) ||
    new Set(mode.diagramSeries).size !== mode.diagramSeries.length
  ) {
    throw new Error(
      'Theme diagram series must contain unique normalized colors.',
    );
  }
  assertAaPairs(mode);
}

function assertProfile(profile, expectedName) {
  const expectedKeys = [
    'name',
    'typography',
    'spacing',
    'geometry',
    'elevation',
    'density',
    'motion',
    'diagrams',
  ];
  if (
    !isObject(profile) ||
    profile.name !== expectedName ||
    !hasExactKeys(profile, expectedKeys)
  ) {
    throw new Error(
      `Bundled visual profile ${expectedName} has an invalid shape.`,
    );
  }
}

function assertResolvedTheme(theme) {
  const result = validateContract('theme', theme);
  if (!result.valid) {
    throw new Error(
      `Invalid resolved theme: ${result.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join('; ')}`,
    );
  }
  if (theme.bundleHash !== canonicalHash(withoutBundleHash(theme))) {
    throw new Error(
      'Resolved theme bundleHash does not match canonical content.',
    );
  }
  for (const mode of Object.values(theme.modes)) {
    assertMode(mode);
  }
}

function assertExactColorObject(value, keys) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, keys) ||
    Object.values(value).some((color) => !isNormalizedColor(color))
  ) {
    throw new Error('Theme color role is incomplete or invalid.');
  }
}

function assertAaPairs(mode) {
  for (const surface of Object.values(mode.surface)) {
    assertContrast(mode.ink.primary, surface);
    assertContrast(mode.ink.muted, surface);
  }
  for (const background of [
    ...Object.values(mode.accent),
    ...Object.values(mode.status),
  ]) {
    assertContrast(mode.ink.inverse, background);
  }
}

function assertContrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  if ((lighter + 0.05) / (darker + 0.05) < 4.5) {
    throw new Error(
      'Theme text/background pair does not meet WCAG AA contrast.',
    );
  }
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

function withoutBundleHash(theme) {
  const identity = structuredClone(theme);
  delete identity.bundleHash;
  return identity;
}

function mapNumbers(values, factor) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, round(value * factor)]),
  );
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function oppositeMode(mode) {
  return mode === 'light' ? 'dark' : 'light';
}

function hasExactKeys(value, keys) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isNormalizedColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
