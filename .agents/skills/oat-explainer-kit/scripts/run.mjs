#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { bindProjectSources } from './bind-project-sources.mjs';
import { checkCoreCompatibility } from './check-core.mjs';
import {
  resolveExplainerConfig,
  toExplainerRunRequest,
} from './resolve-config.mjs';
import { resolveExplainerOutputRoot } from './resolve-paths.mjs';

const MINIMUM_CORE_VERSION = '1.0.0';
const ADAPTER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function runOatExplainer({
  adapterRoot = ADAPTER_ROOT,
  userSkillsRoot,
  repoRoot,
  invocation,
  activeProject,
  recipe,
  slug,
  suppliedFactBasePath,
  runtimeOverrides = {},
  getConfig,
  mode = 'unattended',
  durabilityStrategy = 'none',
  artDirection,
  defaultMode,
  renderStrategy,
  retainRawArtDirection = false,
  author,
  authorModulePath,
  critic,
  criticModulePath,
  coreOptions = {},
}) {
  const compatibility = await checkCoreCompatibility({
    adapterRoot,
    ...(userSkillsRoot && { userSkillsRoot }),
    minimumVersion: MINIMUM_CORE_VERSION,
  });
  if (!compatibility.ok) {
    const error = new Error(
      `${compatibility.message} Run \`${compatibility.guidance}\`.`,
    );
    error.code =
      compatibility.code === 'missing'
        ? 'E_CORE_MISSING'
        : 'E_CORE_INCOMPATIBLE';
    error.compatibility = compatibility;
    throw error;
  }

  const resolvedConfig = await resolveExplainerConfig({
    repoRoot,
    runtimeOverrides,
    ...(getConfig && { getConfig }),
  });
  const outputRoot = await resolveExplainerOutputRoot({
    repoRoot,
    invocation,
    activeProject,
  });
  if (invocation !== 'project' || !activeProject) {
    throw new Error(
      'Project artifact binding requires a project invocation and activeProject.',
    );
  }
  const projectRoot = resolve(repoRoot, activeProject);
  const bound = await bindProjectSources({
    projectRoot,
    recipe,
    suppliedFactBasePath,
  });
  const request = toExplainerRunRequest({
    resolvedConfig,
    recipe,
    slug,
    outputRoot,
    factBase: bound.factBase,
    mode,
    durabilityStrategy,
    artDirection,
    defaultMode,
    renderStrategy,
    retainRawArtDirection,
  });

  const coreModulePath = join(compatibility.coreRoot, 'scripts', 'run.mjs');
  let core;
  try {
    core = await import(pathToFileURL(coreModulePath).href);
  } catch (cause) {
    const error = new Error(
      `Compatible explainer-kit is missing its run entry point. Run \`${compatibility.guidance ?? 'oat tools update --pack utility --scope user'}\`.`,
      { cause },
    );
    error.code = 'E_CORE_INCOMPATIBLE';
    throw error;
  }
  if (typeof core.runExplainer !== 'function') {
    const error = new Error(
      'Compatible explainer-kit does not export runExplainer(request, options).',
    );
    error.code = 'E_CORE_INCOMPATIBLE';
    throw error;
  }

  const lifecycleAuthor = await resolveLifecycleAuthor({
    author,
    authorModulePath,
    coreOptions,
    mode: request.mode,
  });
  const lifecycleCritic = await resolveLifecycleCritic({
    critic,
    criticModulePath,
    coreOptions,
  });
  const result = await core.runExplainer(request, {
    ...coreOptions,
    ...(lifecycleAuthor && { author: lifecycleAuthor }),
    ...(lifecycleCritic && { critic: lifecycleCritic }),
    ...(bound.sourceLoader && { sourceLoader: bound.sourceLoader }),
    reviewedSource: bound.reviewedSource,
  });
  const criticContractError = result?.errors?.find(
    ({ message }) =>
      typeof message === 'string' && message.includes('critic result contract'),
  );
  if (criticContractError) {
    throw new Error(criticContractError.message);
  }
  const manifest = await readManifest(result, request);
  return {
    compatibility,
    request,
    manifest,
    result,
    outputRoot,
  };
}

async function resolveLifecycleAuthor({
  author,
  authorModulePath,
  coreOptions,
  mode,
}) {
  if (coreOptions?.author !== undefined) {
    throw new TypeError(
      'coreOptions.author is not supported at the OAT adapter boundary; supply author directly.',
    );
  }
  if (author !== undefined && typeof author !== 'function') {
    throw new TypeError('author must be a function when supplied.');
  }
  if (author !== undefined && authorModulePath !== undefined) {
    throw new Error(
      'Supply only one provider-neutral author callback or author module entry point.',
    );
  }

  if (author === undefined && authorModulePath === undefined) {
    if (mode === 'unattended') {
      const error = new Error(
        'Unattended OAT explainer runs require exactly one provider-neutral author callback or author module entry point.',
      );
      error.code = 'E_AUTHOR_REQUIRED';
      throw error;
    }
    return null;
  }
  if (authorModulePath === undefined) {
    return author;
  }
  if (
    typeof authorModulePath !== 'string' ||
    authorModulePath.trim().length === 0
  ) {
    throw new TypeError('authorModulePath must be a non-empty path.');
  }

  let authorModule;
  try {
    authorModule = await import(
      pathToFileURL(resolve(authorModulePath.trim())).href
    );
  } catch (cause) {
    throw new Error(
      `Unable to load provider-neutral author module at ${authorModulePath}.`,
      { cause },
    );
  }
  if (typeof authorModule.author !== 'function') {
    throw new TypeError(
      'Provider-neutral author module must export an author function.',
    );
  }
  return authorModule.author;
}

async function resolveLifecycleCritic({
  critic,
  criticModulePath,
  coreOptions,
}) {
  const candidates = [
    typeof critic === 'function' ? critic : null,
    typeof coreOptions?.critic === 'function' ? coreOptions.critic : null,
    criticModulePath ? criticModulePath : null,
  ].filter(Boolean);
  if (candidates.length > 1) {
    throw new Error(
      'Supply only one provider-neutral critic callback or critic module entry point.',
    );
  }
  if (critic !== undefined && typeof critic !== 'function') {
    throw new TypeError('critic must be a function when supplied.');
  }
  if (
    coreOptions?.critic !== undefined &&
    typeof coreOptions.critic !== 'function'
  ) {
    throw new TypeError('coreOptions.critic must be a function when supplied.');
  }

  let callback = critic ?? coreOptions?.critic;
  if (criticModulePath !== undefined) {
    if (
      typeof criticModulePath !== 'string' ||
      criticModulePath.trim().length === 0
    ) {
      throw new TypeError('criticModulePath must be a non-empty path.');
    }
    let criticModule;
    try {
      criticModule = await import(
        pathToFileURL(resolve(criticModulePath)).href
      );
    } catch (cause) {
      throw new Error(
        `Unable to load provider-neutral critic module at ${criticModulePath}.`,
        { cause },
      );
    }
    if (typeof criticModule.critic !== 'function') {
      throw new TypeError(
        'Provider-neutral critic module must export a critic function.',
      );
    }
    callback = criticModule.critic;
  }

  if (!callback) {
    return null;
  }
  return async (request) => {
    const result = await callback(request);
    if (
      !result ||
      typeof result !== 'object' ||
      typeof result.criticId !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(result.criticId) ||
      !Array.isArray(result.findings) ||
      (result.executedAt !== undefined &&
        (typeof result.executedAt !== 'string' ||
          Number.isNaN(Date.parse(result.executedAt))))
    ) {
      throw new Error(
        'Provider-neutral critic result does not match the critic result contract.',
      );
    }
    return result;
  };
}

async function readManifest(result, request) {
  if (
    !result ||
    typeof result !== 'object' ||
    typeof result.manifestPath !== 'string'
  ) {
    throw new Error('explainer-kit returned no manifestPath.');
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  } catch (error) {
    if (
      error?.code === 'ENOENT' &&
      (result.outcome === 'failed' || result.outcome === 'incomplete')
    ) {
      return null;
    }
    throw error;
  }
  if (manifest.schemaVersion !== 'explainer-kit.manifest/v1') {
    throw new Error(
      `Unsupported core manifest version: ${manifest.schemaVersion ?? 'missing'}.`,
    );
  }
  if (
    manifest.recipe?.id !== request.recipe.id ||
    manifest.recipe?.version !== request.recipe.version
  ) {
    throw new Error(
      'Core manifest recipe does not match the normalized request.',
    );
  }
  return manifest;
}

async function runCli(argv = process.argv.slice(2), io = console) {
  try {
    if (argv.length !== 2 || argv[0] !== '--context') {
      throw new Error('Usage: run.mjs --context <adapter-context.json>');
    }
    const context = JSON.parse(await readFile(argv[1], 'utf8'));
    const result = await runOatExplainer(context);
    io.log(JSON.stringify(result, null, 2));
    return result.result.outcome === 'failed' ? 1 : 0;
  } catch (error) {
    io.error(
      JSON.stringify(
        {
          outcome: 'failed',
          errors: [
            {
              code: error.code ?? 'E_ADAPTER',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        },
        null,
        2,
      ),
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runCli();
}
