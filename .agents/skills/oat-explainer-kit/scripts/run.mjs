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

export const MINIMUM_CORE_VERSION = '2.0.3';
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
  planSet,
  planSetModulePath,
  author,
  authorModulePath,
  critic,
  criticModulePath,
  browserProbe,
  browserProbeModulePath,
  visualCritic,
  visualCriticModulePath,
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
  if (!supportsAdaptiveSetPlanning(compatibility.installedVersion)) {
    const error = new Error(
      `Installed explainer-kit ${compatibility.installedVersion} does not provide adaptive set planning. Run \`oat tools update --pack utility --scope user\`.`,
    );
    error.code = 'E_CORE_INCOMPATIBLE';
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
    repoRoot,
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
  });
  const lifecycleSetPlanner = await resolveLifecycleSetPlanner({
    planSet,
    planSetModulePath,
    coreOptions,
    required: recipe === 'project-recap' && mode === 'unattended',
  });
  const lifecycleCritic = await resolveLifecycleCritic({
    critic,
    criticModulePath,
    coreOptions,
  });
  const reviewProvidersRequired =
    recipe === 'project-recap' && mode === 'unattended';
  const lifecycleBrowserProbe = await resolveLifecycleBrowserProbe({
    browserProbe,
    browserProbeModulePath,
    coreOptions,
    required: reviewProvidersRequired,
  });
  const lifecycleVisualCritic = await resolveLifecycleVisualCritic({
    visualCritic,
    visualCriticModulePath,
    coreOptions,
    required: reviewProvidersRequired,
  });
  assertDistinctProviderRoles({
    author: lifecycleAuthor,
    factCritic: lifecycleCritic,
    browserProbe: lifecycleBrowserProbe,
    visualCritic: lifecycleVisualCritic,
  });
  const result = await core.runExplainer(request, {
    ...coreOptions,
    ...(lifecycleSetPlanner && { planSet: lifecycleSetPlanner }),
    ...(lifecycleAuthor && { author: lifecycleAuthor }),
    ...(lifecycleCritic && { critic: lifecycleCritic }),
    ...(lifecycleBrowserProbe && { browserProbe: lifecycleBrowserProbe }),
    ...(lifecycleVisualCritic && { visualCritic: lifecycleVisualCritic }),
    ...(bound.sourceLoader && { sourceLoader: bound.sourceLoader }),
    ...(bound.sourceProvenance && {
      sourceProvenance: bound.sourceProvenance,
    }),
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
    marking: result.marking ?? null,
    outputRoot,
  };
}

export function supportsAdaptiveSetPlanning(version) {
  if (typeof version !== 'string') return false;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-|$)/);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return (
    major === 2 &&
    (minor > 0 ||
      (minor === 0 && patch >= Number(MINIMUM_CORE_VERSION.split('.')[2])))
  );
}

async function resolveLifecycleSetPlanner({
  planSet,
  planSetModulePath,
  coreOptions,
  required,
}) {
  if (coreOptions?.planSet !== undefined) {
    throw new TypeError(
      'coreOptions.planSet is not supported at the OAT adapter boundary; supply planSet directly.',
    );
  }
  if (planSet !== undefined && typeof planSet !== 'function') {
    throw new TypeError('planSet must be a function when supplied.');
  }
  if (planSet !== undefined && planSetModulePath !== undefined) {
    throw new Error(
      'Supply only one provider-neutral set planner callback or set planner module entry point.',
    );
  }
  if (planSet === undefined && planSetModulePath === undefined) {
    if (!required) return null;
    const error = new Error(
      'Unattended OAT project recaps require exactly one provider-neutral set planner callback or set planner module entry point.',
    );
    error.code = 'E_SET_PLANNER_REQUIRED';
    throw error;
  }
  if (planSetModulePath === undefined) {
    return planSet;
  }
  if (
    typeof planSetModulePath !== 'string' ||
    planSetModulePath.trim().length === 0
  ) {
    throw new TypeError('planSetModulePath must be a non-empty path.');
  }

  let plannerModule;
  try {
    plannerModule = await import(
      pathToFileURL(resolve(planSetModulePath.trim())).href
    );
  } catch (cause) {
    throw new Error(
      `Unable to load provider-neutral set planner module at ${planSetModulePath}.`,
      { cause },
    );
  }
  if (typeof plannerModule.planSet !== 'function') {
    throw new TypeError(
      'Provider-neutral set planner module must export a planSet function.',
    );
  }
  return plannerModule.planSet;
}

async function resolveLifecycleAuthor({
  author,
  authorModulePath,
  coreOptions,
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
    const error = new Error(
      'Unattended and interactive OAT explainer runs require exactly one provider-neutral author callback or author module entry point.',
    );
    error.code = 'E_AUTHOR_REQUIRED';
    throw error;
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
  const wrapped = async (request) => {
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
  return markProviderIdentity(wrapped, callback);
}

async function resolveLifecycleBrowserProbe({
  browserProbe,
  browserProbeModulePath,
  coreOptions,
  required,
}) {
  if (coreOptions?.browserProbe !== undefined) {
    throw new TypeError(
      'coreOptions.browserProbe is not supported at the OAT adapter boundary; supply browserProbe directly.',
    );
  }
  const callback = await resolveProviderCallback({
    callback: browserProbe,
    modulePath: browserProbeModulePath,
    exportName: 'browserProbe',
    label: 'browser probe',
  });
  if (!callback) {
    if (!required) return null;
    const error = new Error(
      'Unattended OAT project recaps require exactly one provider-neutral browser probe callback or browser probe module entry point.',
    );
    error.code = 'E_BROWSER_PROBE_REQUIRED';
    throw error;
  }
  const wrapped = async (request) => {
    const result = await callback(request);
    if (
      !result ||
      typeof result !== 'object' ||
      typeof result.pageOverflowX !== 'boolean' ||
      !Array.isArray(result.clippedX) ||
      !Array.isArray(result.viewportClipped) ||
      !Array.isArray(result.unreadableHeadings) ||
      typeof result.reducedMotion !== 'boolean' ||
      !result.keyboard ||
      typeof result.keyboard !== 'object'
    ) {
      throw new Error(
        'Provider-neutral browser probe result does not match the browser evidence result contract.',
      );
    }
    return result;
  };
  return markProviderIdentity(wrapped, callback);
}

async function resolveLifecycleVisualCritic({
  visualCritic,
  visualCriticModulePath,
  coreOptions,
  required,
}) {
  if (coreOptions?.visualCritic !== undefined) {
    throw new TypeError(
      'coreOptions.visualCritic is not supported at the OAT adapter boundary; supply visualCritic directly.',
    );
  }
  const callback = await resolveProviderCallback({
    callback: visualCritic,
    modulePath: visualCriticModulePath,
    exportName: 'visualCritic',
    label: 'visual critic',
  });
  if (!callback) {
    if (!required) return null;
    const error = new Error(
      'Unattended OAT project recaps require exactly one provider-neutral visual critic callback or visual critic module entry point.',
    );
    error.code = 'E_VISUAL_CRITIC_REQUIRED';
    throw error;
  }
  const wrapped = async (request, evidenceInput) => {
    const result = await callback(request, evidenceInput);
    if (
      !result ||
      typeof result !== 'object' ||
      result.schemaVersion !== 'explainer-kit.visual-review-result/v1' ||
      typeof result.reviewId !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(result.reviewId) ||
      result.requestId !== request?.requestId ||
      result.requestHash !== request?.requestHash ||
      typeof result.reviewedAt !== 'string' ||
      Number.isNaN(Date.parse(result.reviewedAt)) ||
      !['pass', 'correct', 'fail'].includes(result.disposition) ||
      !Array.isArray(result.artifactIds) ||
      result.artifactIds.length !== request?.renderedArtifacts?.length ||
      result.artifactIds.some(
        (artifactId, index) =>
          artifactId !== request.renderedArtifacts[index]?.artifactId,
      ) ||
      !Array.isArray(result.findings) ||
      result.findings.some((finding) => !finding || typeof finding !== 'object')
    ) {
      throw new Error(
        'Provider-neutral visual critic result does not match the visual review result contract.',
      );
    }
    return result;
  };
  return markProviderIdentity(wrapped, callback);
}

async function resolveProviderCallback({
  callback,
  modulePath,
  exportName,
  label,
}) {
  if (callback !== undefined && typeof callback !== 'function') {
    throw new TypeError(`${exportName} must be a function when supplied.`);
  }
  if (callback !== undefined && modulePath !== undefined) {
    throw new Error(
      `Supply only one provider-neutral ${label} callback or ${label} module entry point.`,
    );
  }
  if (modulePath === undefined) return callback ?? null;
  if (typeof modulePath !== 'string' || modulePath.trim().length === 0) {
    throw new TypeError(`${exportName}ModulePath must be a non-empty path.`);
  }
  let providerModule;
  try {
    providerModule = await import(
      pathToFileURL(resolve(modulePath.trim())).href
    );
  } catch (cause) {
    throw new Error(
      `Unable to load provider-neutral ${label} module at ${modulePath}.`,
      { cause },
    );
  }
  if (typeof providerModule[exportName] !== 'function') {
    throw new TypeError(
      `Provider-neutral ${label} module must export a ${exportName} function.`,
    );
  }
  return providerModule[exportName];
}

const PROVIDER_IDENTITY = Symbol('oat-explainer-provider-identity');

function markProviderIdentity(wrapper, callback) {
  Object.defineProperty(wrapper, PROVIDER_IDENTITY, { value: callback });
  return wrapper;
}

function providerIdentity(callback) {
  return callback?.[PROVIDER_IDENTITY] ?? callback;
}

function assertDistinctProviderRoles(callbacks) {
  const entries = Object.entries(callbacks).filter(([, callback]) => callback);
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (
        providerIdentity(entries[left][1]) ===
        providerIdentity(entries[right][1])
      ) {
        throw new Error(
          `Provider roles ${entries[left][0]} and ${entries[right][0]} must use distinct callback identities.`,
        );
      }
    }
  }
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
