import assert from 'node:assert/strict';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  RECIPES,
  loadRecipe,
  recipeFloor,
  recipeRequiredNarrative,
} from '../scripts/lib/recipes.mjs';

const SKILL_ROOT = fileURLToPath(new URL('..', import.meta.url));
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

const EXPECTED_NARRATIVE = {
  'project-recap': [
    'original-request',
    'key-agent-decisions',
    'as-built-architecture',
    'implementation-record',
    'validation-evidence',
    'outcome',
  ],
  'program-recap': [
    'program-overview',
    'wave-map',
    'per-wave-outcomes',
    'convention-evolution',
    'aggregate-numbers',
    'follow-up-ledger',
  ],
  'project-explainer': [
    'planned-architecture',
    'decisions',
    'risks',
    'phases',
    'validation-approach',
  ],
};

test('loads the four retained recipes and their existing floor assets', async () => {
  assert.deepEqual([...RECIPES.keys()].sort(), [
    'engineer-tour@1',
    'program-recap@1',
    'project-explainer@1',
    'project-recap@2',
  ]);

  for (const [id, version] of [
    ['project-recap', '2'],
    ['program-recap', '1'],
    ['project-explainer', '1'],
    ['engineer-tour', '1'],
  ]) {
    const recipe = loadRecipe(id, version);
    assert.deepEqual(Object.keys(recipe).sort(), [
      'floor',
      'id',
      'schemaVersion',
      'sourceRoles',
      'version',
    ]);
    for (const floor of recipeFloor(recipe)) {
      assert.deepEqual(Object.keys(floor).sort(), [
        'briefRef',
        'id',
        'requiredNarrative',
        'template',
        'type',
      ]);
      const template = join(SKILL_ROOT, 'templates', `${floor.template}.html`);
      const brief = join(SKILL_ROOT, floor.briefRef);
      assert.ok((await readFile(template, 'utf8')).length > 0, template);
      assert.ok((await readFile(brief, 'utf8')).length > 0, brief);
    }
  }
});

test('returns the required narrative for each recap recipe', () => {
  for (const [id, sections] of Object.entries(EXPECTED_NARRATIVE)) {
    const version = id === 'project-recap' ? '2' : '1';
    const recipe = loadRecipe(id, version);
    assert.deepEqual(
      recipeRequiredNarrative(recipe, recipeFloor(recipe)[0].id),
      sections,
      id,
    );
  }
});

test('the internal validator rejects a retired authoring key', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'explainer-recipes-'));
  tempDirs.push(scratch);
  const skillRoot = join(scratch, 'skill');
  const libRoot = join(skillRoot, 'scripts', 'lib');
  const recipesRoot = join(skillRoot, 'recipes');
  await mkdir(libRoot, { recursive: true });
  await mkdir(recipesRoot, { recursive: true });
  await copyFile(
    join(SKILL_ROOT, 'scripts', 'lib', 'recipes.mjs'),
    join(libRoot, 'recipes.mjs'),
  );

  for (const key of RECIPES.keys()) {
    const [id, version] = key.split('@');
    const filename =
      id === 'project-recap' && version === '2'
        ? 'project-recap.v2.json'
        : `${id}.json`;
    const source = join(SKILL_ROOT, 'recipes', filename);
    const recipe = JSON.parse(await readFile(source, 'utf8'));
    if (id === 'project-recap') recipe.authoring = 'html';
    await writeFile(
      join(recipesRoot, basename(filename)),
      `${JSON.stringify(recipe)}\n`,
    );
  }

  await assert.rejects(
    import(`${pathToFileURL(join(libRoot, 'recipes.mjs')).href}?invalid=1`),
    /unknown or missing keys/,
  );
});
