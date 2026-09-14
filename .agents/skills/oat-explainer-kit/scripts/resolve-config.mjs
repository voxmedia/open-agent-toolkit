import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { resolveSourceAwarePath } from './resolve-paths.mjs';

const execFileAsync = promisify(execFile);

export const EXPLAINER_CONFIG_KEYS = Object.freeze([
  'explainers.defaults.style',
  'explainers.defaults.palette',
  'explainers.defaults.visualProfile',
  'explainers.defaults.themeBundlePath',
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

  return {
    values,
    sources,
    theme,
    preferences,
    warnings,
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
  if (key === 'explainers.defaults.style' && !STYLES.has(normalized)) {
    throw new Error(
      `${key} runtime override must name a curated explainer style.`,
    );
  }
  if (key.startsWith('workflow.explainers.') && !PREFERENCES.has(normalized)) {
    throw new Error(`${key} runtime override must be always, ask, or never.`);
  }
  return normalized;
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
