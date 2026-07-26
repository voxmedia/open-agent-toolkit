#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  RUNTIME_UNAVAILABLE_REASONS,
  createBrowserProbeSession,
} from './lib/browser-runtime.mjs';
import { resolveContentApproval } from './lib/content-approval.mjs';
import { canonicalHash, validateContract } from './lib/contracts.mjs';
import { processFactBase } from './lib/fact-base.mjs';
import { writeJsonAtomic, writeTextAtomic } from './lib/fs-safe.mjs';
import { validateHtmlSafety } from './lib/html-safety.mjs';
import {
  auditArtifactSet,
  checkGuidelines,
  checkSourceDumping,
  RENDER_QA_WARNING_IDS,
  renderQaWarningIds,
  renderWarningIds,
} from './lib/qa.mjs';
import {
  evaluateExpansionProposals,
  loadRecipe,
  recipeExpansion,
  recipeFloor,
  recipeRequiredNarrative,
  shouldStopDiscovery,
  validateSourceBindings,
} from './lib/recipes.mjs';
import {
  initializeRun,
  reopenBuildStages,
  updateBuildRecord,
  writeManifestAtomic,
} from './lib/records.mjs';
import { artifactPath, renderArtifact } from './lib/render.mjs';
import { resolveTheme } from './lib/theme.mjs';

export async function runExplainer(request, options = {}) {
  assertValidRequest(request);
  const recipe = loadRecipe(request.recipe.id, request.recipe.version);
  const resumed = await loadResumableRun(request);
  const run = resumed ?? (await initializeRun(request));
  const now = options.now ?? (() => new Date().toISOString());
  const state = {
    run,
    recipe,
    factBase: null,
    factBaseHash: null,
    inputHashes: {},
    contentModels: [],
    contentPaths: new Map(),
    authorResultPaths: [],
    resolvedArtifacts: [],
    authoredContent: new Map(),
    expansion: {
      valid: true,
      accepted: [],
      rejected: [],
      warnings: [],
      errors: [],
    },
    qaErrors: [],
    theme: null,
    themeWarnings: [],
    renderStrategy: run.request.theme.renderStrategy,
    rendered: [],
    artifacts: [],
    warnings: [],
    reopenedWarnings: {},
    discovery: { rounds: 0, findings: [], reason: 'not-requested' },
    approval: null,
    resumedApprovalStatus: null,
  };

  try {
    if (resumed) {
      await hydrateResumableState(state);
    } else {
      validateRecipeSources(recipe, run.request.factBase);
      await executeStage(run, 'validate', options, async () => ({
        outputPaths: ['run-request.json'],
      }));
      await executeStage(run, 'fact-base', options, async () => {
        const processed = await buildFactBase(
          run.request.factBase,
          options,
          now,
        );
        state.factBase = processed.factBase;
        state.warnings.push(...processed.checks.warnings);
        state.inputHashes = inputHashes(processed.factBase);
        state.factBaseHash = canonicalHash(processed.factBase);
        await writeJsonAtomic(
          run.runRoot,
          'source/fact-base.json',
          state.factBase,
        );
        await writeTextAtomic(
          run.runRoot,
          'source/fact-base.md',
          factBaseMarkdown(state.factBase),
        );
        return {
          outputPaths: ['source/fact-base.json', 'source/fact-base.md'],
          warnings: processed.checks.warnings,
          status: processed.checks.warnings.length > 0 ? 'warned' : 'passed',
        };
      });
      await prepareTheme(state);
      await executeStage(run, 'content', options, async () => {
        state.discovery = await runDiscovery(recipe, state.factBase, options);
        await createAuthoredContent(state, options, now);
        return {
          outputPaths: [
            ...state.contentPaths.values(),
            ...state.authorResultPaths,
          ],
          warnings: state.expansion.warnings,
          status: state.expansion.warnings.length > 0 ? 'warned' : 'passed',
        };
      });
    }

    if (!resumed) {
      await executeThemeStage(state, options);
    }
    if (!resumed || state.resumedApprovalStatus === 'rejected') {
      if (state.resumedApprovalStatus === 'rejected') {
        const reopened = await reopenBuildStages(run, {
          ids: ['render', 'qa'],
          reason: 'content-rejected',
        });
        // Reopen markers are the D4 audit trail, so they survive the rerun's
        // replacement of each stage's warning set.
        state.reopenedWarnings = Object.fromEntries(
          reopened.stages.map(({ id, warnings }) => [
            id,
            warnings.filter((warning) => warning.startsWith('stage-reopened:')),
          ]),
        );
      }
      await executeRenderStage(state, options);
      await executeQaStage(state, options);
    }

    state.approval = await resolveContentApproval(
      run,
      run.request.mode,
      options.reviewedSource,
      state.authorResultPaths,
      approvalArtifacts(state),
    );
    if (!state.approval.canResume) {
      return resultFor(state);
    }

    await executeDurabilityAndPublish(state, options, now);
    await persistManifest(state, now());
    return resultFor(state);
  } catch (error) {
    if (state.theme && state.factBase) {
      await persistFailureManifest(state, error, now()).catch(() => {});
    }
    return resultFor(state, error);
  }
}

async function executeThemeStage(state, options) {
  await executeStage(state.run, 'theme', options, async () => {
    await writeJsonAtomic(
      state.run.runRoot,
      'theme.resolved.json',
      state.theme,
    );
    return {
      outputPaths: ['theme.resolved.json'],
      warnings: state.themeWarnings,
      status: state.themeWarnings.length > 0 ? 'warned' : 'passed',
    };
  });
}

async function prepareTheme(state) {
  const resolved = await resolveTheme(state.run.request.theme);
  state.theme = resolved.theme;
  state.renderStrategy = resolved.renderStrategy;
  state.themeWarnings = resolved.warnings;
  state.warnings.push(...resolved.warnings);
}

async function executeRenderStage(state, options) {
  state.rendered = [];
  state.artifacts = [];
  await executeStage(state.run, 'render', options, async () => {
    for (const artifact of state.resolvedArtifacts) {
      const rendered =
        artifact.authoring === 'markdown'
          ? await renderArtifact({
              recipeArtifact: renderDescriptor(artifact),
              content: state.contentModels.find(
                ({ artifactId }) => artifactId === artifact.id,
              ),
              theme: state.theme,
              renderStrategy: state.renderStrategy,
              ...(state.run.request.publicBaseUrl && {
                publicBaseUrl: state.run.request.publicBaseUrl,
              }),
            })
          : artisticRender(state, artifact);
      await writeTextAtomic(
        state.run.runRoot,
        rendered.renderedPath,
        rendered.html,
      );
      state.rendered.push(rendered);
      state.artifacts.push(artifactRecord(state, rendered));
    }
    // D7 degradation findings are guideline severity, so they travel to the
    // run result and the manifest as warnings rather than failing the stage.
    const degradation = renderWarningIds(
      state.rendered.flatMap(
        ({ warnings: sectionWarnings = [] }) => sectionWarnings,
      ),
    );
    state.warnings.push(...degradation);
    const warnings = [...(state.reopenedWarnings.render ?? []), ...degradation];
    return {
      outputPaths: state.rendered.map(({ renderedPath }) => renderedPath),
      warnings,
      status: warnings.length > 0 ? 'warned' : 'passed',
    };
  });
}

async function executeQaStage(state, options) {
  await executeStage(state.run, 'qa', options, async () => {
    const htmlSafetyErrors = [];
    const qaWarnings = [];
    const runtime = await resolveBrowserProbeRuntime(options);
    try {
      return await auditRenderedArtifacts(state, options, {
        runtime,
        htmlSafetyErrors,
        qaWarnings,
      });
    } finally {
      await runtime.close?.();
    }
  });
}

/**
 * Resolve the browser probe the QA stage will drive. Injection wins for tests,
 * an explicitly requested module must load or fail loudly, and an ordinary run
 * attempts real capability detection before recording a skip.
 */
async function resolveBrowserProbeRuntime(options) {
  if (options.browserProbe !== undefined) {
    if (typeof options.browserProbe !== 'function') {
      throw codedError(
        'E_BROWSER_PROBE',
        'options.browserProbe must be a function when supplied.',
      );
    }
    return { probe: options.browserProbe, source: 'injected' };
  }

  if (options.browserProbeModulePath !== undefined) {
    const probe = await loadBrowserProbeModule(options.browserProbeModulePath);
    return { probe, source: 'module' };
  }

  const createSession =
    options.createBrowserProbeSession ?? createBrowserProbeSession;
  let session;
  try {
    session = await createSession();
  } catch (cause) {
    throw codedError(
      'E_BROWSER_PROBE',
      `Headless browser runtime failed to start: ${safeMessage(cause)}`,
    );
  }
  if (!session?.available) {
    return {
      probe: null,
      source: 'unavailable',
      reason: session?.reason ?? 'unknown',
    };
  }
  return {
    probe: session.probe,
    source: 'resolved',
    runtime: session.runtime,
    close: session.close,
  };
}

async function loadBrowserProbeModule(modulePath) {
  if (typeof modulePath !== 'string' || modulePath.trim().length === 0) {
    throw codedError(
      'E_BROWSER_PROBE',
      'options.browserProbeModulePath must be a non-empty module path.',
    );
  }
  let loaded;
  try {
    loaded = await import(pathToFileURL(resolve(modulePath)).href);
  } catch (cause) {
    throw codedError(
      'E_BROWSER_PROBE',
      `Unable to load browser probe module at ${modulePath}: ${safeMessage(cause)}`,
    );
  }
  const probe = loaded.browserProbe ?? loaded.default;
  if (typeof probe !== 'function') {
    throw codedError(
      'E_BROWSER_PROBE',
      `Browser probe module at ${modulePath} must export a browserProbe function.`,
    );
  }
  return probe;
}

async function auditRenderedArtifacts(
  state,
  options,
  { runtime, htmlSafetyErrors, qaWarnings },
) {
  for (const artifact of state.resolvedArtifacts.filter(
    ({ authoring }) => authoring === 'html',
  )) {
    const safety = validateHtmlSafety({
      html: state.authoredContent.get(artifact.id),
      shell: artifact.shellContent,
      shellName: artifact.shell ?? artifact.template,
    });
    htmlSafetyErrors.push(
      ...safety.errors.map((code) => ({
        code,
        message: `Artistic artifact ${artifact.id} failed DOM safety validation.`,
      })),
    );
    qaWarnings.push(...safety.warnings);
  }

  const probeArtifacts = state.rendered.map((artifact) => ({
    id: artifact.artifactId,
    type: artifact.type,
    html: artifact.html,
  }));
  const report = await auditArtifactSet({
    artifacts: probeArtifacts,
    ...(options.denylist && { denylist: options.denylist }),
    ...(runtime.probe && { browserProbe: runtime.probe }),
    ...(options.widths && { widths: options.widths }),
  });
  const hardIssues = report.issues.filter((issue) => isHardQaIssue(issue.code));
  const warningIssues = report.issues.filter(
    (issue) => !isHardQaIssue(issue.code),
  );
  // A code the render-QA vocabulary already covers must not also emit an ad
  // hoc `qa-*` twin; the generic conversion is for structural codes only.
  qaWarnings.push(
    ...renderQaWarningIds(warningIssues),
    ...warningIssues
      .filter(({ code }) => renderQaWarningIds([{ code }]).length === 0)
      .map(({ code }) => `qa-${code}`),
  );
  // The skip means "this machine has no usable runtime" or "an operator turned
  // probes off", never "no caller injected a probe".
  if (!runtime.probe) {
    qaWarnings.push(
      runtime.reason === RUNTIME_UNAVAILABLE_REASONS.disabled
        ? RENDER_QA_WARNING_IDS.disabledByConfiguration
        : RENDER_QA_WARNING_IDS.skippedNoRuntime,
    );
  }
  const guidelines = checkGuidelines({
    recipe: state.recipe,
    artifacts: probeArtifacts,
    expansion: state.expansion,
  });
  qaWarnings.push(...guidelines.warnings, ...state.expansion.warnings);

  const errors = [...state.qaErrors, ...htmlSafetyErrors, ...hardIssues];
  if (errors.length > 0) {
    throw codedError(
      'E_QA',
      errors.map(({ code, message }) => `${code}: ${message}`).join('; '),
    );
  }
  state.warnings.push(...qaWarnings);
  const warnings = [
    ...(state.reopenedWarnings.qa ?? []),
    ...new Set(qaWarnings),
  ];
  return {
    outputPaths: state.rendered.map(({ renderedPath }) => renderedPath),
    warnings,
    status: warnings.length > 0 ? 'warned' : 'passed',
  };
}

function isHardQaIssue(code) {
  return (
    [
      'denylisted-string',
      'external-asset',
      'link-form',
      'tag-balance',
      'unresolved-token',
    ].includes(code) || code.startsWith('cohesion-')
  );
}

function artisticRender(state, artifact) {
  const renderedPath = artifactPath(renderDescriptor(artifact), state.run.slug);
  const publicBaseUrl = state.run.request.publicBaseUrl?.replace(/\/+$/g, '');
  return {
    artifactId: artifact.id,
    type: artifact.type,
    renderedPath,
    publicUrl: publicBaseUrl
      ? `${publicBaseUrl}/${renderedPath.slice('site/'.length)}`
      : undefined,
    mediaType: 'text/html',
    html: state.authoredContent.get(artifact.id),
    warnings: [],
  };
}

async function loadResumableRun(request) {
  const normalized = structuredClone(request);
  normalized.theme = {
    ...(normalized.theme ?? {}),
    renderStrategy: normalized.theme?.renderStrategy ?? 'default-only',
  };
  const runRoot = join(resolve(normalized.outputRoot), normalized.slug);
  let approval;
  let record;
  let persistedRequest;
  try {
    [approval, record, persistedRequest] = await Promise.all([
      readJson(join(runRoot, 'source/content-approval.json')),
      readJson(join(runRoot, 'build-record.json')),
      readJson(join(runRoot, 'run-request.json')),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }

  const approvalUnresolved = ['pending', 'rejected'].includes(approval.status);
  const completedBeforeApproval = ['content', 'theme', 'render', 'qa'].every(
    (id) =>
      ['passed', 'warned', 'skipped'].includes(
        record.stages?.find((stage) => stage.id === id)?.status,
      ),
  );
  if (
    !approvalUnresolved ||
    !completedBeforeApproval ||
    approval.runId !== record.runId
  ) {
    return null;
  }
  if (
    persistedRequest.slug !== normalized.slug ||
    persistedRequest.recipe?.id !== normalized.recipe.id ||
    persistedRequest.recipe?.version !== normalized.recipe.version ||
    persistedRequest.mode !== normalized.mode ||
    canonicalHash(persistedRequest.factBase) !==
      canonicalHash(normalized.factBase)
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run does not match the current request identity.',
    );
  }

  const canonicalRunRoot = join(persistedRequest.outputRoot, normalized.slug);
  return {
    runId: record.runId,
    slug: normalized.slug,
    outputRoot: persistedRequest.outputRoot,
    runRoot: canonicalRunRoot,
    requestPath: join(canonicalRunRoot, 'run-request.json'),
    buildRecordPath: join(canonicalRunRoot, 'build-record.json'),
    manifestPath: join(canonicalRunRoot, 'manifest.json'),
    request: normalized,
  };
}

async function hydrateResumableState(state) {
  const [factBase, approval, theme, record] = await Promise.all([
    readJson(join(state.run.runRoot, 'source/fact-base.json')),
    readJson(join(state.run.runRoot, 'source/content-approval.json')),
    readJson(join(state.run.runRoot, 'theme.resolved.json')),
    readJson(state.run.buildRecordPath),
  ]);
  state.factBase = factBase;
  state.theme = theme;
  state.themeWarnings = [];
  state.resumedApprovalStatus = approval.status;
  state.warnings.push(
    ...record.stages.flatMap(({ warnings = [] }) =>
      warnings.filter((warning) => !warning.startsWith('stage-reopened:')),
    ),
  );
  state.inputHashes = inputHashes(state.factBase);
  state.factBaseHash = canonicalHash(state.factBase);
  state.contentModels = [];
  const persistedArtifacts = Array.isArray(approval.artifacts)
    ? approval.artifacts
    : recipeFloor(state.recipe).map((artifact) => ({
        artifactId: artifact.id,
        origin: 'floor',
        authoring: artifact.authoring ?? 'markdown',
        contentPath: `source/content/${artifact.id}.md`,
      }));
  for (const persisted of persistedArtifacts) {
    const artifact = resolvedArtifactFromApproval(state.recipe, persisted);
    if (artifact.authoring === 'html') {
      artifact.shellContent = await readSkillFile(
        `templates/${artifact.shell}.html`,
      );
    }
    const content = await readFile(
      join(state.run.runRoot, persisted.contentPath),
      'utf8',
    );
    state.resolvedArtifacts.push(artifact);
    state.authoredContent.set(artifact.id, content);
    state.contentPaths.set(artifact.id, persisted.contentPath);
    if (persisted.authorResultPath) {
      state.authorResultPaths.push(persisted.authorResultPath);
    }
  }
  const links = expansionLinks(state.resolvedArtifacts);
  for (const artifact of state.resolvedArtifacts) {
    if (artifact.authoring !== 'markdown') continue;
    state.contentModels.push(
      markdownContentModel(
        artifact,
        state.run.slug,
        state.authoredContent.get(artifact.id),
        artifact.origin === 'floor' ? links : [],
      ),
    );
  }
  state.expansion.accepted = state.resolvedArtifacts
    .filter(({ origin }) => origin === 'expansion')
    .map((artifact) => ({
      id: artifact.id,
      profileId: artifact.profileId,
      rationale: 'Persisted approved expansion artifact.',
      status: 'accepted',
      profile: expansionProfile(state.recipe, artifact.profileId),
    }));
  await hydrateRenderedState(state);
}

async function hydrateRenderedState(state) {
  state.rendered = [];
  state.artifacts = [];
  for (const artifact of state.resolvedArtifacts) {
    const descriptor =
      artifact.authoring === 'markdown'
        ? await renderArtifact({
            recipeArtifact: renderDescriptor(artifact),
            content: state.contentModels.find(
              ({ artifactId }) => artifactId === artifact.id,
            ),
            theme: state.theme,
            renderStrategy: state.renderStrategy,
            ...(state.run.request.publicBaseUrl && {
              publicBaseUrl: state.run.request.publicBaseUrl,
            }),
          })
        : artisticRender(state, artifact);
    const html = await readFile(
      join(state.run.runRoot, descriptor.renderedPath),
      'utf8',
    );
    const rendered = { ...descriptor, html };
    state.rendered.push(rendered);
    state.artifacts.push(artifactRecord(state, rendered));
  }
}

function artifactRecord(state, rendered) {
  return {
    id: rendered.artifactId,
    type: rendered.type,
    contentPath: state.contentPaths.get(rendered.artifactId),
    renderedPath: rendered.renderedPath,
    mediaType: rendered.mediaType,
    status: 'built',
    hash: hashBytes(rendered.html),
    rebuildable: false,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function runExplainerCli(
  argv = process.argv.slice(2),
  io = console,
) {
  try {
    const parsed = await parseCli(argv);
    const request = JSON.parse(await readFile(parsed.requestPath, 'utf8'));
    const result = await runExplainer(request, parsed.options);
    io.log(JSON.stringify(result, null, 2));
    return result.outcome === 'failed' ? 1 : 0;
  } catch (error) {
    io.log(
      JSON.stringify(
        {
          outcome: 'failed',
          errors: [
            {
              code: error.code ?? 'E_INPUT_SCHEMA',
              message: safeMessage(error),
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

async function executeStage(run, id, options, operation) {
  await updateBuildRecord(run, { id, status: 'running' });
  try {
    await options.hooks?.beforeStage?.(id, run);
    const result = (await operation()) ?? {};
    await options.hooks?.afterStage?.(id, run);
    return updateBuildRecord(run, {
      id,
      status: result.status ?? 'passed',
      outputPaths: result.outputPaths ?? [],
      ...(result.warnings !== undefined && { warnings: result.warnings }),
    });
  } catch (error) {
    await updateBuildRecord(run, {
      id,
      status: 'failed',
      error: {
        code: error.code ?? stageErrorCode(id),
        message: safeMessage(error),
        recovery: [
          `Correct the ${id} inputs or implementation and start a new run.`,
        ],
      },
    });
    throw error;
  }
}

async function buildFactBase(binding, options, now) {
  if (binding.mode === 'supplied') {
    const factBase = JSON.parse(await readFile(binding.path, 'utf8'));
    return processFactBase(
      { mode: 'supplied', freshnessPolicy: binding.freshnessPolicy, factBase },
      {
        now: now(),
        ...(options.maxFactAgeMs && { maxAgeMs: options.maxFactAgeMs }),
      },
    );
  }

  const sourceDocuments = await Promise.all(
    binding.sources.map(async (source) => {
      if (
        source.kind !== 'file' &&
        typeof options.sourceLoader !== 'function'
      ) {
        throw codedError(
          'E_FACT_BASE',
          `Core file loading cannot resolve source kind ${source.kind}; supply an explicit sourceLoader.`,
        );
      }
      const raw = options.sourceLoader
        ? await options.sourceLoader(source)
        : JSON.parse(await readFile(source.locator, 'utf8'));
      if (!Array.isArray(raw.claims)) {
        throw codedError(
          'E_FACT_BASE',
          `Federated source ${source.id} must provide a claims array.`,
        );
      }
      const serialized = JSON.stringify(raw);
      return {
        source: {
          ...source,
          hash: hashBytes(serialized),
          observedAt: raw.observedAt ?? now(),
        },
        claims: raw.claims,
      };
    }),
  );
  return processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: binding.freshnessPolicy,
      sourceDocuments,
      overrides: options.overrides ?? [],
    },
    { critic: options.critic, now: now() },
  );
}

async function runDiscovery(recipe, factBase, options) {
  if (typeof options.discover !== 'function') {
    return { rounds: 0, findings: [], reason: 'not-requested' };
  }
  const findings = [];
  const counts = [];
  while (!shouldStopDiscovery(recipe, counts)) {
    const round = counts.length + 1;
    const roundFindings = await options.discover({
      round,
      recipe: structuredClone(recipe),
      factBase: structuredClone(factBase),
    });
    if (!Array.isArray(roundFindings)) {
      throw codedError('E_CONTENT', 'Discovery callback must return an array.');
    }
    counts.push(roundFindings.length);
    findings.push(...roundFindings);
  }
  const emptyLimit = recipe.discoveryLimits.consecutiveNoNewFindingsRounds;
  const stoppedEmpty =
    counts.slice(-emptyLimit).length === emptyLimit &&
    counts.slice(-emptyLimit).every((count) => count === 0);
  return {
    rounds: counts.length,
    findings,
    reason: stoppedEmpty ? 'two-empty-rounds' : 'hard-maximum',
  };
}

async function executeDurabilityAndPublish(state, options, now) {
  const strategy = state.run.request.durability?.strategy ?? 'none';
  if (strategy === 'none') {
    await updateBuildRecord(state.run, { id: 'durability', status: 'skipped' });
    await updateBuildRecord(state.run, { id: 'publish', status: 'skipped' });
    return;
  }

  if (strategy === 'commit') {
    await updateBuildRecord(state.run, { id: 'durability', status: 'running' });
    await persistManifest(state, now());
    if (typeof options.durability !== 'function') {
      throw codedError(
        'E_DURABILITY',
        'Commit durability was requested without a durability callback.',
      );
    }
    await options.durability({
      runRoot: state.run.runRoot,
      manifestPath: state.run.manifestPath,
      buildRecordPath: state.run.buildRecordPath,
    });
    await updateBuildRecord(state.run, {
      id: 'durability',
      status: 'warned',
      warnings: [
        'Commit durability requires caller-created evidence through record-durability.mjs.',
      ],
    });
    await updateBuildRecord(state.run, { id: 'publish', status: 'skipped' });
    return;
  }

  await updateBuildRecord(state.run, { id: 'durability', status: 'skipped' });
  await updateBuildRecord(state.run, { id: 'publish', status: 'running' });
  await persistManifest(state, now());
  if (typeof options.publish !== 'function') {
    throw codedError(
      'E_PUBLISH',
      'Publish durability was requested without an explicit publisher callback.',
    );
  }
  await options.publish({
    request: structuredClone(state.run.request.durability.publish),
    runRoot: state.run.runRoot,
    manifestPath: state.run.manifestPath,
  });
  await updateBuildRecord(state.run, {
    id: 'publish',
    status: 'warned',
    warnings: [
      'Publishing completed; verified receipt evidence must be recorded separately.',
    ],
  });
}

async function persistManifest(state, createdAt) {
  const record = JSON.parse(await readFile(state.run.buildRecordPath, 'utf8'));
  const manifest = manifestFor(
    state,
    record,
    createdAt,
    await immutableHashesFor(state),
  );
  await writeManifestAtomic(state.run, manifest);
  return manifest;
}

async function persistFailureManifest(state, error, createdAt) {
  const record = JSON.parse(await readFile(state.run.buildRecordPath, 'utf8'));
  const recordedIds = new Set(state.artifacts.map(({ id }) => id));
  state.artifacts.push(
    ...recipeFloor(state.recipe)
      .filter(({ id }) => !recordedIds.has(id))
      .map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        contentPath: state.contentPaths.get(artifact.id),
        status: 'failed',
        rebuildable: false,
        failure: {
          code: error.code ?? 'E_RENDER',
          message: safeMessage(error),
          recovery: ['Correct the failed stage and start a new run.'],
        },
      })),
  );
  return writeManifestAtomic(
    state.run,
    manifestFor(state, record, createdAt, await immutableHashesFor(state)),
  );
}

function manifestFor(state, buildRecord, createdAt, immutableHashes) {
  return {
    schemaVersion: 'explainer-kit.manifest/v1',
    runId: state.run.runId,
    slug: state.run.slug,
    recipe: {
      id: state.recipe.id,
      version: state.recipe.version,
    },
    createdAt,
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: state.factBaseHash,
      inputHashes: state.inputHashes,
      ...(state.authorResultPaths.length > 0 && {
        authorResultPaths: state.authorResultPaths,
      }),
    },
    theme: {
      path: 'theme.resolved.json',
      hash: canonicalHash(state.theme),
      derived: state.theme.provenance.derived,
    },
    artifacts: state.artifacts,
    immutableHashes,
    outcome: buildRecord.outcome,
    buildRecord: {
      path: 'build-record.json',
      hash: canonicalHash(buildRecord),
    },
    warnings: [...new Set(state.warnings)],
  };
}

async function createAuthoredContent(state, options, now) {
  const author = options.author;
  if (typeof author !== 'function') {
    throw codedError(
      'E_AUTHOR_REQUIRED',
      'Explainer runs require an explicit author callback in both modes.',
    );
  }
  const trust = authorTrustContext(options, now);

  const floor = await Promise.all(
    recipeFloor(state.recipe).map((artifact) =>
      authorArtifact(
        state,
        {
          ...artifact,
          origin: 'floor',
          shell: artifact.authoring === 'html' ? artifact.template : undefined,
        },
        author,
        trust,
      ),
    ),
  );
  const proposals = floor.flatMap(
    ({ result }) => result.proposedArtifacts ?? [],
  );
  state.expansion = evaluateExpansionProposals(state.recipe, proposals);
  if (!state.expansion.valid) {
    throw codedError(
      'E_AUTHOR_RESULT',
      `Invalid expansion proposals: ${state.expansion.errors.join('; ')}`,
    );
  }

  const expansions = [];
  for (const accepted of state.expansion.accepted) {
    const profile = accepted.profile;
    const item = await authorArtifact(
      state,
      {
        id: accepted.id,
        type: profile.type,
        authoring: profile.authoring,
        briefRef: profile.briefRef,
        shell: profile.shell,
        template:
          profile.authoring === 'markdown'
            ? templateForType(profile.type)
            : profile.shell,
        required: false,
        origin: 'expansion',
        profileId: profile.profileId,
      },
      author,
      trust,
    );
    if ((item.result.proposedArtifacts ?? []).length > 0) {
      throw codedError(
        'E_AUTHOR_RESULT',
        `Expansion artifact ${accepted.id} cannot propose nested artifacts.`,
      );
    }
    expansions.push(item);
  }

  const authored = [...floor, ...expansions];
  state.resolvedArtifacts = authored.map(({ artifact }) => artifact);
  const links = expansionLinks(state.resolvedArtifacts);
  for (const item of authored) {
    await writeJsonAtomic(state.run.runRoot, item.resultPath, item.result);
    await writeTextAtomic(state.run.runRoot, item.contentPath, item.content);
    state.authorResultPaths.push(item.resultPath);
    state.contentPaths.set(item.artifact.id, item.contentPath);
    state.authoredContent.set(item.artifact.id, item.content);
    if (item.artifact.authoring === 'markdown') {
      state.contentModels.push(
        markdownContentModel(
          item.artifact,
          state.run.slug,
          item.content,
          item.artifact.origin === 'floor' ? links : [],
        ),
      );
    }
  }
}

// Provenance authenticity cannot come from the party being identified, so
// identity and method are bound to trusted caller configuration and the
// generation time is stamped from the run's injected clock.
function authorTrustContext(options, now) {
  const generatedAt = now();
  const declared = options.authorProvenance;
  if (declared === undefined) return { generatedAt, bound: null };
  const valid =
    typeof declared === 'object' &&
    declared !== null &&
    !Array.isArray(declared) &&
    typeof declared.authorId === 'string' &&
    declared.authorId.length > 0 &&
    (declared.method === undefined ||
      (typeof declared.method === 'string' && declared.method.length > 0));
  if (!valid) {
    throw codedError(
      'E_AUTHOR_PROVENANCE',
      'Trusted author provenance requires a non-empty authorId and, when present, a non-empty method.',
    );
  }
  return {
    generatedAt,
    bound: {
      authorId: declared.authorId,
      ...(declared.method !== undefined && { method: declared.method }),
    },
  };
}

function resolveAuthorProvenance(claimed, trust, artifactId) {
  if ('trust' in claimed) {
    throw codedError(
      'E_AUTHOR_PROVENANCE',
      `Author result for ${artifactId} must not assert a provenance trust level; the core stamps it.`,
    );
  }
  if (trust.bound === null) {
    return {
      ...claimed,
      generatedAt: trust.generatedAt,
      trust: 'self-asserted',
    };
  }
  if (
    claimed.authorId !== trust.bound.authorId ||
    (trust.bound.method !== undefined && claimed.method !== trust.bound.method)
  ) {
    throw codedError(
      'E_AUTHOR_PROVENANCE',
      `Author result for ${artifactId} claims provenance that does not match the trusted caller context.`,
    );
  }
  return {
    ...trust.bound,
    generatedAt: trust.generatedAt,
    trust: 'caller-bound',
  };
}

async function authorArtifact(state, artifact, author, trust) {
  const brief = await readSkillFile(artifact.briefRef);
  const shellContent =
    artifact.authoring === 'html'
      ? await readSkillFile(`templates/${artifact.shell}.html`)
      : undefined;
  const resolvedArtifact = {
    ...artifact,
    ...(shellContent && { shellContent }),
  };
  const requiredNarrative =
    artifact.origin === 'floor'
      ? recipeRequiredNarrative(state.recipe, artifact.id)
      : [];
  const authorRequest = {
    schemaVersion: 'explainer-kit.author-request/v2',
    artifactId: artifact.id,
    artifactType: artifact.type,
    authoring: artifact.authoring,
    brief,
    factBase: structuredClone(state.factBase),
    ...(shellContent && { shell: shellContent }),
    theme: structuredClone(state.theme),
    ...(artifact.origin === 'floor' &&
      requiredNarrative.length > 0 && {
        floor: { requiredNarrative },
      }),
  };
  const requestValidation = validateContract(
    'author-request/v2',
    authorRequest,
  );
  if (!requestValidation.valid) {
    throw codedError(
      'E_AUTHOR_REQUEST',
      contractErrorMessage('author request', requestValidation.errors),
    );
  }

  const result = await author(structuredClone(authorRequest));
  const resultValidation = validateContract('author-result/v2', result);
  if (!resultValidation.valid) {
    throw codedError(
      'E_AUTHOR_RESULT',
      contractErrorMessage('author result', resultValidation.errors),
    );
  }
  const content = result.content?.[artifact.authoring];
  if (result.artifactId !== artifact.id || typeof content !== 'string') {
    throw codedError(
      'E_AUTHOR_RESULT',
      `Author result for ${artifact.id} must match its identity and ${artifact.authoring} path.`,
    );
  }
  const retained = {
    ...structuredClone(result),
    provenance: resolveAuthorProvenance(
      result.provenance,
      trust,
      artifact.id,
    ),
  };
  const retainedValidation = validateContract('author-result/v2', retained);
  if (!retainedValidation.valid) {
    throw codedError(
      'E_AUTHOR_PROVENANCE',
      contractErrorMessage('retained author result', retainedValidation.errors),
    );
  }
  const dumpCheck = checkSourceDumping({
    authoredText: content,
    sourceTexts: [
      ...state.factBase.claims,
      ...state.factBase.unresolvedClaims,
    ].map(({ text }) => text),
  });
  state.qaErrors.push(
    ...dumpCheck.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
  );

  return {
    artifact: resolvedArtifact,
    result: retained,
    resultPath: `source/author/${artifact.id}.json`,
    content,
    contentPath: `source/content/${artifact.id}.${artifact.authoring === 'markdown' ? 'md' : 'html'}`,
  };
}

async function readSkillFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function contractErrorMessage(label, errors) {
  return `Invalid ${label}: ${errors
    .map(({ path, message }) => `${path}: ${message}`)
    .join('; ')}`;
}

// renderArtifact validates an exact key set, so normalized v2 floor entries
// must be narrowed before they reach it.
function renderDescriptor(artifact) {
  return {
    id: artifact.id,
    type: artifact.type,
    template: artifact.template,
    required: artifact.required,
    origin: artifact.origin,
  };
}

function markdownContentModel(artifact, slug, markdown, artifactLinks) {
  const title =
    markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? humanize(artifact.id);
  const headings = [...markdown.matchAll(/^## (.+)$/gm)];
  const sections =
    headings.length > 0
      ? headings.map((heading, index) => ({
          id: slugify(heading[1].trim()),
          title: heading[1].trim(),
          content: markdown
            .slice(
              heading.index + heading[0].length,
              headings[index + 1]?.index ?? markdown.length,
            )
            .trim(),
        }))
      : [{ id: 'overview', title: 'Overview', content: markdown }];
  return {
    artifactId: artifact.id,
    slug,
    title,
    description: `Authored ${humanize(artifact.id).toLowerCase()}.`,
    eyebrow: 'Explainer Kit',
    footer: 'Authored from the retained reconciled fact base.',
    sections,
    artifactLinks,
  };
}

function approvalArtifacts(state) {
  return state.resolvedArtifacts.map((artifact) => ({
    artifactId: artifact.id,
    origin: artifact.origin,
    ...(artifact.profileId && { profileId: artifact.profileId }),
    authoring: artifact.authoring,
    contentPath:
      state.contentPaths.get(artifact.id) ??
      `source/content/${artifact.id}.${artifact.authoring === 'markdown' ? 'md' : 'html'}`,
    authorResultPath:
      state.authorResultPaths.find((path) =>
        path.endsWith(`/${artifact.id}.json`),
      ) ?? `source/author/${artifact.id}.json`,
  }));
}

function expansionLinks(artifacts) {
  return artifacts
    .filter(({ origin }) => origin === 'expansion')
    .map((artifact) => ({
      id: artifact.id,
      type: artifact.type,
      label: humanize(artifact.id),
      origin: 'expansion',
    }));
}

function expansionProfile(recipe, profileId) {
  return recipeExpansion(recipe).profiles.find(
    (profile) => profile.profileId === profileId,
  );
}

function resolvedArtifactFromApproval(recipe, persisted) {
  if (persisted.origin === 'floor') {
    const artifact = recipeFloor(recipe).find(
      ({ id }) => id === persisted.artifactId,
    );
    if (!artifact) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Approval references unknown floor artifact ${persisted.artifactId}.`,
      );
    }
    return {
      ...artifact,
      origin: 'floor',
      shell: artifact.authoring === 'html' ? artifact.template : undefined,
    };
  }
  const profile = expansionProfile(recipe, persisted.profileId);
  if (!profile) {
    throw codedError(
      'E_APPROVAL_RESUME',
      `Approval references unknown expansion profile ${persisted.profileId}.`,
    );
  }
  return {
    id: persisted.artifactId,
    type: profile.type,
    authoring: profile.authoring,
    briefRef: profile.briefRef,
    shell: profile.shell,
    template:
      profile.authoring === 'markdown'
        ? templateForType(profile.type)
        : profile.shell,
    required: false,
    origin: 'expansion',
    profileId: profile.profileId,
  };
}

function templateForType(type) {
  return (
    {
      hub: 'house-style',
      diagram: 'diagram-shell',
      explainer: 'engineer-tour',
      deck: 'deck-shell',
    }[type] ?? 'house-style'
  );
}

function validateRecipeSources(recipe, binding) {
  const primaryRole = recipe.sourceRoles[0]?.role;
  const bindings =
    binding.mode === 'supplied'
      ? [{ role: primaryRole, kind: 'file', sourceSetId: 'supplied-fact-base' }]
      : binding.sources.map((source) => ({
          role: source.role,
          kind: source.kind,
          sourceSetId: source.sourceSetId,
        }));
  const result = validateSourceBindings(recipe, bindings);
  if (!result.valid) {
    throw codedError('E_FACT_BASE', result.errors.join('; '));
  }
}

async function immutableHashesFor(state) {
  const paths = [
    'run-request.json',
    'source/fact-base.json',
    'source/fact-base.md',
    'source/content-approval.json',
    ...state.authorResultPaths,
    ...state.contentPaths.values(),
    ...(state.theme ? ['theme.resolved.json'] : []),
    ...state.artifacts
      .filter(
        ({ status, renderedPath }) =>
          status === 'built' && typeof renderedPath === 'string',
      )
      .map(({ renderedPath }) => renderedPath),
  ];
  return Object.fromEntries(
    await Promise.all(
      [...new Set(paths)].map(async (path) => [
        path,
        hashBytes(await readFile(join(state.run.runRoot, path))),
      ]),
    ),
  );
}

function inputHashes(factBase) {
  return Object.fromEntries(
    factBase.sources.map(({ id, hash }) => [`inputs/${safeId(id)}`, hash]),
  );
}

function factBaseMarkdown(factBase) {
  const confirmed = factBase.claims
    .map(({ id, text }) => `- **${id}:** ${text}`)
    .join('\n');
  const unresolved = factBase.unresolvedClaims
    .map(({ id, text, reason }) => `- **${id} (${reason}):** ${text}`)
    .join('\n');
  return `# Fact base\n\n## Confirmed claims\n\n${confirmed || '- None.'}\n\n## Unresolved claims\n\n${unresolved || '- None.'}\n`;
}

function assertValidRequest(request) {
  const result = validateContract('run-request', request);
  if (!result.valid) {
    throw codedError(
      'E_INPUT_SCHEMA',
      result.errors
        .map(({ path, code, message }) => `${path} [${code}]: ${message}`)
        .join('; '),
    );
  }
}

function resultFor(state, error) {
  return {
    runId: state.run.runId,
    runRoot: state.run.runRoot,
    manifestPath: state.run.manifestPath,
    buildRecordPath: state.run.buildRecordPath,
    outcome: error
      ? 'failed'
      : state.approval?.canResume === false
        ? 'incomplete'
        : 'built-not-durable',
    ...(state.approval?.record?.marking && {
      marking: state.approval.record.marking,
    }),
    warnings: [...new Set(state.warnings)],
    discovery: state.discovery,
    ...(state.approval && {
      approval: {
        status: state.approval.status,
        path: state.approval.path,
        ...(state.approval.record.marking && {
          marking: state.approval.record.marking,
        }),
      },
    }),
    ...(error && {
      errors: [{ code: error.code ?? 'E_RUN', message: safeMessage(error) }],
    }),
  };
}

async function parseCli(argv) {
  let requestPath;
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--request') {
      requestPath = argv[++index];
    } else if (value === '--reviewed-source') {
      const path = argv[++index];
      if (!path) throw new Error('--reviewed-source requires a JSON path.');
      options.reviewedSource = JSON.parse(await readFile(path, 'utf8'));
    } else if (value === '--browser-probe-module') {
      const path = argv[++index];
      if (!path) throw new Error(`${value} requires a module path.`);
      options.browserProbeModulePath = path;
    } else if (
      [
        '--author-module',
        '--critic-module',
        '--publish-module',
        '--durability-module',
      ].includes(value)
    ) {
      const path = argv[++index];
      if (!path) throw new Error(`${value} requires a module path.`);
      const loaded = await import(pathToFileURL(resolve(path)).href);
      const key = value.slice(2, -'-module'.length);
      options[key] = loaded.default ?? loaded[key];
      if (typeof options[key] !== 'function') {
        throw new Error(`${value} must export a callback function.`);
      }
    } else {
      throw new Error(`Unknown option: ${value}.`);
    }
  }
  if (!requestPath) {
    throw new Error(
      'Usage: run.mjs --request <json> [--reviewed-source <json>] [--author-module <mjs>] [--critic-module <mjs>] [--publish-module <mjs>] [--durability-module <mjs>] [--browser-probe-module <mjs>]',
    );
  }
  return { requestPath, options };
}

function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function safeId(value) {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function humanize(value) {
  return value
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stageErrorCode(stage) {
  return `E_${stage.toUpperCase().replaceAll('-', '_')}`;
}

function safeMessage(error) {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(
      /(?:aws_secret_access_key|aws_session_token|password|private_key)\s*[:=]\s*\S+/gi,
      '[redacted]',
    )
    .slice(0, 2000);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runExplainerCli();
}
