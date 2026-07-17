import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  loadRecipe,
  shouldStopDiscovery,
  validateContentModel,
  validateSourceBindings,
} from '../scripts/lib/recipes.mjs';

const RECAP_SECTIONS = [
  'original-request',
  'key-agent-decisions',
  'as-built-architecture',
  'implementation-record',
  'validation-evidence',
  'outcome',
];

function contentModel(recipe, overrides = {}) {
  return {
    artifactId: recipe.artifacts[0].id,
    sections: recipe.requiredNarrative.map((id) => ({
      id,
      content: `Content for ${id}.`,
    })),
    ...overrides,
  };
}

test('loads each supported recipe by exact id and version', () => {
  for (const id of ['project-explainer', 'project-recap', 'engineer-tour']) {
    const recipe = loadRecipe(id, '1');
    assert.equal(recipe.id, id);
    assert.equal(recipe.version, '1');
    assert.equal(recipe.schemaVersion, 'explainer-kit.recipe/v1');
  }
});

test('rejects unsupported recipe ids and versions with the contract error', () => {
  assert.throws(
    () => loadRecipe('program-recap', '1'),
    (error) =>
      error.code === 'E_RECIPE_UNSUPPORTED' &&
      /program-recap@1/.test(error.message),
  );
  assert.throws(
    () => loadRecipe('project-recap', '2'),
    (error) =>
      error.code === 'E_RECIPE_UNSUPPORTED' &&
      /project-recap@2/.test(error.message),
  );
});

test('source-role bindings are closed and enforce declared kinds', () => {
  const recipe = loadRecipe('project-explainer', '1');
  assert.deepEqual(validateSourceBindings(recipe, []), {
    valid: false,
    errors: ['Missing required source role: project'],
  });
  assert.deepEqual(
    validateSourceBindings(recipe, [
      { role: 'project', kind: 'directory', locator: '/repo' },
    ]),
    { valid: true, errors: [] },
  );
  assert.deepEqual(
    validateSourceBindings(recipe, [
      { role: 'project', kind: 'session', locator: 'session-1' },
      { role: 'private-oat-state', kind: 'directory', locator: '.oat' },
    ]),
    {
      valid: false,
      errors: [
        'Source role project does not accept kind session',
        'Unknown source role: private-oat-state',
      ],
    },
  );
});

test('project recap binds exactly one project source set', () => {
  const recipe = loadRecipe('project-recap', '1');
  const oneProject = [{ role: 'project', kind: 'directory', locator: '/repo' }];

  assert.deepEqual(validateSourceBindings(recipe, oneProject), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateSourceBindings(recipe, []), {
    valid: false,
    errors: ['Missing required source role: project'],
  });
  assert.deepEqual(
    validateSourceBindings(recipe, [...oneProject, ...oneProject]),
    {
      valid: false,
      errors: ['Source role project allows at most 1 binding'],
    },
  );
});

test('project recap requires all six accountability sections', () => {
  const recipe = loadRecipe('project-recap', '1');
  assert.deepEqual(recipe.requiredNarrative, RECAP_SECTIONS);
  assert.deepEqual(validateContentModel(recipe, contentModel(recipe)), {
    valid: true,
    errors: [],
  });

  const incomplete = contentModel(recipe);
  incomplete.sections.pop();
  assert.deepEqual(validateContentModel(recipe, incomplete), {
    valid: false,
    errors: ['Missing required narrative section: outcome'],
  });
});

test('content models are closed to declared artifacts and safe section content', () => {
  const recipe = loadRecipe('project-explainer', '1');
  const duplicate = contentModel(recipe);
  duplicate.sections.push({ ...duplicate.sections[0] });

  assert.deepEqual(
    validateContentModel(recipe, {
      ...contentModel(recipe),
      artifactId: 'undeclared',
    }),
    {
      valid: false,
      errors: ['Unknown recipe artifact: undeclared'],
    },
  );
  assert.deepEqual(validateContentModel(recipe, duplicate), {
    valid: false,
    errors: [`Duplicate narrative section: ${recipe.requiredNarrative[0]}`],
  });
  assert.deepEqual(
    validateContentModel(recipe, {
      ...contentModel(recipe),
      sections: [
        ...contentModel(recipe).sections.slice(1),
        {
          id: recipe.requiredNarrative[0],
          content: '<script>alert("unsafe")</script>',
        },
      ],
    }),
    {
      valid: false,
      errors: [
        `Narrative section ${recipe.requiredNarrative[0]} contains raw script content`,
      ],
    },
  );
});

test('engineer tour is a generic codebase recipe without OAT coupling', async () => {
  const recipe = loadRecipe('engineer-tour', '1');
  assert.deepEqual(recipe.sourceRoles, [
    {
      role: 'codebase',
      required: true,
      accepts: ['directory', 'git'],
      minBindings: 1,
      maxBindings: 1,
    },
  ]);
  assert.equal(recipe.artifacts[0].template, 'engineer-tour');

  const serialized = await readFile(
    new URL('../recipes/engineer-tour.json', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(serialized, /\.oat|oat-project|project-recap/i);
});

test('unknown-size discovery stops after two consecutive empty rounds', () => {
  const recipe = loadRecipe('project-explainer', '1');

  assert.equal(shouldStopDiscovery(recipe, [3, 0]), false);
  assert.equal(shouldStopDiscovery(recipe, [3, 0, 2, 0]), false);
  assert.equal(shouldStopDiscovery(recipe, [3, 0, 2, 0, 0]), true);
});

test('unknown-size discovery always stops at the recipe hard maximum', () => {
  for (const id of ['project-explainer', 'project-recap', 'engineer-tour']) {
    const recipe = loadRecipe(id, '1');
    const findingsByRound = Array.from(
      { length: recipe.discoveryLimits.maxRounds },
      () => 1,
    );
    assert.equal(
      shouldStopDiscovery(recipe, findingsByRound.slice(0, -1)),
      false,
      id,
    );
    assert.equal(shouldStopDiscovery(recipe, findingsByRound), true, id);
  }
});
