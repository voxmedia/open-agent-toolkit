import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export const CORE_INSTALL_COMMAND = 'oat tools install utility --scope user';
export const CORE_UPDATE_COMMAND =
  'oat tools update --pack utility --scope user';

export async function checkCoreCompatibility({ adapterRoot, minimumVersion }) {
  const minimum = parseVersion(minimumVersion);
  if (minimum === null) {
    throw new TypeError(
      `minimumVersion must be a semantic version, received: ${minimumVersion}`,
    );
  }

  const canonicalAdapterRoot = resolve(adapterRoot);
  const skillsRoot = dirname(canonicalAdapterRoot);
  const coreRoot = join(skillsRoot, 'explainer-kit');
  if (
    basename(canonicalAdapterRoot) !== 'oat-explainer-kit' ||
    basename(skillsRoot) !== 'skills' ||
    basename(dirname(skillsRoot)) !== '.agents'
  ) {
    return failure({
      code: 'invalid-layout',
      coreRoot,
      minimumVersion,
      message:
        'oat-explainer-kit is not running from an installed canonical .agents/skills path.',
      guidance: CORE_INSTALL_COMMAND,
    });
  }

  let skill;
  try {
    skill = await readFile(join(coreRoot, 'SKILL.md'), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return failure({
        code: 'missing',
        coreRoot,
        minimumVersion,
        message: 'A canonical installed explainer-kit core was not found.',
        guidance: CORE_INSTALL_COMMAND,
      });
    }
    throw error;
  }

  const installedVersion = readFrontmatterVersion(skill);
  const installed = parseVersion(installedVersion);
  if (
    installed === null ||
    installed.major !== minimum.major ||
    installed.minor < minimum.minor
  ) {
    return failure({
      code: 'incompatible',
      coreRoot,
      installedVersion,
      minimumVersion,
      message: installedVersion
        ? `Installed explainer-kit ${installedVersion} is incompatible with required ${minimumVersion}.`
        : 'Installed explainer-kit has no valid version.',
      guidance: CORE_UPDATE_COMMAND,
    });
  }

  return {
    ok: true,
    code: 'compatible',
    coreRoot,
    installedVersion,
    minimumVersion,
    message: `Installed explainer-kit ${installedVersion} is compatible.`,
    guidance: null,
  };
}

function failure({
  code,
  coreRoot,
  installedVersion = null,
  minimumVersion,
  message,
  guidance,
}) {
  return {
    ok: false,
    code,
    coreRoot,
    installedVersion,
    minimumVersion,
    message,
    guidance,
  };
}

function readFrontmatterVersion(content) {
  const match = content.match(/^version:\s*([^\s#]+)\s*(?:#.*)?$/m);
  return match?.[1] ?? null;
}

function parseVersion(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/,
  );
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}
