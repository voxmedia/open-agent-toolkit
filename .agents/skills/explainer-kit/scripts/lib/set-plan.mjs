import { canonicalHash, validateContract } from './contracts.mjs';
import { recipeExpansion, recipeFloor } from './recipes.mjs';

export async function planExplainerSet({
  recipe,
  factBase,
  discovery,
  planSet,
}) {
  const sourceIds = factBase.sources
    .map(({ id }) => id)
    .filter((id) => !id.startsWith('critic:'));
  const request = deepFreeze({
    schemaVersion: 'explainer-kit.set-plan-request/v1',
    recipe: structuredClone(recipe),
    factBase: structuredClone(factBase),
    discovery: structuredClone(discovery),
  });
  const callback =
    typeof planSet === 'function' ? planSet : createBaselineSetPlan;
  const candidate = await callback(structuredClone(request));
  const validation = validateContract('set-plan', candidate);
  if (!validation.valid) {
    throw setPlanError(
      validation.errors
        .map(({ path, code, message }) => `${path} [${code}]: ${message}`)
        .join('; '),
    );
  }
  validateAgainstInputs(candidate, { recipe, sourceIds });

  const plan = deepFreeze(structuredClone(candidate));
  const retainedRequest = deepFreeze({
    schemaVersion: request.schemaVersion,
    recipe: { id: recipe.id, version: recipe.version },
    factBaseHash: canonicalHash(factBase),
    sourceIds,
    discovery: structuredClone(discovery),
  });
  return { request: retainedRequest, plan };
}

export function plannedArtifacts(recipe, plan) {
  const floor = new Map(
    recipeFloor(recipe).map((artifact) => [artifact.id, artifact]),
  );
  const profiles = new Map(
    recipeExpansion(recipe).profiles.map((profile) => [
      profile.profileId,
      profile,
    ]),
  );
  return plan.portfolio.map((planned) => {
    const floorArtifact = floor.get(planned.artifactId);
    if (floorArtifact) {
      return {
        ...floorArtifact,
        origin: 'floor',
        shell:
          floorArtifact.authoring === 'html'
            ? floorArtifact.template
            : undefined,
        plannedArtifact: planned,
      };
    }
    const profile = profiles.get(planned.profileId);
    return {
      id: planned.artifactId,
      type: profile.type,
      authoring: profile.authoring,
      briefRef: profile.briefRef,
      shell: profile.shell,
      template:
        profile.authoring === 'markdown'
          ? templateForType(profile.type)
          : profile.shell,
      required: false,
      origin: 'expansion',
      profileId: profile.profileId,
      plannedArtifact: planned,
    };
  });
}

function createBaselineSetPlan({ recipe, factBase }) {
  const sourceIds = factBase.sources
    .map(({ id }) => id)
    .filter((id) => !id.startsWith('critic:'));
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: `${recipe.id}-set`,
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: { terminology: [], statuses: [], numbers: [] },
    portfolio: recipeFloor(recipe).map((artifact) => ({
      artifactId: artifact.id,
      artifactType: artifact.type,
      profileId: 'recipe-floor',
      required: true,
      sourceIds,
      draft: `Compose ${artifact.id} from the reconciled fact base.`,
      visualIntent: 'Follow the bundled brief and selected medium.',
    })),
  };
}

function validateAgainstInputs(plan, { recipe, sourceIds }) {
  if (plan.recipe.id !== recipe.id || plan.recipe.version !== recipe.version) {
    throw setPlanError('Set plan recipe does not match the active recipe.');
  }
  const availableSources = new Set(sourceIds);
  for (const sourceId of plan.sourceIds) {
    if (!availableSources.has(sourceId)) {
      throw setPlanError(
        `Set plan references unknown reconciled source ${sourceId}.`,
      );
    }
  }

  const plannedById = new Map(
    plan.portfolio.map((artifact) => [artifact.artifactId, artifact]),
  );
  for (const floorArtifact of recipeFloor(recipe)) {
    const planned = plannedById.get(floorArtifact.id);
    if (
      !planned ||
      planned.required !== true ||
      planned.artifactType !== floorArtifact.type
    ) {
      throw setPlanError(
        `Set plan is missing required draft ${floorArtifact.id}.`,
      );
    }
  }

  const floorIds = new Set(recipeFloor(recipe).map(({ id }) => id));
  const profiles = new Map(
    recipeExpansion(recipe).profiles.map((profile) => [
      profile.profileId,
      profile,
    ]),
  );
  for (const artifact of plan.portfolio) {
    if (floorIds.has(artifact.artifactId)) continue;
    const profile = profiles.get(artifact.profileId);
    if (
      !profile ||
      artifact.required !== false ||
      artifact.artifactType !== profile.type
    ) {
      throw setPlanError(
        `Optional artifact ${artifact.artifactId} does not match an allowed recipe profile.`,
      );
    }
  }
}

function templateForType(type) {
  return (
    {
      hub: 'house-style',
      diagram: 'diagram-shell',
      explainer: 'engineer-tour',
      deck: 'deck-shell',
    }[type] ?? 'house-style'
  );
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function setPlanError(message) {
  const error = new Error(`Invalid set plan: ${message}`);
  error.code = 'E_SET_PLAN';
  return error;
}
