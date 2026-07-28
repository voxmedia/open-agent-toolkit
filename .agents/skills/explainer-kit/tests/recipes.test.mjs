import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  evaluateExpansionProposals,
  loadRecipe,
  recipeExpansion,
  recipeFloor,
  recipeRequiredNarrative,
  selectRecipeAuthoring,
  shouldStopDiscovery,
  validateContentModel,
  validatePlannedPortfolio,
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
        authoring: 'html',
        template: 'house-style',
        briefRef: 'briefs/project-recap.md',
        requiredNarrative: RECAP_SECTIONS,
      },
      additionalFloor: [
        {
          id: 'architecture',
          type: 'diagram',
          authoring: 'html',
          template: 'diagram-shell',
          briefRef: 'briefs/supporting-diagram.md',
          requiredNarrative: ['as-built-architecture'],
        },
        {
          id: 'deck',
          type: 'deck',
          authoring: 'html',
          template: 'deck-shell',
          briefRef: 'briefs/walkthrough-deck.md',
          requiredNarrative: ['outcome'],
        },
      ],
      profiles: [
        {
          profileId: 'status-view',
          type: 'explainer',
          authoring: 'html',
          briefRef: 'briefs/project-recap.md',
          shell: 'house-style',
          maxCount: 1,
          allowedJustificationKinds: ['status-change'],
        },
        {
          profileId: 'rollout-view',
          type: 'explainer',
          authoring: 'html',
          briefRef: 'briefs/project-recap.md',
          shell: 'house-style',
          maxCount: 1,
          allowedJustificationKinds: ['rollout-complexity'],
        },
        {
          profileId: 'deep-dive',
          type: 'explainer',
          authoring: 'markdown',
          briefRef: 'briefs/deep-dive.md',
          maxCount: 3,
          allowedJustificationKinds: ['source-backed-detail'],
        },
      ],
      maxArtifacts: 5,
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
    assert.equal(floor.length, 1 + (expected.additionalFloor?.length ?? 0), id);
    assert.deepEqual(
      floor,
      [expected.floor, ...(expected.additionalFloor ?? [])].map((artifact) => ({
        ...artifact,
        required: true,
      })),
      id,
    );
    assert.deepEqual(expansion.profiles, expected.profiles, id);
    assert.equal(expansion.limits.maxArtifacts, expected.maxArtifacts, id);

    for (const briefRef of [
      ...floor.map(({ briefRef }) => briefRef),
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

test('html expansion profiles require shells while markdown profiles do not', () => {
  const missingHtmlShell = recipeV2();
  delete missingHtmlShell.expansion.profiles[0].shell;
  assert.throws(
    () => validateRecipe(missingHtmlShell, 'missing-html-shell'),
    /supporting-diagram.*shell.*non-empty string/i,
  );

  const markdownWithoutShell = recipeV2();
  assert.equal('shell' in markdownWithoutShell.expansion.profiles[1], false);
  assert.equal(
    validateRecipe(markdownWithoutShell, 'markdown-without-shell'),
    markdownWithoutShell,
  );
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

test('a declared type cap binds across profiles that share one artifact type', () => {
  const recipe = recipeV2();
  // Two profiles produce the same artifact type, and the recipe caps that type
  // below what the two per-profile caps would allow on their own.
  recipe.expansion.profiles = [
    {
      profileId: 'supporting-diagram',
      type: 'diagram',
      authoring: 'html',
      briefRef: 'briefs/supporting-diagram.md',
      shell: 'diagram-shell',
      maxCount: 3,
    },
    {
      profileId: 'context-diagram',
      type: 'diagram',
      authoring: 'html',
      briefRef: 'briefs/supporting-diagram.md',
      shell: 'diagram-shell',
      maxCount: 3,
    },
  ];
  recipe.expansion.limits = { maxArtifacts: 6, maxPerType: { diagram: 2 } };

  const evaluated = evaluateExpansionProposals(recipe, [
    {
      id: 'first-diagram',
      profileId: 'supporting-diagram',
      rationale: 'Shows the ingest boundary.',
    },
    {
      id: 'second-diagram',
      profileId: 'context-diagram',
      rationale: 'Shows the surrounding systems.',
    },
    {
      id: 'third-diagram',
      profileId: 'supporting-diagram',
      rationale: 'Would exceed the declared diagram cap.',
    },
    {
      id: 'fourth-diagram',
      profileId: 'context-diagram',
      rationale: 'Spreads across a sibling profile to evade the cap.',
    },
  ]);

  assert.equal(evaluated.valid, true, JSON.stringify(evaluated.errors));
  assert.deepEqual(
    evaluated.accepted.map(({ id }) => id),
    ['first-diagram', 'second-diagram'],
  );
  assert.deepEqual(
    evaluated.rejected.map(({ id, status, reason }) => ({
      id,
      status,
      reason,
    })),
    [
      { id: 'third-diagram', status: 'rejected', reason: 'type-limit' },
      { id: 'fourth-diagram', status: 'rejected', reason: 'type-limit' },
    ],
  );
  assert.deepEqual(evaluated.warnings, ['expansion-type-limit-exceeded']);
});

test('an undeclared type is unconstrained and per-profile caps still apply', () => {
  const recipe = recipeV2();
  recipe.expansion.limits = { maxArtifacts: 4, maxPerType: { deck: 1 } };
  recipe.expansion.profiles[1].maxCount = 2;

  const evaluated = evaluateExpansionProposals(recipe, [
    {
      id: 'storage-deep-dive',
      profileId: 'deep-dive',
      rationale: 'Storage warrants its own page.',
    },
    {
      id: 'api-deep-dive',
      profileId: 'deep-dive',
      rationale: 'The API surface warrants its own page.',
    },
    {
      id: 'third-deep-dive',
      profileId: 'deep-dive',
      rationale: 'Exceeds the profile cap, not a type cap.',
    },
  ]);

  assert.deepEqual(
    evaluated.accepted.map(({ id }) => id),
    ['storage-deep-dive', 'api-deep-dive'],
  );
  assert.deepEqual(evaluated.warnings, ['expansion-profile-limit-exceeded']);
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
  const artifact = recipeFloor(recipe).find(({ id }) => id === 'project-recap');
  assert.deepEqual(
    recipeRequiredNarrative(recipe, artifact.id),
    RECAP_SECTIONS,
  );
});

test('project recap exposes an explicit deterministic Markdown fallback', () => {
  const recipe = loadRecipe('project-recap', '1');
  assert.deepEqual(recipe.fallback, {
    mode: 'deterministic-markdown',
    selection: 'explicit',
    authoring: 'markdown',
    scope: 'portfolio',
  });

  assert.deepEqual(
    recipeFloor(selectRecipeAuthoring(recipe)),
    recipeFloor(recipe),
    'default selection remains artistic',
  );

  const fallback = selectRecipeAuthoring(recipe, 'deterministic-markdown');
  assert.ok(
    recipeFloor(fallback).every(({ authoring }) => authoring === 'markdown'),
  );
  assert.ok(
    fallback.expansion.profiles.every(
      ({ authoring, shell }) => authoring === 'markdown' && shell === undefined,
    ),
  );

  const openPolicy = structuredClone(recipe);
  openPolicy.fallback.automatic = true;
  assert.throws(
    () => validateRecipe(openPolicy, 'open-fallback'),
    /fallback has unknown or missing keys/,
  );
});

test('project recap requires the adaptive visual minimum and source-backed optional profiles', () => {
  const recipe = loadRecipe('project-recap', '1');
  assert.deepEqual(
    recipeFloor(recipe).map(({ id, type, authoring, template, required }) => ({
      id,
      type,
      authoring,
      template,
      required,
    })),
    [
      {
        id: 'project-recap',
        type: 'hub',
        authoring: 'html',
        template: 'house-style',
        required: true,
      },
      {
        id: 'architecture',
        type: 'diagram',
        authoring: 'html',
        template: 'diagram-shell',
        required: true,
      },
      {
        id: 'deck',
        type: 'deck',
        authoring: 'html',
        template: 'deck-shell',
        required: true,
      },
    ],
  );
  assert.deepEqual(
    recipeExpansion(recipe).profiles.map(
      ({ profileId, allowedJustificationKinds }) => ({
        profileId,
        allowedJustificationKinds,
      }),
    ),
    [
      {
        profileId: 'status-view',
        allowedJustificationKinds: ['status-change'],
      },
      {
        profileId: 'rollout-view',
        allowedJustificationKinds: ['rollout-complexity'],
      },
      {
        profileId: 'deep-dive',
        allowedJustificationKinds: ['source-backed-detail'],
      },
    ],
  );

  const optional = {
    artifactId: 'migration-status',
    artifactType: 'explainer',
    profileId: 'status-view',
    required: false,
    sourceIds: ['implementation'],
    draft: 'Show the current migration status.',
    visualIntent: 'Make status legible at a glance.',
    justification: {
      kind: 'status-change',
      sourceIds: ['implementation'],
      rationale: 'The source records a material status transition.',
    },
  };
  assert.deepEqual(validatePlannedPortfolio(recipe, [optional]), {
    valid: true,
    errors: [],
  });
  for (const [label, mutate] of [
    [
      'wrong kind',
      (artifact) => {
        artifact.justification.kind = 'rollout-complexity';
      },
    ],
    [
      'missing justification',
      (artifact) => {
        delete artifact.justification;
      },
    ],
  ]) {
    const artifact = structuredClone(optional);
    mutate(artifact);
    const result = validatePlannedPortfolio(recipe, [artifact]);
    assert.equal(result.valid, false, label);
  }
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
