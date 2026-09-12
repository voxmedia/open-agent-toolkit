import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runBundle } from '../scripts/bundle.mjs';
import { validateContract } from '../scripts/lib/contracts.mjs';
import { enforceRunPackageInventory } from '../scripts/lib/package-coverage.mjs';
import { loadRecipe } from '../scripts/lib/recipes.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';
import { runRecord } from '../scripts/record.mjs';
import { runVerify } from '../scripts/verify.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(here, '..');
const suppliedFactBaseFixture = join(
  here,
  'fixtures',
  'bundle',
  'fact-base.json',
);

async function prepareFrontDoor(t, name) {
  const root = await mkdtemp(join(tmpdir(), `explainer-front-door-${name}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runRoot = join(root, 'run');
  const themePath = join(root, 'theme.json');
  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`);
  return { root, runRoot, themePath };
}

async function authorFromBundle(runRoot, recipeId) {
  const recipeVersion = recipeId === 'project-recap' ? '2' : '1';
  const recipe = loadRecipe(recipeId, recipeVersion);
  const floor = recipe.floor[0];
  const [template, ledger] = await Promise.all([
    readFile(join(skillRoot, 'templates', `${floor.template}.html`), 'utf8'),
    readJson(join(runRoot, 'source/ledger.json')),
  ]);
  const terms = (ledger.terminology ?? [])
    .map(({ term }) => `<li>${escapeHtml(term)}</li>`)
    .join('');
  const claims = (ledger.claims ?? [])
    .map(
      ({ subject, value }) =>
        `<tr><td>${escapeHtml(subject)}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const sections = floor.requiredNarrative
    .map((id, index) => {
      const evidence =
        index === 0
          ? `<ul>${terms}</ul>`
          : index === floor.requiredNarrative.length - 1 && claims
            ? `<table><tbody>${claims}</tbody></table>`
            : '<p>Source-grounded explanation for this section.</p>';
      return `<section id="${id}"><h2>${title(id)}</h2>${evidence}</section>`;
    })
    .join('');
  const navigation = floor.requiredNarrative
    .map((id) => `<a href="#${id}">${title(id)}</a>`)
    .join('');
  const page = template
    .replaceAll('{{THEME_CSS}}', 'color-scheme: light;')
    .replaceAll('{{TITLE}}', 'Front-door explainer')
    .replaceAll(
      '{{DESCRIPTION}}',
      'A source-grounded artifact produced from explicitly supplied inputs.',
    )
    .replaceAll('{{EYEBROW}}', 'Explainer Kit')
    .replaceAll('{{NAVIGATION}}', navigation)
    .replaceAll('{{CONTENT}}', sections)
    .replaceAll('{{FOOTER}}', 'Generated from the prepared fact base.');
  await mkdir(join(runRoot, 'site'), { recursive: true });
  await writeFile(join(runRoot, 'site/index.html'), page);
}

async function completeFrontDoorRun({ runRoot, bundleArgs, slug }) {
  const bundle = await runBundle(bundleArgs, { log() {} });
  assert.equal(bundle.reuse, false);
  await authorFromBundle(runRoot, 'project-recap');
  const qa = await runVerify(
    ['--run-root', runRoot, '--recipe', 'project-recap', '--rung', 'none'],
    { log() {} },
  );
  assert.equal(
    Object.values(qa.checks).every(({ status }) => status === 'pass'),
    true,
    JSON.stringify(qa.checks),
  );
  const manifest = await runRecord(
    [
      '--run-root',
      runRoot,
      '--recipe',
      'project-recap',
      '--slug',
      slug,
      '--mode',
      'interactive',
      '--theme',
      join(runRoot, 'theme.resolved.json'),
    ],
    { log() {} },
  );
  assert.equal(manifest.outcome, 'built-needs-review');
  await verifyGenericPackage(runRoot, manifest);
  return manifest;
}

async function verifyGenericPackage(runRoot, manifest) {
  const validation = validateContract('manifest', manifest);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  for (const [relativePath, expectedHash] of Object.entries(
    manifest.immutableHashes,
  )) {
    const bytes = await readFile(join(runRoot, relativePath));
    const actualHash = `sha256:${createHash('sha256')
      .update(bytes)
      .digest('hex')}`;
    assert.equal(actualHash, expectedHash, relativePath);
  }
  await enforceRunPackageInventory(runRoot, manifest);
}

test('document inputs complete the interactive front-door flow', async (t) => {
  const fixture = await prepareFrontDoor(t, 'documents');
  const documents = join(fixture.root, 'documents');
  await mkdir(documents);
  await Promise.all([
    writeFile(
      join(documents, 'overview.md'),
      '# Orientation\n\nThe service routes explicit requests.\n',
    ),
    writeFile(
      join(documents, 'architecture.txt'),
      'Architecture\n\nA verifier checks the authored page.\n',
    ),
    writeFile(
      join(documents, 'evidence.json'),
      `${JSON.stringify({ evidence: 'Package inventory is exact.' }, null, 2)}\n`,
    ),
  ]);
  const manifest = await completeFrontDoorRun({
    ...fixture,
    slug: 'documents',
    bundleArgs: [
      '--recipe',
      'project-recap',
      '--inputs',
      documents,
      '--theme',
      fixture.themePath,
      '--out',
      fixture.runRoot,
    ],
  });

  const corruptedRoot = join(fixture.root, 'corrupted-run');
  await cp(fixture.runRoot, corruptedRoot, { recursive: true });
  await appendFile(
    join(corruptedRoot, 'site/index.html'),
    '\n<!-- corrupt -->',
  );
  await assert.rejects(verifyGenericPackage(corruptedRoot, manifest));
  await verifyGenericPackage(fixture.runRoot, manifest);
});

test('a supplied fact base completes the interactive front-door flow', async (t) => {
  const fixture = await prepareFrontDoor(t, 'fact-base');
  const factBasePath = join(fixture.root, 'fact-base.json');
  await cp(suppliedFactBaseFixture, factBasePath);
  await completeFrontDoorRun({
    ...fixture,
    slug: 'supplied-fact-base',
    bundleArgs: [
      '--recipe',
      'project-recap',
      '--fact-base',
      factBasePath,
      '--theme',
      fixture.themePath,
      '--out',
      fixture.runRoot,
    ],
  });
});

test('front-door bundle refuses a missing --out with usage guidance', async (t) => {
  const fixture = await prepareFrontDoor(t, 'missing-out');
  const input = join(fixture.root, 'input.md');
  await writeFile(input, '# Input\n\nExplicit source material.\n');
  await assert.rejects(
    runBundle([
      '--recipe',
      'project-recap',
      '--inputs',
      input,
      '--theme',
      fixture.themePath,
    ]),
    (error) =>
      error.code === 'E_BUNDLE' && /Usage: bundle\.mjs/.test(error.message),
  );
});

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function title(id) {
  if (id === 'as-built-architecture') return 'Delivered Architecture';
  return id
    .split('-')
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
