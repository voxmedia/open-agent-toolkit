import { readFileSync } from 'node:fs';

const RECIPE_SCHEMA_VERSION = 'explainer-kit.recipe/v1';
const RECIPE_ROOT_KEYS = [
  'artifacts',
  'discoveryLimits',
  'id',
  'requiredNarrative',
  'schemaVersion',
  'sourceRoles',
  'version',
];
const SOURCE_ROLE_KEYS = [
  'accepts',
  'maxBindings',
  'minBindings',
  'required',
  'role',
];
const ARTIFACT_KEYS = ['id', 'required', 'template', 'type'];
const DISCOVERY_LIMIT_KEYS = ['consecutiveNoNewFindingsRounds', 'maxRounds'];
const SOURCE_KINDS = new Set([
  'file',
  'directory',
  'git',
  'github',
  'session',
  'other',
]);
const ARTIFACT_TYPES = new Set(['hub', 'diagram', 'explainer', 'deck']);
const RECIPE_FILES = [
  'project-explainer.json',
  'project-recap.json',
  'engineer-tour.json',
  'program-recap.json',
];

const RECIPES = new Map(
  RECIPE_FILES.map((file) => {
    const recipe = JSON.parse(
      readFileSync(new URL(`../../recipes/${file}`, import.meta.url), 'utf8'),
    );
    validateRecipe(recipe, file);
    return [`${recipe.id}@${recipe.version}`, recipe];
  }),
);

export function loadRecipe(id, version) {
  const recipe = RECIPES.get(`${id}@${version}`);
  if (!recipe) {
    const error = new Error(`Unsupported recipe: ${id}@${version}`);
    error.code = 'E_RECIPE_UNSUPPORTED';
    throw error;
  }
  return structuredClone(recipe);
}

export function validateSourceBindings(recipe, bindings) {
  const errors = [];
  if (!Array.isArray(bindings)) {
    return { valid: false, errors: ['Source bindings must be an array'] };
  }

  const roles = new Map(recipe.sourceRoles.map((role) => [role.role, role]));
  const sourceSets = new Map();
  for (const binding of bindings) {
    const role = roles.get(binding?.role);
    if (!role) {
      errors.push(`Unknown source role: ${binding?.role}`);
      continue;
    }
    const sets = sourceSets.get(role.role) ?? new Set();
    sets.add(binding.sourceSetId ?? Symbol());
    sourceSets.set(role.role, sets);
    if (!role.accepts.includes(binding.kind)) {
      errors.push(
        `Source role ${role.role} does not accept kind ${binding.kind}`,
      );
    }
  }

  for (const role of recipe.sourceRoles) {
    const count = sourceSets.get(role.role)?.size ?? 0;
    if (role.required && count < role.minBindings) {
      errors.push(`Missing required source role: ${role.role}`);
    }
    if (count > role.maxBindings) {
      errors.push(
        `Source role ${role.role} allows at most ${role.maxBindings} binding`,
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateContentModel(recipe, contentModel) {
  const errors = [];
  if (!isObject(contentModel)) {
    return { valid: false, errors: ['Content model must be an object'] };
  }

  if (
    !recipe.artifacts.some(
      (artifact) => artifact.id === contentModel.artifactId,
    )
  ) {
    errors.push(`Unknown recipe artifact: ${contentModel.artifactId}`);
  }
  if (!Array.isArray(contentModel.sections)) {
    errors.push('Content model sections must be an array');
    return { valid: false, errors };
  }

  const sectionCounts = new Map();
  for (const section of contentModel.sections) {
    if (
      !isObject(section) ||
      typeof section.id !== 'string' ||
      typeof section.content !== 'string'
    ) {
      errors.push('Narrative sections require string id and content');
      continue;
    }
    sectionCounts.set(section.id, (sectionCounts.get(section.id) ?? 0) + 1);
    if (/<\s*script\b/i.test(section.content)) {
      errors.push(
        `Narrative section ${section.id} contains raw script content`,
      );
    }
  }

  for (const sectionId of recipe.requiredNarrative) {
    const count = sectionCounts.get(sectionId) ?? 0;
    if (count === 0) {
      errors.push(`Missing required narrative section: ${sectionId}`);
    } else if (count > 1) {
      errors.push(`Duplicate narrative section: ${sectionId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function shouldStopDiscovery(recipe, findingsByRound) {
  if (
    !Array.isArray(findingsByRound) ||
    findingsByRound.some((count) => !Number.isInteger(count) || count < 0)
  ) {
    throw new TypeError(
      'Discovery round findings must be an array of non-negative integers',
    );
  }

  const { consecutiveNoNewFindingsRounds, maxRounds } = recipe.discoveryLimits;
  if (findingsByRound.length >= maxRounds) {
    return true;
  }
  if (findingsByRound.length < consecutiveNoNewFindingsRounds) {
    return false;
  }
  return findingsByRound
    .slice(-consecutiveNoNewFindingsRounds)
    .every((count) => count === 0);
}

function validateRecipe(recipe, file) {
  assertObject(recipe, `${file} recipe`);
  assertExactKeys(recipe, RECIPE_ROOT_KEYS, `${file} recipe`);
  assert(
    recipe.schemaVersion === RECIPE_SCHEMA_VERSION,
    `${file} has unsupported schemaVersion`,
  );
  assertNonEmptyString(recipe.id, `${file} id`);
  assertNonEmptyString(recipe.version, `${file} version`);
  assertUniqueNonEmptyStrings(
    recipe.requiredNarrative,
    `${file} requiredNarrative`,
  );

  assert(
    Array.isArray(recipe.sourceRoles) && recipe.sourceRoles.length > 0,
    `${file} sourceRoles must be a non-empty array`,
  );
  const roleNames = [];
  for (const role of recipe.sourceRoles) {
    assertObject(role, `${file} source role`);
    assertExactKeys(role, SOURCE_ROLE_KEYS, `${file} source role`);
    assertNonEmptyString(role.role, `${file} source role name`);
    roleNames.push(role.role);
    assert(typeof role.required === 'boolean', `${file} role required`);
    assert(
      Array.isArray(role.accepts) &&
        role.accepts.length > 0 &&
        role.accepts.every((kind) => SOURCE_KINDS.has(kind)),
      `${file} role accepts unsupported source kinds`,
    );
    assert(
      Number.isInteger(role.minBindings) &&
        role.minBindings >= 0 &&
        Number.isInteger(role.maxBindings) &&
        role.maxBindings >= role.minBindings,
      `${file} role has invalid binding limits`,
    );
    assert(
      role.required === role.minBindings > 0,
      `${file} role required flag must match minBindings`,
    );
  }
  assertUnique(roleNames, `${file} source role names`);

  assert(
    Array.isArray(recipe.artifacts) && recipe.artifacts.length > 0,
    `${file} artifacts must be a non-empty array`,
  );
  const artifactIds = [];
  for (const artifact of recipe.artifacts) {
    assertObject(artifact, `${file} artifact`);
    assertExactKeys(artifact, ARTIFACT_KEYS, `${file} artifact`);
    assertNonEmptyString(artifact.id, `${file} artifact id`);
    artifactIds.push(artifact.id);
    assert(
      ARTIFACT_TYPES.has(artifact.type),
      `${file} artifact has unsupported type`,
    );
    assertNonEmptyString(artifact.template, `${file} artifact template`);
    assert(typeof artifact.required === 'boolean', `${file} artifact required`);
  }
  assertUnique(artifactIds, `${file} artifact ids`);

  assertObject(recipe.discoveryLimits, `${file} discoveryLimits`);
  assertExactKeys(
    recipe.discoveryLimits,
    DISCOVERY_LIMIT_KEYS,
    `${file} discoveryLimits`,
  );
  assert(
    recipe.discoveryLimits.consecutiveNoNewFindingsRounds === 2,
    `${file} discovery must stop after exactly two no-new-findings rounds`,
  );
  assert(
    Number.isInteger(recipe.discoveryLimits.maxRounds) &&
      recipe.discoveryLimits.maxRounds >= 2,
    `${file} discovery maxRounds must be an integer of at least two`,
  );
}

function assertObject(value, label) {
  assert(isObject(value), `${label} must be an object`);
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  assert(
    actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]),
    `${label} has unknown or missing keys`,
  );
}

function assertNonEmptyString(value, label) {
  assert(
    typeof value === 'string' && value.length > 0,
    `${label} must be a non-empty string`,
  );
}

function assertUniqueNonEmptyStrings(value, label) {
  assert(
    Array.isArray(value) && value.length > 0,
    `${label} must be a non-empty array`,
  );
  for (const entry of value) {
    assertNonEmptyString(entry, label);
  }
  assertUnique(value, label);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function assert(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
