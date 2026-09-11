import { readFileSync } from 'node:fs';

const RECIPE_SCHEMA = 'explainer-kit.recipe/v2';
const ROOT_KEYS = ['floor', 'id', 'schemaVersion', 'sourceRoles', 'version'];
const SOURCE_ROLE_KEYS = [
  'accepts',
  'maxBindings',
  'minBindings',
  'required',
  'role',
];
const FLOOR_KEYS = ['briefRef', 'id', 'requiredNarrative', 'template', 'type'];
const SOURCE_KINDS = new Set([
  'file',
  'directory',
  'git',
  'github',
  'session',
  'other',
]);
const ARTIFACT_TYPES = new Set([
  'hub',
  'diagram',
  'explainer',
  'deck',
  'catalog',
]);
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RECIPE_FILES = [
  'project-explainer.json',
  'project-recap.v2.json',
  'engineer-tour.json',
  'program-recap.json',
];

export const RECIPES = new Map(
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

export function recipeFloor(recipe) {
  assert(
    recipe?.schemaVersion === RECIPE_SCHEMA,
    'Recipe has an unsupported schemaVersion',
  );
  return structuredClone(recipe.floor);
}

export function recipeRequiredNarrative(recipe, artifactId) {
  const artifact = recipeFloor(recipe).find(({ id }) => id === artifactId);
  return [...(artifact?.requiredNarrative ?? [])];
}

function validateRecipe(recipe, file) {
  assertObject(recipe, `${file} recipe`);
  assertExactKeys(recipe, ROOT_KEYS, `${file} recipe`);
  assert(
    recipe.schemaVersion === RECIPE_SCHEMA,
    `${file} has unsupported schemaVersion`,
  );
  assertSafeId(recipe.id, `${file} id`);
  assertNonEmptyString(recipe.version, `${file} version`);

  assert(
    Array.isArray(recipe.sourceRoles) && recipe.sourceRoles.length > 0,
    `${file} sourceRoles must be a non-empty array`,
  );
  const roleNames = [];
  for (const role of recipe.sourceRoles) {
    assertObject(role, `${file} source role`);
    assertExactKeys(role, SOURCE_ROLE_KEYS, `${file} source role`);
    assertSafeId(role.role, `${file} source role name`);
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
  }
  assertUnique(roleNames, `${file} source role names`);

  assert(
    Array.isArray(recipe.floor) && recipe.floor.length > 0,
    `${file} floor must be a non-empty array`,
  );
  const floorIds = [];
  for (const artifact of recipe.floor) {
    assertObject(artifact, `${file} floor entry`);
    assertExactKeys(artifact, FLOOR_KEYS, `${file} floor entry`);
    assertSafeId(artifact.id, `${file} floor id`);
    floorIds.push(artifact.id);
    assert(
      ARTIFACT_TYPES.has(artifact.type),
      `${file} floor has unsupported type`,
    );
    assertNonEmptyString(artifact.template, `${file} floor template`);
    assertNonEmptyString(artifact.briefRef, `${file} floor briefRef`);
    assertUniqueNonEmptyStrings(
      artifact.requiredNarrative,
      `${file} floor requiredNarrative`,
    );
  }
  assertUnique(floorIds, `${file} floor ids`);
  return recipe;
}

function assertObject(value, label) {
  assert(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  assert(
    actual.length === sortedExpected.length &&
      actual.every((key, index) => key === sortedExpected[index]),
    `${label} has unknown or missing keys`,
  );
}

function assertNonEmptyString(value, label) {
  assert(
    typeof value === 'string' && value.length > 0,
    `${label} must be a non-empty string`,
  );
}

function assertSafeId(value, label) {
  assertNonEmptyString(value, label);
  assert(SAFE_ID.test(value), `${label} must be a safe slug`);
}

function assertUniqueNonEmptyStrings(value, label) {
  assert(
    Array.isArray(value) && value.length > 0,
    `${label} must be a non-empty array`,
  );
  for (const entry of value) assertNonEmptyString(entry, label);
  assertUnique(value, label);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}
