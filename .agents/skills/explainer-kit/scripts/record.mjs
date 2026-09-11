#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { access, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateContract } from './lib/contracts.mjs';
import {
  permissibleRunPackagePaths,
  requiredImmutablePackagePaths,
  validateImmutablePackageEvidence,
} from './lib/package-coverage.mjs';
import { validateQaResult } from './lib/qa-result.mjs';
import { loadRecipe } from './lib/recipes.mjs';

const HASH_PREFIX = 'sha256:';
const MODES = new Set(['unattended', 'interactive']);
const BROWSER_RUNGS = new Set(['host', 'playwright']);

export async function recordRun({
  runRoot,
  recipe,
  slug,
  mode,
  themePath,
  runId = randomUUID(),
  createdAt = new Date().toISOString(),
}) {
  if (!runRoot || !recipe || !slug || !mode || !themePath) {
    throw recordError(
      'record-invalid-arguments',
      'Record arguments are incomplete.',
    );
  }
  if (!MODES.has(mode)) {
    throw recordError(
      'record-invalid-mode',
      `Unsupported record mode: ${mode}`,
    );
  }
  if (await exists(join(runRoot, 'failure.json'))) {
    throw recordError(
      'record-failure-present',
      'Cannot record a run that contains failure.json.',
    );
  }

  const recipeVersion = recipe === 'project-recap' ? '2' : '1';
  const recipeContract = loadRecipe(recipe, recipeVersion);
  const contentPath = 'site/index.html';
  const factBasePath = 'source/fact-base.json';
  const resolvedThemePath = 'theme.resolved.json';
  const [factBaseBytes, themeBytes, artifactBytes] = await Promise.all([
    readFile(join(runRoot, factBasePath)),
    readFile(themePath),
    readFile(join(runRoot, contentPath)),
  ]);
  const artifactHash = hashBytes(artifactBytes);

  let qa = null;
  try {
    qa = JSON.parse(await readFile(join(runRoot, 'qa/result.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (qa) {
    try {
      validateQaResult(qa);
    } catch (error) {
      throw recordError(
        'record-qa-invalid',
        `qa/result.json is invalid: ${error.message}`,
      );
    }
  }
  if (qa && qa.artifactSha256 !== artifactHash) {
    throw recordError(
      'record-qa-stale',
      'qa/result.json describes different site/index.html bytes.',
    );
  }

  const { outcome, warnings } = outcomeFromQa(qa);
  const immutableHashes = await hashRunFiles(runRoot);
  const screenshotPaths = ['qa/320.png', 'qa/768.png', 'qa/1440.png'].filter(
    (path) => path in immutableHashes,
  );
  if (
    JSON.stringify(screenshotPaths) !== JSON.stringify(qa?.screenshots ?? [])
  ) {
    throw recordError(
      'record-qa-invalid',
      'QA screenshot claims do not match the canonical screenshot files.',
    );
  }
  const factBase = JSON.parse(factBaseBytes.toString('utf8'));
  const bundleInputs = (factBase.sources ?? []).filter(
    ({ role }) => role === 'bundle-input',
  );
  const manifestInputs =
    bundleInputs.length > 0 ? bundleInputs : (factBase.sources ?? []);
  const manifest = {
    schemaVersion: 'explainer-kit.manifest/v2',
    runId,
    slug,
    recipe: { id: recipeContract.id, version: recipeContract.version },
    createdAt,
    mode,
    source: {
      factBasePath,
      factBaseHash: hashBytes(factBaseBytes),
      inputHashes: Object.fromEntries(
        manifestInputs
          .filter(
            ({ locator, hash }) =>
              typeof locator === 'string' && typeof hash === 'string',
          )
          .map(({ locator, hash }) => [locator, hash])
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    theme: {
      path: resolvedThemePath,
      hash: hashBytes(themeBytes),
    },
    artifacts: [
      {
        id: recipeContract.floor[0].id,
        type: recipeContract.floor[0].type,
        contentPath,
        hash: artifactHash,
        status:
          outcome === 'failed' || outcome === 'incomplete' ? 'failed' : 'built',
      },
    ],
    immutableHashes,
    outcome,
    warnings,
  };

  const validation = validateContract('manifest', manifest);
  if (!validation.valid) {
    throw recordError(
      'record-manifest-invalid',
      `Generated manifest is invalid: ${validation.errors
        .map(({ code }) => code)
        .join(', ')}`,
    );
  }
  const permissible = new Set(
    permissibleRunPackagePaths(manifest).filter(
      (path) => path !== 'manifest.json',
    ),
  );
  const unexpected = Object.keys(immutableHashes).filter(
    (path) => !permissible.has(path),
  );
  if (unexpected.length > 0) {
    throw recordError(
      'record-package-unexpected',
      `Run package contains unexpected files: ${unexpected.join(', ')}`,
    );
  }
  if (qa) {
    try {
      validateImmutablePackageEvidence(manifest);
    } catch (error) {
      throw recordError('record-package-incomplete', error.message);
    }
    const expected = requiredImmutablePackagePaths(manifest).sort();
    const missing = expected.filter((path) => !(path in immutableHashes));
    if (missing.length > 0) {
      throw recordError(
        'record-package-incomplete',
        `Run package is incomplete: ${missing.join(', ')}`,
      );
    }
  }

  const temporaryManifest = join(
    runRoot,
    `.manifest-${process.pid}-${randomUUID()}.json`,
  );
  await writeFile(temporaryManifest, formatManifest(manifest));
  await rename(temporaryManifest, join(runRoot, 'manifest.json'));
  return manifest;
}

export async function runRecord(argv, io = console) {
  const options = parseArgs(argv);
  const manifest = await recordRun(options);
  io.log(
    JSON.stringify({ runRoot: options.runRoot, outcome: manifest.outcome }),
  );
  return manifest;
}

function outcomeFromQa(qa) {
  if (!qa) {
    return {
      outcome: 'incomplete',
      warnings: ['record-incomplete:qa-missing'],
    };
  }
  const checks = Object.entries(qa.checks).map(([id, check]) => ({
    id,
    ...check,
  }));
  const failures = checks.filter(({ status }) => status !== 'pass');
  if (failures.length > 0) {
    const failureSummary = failures
      .map(({ id, cause, message }) => `${id}: ${cause ?? message ?? 'failed'}`)
      .join('; ');
    return {
      outcome: 'failed',
      warnings: [`record-failed:${sanitize(failureSummary)}`],
    };
  }
  if (BROWSER_RUNGS.has(qa.rung) && qa.visual?.verdict === 'pass') {
    return { outcome: 'built', warnings: [] };
  }
  const reason =
    qa.reason ??
    (qa.visual?.verdict === 'findings'
      ? (qa.visual.findings ?? ['visual-findings']).join(',')
      : 'visual-review-unavailable');
  return {
    outcome: 'built-needs-review',
    warnings: [`record-needs-review:${sanitize(reason)}`],
  };
}

async function hashRunFiles(runRoot) {
  const hashes = {};
  async function visit(relativeRoot = '') {
    const entries = await readdir(join(runRoot, relativeRoot), {
      withFileTypes: true,
    });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      if (path === 'manifest.json' || path.startsWith('.manifest-')) continue;
      if (entry.isSymbolicLink()) {
        throw recordError(
          'record-package-symlink',
          `Run package contains a symbolic link: ${path}`,
        );
      }
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        hashes[path] = hashBytes(await readFile(join(runRoot, path)));
      } else {
        throw recordError(
          'record-package-entry',
          `Run package contains an unsupported entry: ${path}`,
        );
      }
    }
  }
  await visit();
  return hashes;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const field = {
      '--run-root': 'runRoot',
      '--recipe': 'recipe',
      '--slug': 'slug',
      '--mode': 'mode',
      '--theme': 'themePath',
      '--run-id': 'runId',
      '--created-at': 'createdAt',
    }[argv[index]];
    if (!field || !argv[index + 1]) throw usageError();
    options[field] = argv[index + 1];
  }
  if (
    !options.runRoot ||
    !options.recipe ||
    !options.slug ||
    !options.mode ||
    !options.themePath
  ) {
    throw usageError();
  }
  return options;
}

function sanitize(value) {
  let sanitized = String(value)
    .replaceAll(process.cwd(), '<repo>')
    .replace(/\/Users\/[^/\s]+/g, '<user>');
  const environmentValues = [...new Set(Object.values(process.env))]
    .filter((entry) => typeof entry === 'string' && entry.length >= 12)
    .sort((left, right) => right.length - left.length);
  for (const secret of environmentValues) {
    sanitized = sanitized.replaceAll(secret, '<env>');
  }
  return sanitized;
}

function hashBytes(bytes) {
  return `${HASH_PREFIX}${createHash('sha256').update(bytes).digest('hex')}`;
}

function formatManifest(manifest) {
  const json = JSON.stringify(manifest, null, 2).replace(
    /  "warnings": \[\n(?:    .+\n)*  \]\n}$/,
    `  "warnings": ${JSON.stringify(manifest.warnings)}\n}`,
  );
  return `${json}\n`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function usageError() {
  return recordError(
    'record-usage',
    'Usage: record.mjs --run-root <dir> --recipe <id> --slug <slug> --mode unattended|interactive --theme <resolved-json> [--run-id <id>] [--created-at <iso>]',
  );
}

function recordError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runRecord(process.argv.slice(2)).catch((error) => {
    console.error(`${error.code}: ${error.message}`);
    process.exitCode = 1;
  });
}
