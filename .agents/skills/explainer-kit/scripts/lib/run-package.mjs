import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { validateContract } from './contracts.mjs';
import {
  enforceRunPackageInventory,
  validateImmutablePackageEvidence,
} from './package-coverage.mjs';
import { validateQaResult } from './qa-result.mjs';

const SATISFIED_OUTCOMES = new Set(['built', 'built-needs-review']);
const SCREENSHOT_PATHS = ['qa/320.png', 'qa/768.png', 'qa/1440.png'];

export async function validateSatisfiedRunPackage(
  runRoot,
  recipe,
  { inputHashes } = {},
) {
  const manifest = JSON.parse(
    await readFile(join(runRoot, 'manifest.json'), 'utf8'),
  );
  const validation = validateContract('manifest', manifest);
  if (!validation.valid) {
    throw packageError('manifest-v2-contract');
  }

  const recipeId = typeof recipe === 'string' ? recipe : recipe.id;
  const recipeVersion = typeof recipe === 'string' ? undefined : recipe.version;
  const artifact = manifest.artifacts[0];
  const expectedArtifact = typeof recipe === 'string' ? null : recipe.floor[0];
  if (
    manifest.recipe.id !== recipeId ||
    (recipeVersion !== undefined &&
      manifest.recipe.version !== recipeVersion) ||
    !SATISFIED_OUTCOMES.has(manifest.outcome) ||
    artifact?.id !== expectedArtifact?.id ||
    artifact?.type !== expectedArtifact?.type ||
    artifact?.contentPath !== 'site/index.html' ||
    artifact?.status !== 'built' ||
    manifest.artifacts.length !== 1
  ) {
    throw packageError('project-recap-identity-or-outcome');
  }
  if (
    inputHashes !== undefined &&
    JSON.stringify(manifest.source.inputHashes) !== JSON.stringify(inputHashes)
  ) {
    throw packageError('input-hashes');
  }
  if (
    manifest.source.factBasePath !== 'source/fact-base.json' ||
    manifest.source.factBaseHash !==
      manifest.immutableHashes[manifest.source.factBasePath] ||
    manifest.theme.path !== 'theme.resolved.json' ||
    manifest.theme.hash !== manifest.immutableHashes[manifest.theme.path] ||
    artifact.hash !== manifest.immutableHashes[artifact.contentPath]
  ) {
    throw packageError('canonical-path-hash-bindings');
  }

  validateImmutablePackageEvidence(manifest);
  await verifyImmutableBytes(runRoot, manifest.immutableHashes);
  await enforceRunPackageInventory(runRoot, manifest);

  const qa = validateQaResult(
    JSON.parse(await readFile(join(runRoot, 'qa/result.json'), 'utf8')),
  );
  const expectedScreenshots = SCREENSHOT_PATHS.filter(
    (path) => path in manifest.immutableHashes,
  );
  if (
    qa.artifactSha256 !== artifact.hash ||
    Object.values(qa.checks).some(({ status }) => status !== 'pass') ||
    outcomeFromQa(qa) !== manifest.outcome ||
    JSON.stringify(qa.screenshots ?? []) !== JSON.stringify(expectedScreenshots)
  ) {
    throw packageError('qa-artifact-outcome-bindings');
  }
  return manifest;
}

async function verifyImmutableBytes(runRoot, immutableHashes) {
  for (const [path, expected] of Object.entries(immutableHashes)) {
    const actual = `sha256:${createHash('sha256')
      .update(await readFile(join(runRoot, path)))
      .digest('hex')}`;
    if (actual !== expected) {
      throw packageError(`immutable-byte-hash:${path}`);
    }
  }
}

function outcomeFromQa(qa) {
  return qa.rung !== 'none' && qa.visual.verdict === 'pass'
    ? 'built'
    : 'built-needs-review';
}

function packageError(reason) {
  const error = new Error(`Satisfied run package is invalid: ${reason}.`);
  error.code = 'E_RUN_PACKAGE';
  return error;
}
