import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  evaluateExpansionProposals,
  loadRecipe,
  recipeExpansion,
  recipeFloor,
  recipeRequiredNarrative,
  shouldStopDiscovery,
  validateContentModel,
  validateRecipe,
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
const PROGRAM_RECAP_SECTIONS = [
  'program-overview',
  'wave-map',
  'per-wave-outcomes',
  'convention-evolution',
  'aggregate-numbers',
  'follow-up-ledger',
];

function contentModel(recipe, overrides = {}) {
  const artifact = recipeFloor(recipe)[0];
  return {
    artifactId: artifact.id,
    sections: recipeRequiredNarrative(recipe, artifact.id).map((id) => ({
      id,
      content: `Content for ${id}.`,
    })),
    ...overrides,
  };
}

function recipeV2() {
  return {
    schemaVersion: 'explainer-kit.recipe/v2',
    id: 'synthetic-recipe',
    version: '1',
    sourceRoles: [
      {
        role: 'project',
        required: true,
        accepts: ['file', 'directory', 'git', 'github'],
        minBindings: 1,
        maxBindings: 1,
      },
    ],
    floor: [
      {
        id: 'synthetic-recipe',
        type: 'hub',
        template: 'house-style',
        required: true,
        authoring: 'markdown',
        briefRef: 'briefs/project-explainer.md',
        requiredNarrative: ['planned-architecture', 'decisions', 'risks'],
      },
    ],
    expansion: {
      profiles: [
        {
          profileId: 'supporting-diagram',
          type: 'diagram',
          authoring: 'html',
          briefRef: 'briefs/supporting-diagram.md',
          shell: 'diagram-shell',
          maxCount: 1,
        },
        {
          profileId: 'deep-dive',
          type: 'explainer',
          authoring: 'markdown',
          briefRef: 'briefs/deep-dive.md',
          maxCount: 2,
        },
      ],
      limits: { maxArtifacts: 2 },
    },
    discoveryLimits: {
      consecutiveNoNewFindingsRounds: 2,
      maxRounds: 8,
    },
  };
}

test('loads each supported recipe by exact id and version', () => {
  for (const id of [
    'project-explainer',
    'project-recap',
    'engineer-tour',
    'program-recap',
  ]) {
    const recipe = loadRecipe(id, '1');
    assert.equal(recipe.id, id);
    assert.equal(recipe.version, '1');
    assert.equal(recipe.schemaVersion, 'explainer-kit.recipe/v2');
  }
});

test('bundled v2 recipes preserve floors and declare bounded expansion policy', async () => {
  const expectations = {
    'project-recap': {
      floor: {
        id: 'project-recap',
        type: 'hub',
        authoring: 'markdown',
        template: 'house-style',
        briefRef: 'briefs/project-recap.md',
        requiredNarrative: RECAP_SECTIONS,
      },
      profiles: [
        {
          profileId: 'supporting-diagram',
          type: 'diagram',
          authoring: 'html',
          briefRef: 'briefs/supporting-diagram.md',
          shell: 'diagram-shell',
          maxCount: 4,
        },
        {
          profileId: 'deep-dive',
          type: 'explainer',
          authoring: 'markdown',
          briefRef: 'briefs/deep-dive.md',
          maxCount: 3,
        },
        {
          profileId: 'walkthrough-deck',
          type: 'deck',
          authoring: 'html',
          briefRef: 'briefs/walkthrough-deck.md',
          shell: 'deck-shell',
          maxCount: 1,
        },
      ],
      maxArtifacts: 6,
    },
    'program-recap': {
      floor: {
        id: 'program-recap',
        type: 'hub',
        authoring: 'markdown',
        template: 'house-style',
        briefRef: 'briefs/program-recap.md',
        requiredNarrative: PROGRAM_RECAP_SECTIONS,
      },
      profiles: [
        {
          profileId: 'supporting-diagram',
          type: 'diagram',
          authoring: 'html',
          briefRef: 'briefs/supporting-diagram.md',
          shell: 'diagram-shell',
          maxCount: 3,
        },
        {
          profileId: 'project-page',
          type: 'explainer',
          authoring: 'markdown',
          briefRef: 'briefs/project-page.md',
          maxCount: 12,
        },
      ],
      maxArtifacts: 12,
    },
    'project-explainer': {
      floor: {
        id: 'project-explainer',
        type: 'hub',
        authoring: 'markdown',
        template: 'house-style',
        briefRef: 'briefs/project-explainer.md',
        requiredNarrative: [
          'planned-architecture',
          'decisions',
          'risks',
          'phases',
          'validation-approach',
        ],
      },
      profiles: [
        {
          profileId: 'supporting-diagram',
          type: 'diagram',
          authoring: 'html',
          briefRef: 'briefs/supporting-diagram.md',
          shell: 'diagram-shell',
          maxCount: 4,
        },
      ],
      maxArtifacts: 4,
    },
    'engineer-tour': {
      floor: {
        id: 'engineer-tour',
        type: 'explainer',
        authoring: 'html',
        template: 'engineer-tour',
        briefRef: 'briefs/engineer-tour.md',
        requiredNarrative: [
          'orientation',
          'architecture',
          'execution-flow',
          'key-code',
          'validation',
        ],
      },
      profiles: [
        {
          profileId: 'supporting-diagram',
          type: 'diagram',
          authoring: 'html',
          briefRef: 'briefs/supporting-diagram.md',
          shell: 'diagram-shell',
          maxCount: 4,
        },
      ],
      maxArtifacts: 4,
    },
  };
  const briefRefs = new Set();

  for (const [id, expected] of Object.entries(expectations)) {
    const recipe = loadRecipe(id, '1');
    const floor = recipeFloor(recipe);
    const expansion = recipeExpansion(recipe);

    assert.equal(recipe.version, '1', id);
    assert.equal(floor.length, 1, id);
    assert.deepEqual(floor[0], { ...expected.floor, required: true }, id);
    assert.deepEqual(expansion.profiles, expected.profiles, id);
    assert.equal(expansion.limits.maxArtifacts, expected.maxArtifacts, id);

    for (const briefRef of [
      floor[0].briefRef,
      ...expansion.profiles.map(({ briefRef }) => briefRef),
    ]) {
      briefRefs.add(briefRef);
      assert.ok(
        (
          await readFile(new URL(`../${briefRef}`, import.meta.url), 'utf8')
        ).trim().length > 0,
        briefRef,
      );
    }
  }

  assert.equal(briefRefs.size, 8);
});

test('validates recipe v2 and rejects retired schema shapes', () => {
  const v2 = recipeV2();

  assert.equal(validateRecipe(v2, 'synthetic-v2'), v2);
  assert.deepEqual(recipeRequiredNarrative(v2, recipeFloor(v2)[0].id), [
    'planned-architecture',
    'decisions',
    'risks',
  ]);
  assert.equal(recipeExpansion(v2).profiles.length, 2);
  assert.throws(
    () =>
      validateRecipe(
        {
          ...v2,
          schemaVersion: 'explainer-kit.recipe/unsupported',
        },
        'retired-shape',
      ),
    /unsupported schemaVersion/,
  );
});

// Floor coverage degrades to a guideline-checker warning (p05-t01), so this
// contract layer stays silent by design.
test('recipe v2 narrative coverage is not a content-model hard error', () => {
  const recipe = recipeV2();
  assert.deepEqual(validateContentModel(recipe, contentModel(recipe)), {
    valid: true,
    errors: [],
  });

  const incomplete = contentModel(recipe);
  incomplete.sections.pop();
  assert.deepEqual(validateContentModel(recipe, incomplete), {
    valid: true,
    errors: [],
  });
});

test('recipe v2 rejects malformed profiles, ids, types, and finite caps', () => {
  const cases = [
    [
      'undeclared type',
      (recipe) => {
        recipe.expansion.profiles[0].type = 'narrative-page';
      },
      /unsupported type/,
    ],
    [
      'duplicate profileId',
      (recipe) => {
        recipe.expansion.profiles[1].profileId =
          recipe.expansion.profiles[0].profileId;
      },
      /profileIds must be unique/,
    ],
    [
      'floor/profile id collision',
      (recipe) => {
        recipe.expansion.profiles[0].profileId = recipe.floor[0].id;
      },
      /collides with floor id/,
    ],
    [
      'missing maxCount',
      (recipe) => {
        delete recipe.expansion.profiles[0].maxCount;
      },
      /unknown or missing keys/,
    ],
    [
      'missing maxArtifacts',
      (recipe) => {
        delete recipe.expansion.limits.maxArtifacts;
      },
      /unknown or missing keys/,
    ],
    [
      'non-finite maxCount',
      (recipe) => {
        recipe.expansion.profiles[0].maxCount = Number.POSITIVE_INFINITY;
      },
      /finite non-negative integer/,
    ],
  ];

  for (const [label, mutate, expected] of cases) {
    const recipe = recipeV2();
    mutate(recipe);
    assert.throws(() => validateRecipe(recipe, label), expected, label);
  }
});

test('expansion proposals reject over-limit entries without making floor misses errors', () => {
  const recipe = recipeV2();
  const thinContent = contentModel(recipe);
  thinContent.sections.pop();
  assert.deepEqual(validateContentModel(recipe, thinContent), {
    valid: true,
    errors: [],
  });

  const empty = evaluateExpansionProposals(recipe, []);
  assert.deepEqual(empty, {
    valid: true,
    accepted: [],
    rejected: [],
    warnings: [],
    errors: [],
  });

  const evaluated = evaluateExpansionProposals(recipe, [
    {
      id: 'architecture-overview',
      profileId: 'supporting-diagram',
      rationale: 'Show the main boundaries.',
    },
    {
      id: 'architecture-detail',
      profileId: 'supporting-diagram',
      rationale: 'Show the internal flow.',
    },
    {
      id: 'storage-deep-dive',
      profileId: 'deep-dive',
      rationale: 'Explain persistence choices.',
    },
    {
      id: 'api-deep-dive',
      profileId: 'deep-dive',
      rationale: 'Explain the public interface.',
    },
  ]);

  assert.equal(evaluated.valid, true);
  assert.deepEqual(
    evaluated.accepted.map(({ id }) => id),
    ['architecture-overview', 'storage-deep-dive'],
  );
  assert.deepEqual(
    evaluated.rejected.map(({ id, status, reason }) => ({
      id,
      status,
      reason,
    })),
    [
      {
        id: 'architecture-detail',
        status: 'rejected',
        reason: 'profile-limit',
      },
      {
        id: 'api-deep-dive',
        status: 'rejected',
        reason: 'recipe-limit',
      },
    ],
  );
  assert.deepEqual(evaluated.warnings, [
    'expansion-profile-limit-exceeded',
    'expansion-artifact-limit-exceeded',
  ]);
});

test('malformed expansion proposals remain hard validation errors', () => {
  const recipe = recipeV2();
  const evaluated = evaluateExpansionProposals(recipe, [
    {
      id: recipe.floor[0].id,
      profileId: 'supporting-diagram',
      rationale: 'Collides with the floor.',
    },
    {
      id: 'Unsafe ID',
      profileId: 'supporting-diagram',
      rationale: 'Not a safe slug.',
    },
    {
      id: 'unknown-profile',
      profileId: 'missing-profile',
      rationale: 'References missing policy.',
    },
    {
      id: 'unknown-profile',
      profileId: 'deep-dive',
      rationale: 'Duplicates an earlier proposal id.',
    },
  ]);

  assert.equal(evaluated.valid, false);
  assert.deepEqual(evaluated.errors, [
    `Expansion artifact id collides with floor: ${recipe.floor[0].id}`,
    'Unsafe expansion artifact id: Unsafe ID',
    'Unknown expansion profile: missing-profile',
    'Duplicate expansion artifact id: unknown-profile',
  ]);
});

test('rejects unsupported recipe ids and versions with the contract error', () => {
  assert.throws(
    () => loadRecipe('future-recap', '1'),
    (error) =>
      error.code === 'E_RECIPE_UNSUPPORTED' &&
      /future-recap@1/.test(error.message),
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

test('project recap declares all six accountability sections', () => {
  const recipe = loadRecipe('project-recap', '1');
  const artifact = recipeFloor(recipe)[0];
  assert.deepEqual(
    recipeRequiredNarrative(recipe, artifact.id),
    RECAP_SECTIONS,
  );
});

test('program recap binds one program and requires its six birdseye sections', () => {
  const recipe = loadRecipe('program-recap', '1');
  const artifact = recipeFloor(recipe)[0];
  const oneProgram = [{ role: 'program', kind: 'directory', locator: '/repo' }];

  assert.deepEqual(
    recipeRequiredNarrative(recipe, artifact.id),
    PROGRAM_RECAP_SECTIONS,
  );
  assert.deepEqual(validateSourceBindings(recipe, oneProgram), {
    valid: true,
    errors: [],
  });
  assert.deepEqual(validateSourceBindings(recipe, []), {
    valid: false,
    errors: ['Missing required source role: program'],
  });
  assert.deepEqual(validateContentModel(recipe, contentModel(recipe)), {
    valid: true,
    errors: [],
  });
});

test('content models are closed to declared artifacts and safe section content', () => {
  const recipe = loadRecipe('project-explainer', '1');
  const artifact = recipeFloor(recipe)[0];
  const requiredNarrative = recipeRequiredNarrative(recipe, artifact.id);
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
    errors: [`Duplicate narrative section: ${requiredNarrative[0]}`],
  });
  assert.deepEqual(
    validateContentModel(recipe, {
      ...contentModel(recipe),
      sections: [
        ...contentModel(recipe).sections.slice(1),
        {
          id: requiredNarrative[0],
          content: '<script>alert("unsafe")</script>',
        },
      ],
    }),
    {
      valid: false,
      errors: [
        `Narrative section ${requiredNarrative[0]} contains raw script content`,
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
  assert.equal(recipeFloor(recipe)[0].template, 'engineer-tour');

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
  for (const id of [
    'project-explainer',
    'project-recap',
    'engineer-tour',
    'program-recap',
  ]) {
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
