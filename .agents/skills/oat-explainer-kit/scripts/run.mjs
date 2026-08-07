#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  bindProjectSources,
  bindRepositorySources,
} from './bind-project-sources.mjs';
import { checkCoreCompatibility } from './check-core.mjs';
import { deriveExplainerDestination } from './derive-destination.mjs';
import {
  resolveExplainerConfig,
  toExplainerRunRequest,
} from './resolve-config.mjs';
import { resolveExplainerOutputRoot } from './resolve-paths.mjs';

export const MINIMUM_CORE_VERSION = '2.1.0';
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
  browserSession,
  browserSessionModulePath,
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
    slug,
  });
  const destination = resolvedConfig.publish
    ? deriveExplainerDestination({
        invocation,
        ...(invocation === 'project' && {
          projectSlug: basename(activeProject),
        }),
        s3Uri: resolvedConfig.publish.s3Uri,
        publicBaseUrl: resolvedConfig.publish.publicBaseUrl,
      })
    : null;
  let bound;
  if (invocation === 'project') {
    if (!activeProject) {
      throw new Error(
        'Project artifact binding requires an activeProject input.',
      );
    }
    bound = await bindProjectSources({
      projectRoot: resolve(repoRoot, activeProject),
      repoRoot,
      recipe,
      suppliedFactBasePath,
    });
  } else if (invocation === 'repo') {
    bound = await bindRepositorySources({
      repoRoot,
      suppliedFactBasePath,
    });
  } else {
    throw new Error(
      'The OAT adapter accepts project or repository invocations; direct callers invoke the core with an explicit output root.',
    );
  }
  const requestConfig = destination
    ? {
        ...resolvedConfig,
        publish: {
          ...resolvedConfig.publish,
          ...destination,
        },
      }
    : resolvedConfig;
  const request = toExplainerRunRequest({
    resolvedConfig: requestConfig,
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
  const lifecycleBrowserSession = await resolveLifecycleBrowserSession({
    core,
    browserSession,
    browserSessionModulePath,
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
    browserProbe: lifecycleBrowserSession?.probe,
    visualCritic: lifecycleVisualCritic,
  });
  const result = await core.runExplainer(request, {
    ...coreOptions,
    ...(lifecycleSetPlanner && { planSet: lifecycleSetPlanner }),
    ...(lifecycleAuthor && { author: lifecycleAuthor }),
    ...(lifecycleCritic && { critic: lifecycleCritic }),
    ...(lifecycleBrowserSession && {
      browserSession: lifecycleBrowserSession,
    }),
    ...(lifecycleVisualCritic && { visualCritic: lifecycleVisualCritic }),
    ...(bound.sourceLoader && { sourceLoader: bound.sourceLoader }),
    ...(bound.sourceProvenance && {
      sourceProvenance: bound.sourceProvenance,
    }),
    reviewedSource: bound.reviewedSource,
  });
  const manifest = await readManifest(result, request);
  return {
    compatibility,
    request,
    manifest,
    result,
    marking: result.marking ?? null,
    publication: result.publication ?? null,
    outputRoot,
    destination,
  };
}

export function supportsAdaptiveSetPlanning(version) {
  if (typeof version !== 'string') return false;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-|$)/);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  const [minimumMajor, minimumMinor, minimumPatch] =
    MINIMUM_CORE_VERSION.split('.').map(Number);
  return (
    major === minimumMajor &&
    (minor > minimumMinor || (minor === minimumMinor && patch >= minimumPatch))
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

async function resolveLifecycleBrowserSession({
  core,
  browserSession,
  browserSessionModulePath,
  browserProbe,
  browserProbeModulePath,
  coreOptions,
  required,
}) {
  if (coreOptions?.browserProbe !== undefined) {
    throw new TypeError(
      'coreOptions.browserProbe is not supported at the OAT adapter boundary; supply browserSession directly.',
    );
  }
  if (browserProbe !== undefined || browserProbeModulePath !== undefined) {
    throw new TypeError(
      'Bare browserProbe callbacks are not supported at the OAT adapter boundary; supply a branded browserSession created by createBrowserProbeSession().',
    );
  }
  if (coreOptions?.browserSession !== undefined) {
    throw new TypeError(
      'coreOptions.browserSession is not supported at the OAT adapter boundary; supply browserSession directly.',
    );
  }
  if (browserSession !== undefined && browserSessionModulePath !== undefined) {
    throw new Error(
      'Supply only one browser session descriptor or browser session module entry point.',
    );
  }
  let resolvedSession = browserSession;
  if (browserSessionModulePath !== undefined) {
    if (
      typeof browserSessionModulePath !== 'string' ||
      browserSessionModulePath.trim().length === 0
    ) {
      throw new TypeError('browserSessionModulePath must be a non-empty path.');
    }
    let sessionModule;
    try {
      sessionModule = await import(
        pathToFileURL(resolve(browserSessionModulePath.trim())).href
      );
    } catch (cause) {
      throw new Error(
        `Unable to load browser session module at ${browserSessionModulePath}.`,
        { cause },
      );
    }
    resolvedSession = sessionModule.browserSession;
  }
  if (!resolvedSession) {
    if (!required) return null;
    const error = new Error(
      'Unattended OAT project recaps require exactly one branded launched-Chromium browser session descriptor or browser session module entry point.',
    );
    error.code = 'E_BROWSER_PROBE_REQUIRED';
    throw error;
  }
  if (typeof core.assertBrowserProbeSession !== 'function') {
    const error = new Error(
      'Compatible explainer-kit does not export browser session validation.',
    );
    error.code = 'E_CORE_INCOMPATIBLE';
    throw error;
  }
  try {
    return core.assertBrowserProbeSession(resolvedSession, {
      allowFixture: !required,
    });
  } catch {
    const error = new Error('Browser session validation failed.');
    error.code = 'E_BROWSER_PROBE_REQUIRED';
    throw error;
  }
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

export async function runOatExplainerCli(
  argv = process.argv.slice(2),
  io = console,
  run = runOatExplainer,
) {
  try {
    if (argv.length !== 2 || argv[0] !== '--context') {
      throw new Error('Usage: run.mjs --context <adapter-context.json>');
    }
    const context = JSON.parse(await readFile(argv[1], 'utf8'));
    const result = await run(context);
    io.log(JSON.stringify(projectAdapterCliResult(result), null, 2));
    return result.result.outcome === 'failed' ? 1 : 0;
  } catch {
    io.error(
      JSON.stringify(
        {
          outcome: 'failed',
          reasons: [
            {
              stage: 'finalization',
              kind: 'pipeline-failure',
              count: 1,
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

function projectAdapterCliResult(value) {
  if (!isObject(value) || !isObject(value.result)) {
    return {
      result: {
        outcome: 'failed',
        reasons: [
          {
            stage: 'finalization',
            kind: 'pipeline-failure',
            count: 1,
          },
        ],
      },
    };
  }
  const projected = {};
  for (const key of ['compatibility', 'request', 'manifest', 'destination']) {
    if (isObject(value[key])) projected[key] = structuredClone(value[key]);
  }
  for (const key of ['marking', 'outputRoot']) {
    if (typeof value[key] === 'string' || value[key] === null) {
      projected[key] = value[key];
    }
  }
  projected.result = projectAdapterRunResult(value.result);
  const publication = projectAdapterPublication(value.publication);
  if (publication) projected.publication = publication;
  return projected;
}

function projectAdapterRunResult(value) {
  const projected = {};
  for (const key of [
    'runId',
    'runRoot',
    'manifestPath',
    'buildRecordPath',
    'outcome',
    'marking',
  ]) {
    if (typeof value[key] === 'string') projected[key] = value[key];
  }
  if (Array.isArray(value.warnings)) {
    projected.warnings = [
      ...new Set(value.warnings.filter(isAdapterWarningCode)),
    ];
  }
  for (const key of ['discovery', 'approval']) {
    if (isObject(value[key])) projected[key] = structuredClone(value[key]);
  }
  const reasons = projectAdapterReasons(value.reasons);
  if (reasons.length > 0) projected.reasons = reasons;
  const visualReview = projectAdapterVisualReview(value.visualReview);
  if (visualReview) projected.visualReview = visualReview;
  const publication = projectAdapterPublication(value.publication);
  if (publication) projected.publication = publication;
  return projected;
}

function projectAdapterVisualReview(value) {
  if (!isObject(value)) return null;
  const reasons = projectAdapterReasons(value.reasons);
  if (
    value.schemaVersion !== 'explainer-kit.visual-review-evidence/v1' ||
    typeof value.requestHash !== 'string' ||
    ![1, 2].includes(value.attempt) ||
    !['pass', 'correct', 'failed'].includes(value.disposition) ||
    !Array.isArray(value.reasons) ||
    reasons.length !== value.reasons.length
  ) {
    return null;
  }
  return {
    schemaVersion: value.schemaVersion,
    requestHash: value.requestHash,
    attempt: value.attempt,
    disposition: value.disposition,
    reasons,
  };
}

function projectAdapterPublication(value) {
  if (!isObject(value)) return null;
  if (
    value.schemaVersion !== 'explainer-kit.publish-summary/v1' &&
    value.schemaVersion !== 'explainer-kit.publish-summary/v2'
  ) {
    return null;
  }
  return {
    schemaVersion: value.schemaVersion,
    ...(typeof value.receiptSchemaVersion === 'string' && {
      receiptSchemaVersion: value.receiptSchemaVersion,
    }),
    ...(typeof value.publicAccess === 'string' && {
      publicAccess: value.publicAccess,
    }),
    ...(Array.isArray(value.artifacts) && {
      artifacts: value.artifacts.map((artifact) =>
        isObject(artifact)
          ? {
              ...pickAdapterStringFields(artifact, [
                'relativePath',
                'publicUrl',
                's3Uri',
                'hash',
                'contentType',
              ]),
              ...(isObject(artifact.source) && {
                source: pickAdapterStringFields(artifact.source, [
                  'kind',
                  'artifactId',
                  'name',
                ]),
              }),
              ...(isObject(artifact.objectVerification) && {
                objectVerification: projectAdapterVerification(
                  artifact.objectVerification,
                ),
              }),
              ...(isObject(artifact.publicVerification) && {
                publicVerification: projectAdapterVerification(
                  artifact.publicVerification,
                ),
              }),
            }
          : {},
      ),
    }),
  };
}

function projectAdapterVerification(value) {
  return {
    ...pickAdapterStringFields(value, ['status', 'method', 'hash']),
    ...(Number.isInteger(value.httpStatus) && {
      httpStatus: value.httpStatus,
    }),
  };
}

function projectAdapterReasons(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((reason) => {
    if (
      !isObject(reason) ||
      ![
        'planning',
        'authoring',
        'rendering',
        'link-validation',
        'browser-review',
        'visual-review',
        'durability',
        'finalization',
      ].includes(reason.stage) ||
      ![
        'finding',
        'provider-failure',
        'pipeline-failure',
        'superseded',
      ].includes(reason.kind) ||
      !Number.isInteger(reason.count) ||
      reason.count < 1 ||
      reason.count > 50
    ) {
      return [];
    }
    return [
      {
        stage: reason.stage,
        kind: reason.kind,
        ...(typeof reason.artifactId === 'string' && {
          artifactId: reason.artifactId,
        }),
        count: reason.count,
      },
    ];
  });
}

function pickAdapterStringFields(value, keys) {
  return Object.fromEntries(
    keys.flatMap((key) =>
      typeof value[key] === 'string' ? [[key, value[key]]] : [],
    ),
  );
}

function isAdapterWarningCode(value) {
  return (
    typeof value === 'string' &&
    /^(?:fact-base-freshness-warning|theme-selection-normalized|durability-evidence-required|publish-receipt-evidence-required|(?:expansion|guideline|render|qa)-[a-z0-9-]+|visual-review-required:[a-z0-9-]+|stage-reopened:[a-z0-9-]+:[0-9TZ:.-]+|missing-(?:theme-token|required-anchor):[a-z0-9-]+)$/.test(
      value,
    )
  );
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runOatExplainerCli();
}
