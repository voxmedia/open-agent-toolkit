import { createHash } from 'node:crypto';
import { basename, isAbsolute } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const RC_SCHEMA_VERSION = 'explainer-kit.release-candidate/v1';
export const EXECUTION_SCHEMA_VERSION = 'explainer-kit.packaged-execution/v1';
export const CLI_PACKAGE = '@open-agent-toolkit/cli';
export const PACKAGE_NAMES = Object.freeze([
  '@open-agent-toolkit/cli',
  '@open-agent-toolkit/control-plane',
  '@open-agent-toolkit/docs-config',
  '@open-agent-toolkit/docs-theme',
  '@open-agent-toolkit/docs-transforms',
]);
export const SKILL_NAMES = Object.freeze([
  'explainer-kit',
  'oat-explainer-kit',
]);
export const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
export const COMMIT_PATTERN = /^[a-f0-9]{40}$/;

const RC_KEYS = Object.freeze([
  'schemaVersion',
  'rcId',
  'commit',
  'packages',
  'skills',
  'schemas',
  'recipes',
  'changedCandidates',
]);

export function releaseCandidateIdentity(candidate) {
  return {
    schemaVersion: candidate.schemaVersion,
    commit: candidate.commit,
    packages: candidate.packages,
    skills: candidate.skills,
    schemas: candidate.schemas,
    recipes: candidate.recipes,
    changedCandidates: candidate.changedCandidates,
  };
}

export function hashCanonicalJson(value) {
  return hashBytes(Buffer.from(JSON.stringify(value)));
}

export function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function assertReleaseCandidate(candidate, fail) {
  assertObject(candidate, fail);
  assertExactKeys(candidate, RC_KEYS, fail);
  if (
    candidate.schemaVersion !== RC_SCHEMA_VERSION ||
    !HASH_PATTERN.test(candidate.rcId) ||
    !COMMIT_PATTERN.test(candidate.commit)
  ) {
    fail('Release candidate identity fields are invalid.');
  }
  assertPackages(candidate.packages, fail);
  assertSkills(candidate.skills, fail);
  assertIdentityEntries(candidate.schemas, ['id', 'path', 'sha256'], fail);
  assertIdentityEntries(
    candidate.recipes,
    ['id', 'version', 'schemaVersion', 'path', 'sha256'],
    fail,
    ({ id, version }) => `${id}@${version}`,
    byRecipeIdentity,
  );
  if (
    !Array.isArray(candidate.changedCandidates) ||
    !candidate.changedCandidates.every(safeRelativePath)
  ) {
    fail('Release candidate changedCandidates are invalid.');
  }
  if (
    hashCanonicalJson(releaseCandidateIdentity(candidate)) !== candidate.rcId
  ) {
    fail('Release candidate identity does not match its contents.', true);
  }
  return candidate;
}

function assertPackages(packages, fail) {
  if (!Array.isArray(packages) || packages.length !== PACKAGE_NAMES.length) {
    fail('Release candidate package set is incomplete.');
  }
  for (const pkg of packages) {
    assertObject(pkg, fail);
    assertExactKeys(pkg, ['name', 'version', 'artifact', 'sha256'], fail);
    if (
      !nonEmptyString(pkg.name) ||
      !nonEmptyString(pkg.version) ||
      !nonEmptyString(pkg.artifact) ||
      pkg.artifact !== basename(pkg.artifact) ||
      pkg.artifact.includes('\\') ||
      !pkg.artifact.endsWith('.tgz') ||
      !HASH_PATTERN.test(pkg.sha256)
    ) {
      fail('A release candidate package entry is invalid.');
    }
  }
  if (
    !isDeepStrictEqual(
      packages.map(({ name }) => name),
      PACKAGE_NAMES,
    ) ||
    new Set(packages.map(({ artifact }) => artifact)).size !== packages.length
  ) {
    fail('Release candidate package order or identity is invalid.');
  }
}

function assertSkills(skills, fail) {
  if (!Array.isArray(skills) || skills.length !== SKILL_NAMES.length) {
    fail('Release candidate skill set is incomplete.');
  }
  for (const skill of skills) {
    assertObject(skill, fail);
    assertExactKeys(
      skill,
      ['name', 'version', 'package', 'path', 'sha256'],
      fail,
    );
    if (
      !nonEmptyString(skill.name) ||
      !nonEmptyString(skill.version) ||
      skill.package !== CLI_PACKAGE ||
      skill.path !== `package/assets/skills/${skill.name}` ||
      !HASH_PATTERN.test(skill.sha256)
    ) {
      fail('A release candidate skill entry is invalid.');
    }
  }
  if (
    !isDeepStrictEqual(
      skills.map(({ name }) => name),
      SKILL_NAMES,
    )
  ) {
    fail('Release candidate skill order is invalid.');
  }
}

function assertIdentityEntries(
  entries,
  keys,
  fail,
  identity = ({ id }) => id,
  compare = undefined,
) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail('Release candidate contract identities are incomplete.');
  }
  for (const entry of entries) {
    assertObject(entry, fail);
    assertExactKeys(entry, keys, fail);
    if (
      !keys.every((key) =>
        key === 'sha256'
          ? HASH_PATTERN.test(entry[key])
          : nonEmptyString(entry[key]),
      ) ||
      !safeRelativePath(entry.path)
    ) {
      fail('A release candidate contract identity is invalid.');
    }
  }
  const identities = entries.map(identity);
  // The expected order must be computed with the same comparator the builder
  // uses. Sorting the composed `id@version` strings instead disagrees with the
  // builder's (id, version) tuple whenever one recipe id is a strict prefix of
  // another, because `-` (0x2D) sorts before `@` (0x40): the builder emits
  // ['project@1', 'project-explainer@1'] while a string sort expects the
  // reverse, so a valid RC would be rejected.
  const expected = compare
    ? [...entries].sort(compare).map(identity)
    : [...identities].sort();
  if (
    new Set(identities).size !== identities.length ||
    !isDeepStrictEqual(identities, expected)
  ) {
    fail('Release candidate contract identities must be unique and sorted.');
  }
}

/** Mirrors `byRecipeIdentity` in `build-explainer-rc.mjs`. */
function byRecipeIdentity(left, right) {
  const byId = left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  return byId || left.version.localeCompare(right.version);
}

function assertObject(value, fail) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('Release candidate data must be an object.');
  }
}

function assertExactKeys(value, keys, fail) {
  if (!isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())) {
    fail('Release candidate data does not match its closed schema.');
  }
}

function safeRelativePath(value) {
  return (
    nonEmptyString(value) &&
    !isAbsolute(value) &&
    !value.includes('\\') &&
    value
      .split('/')
      .every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}
