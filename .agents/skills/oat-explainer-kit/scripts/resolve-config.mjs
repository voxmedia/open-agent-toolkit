import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { resolveSourceAwarePath } from './resolve-paths.mjs';

const execFileAsync = promisify(execFile);

export const EXPLAINER_CONFIG_KEYS = Object.freeze([
  'explainers.defaults.style',
  'explainers.defaults.palette',
  'explainers.defaults.visualProfile',
  'explainers.defaults.themeBundlePath',
  'explainers.publish.provider',
  'explainers.publish.s3Uri',
  'explainers.publish.publicBaseUrl',
  'explainers.publish.awsRegion',
  'explainers.publish.awsProfile',
  'workflow.explainers.projectExplainer',
  'workflow.explainers.projectRecap',
]);

const CONFIG_KEY_SET = new Set(EXPLAINER_CONFIG_KEYS);
const SOURCES = new Set(['local', 'shared', 'user', 'env', 'default']);
const PREFERENCES = new Set(['always', 'ask', 'never']);
const STYLES = new Set([
  'clean-neutral',
  'business-corporate',
  'navy-ocean',
  'dark-edgy',
]);

export async function resolveExplainerConfig({
  repoRoot,
  runtimeOverrides = {},
  getConfig = (key) => getConfigFromCli(repoRoot, key),
}) {
  validateRuntimeOverrides(runtimeOverrides);

  const entries = await Promise.all(
    EXPLAINER_CONFIG_KEYS.map(async (key) => {
      const response = await getConfig(key);
      validateConfigResponse(key, response);
      return [key, response];
    }),
  );

  const values = {};
  const sources = {};
  for (const [key, response] of entries) {
    values[key] = response.value;
    sources[key] = response.source;
  }
  for (const [key, value] of Object.entries(runtimeOverrides)) {
    values[key] = normalizeRuntimeValue(key, value);
    sources[key] = 'runtime';
  }

  const warnings = [];
  const theme = {};
  const bundlePath = nullableString(
    values['explainers.defaults.themeBundlePath'],
  );
  const style = nullableString(values['explainers.defaults.style']);
  if (style && !STYLES.has(style)) {
    throw new Error(
      'explainers.defaults.style must name a curated explainer style.',
    );
  }
  const palette = nullableString(values['explainers.defaults.palette']);
  const visualProfile = nullableString(
    values['explainers.defaults.visualProfile'],
  );
  const hasLegacySelection = palette !== null || visualProfile !== null;
  if (hasLegacySelection) {
    warnings.push(
      'Palette and visual profile configuration is deprecated; use explainers.defaults.style.',
    );
  }
  if (bundlePath) {
    theme.suppliedBundlePath = await resolveSourceAwarePath({
      repoRoot,
      candidate: bundlePath,
      source: sources['explainers.defaults.themeBundlePath'],
      field: 'explainers.defaults.themeBundlePath',
    });
    if (style || palette || visualProfile) {
      warnings.push(
        'explainers.defaults.themeBundlePath overrides configured style, palette, and visual profile.',
      );
    }
  } else {
    const explicitStyle =
      style && sources['explainers.defaults.style'] !== 'default'
        ? style
        : null;
    if (explicitStyle) {
      theme.style = explicitStyle;
    }
    if (palette) {
      theme.palette = palette;
    }
    if (visualProfile) {
      theme.visualProfile = visualProfile;
    }
    if (explicitStyle && hasLegacySelection) {
      warnings.push(
        'explainers.defaults.style wins over deprecated palette and visual profile configuration.',
      );
    }
    if (!explicitStyle && !hasLegacySelection) {
      warnings.push(
        'No explicit explainer style is configured; the core will default to clean-neutral.',
      );
    }
  }

  const publish = resolvePublish(values);
  const preferences = {
    projectExplainer: resolvePreference(
      'workflow.explainers.projectExplainer',
      values['workflow.explainers.projectExplainer'],
    ),
    projectRecap: resolvePreference(
      'workflow.explainers.projectRecap',
      values['workflow.explainers.projectRecap'],
    ),
  };

  return { values, sources, theme, publish, preferences, warnings };
}

export function toExplainerRunRequest({
  resolvedConfig,
  recipe,
  slug,
  outputRoot,
  factBase,
  mode,
  durabilityStrategy = 'none',
  artDirection,
  defaultMode,
  renderStrategy,
  retainRawArtDirection = false,
}) {
  if (!resolvedConfig || !outputRoot || !factBase) {
    throw new TypeError(
      'resolvedConfig, outputRoot, and factBase are required to build a run request.',
    );
  }
  if (retainRawArtDirection && !nullableString(artDirection)) {
    throw new Error(
      'retainRawArtDirection requires a non-empty artDirection runtime input.',
    );
  }

  const theme = {
    ...resolvedConfig.theme,
    ...(nullableString(artDirection)
      ? { artDirection: artDirection.trim() }
      : {}),
    ...(defaultMode ? { defaultMode } : {}),
    ...(renderStrategy ? { renderStrategy } : {}),
  };
  const durability = { strategy: durabilityStrategy };
  if (durabilityStrategy === 'publish') {
    if (!resolvedConfig.publish) {
      throw new Error(
        'Publish durability requires a complete explainer publish configuration.',
      );
    }
    durability.publish = {
      schemaVersion: 'explainer-kit.publish-request/v1',
      ...resolvedConfig.publish,
      siteRoot: join(outputRoot, slug, 'site'),
      manifestPath: join(outputRoot, slug, 'manifest.json'),
    };
  }

  return {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: recipe, version: '1' },
    slug,
    outputRoot,
    factBase,
    ...(Object.keys(theme).length > 0 ? { theme } : {}),
    durability,
    privacy: { retainRawArtDirection },
    mode,
  };
}

async function getConfigFromCli(repoRoot, key) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync('oat', ['config', 'get', key, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }));
  } catch (error) {
    const detail =
      error && typeof error === 'object' && typeof error.stderr === 'string'
        ? error.stderr.trim()
        : '';
    throw new Error(
      `Failed to resolve ${key} with \`oat config get ${key} --json\`${detail ? `: ${detail}` : '.'}`,
      { cause: error },
    );
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`oat config get returned invalid JSON for ${key}.`);
  }
}

function validateConfigResponse(key, response) {
  if (
    !response ||
    typeof response !== 'object' ||
    response.status !== 'ok' ||
    response.key !== key ||
    !SOURCES.has(response.source)
  ) {
    throw new Error(
      `Invalid oat config get --json response for ${key}; expected value and source metadata.`,
    );
  }
}

function validateRuntimeOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('runtimeOverrides must be an object.');
  }
  for (const key of Object.keys(overrides)) {
    if (!CONFIG_KEY_SET.has(key)) {
      throw new Error(`Unsupported runtime override: ${key}`);
    }
  }
}

function normalizeRuntimeValue(key, value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Runtime override ${key} must be a non-empty string or null.`,
    );
  }
  const normalized = value.trim();
  if (key === 'explainers.publish.provider' && normalized !== 's3-static') {
    throw new Error(`${key} runtime override must be s3-static.`);
  }
  if (key === 'explainers.defaults.style' && !STYLES.has(normalized)) {
    throw new Error(
      `${key} runtime override must name a curated explainer style.`,
    );
  }
  if (key.startsWith('workflow.explainers.') && !PREFERENCES.has(normalized)) {
    throw new Error(`${key} runtime override must be always, ask, or never.`);
  }
  if (
    key === 'explainers.publish.s3Uri' &&
    !/^s3:\/\/[^/\s]+(?:\/.*)?$/.test(normalized)
  ) {
    throw new Error(`${key} runtime override must be an s3:// URI.`);
  }
  if (
    key === 'explainers.publish.publicBaseUrl' &&
    !/^https:\/\/[^\s]+$/.test(normalized)
  ) {
    throw new Error(`${key} runtime override must be an https:// URL.`);
  }
  if (
    key === 'explainers.publish.s3Uri' ||
    key === 'explainers.publish.publicBaseUrl'
  ) {
    return normalized.replace(/\/+$/, '');
  }
  return normalized;
}

function resolvePublish(values) {
  const provider = nullableString(values['explainers.publish.provider']);
  if (!provider) {
    return null;
  }
  if (provider !== 's3-static') {
    throw new Error(`Unsupported explainer publish provider: ${provider}`);
  }

  const fields = {
    s3Uri: nullableString(values['explainers.publish.s3Uri']),
    publicBaseUrl: nullableString(values['explainers.publish.publicBaseUrl']),
    awsRegion: nullableString(values['explainers.publish.awsRegion']),
  };
  const missing = Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Incomplete explainer publish configuration; missing ${missing.join(', ')}.`,
    );
  }
  if (!/^s3:\/\/[^/\s]+(?:\/.*)?$/.test(fields.s3Uri)) {
    throw new Error('explainers.publish.s3Uri must be a valid s3:// URI.');
  }
  if (!/^https:\/\/[^\s]+$/.test(fields.publicBaseUrl)) {
    throw new Error(
      'explainers.publish.publicBaseUrl must be a valid https:// URL.',
    );
  }

  const awsProfile = nullableString(values['explainers.publish.awsProfile']);
  return {
    provider,
    s3Uri: fields.s3Uri.replace(/\/+$/, ''),
    publicBaseUrl: fields.publicBaseUrl.replace(/\/+$/, ''),
    awsRegion: fields.awsRegion,
    ...(awsProfile ? { awsProfile } : {}),
  };
}

function resolvePreference(key, value) {
  const preference = nullableString(value) ?? 'ask';
  if (!PREFERENCES.has(preference)) {
    throw new Error(`${key} must be always, ask, or never.`);
  }
  return preference;
}

function nullableString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
