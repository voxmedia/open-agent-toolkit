import { readFileSync } from 'node:fs';

const RECIPE_SCHEMA_V2 = 'explainer-kit.recipe/v2';
const RECIPE_V2_REQUIRED_ROOT_KEYS = [
  'discoveryLimits',
  'expansion',
  'floor',
  'id',
  'schemaVersion',
  'sourceRoles',
  'version',
];
const RECIPE_V2_ROOT_KEYS = [...RECIPE_V2_REQUIRED_ROOT_KEYS, 'fallback'];
const SOURCE_ROLE_KEYS = [
  'accepts',
  'maxBindings',
  'minBindings',
  'required',
  'role',
];
const FLOOR_KEYS = [
  'authoring',
  'briefRef',
  'id',
  'required',
  'requiredNarrative',
  'template',
  'type',
];
const EXPANSION_KEYS = ['limits', 'profiles'];
const PROFILE_REQUIRED_KEYS = [
  'authoring',
  'briefRef',
  'maxCount',
  'profileId',
  'type',
];
const PROFILE_KEYS = [
  ...PROFILE_REQUIRED_KEYS,
  'allowedJustificationKinds',
  'shell',
];
const EXPANSION_LIMIT_KEYS = ['maxArtifacts', 'maxPerType'];
const DISCOVERY_LIMIT_KEYS = ['consecutiveNoNewFindingsRounds', 'maxRounds'];
const FALLBACK_KEYS = ['authoring', 'mode', 'scope', 'selection'];
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
const AUTHORING_TYPES = new Set(['markdown', 'html']);
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RECIPE_FILES = [
  'project-explainer.json',
  'project-recap.v1.json',
  'project-recap.v2.json',
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

export function selectRecipeAuthoring(recipe, mode = 'artistic') {
  const selected = structuredClone(recipe);
  if (mode === 'artistic') {
    return selected;
  }
  if (selected.fallback?.mode !== mode) {
    const error = new Error(
      `Recipe ${selected.id}@${selected.version} does not support recap mode ${mode}`,
    );
    error.code = 'E_RECIPE_UNSUPPORTED';
    throw error;
  }

  selected.floor = selected.floor.map((artifact) => ({
    ...artifact,
    authoring: selected.fallback.authoring,
  }));
  selected.expansion.profiles = selected.expansion.profiles.map(
    ({ shell: _shell, ...profile }) => ({
      ...profile,
      authoring: selected.fallback.authoring,
    }),
  );
  return selected;
}

export function resolveDiagramRenderingRoute(recipe, artifact, diagrams) {
  if (
    !recipe ||
    typeof recipe !== 'object' ||
    !artifact ||
    typeof artifact !== 'object' ||
    !Array.isArray(diagrams)
  ) {
    throw new TypeError(
      'Diagram routing requires a recipe, artifact, and diagram analyses.',
    );
  }
  const supported = diagrams.filter(({ valid }) => valid === true);
  if (
    supported.length === 0 ||
    supported.every(({ inlineSupported }) => inlineSupported === true)
  ) {
    return 'inline';
  }
  return artifact.authoring === 'html' ? 'artistic' : 'reject';
}

export function recipeFloor(recipe) {
  if (recipe?.schemaVersion === RECIPE_SCHEMA_V2) {
    return structuredClone(recipe.floor);
  }
  throw new TypeError('Recipe has an unsupported schemaVersion');
}

export function recipeExpansion(recipe) {
  if (recipe?.schemaVersion === RECIPE_SCHEMA_V2) {
    return structuredClone(recipe.expansion);
  }
  throw new TypeError('Recipe has an unsupported schemaVersion');
}

export function recipeRequiredNarrative(recipe, artifactId) {
  if (recipe?.schemaVersion === RECIPE_SCHEMA_V2) {
    const artifact = recipe.floor.find(({ id }) => id === artifactId);
    return [...(artifact?.requiredNarrative ?? [])];
  }
  throw new TypeError('Recipe has an unsupported schemaVersion');
}

export function evaluateExpansionProposals(recipe, proposals) {
  const floorIds = new Set(recipeFloor(recipe).map(({ id }) => id));
  const expansion = recipeExpansion(recipe);
  const profiles = new Map(
    expansion.profiles.map((profile) => [profile.profileId, profile]),
  );
  const errors = [];
  const accepted = [];
  const rejected = [];
  const warnings = new Set();
  const seenIds = new Set();
  const acceptedByProfile = new Map();
  const acceptedByType = new Map();
  const maxPerType = new Map(Object.entries(expansion.limits.maxPerType ?? {}));

  if (!Array.isArray(proposals)) {
    return {
      valid: false,
      accepted,
      rejected,
      warnings: [],
      errors: ['Expansion proposals must be an array'],
    };
  }

  for (const proposal of proposals) {
    if (
      !isObject(proposal) ||
      !hasExactKeys(proposal, ['id', 'profileId', 'rationale'])
    ) {
      errors.push(
        'Expansion proposals require only id, profileId, and rationale',
      );
      continue;
    }
    if (!SAFE_ID.test(proposal.id)) {
      errors.push(`Unsafe expansion artifact id: ${proposal.id}`);
      continue;
    }
    if (floorIds.has(proposal.id)) {
      errors.push(`Expansion artifact id collides with floor: ${proposal.id}`);
      continue;
    }
    if (seenIds.has(proposal.id)) {
      errors.push(`Duplicate expansion artifact id: ${proposal.id}`);
      continue;
    }
    seenIds.add(proposal.id);

    const profile = profiles.get(proposal.profileId);
    if (!profile) {
      errors.push(`Unknown expansion profile: ${proposal.profileId}`);
      continue;
    }
    if (
      typeof proposal.rationale !== 'string' ||
      proposal.rationale.length === 0
    ) {
      errors.push(`Expansion proposal ${proposal.id} requires a rationale`);
      continue;
    }

    const profileCount = acceptedByProfile.get(profile.profileId) ?? 0;
    if (profileCount >= profile.maxCount) {
      rejected.push({
        ...structuredClone(proposal),
        status: 'rejected',
        reason: 'profile-limit',
      });
      warnings.add('expansion-profile-limit-exceeded');
      continue;
    }
    // A declared type cap binds across profiles, so proposals cannot spread
    // over sibling profiles that share one artifact type to evade it.
    const typeCount = acceptedByType.get(profile.type) ?? 0;
    if (
      maxPerType.has(profile.type) &&
      typeCount >= maxPerType.get(profile.type)
    ) {
      rejected.push({
        ...structuredClone(proposal),
        status: 'rejected',
        reason: 'type-limit',
      });
      warnings.add('expansion-type-limit-exceeded');
      continue;
    }
    if (accepted.length >= expansion.limits.maxArtifacts) {
      rejected.push({
        ...structuredClone(proposal),
        status: 'rejected',
        reason: 'recipe-limit',
      });
      warnings.add('expansion-artifact-limit-exceeded');
      continue;
    }

    accepted.push({
      ...structuredClone(proposal),
      status: 'accepted',
      profile: structuredClone(profile),
    });
    acceptedByProfile.set(profile.profileId, profileCount + 1);
    acceptedByType.set(profile.type, typeCount + 1);
  }

  return {
    valid: errors.length === 0,
    accepted,
    rejected,
    warnings: [...warnings],
    errors,
  };
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
    !recipeFloor(recipe).some(
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

  for (const sectionId of recipeRequiredNarrative(
    recipe,
    contentModel.artifactId,
  )) {
    const count = sectionCounts.get(sectionId) ?? 0;
    if (count > 1) {
      errors.push(`Duplicate narrative section: ${sectionId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validatePlannedPortfolio(recipe, portfolio) {
  const errors = [];
  if (!Array.isArray(portfolio)) {
    return { valid: false, errors: ['Planned portfolio must be an array'] };
  }
  const floorIds = new Set(recipeFloor(recipe).map(({ id }) => id));
  const expansion = recipeExpansion(recipe);
  const profiles = new Map(
    expansion.profiles.map((profile) => [profile.profileId, profile]),
  );
  const counts = new Map();
  let optionalCount = 0;

  for (const artifact of portfolio) {
    if (floorIds.has(artifact?.artifactId)) continue;
    optionalCount += 1;
    const profile = profiles.get(artifact?.profileId);
    if (!profile) {
      errors.push(`Unknown planned profile: ${artifact?.profileId}`);
      continue;
    }
    counts.set(profile.profileId, (counts.get(profile.profileId) ?? 0) + 1);
    if (!isObject(artifact.justification)) {
      errors.push(
        `Optional artifact ${artifact.artifactId} requires a source-backed justification`,
      );
      continue;
    }
    if (
      profile.allowedJustificationKinds !== undefined &&
      !profile.allowedJustificationKinds.includes(artifact.justification.kind)
    ) {
      errors.push(
        `Optional artifact ${artifact.artifactId} justification ${artifact.justification.kind} is not allowed for ${profile.profileId}`,
      );
    }
  }
  if (optionalCount > expansion.limits.maxArtifacts) {
    errors.push('Planned portfolio exceeds the recipe optional-artifact limit');
  }
  for (const [profileId, count] of counts) {
    if (count > profiles.get(profileId).maxCount) {
      errors.push(`Planned portfolio exceeds the ${profileId} profile limit`);
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

export function validateRecipe(recipe, file = 'recipe') {
  assertObject(recipe, `${file} recipe`);
  if (recipe.schemaVersion === RECIPE_SCHEMA_V2) {
    assertAllowedKeys(
      recipe,
      RECIPE_V2_ROOT_KEYS,
      RECIPE_V2_REQUIRED_ROOT_KEYS,
      `${file} recipe`,
    );
    validateV2Shape(recipe, file);
  } else {
    assert(false, `${file} has unsupported schemaVersion`);
  }
  assertNonEmptyString(recipe.id, `${file} id`);
  assertNonEmptyString(recipe.version, `${file} version`);

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

  if ('fallback' in recipe) {
    assert(
      recipe.id === 'project-recap',
      `${file} fallback is allowed only for project-recap`,
    );
    assertObject(recipe.fallback, `${file} fallback`);
    assertExactKeys(recipe.fallback, FALLBACK_KEYS, `${file} fallback`);
    assert(
      recipe.fallback.mode === 'deterministic-markdown' &&
        recipe.fallback.selection === 'explicit' &&
        recipe.fallback.authoring === 'markdown' &&
        recipe.fallback.scope === 'portfolio',
      `${file} has an unsupported fallback policy`,
    );
  }

  validateDiscoveryLimits(recipe.discoveryLimits, file);
  return recipe;
}

function validateV2Shape(recipe, file) {
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
    assert(
      AUTHORING_TYPES.has(artifact.authoring),
      `${file} floor has unsupported authoring`,
    );
    assertNonEmptyString(artifact.template, `${file} floor template`);
    assertNonEmptyString(artifact.briefRef, `${file} floor briefRef`);
    assert(typeof artifact.required === 'boolean', `${file} floor required`);
    assertUniqueNonEmptyStrings(
      artifact.requiredNarrative,
      `${file} floor requiredNarrative`,
    );
  }
  assertUnique(floorIds, `${file} floor ids`);

  assertObject(recipe.expansion, `${file} expansion`);
  assertExactKeys(recipe.expansion, EXPANSION_KEYS, `${file} expansion`);
  assert(
    Array.isArray(recipe.expansion.profiles),
    `${file} expansion profiles must be an array`,
  );
  const profileIds = [];
  for (const profile of recipe.expansion.profiles) {
    assertObject(profile, `${file} expansion profile`);
    assertAllowedKeys(
      profile,
      PROFILE_KEYS,
      PROFILE_REQUIRED_KEYS,
      `${file} expansion profile`,
    );
    assertSafeId(profile.profileId, `${file} expansion profileId`);
    profileIds.push(profile.profileId);
    assert(
      !floorIds.includes(profile.profileId),
      `${file} expansion profileId collides with floor id`,
    );
    assert(
      ARTIFACT_TYPES.has(profile.type),
      `${file} expansion profile has unsupported type`,
    );
    assert(
      AUTHORING_TYPES.has(profile.authoring),
      `${file} expansion profile has unsupported authoring`,
    );
    assertNonEmptyString(
      profile.briefRef,
      `${file} expansion profile briefRef`,
    );
    assertFiniteCount(profile.maxCount, `${file} expansion profile maxCount`);
    if ('allowedJustificationKinds' in profile) {
      assertUniqueNonEmptyStrings(
        profile.allowedJustificationKinds,
        `${file} expansion profile allowedJustificationKinds`,
      );
    }
    if (profile.authoring === 'html' || 'shell' in profile) {
      assertNonEmptyString(
        profile.shell,
        `${file} expansion profile ${profile.profileId} shell`,
      );
    }
  }
  assertUnique(profileIds, `${file} expansion profileIds`);

  assertObject(recipe.expansion.limits, `${file} expansion limits`);
  assertAllowedKeys(
    recipe.expansion.limits,
    EXPANSION_LIMIT_KEYS,
    ['maxArtifacts'],
    `${file} expansion limits`,
  );
  assertFiniteCount(
    recipe.expansion.limits.maxArtifacts,
    `${file} expansion maxArtifacts`,
  );
  if ('maxPerType' in recipe.expansion.limits) {
    assertObject(
      recipe.expansion.limits.maxPerType,
      `${file} expansion maxPerType`,
    );
    for (const [type, limit] of Object.entries(
      recipe.expansion.limits.maxPerType,
    )) {
      assert(
        ARTIFACT_TYPES.has(type),
        `${file} expansion maxPerType has unsupported type`,
      );
      assertFiniteCount(limit, `${file} expansion maxPerType ${type}`);
    }
  }
}

function validateDiscoveryLimits(discoveryLimits, file) {
  assertObject(discoveryLimits, `${file} discoveryLimits`);
  assertExactKeys(
    discoveryLimits,
    DISCOVERY_LIMIT_KEYS,
    `${file} discoveryLimits`,
  );
  assert(
    discoveryLimits.consecutiveNoNewFindingsRounds === 2,
    `${file} discovery must stop after exactly two no-new-findings rounds`,
  );
  assert(
    Number.isInteger(discoveryLimits.maxRounds) &&
      discoveryLimits.maxRounds >= 2,
    `${file} discovery maxRounds must be an integer of at least two`,
  );
}

function assertObject(value, label) {
  assert(isObject(value), `${label} must be an object`);
}

function assertExactKeys(value, expected, label) {
  const matches = hasExactKeys(value, expected);
  assert(matches, `${label} has unknown or missing keys`);
}

function assertAllowedKeys(value, allowed, required, label) {
  const actual = Object.keys(value);
  assert(
    actual.every((key) => allowed.includes(key)) &&
      required.every((key) => key in value),
    `${label} has unknown or missing keys`,
  );
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
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

function assertFiniteCount(value, label) {
  assert(
    Number.isInteger(value) && Number.isFinite(value) && value >= 0,
    `${label} must be a finite non-negative integer`,
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
