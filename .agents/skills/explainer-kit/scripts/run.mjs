#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertBrowserProbeSession } from './lib/browser-runtime.mjs';
import { catalogFromManifest, initiativeCatalogPath } from './lib/catalog.mjs';
import {
  readContentApproval,
  resolveContentApproval,
} from './lib/content-approval.mjs';
import { canonicalHash, validateContract } from './lib/contracts.mjs';
import {
  assertAuthoredGraphSemantics,
  graphSemanticsForArtisticAuthor,
  parseDiagram,
} from './lib/diagram.mjs';
import { processFactBase } from './lib/fact-base.mjs';
import { writeJsonAtomic, writeTextAtomic } from './lib/fs-safe.mjs';
import { validateHtmlSafety } from './lib/html-safety.mjs';
import { validateInternalReferences } from './lib/internal-references.mjs';
import { parseMarkdown } from './lib/markdown.mjs';
import {
  auditArtifactSet,
  checkGuidelines,
  checkSourceDumping,
  RENDER_QA_WARNING_IDS,
  renderQaWarningIds,
  renderWarningIds,
} from './lib/qa.mjs';
import {
  loadRecipe,
  recipeExpansion,
  recipeFloor,
  recipeRequiredNarrative,
  resolveDiagramRenderingRoute,
  selectRecipeAuthoring,
  shouldStopDiscovery,
  validateContentModel,
  validatePlannedPortfolio,
  validateSourceBindings,
} from './lib/recipes.mjs';
import {
  canonicalPersistedRunRequest,
  createSetPlanResumeToken,
  initializeRun,
  readSetPlanRecords,
  reopenBuildStages,
  updateBuildRecord,
  verifySetPlanResumeToken,
  writeManifestAtomic,
  writeSetPlanRecords,
  writeVisualReviewAttempt,
  writeVisualReviewFailure,
  writeVisualRevision,
} from './lib/records.mjs';
import { artifactPath, renderArtifact } from './lib/render.mjs';
import { resolveRootConfinedPath } from './lib/safe-paths.mjs';
import { plannedArtifacts, planExplainerSet } from './lib/set-plan.mjs';
import { resolveTheme } from './lib/theme.mjs';
import { runVisualReview } from './lib/visual-review.mjs';

export {
  assertBrowserProbeSession,
  createBrowserProbeSession,
  createFixtureBrowserProbeSession,
} from './lib/browser-runtime.mjs';

// Stages a rejected draft reruns once its content is corrected.
const REOPENED_ON_REJECTION = Object.freeze(['render', 'qa']);

export async function runExplainer(request, options = {}) {
  const normalizedRequest = normalizeRunRequest(request);
  assertValidRequest(normalizedRequest);
  const recipe = selectRecipeAuthoring(
    loadRecipe(normalizedRequest.recipe.id, normalizedRequest.recipe.version),
    normalizedRequest.recapMode,
  );
  const browserProvider = resolveBrowserProvider(
    normalizedRequest,
    recipe,
    options,
  );
  const resumed = await loadResumableRun(
    normalizedRequest,
    options.reviewedSource?.resumeToken,
  );
  const run = resumed ?? (await initializeRun(normalizedRequest));
  const now = options.now ?? (() => new Date().toISOString());
  const state = {
    run,
    recipe,
    factBase: null,
    factBaseHash: null,
    inputHashes: {},
    setPlan: null,
    setPlanPaths: [],
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
    browserProvider,
    browserEvidence: [],
    visualReview: null,
    visualReviewPaths: [],
    visualReviewAttempt: 0,
    reviewGateBlocked: false,
    correctionAttempted: false,
    resumeToken: null,
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
        const planned = await planExplainerSet({
          recipe,
          factBase: state.factBase,
          discovery: state.discovery,
          planSet: options.planSet,
        });
        state.setPlan = planned.plan;
        const portfolioValidation = validatePlannedPortfolio(
          recipe,
          state.setPlan.portfolio,
        );
        if (!portfolioValidation.valid) {
          throw codedError(
            'E_SET_PLAN',
            `Invalid planned portfolio: ${portfolioValidation.errors.join('; ')}`,
          );
        }
        state.setPlanPaths = await writeSetPlanRecords(run, planned);
        await createAuthoredContent(state, options, now);
        return {
          outputPaths: [
            ...state.setPlanPaths,
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
          ids: [...REOPENED_ON_REJECTION],
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
      await executeQaStage(state, options, now);
    }

    state.approval = await resolveContentApproval(
      run,
      run.request.mode,
      options.reviewedSource,
      state.authorResultPaths,
      approvalArtifacts(state),
    );
    if (!state.approval.canResume) {
      if (run.request.mode === 'interactive') {
        state.resumeToken = await createSetPlanResumeToken(run);
      }
      return resultFor(state);
    }

    if (state.reviewGateBlocked) {
      await updateBuildRecord(run, { id: 'durability', status: 'skipped' });
      await updateBuildRecord(run, { id: 'publish', status: 'skipped' });
      await persistManifest(state, now());
      return resultFor(state);
    }

    const manifestFinalized = await executeDurabilityAndPublish(
      state,
      options,
      now,
    );
    if (!manifestFinalized) {
      await persistManifest(state, now());
    }
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
              factBase: state.factBase,
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

async function executeQaStage(state, options, now) {
  await executeStage(state.run, 'qa', options, async () => {
    const htmlSafetyErrors = [];
    const qaWarnings = [];
    try {
      return await auditRenderedArtifacts(state, options, now, {
        browserProvider: state.browserProvider,
        htmlSafetyErrors,
        qaWarnings,
      });
    } catch (error) {
      const reviewError = normalizeReviewGateError(state, error);
      if (!reviewError) {
        throw error;
      }
      const warning = reviewGateWarning(reviewError);
      state.reviewGateBlocked = true;
      state.warnings.push(warning);
      state.visualReviewPaths.push(
        ...(await writeVisualReviewFailure(state.run, {
          attempt: state.visualReviewAttempt || 1,
          error: reviewError,
          evidence: state.browserEvidence,
        })),
      );
      return {
        outputPaths: [
          ...state.rendered.map(({ renderedPath }) => renderedPath),
          ...state.visualReviewPaths,
        ],
        warnings: [warning],
        status: 'warned',
      };
    }
  });
}

/**
 * Render QA drives a caller-supplied session only. The core never launches a
 * headless runtime itself. Production recap evidence requires a session whose
 * identity was derived and branded by createBrowserProbeSession().
 */
function resolveBrowserProvider(request, recipe, options) {
  if (
    options.browserSession !== undefined &&
    options.browserProbe !== undefined
  ) {
    throw codedError(
      'E_BROWSER_PROBE',
      'Supply either options.browserSession or the legacy non-retaining options.browserProbe callback, not both.',
    );
  }
  const productionRecap =
    recipe.id === 'project-recap' && request.mode === 'unattended';
  if (options.browserSession !== undefined) {
    try {
      return {
        session: assertBrowserProbeSession(options.browserSession, {
          allowFixture: true,
        }),
        probe: null,
        productionRecap,
      };
    } catch (error) {
      throw codedError(
        'E_BROWSER_PROBE',
        error?.message ?? 'Browser session validation failed.',
      );
    }
  }
  if (options.browserProbe === undefined) return null;
  if (productionRecap) {
    throw codedError(
      'E_BROWSER_PROBE',
      'Unattended project recaps require a trusted launched-Chromium browserSession; bare callbacks and caller-asserted runtime metadata are not accepted.',
    );
  }
  if (typeof options.browserProbe !== 'function') {
    throw codedError(
      'E_BROWSER_PROBE',
      'options.browserProbe must be a function when supplied.',
    );
  }
  return {
    session: null,
    probe: async (...args) => {
      try {
        return await options.browserProbe(...args);
      } catch (error) {
        throw codedError(
          'E_VISUAL_REVIEW',
          `Browser evidence callback failed: ${error?.message ?? String(error)}`,
        );
      }
    },
    productionRecap,
  };
}

async function auditRenderedArtifacts(
  state,
  options,
  now,
  { browserProvider, htmlSafetyErrors, qaWarnings },
) {
  await enforceInternalReferenceGate(state, options, now);
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
    setPlan: state.setPlan,
    ...(options.denylist && { denylist: options.denylist }),
    ...(browserProvider?.session && {
      browserSession: browserProvider.session,
    }),
    ...(browserProvider?.probe && { browserProbe: browserProvider.probe }),
    ...(options.widths &&
      !requiresRecapVisualReview(state) && { widths: options.widths }),
    ...(browserProvider &&
      requiresRecapVisualReview(state) && {
        evidenceRoot: state.run.runRoot,
        requireBrowserEvidence: true,
      }),
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
  if (!browserProvider) {
    qaWarnings.push(RENDER_QA_WARNING_IDS.skippedNoProbe);
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
  state.browserEvidence = report.browser?.evidence ?? [];
  const visualCritic = resolveVisualCritic(options);
  const reviewRequired = requiresRecapVisualReview(state);
  const fixtureBrowserSession =
    browserProvider?.session?.runtime.kind === 'fixture';
  if (reviewRequired && !browserProvider) {
    qaWarnings.push('visual-review-required:browser-probe-missing');
  } else if (reviewRequired && !visualCritic) {
    qaWarnings.push('visual-review-required:visual-critic-missing');
  } else if (visualCritic) {
    await reviewAndRetain(state, visualCritic, 1);
    if (state.visualReview.result.disposition === 'correct') {
      if (state.correctionAttempted) {
        throw codedError(
          'E_VISUAL_CORRECTION',
          'The one bounded artifact correction was already consumed by internal-reference validation.',
        );
      }
      state.correctionAttempted = true;
      await applyVisualCorrection(state, options, now);
      const correctedArtifacts = state.rendered.map((artifact) => ({
        id: artifact.artifactId,
        type: artifact.type,
        html: artifact.html,
      }));
      const finalReport = await auditArtifactSet({
        artifacts: correctedArtifacts,
        setPlan: state.setPlan,
        ...(options.denylist && { denylist: options.denylist }),
        ...(browserProvider?.session && {
          browserSession: browserProvider.session,
        }),
        ...(browserProvider?.probe && { browserProbe: browserProvider.probe }),
        ...(options.widths &&
          !requiresRecapVisualReview(state) && { widths: options.widths }),
        ...(browserProvider &&
          requiresRecapVisualReview(state) && {
            evidenceRoot: state.run.runRoot,
            requireBrowserEvidence: true,
          }),
      });
      const finalHardIssues = finalReport.issues.filter((issue) =>
        isHardQaIssue(issue.code),
      );
      if (finalHardIssues.length > 0) {
        throw codedError(
          'E_VISUAL_CORRECTION',
          finalHardIssues
            .map(({ code, message }) => `${code}: ${message}`)
            .join('; '),
        );
      }
      const finalWarnings = finalReport.issues.filter(
        (issue) => !isHardQaIssue(issue.code),
      );
      qaWarnings.push(
        ...renderQaWarningIds(finalWarnings),
        ...finalWarnings
          .filter(({ code }) => renderQaWarningIds([{ code }]).length === 0)
          .map(({ code }) => `qa-${code}`),
      );
      state.browserEvidence = finalReport.browser?.evidence ?? [];
      await reviewAndRetain(state, visualCritic, 2);
    }
  }
  if (reviewRequired && fixtureBrowserSession) {
    qaWarnings.push('visual-review-required:fixture-browser-session');
  }
  if (
    reviewRequired &&
    state.visualReview &&
    state.visualReview.result.disposition !== 'pass'
  ) {
    qaWarnings.push(
      state.visualReview.result.disposition === 'fail'
        ? 'visual-review-required:critic-failed'
        : 'visual-review-required:correction-unresolved',
    );
  }
  state.reviewGateBlocked = qaWarnings.some((warning) =>
    warning.startsWith('visual-review-required:'),
  );
  state.warnings.push(...qaWarnings);
  const warnings = [
    ...(state.reopenedWarnings.qa ?? []),
    ...new Set(qaWarnings),
  ];
  return {
    outputPaths: [
      ...state.rendered.map(({ renderedPath }) => renderedPath),
      ...state.visualReviewPaths,
    ],
    warnings,
    status: warnings.length > 0 ? 'warned' : 'passed',
  };
}

async function enforceInternalReferenceGate(state, options, now) {
  const validate = () =>
    validateInternalReferences({
      artifacts: state.rendered.map((artifact) => ({
        artifactId: artifact.artifactId,
        renderedPath: artifact.renderedPath,
        html: artifact.html,
      })),
      manifestPaths: state.artifacts.map(({ renderedPath }) => renderedPath),
    });
  const initial = validate();
  if (initial.valid) return;

  const correctionAuthor = options.correctArtifact ?? options.author;
  if (typeof correctionAuthor !== 'function') {
    throw internalReferenceError(initial.errors);
  }
  const trust = authorTrustContext(options, now);
  const artifactIds = [
    ...new Set(
      initial.errors
        .map(({ artifactId }) => artifactId)
        .filter((artifactId) => typeof artifactId === 'string'),
    ),
  ];
  if (artifactIds.length === 0) {
    throw internalReferenceError(initial.errors);
  }
  state.correctionAttempted = true;
  for (const artifactId of artifactIds) {
    const artifactIndex = state.resolvedArtifacts.findIndex(
      ({ id }) => id === artifactId,
    );
    if (artifactIndex < 0) {
      throw internalReferenceError(initial.errors);
    }
    const artifact = state.resolvedArtifacts[artifactIndex];
    let item;
    try {
      item = await authorArtifact(
        state,
        artifact,
        correctionAuthor,
        trust,
        canonicalArtifactLinks(
          state.resolvedArtifacts,
          artifact.id,
          state.run.slug,
        ),
        {
          attempt: 1,
          reason: 'internal-reference-validation',
          findings: structuredClone(
            initial.errors.filter(
              ({ artifactId: findingArtifactId }) =>
                findingArtifactId === artifactId,
            ),
          ),
          previousContentPath: state.contentPaths.get(artifactId),
        },
      );
    } catch (error) {
      throw codedError(
        'E_INTERNAL_REFERENCE',
        `Internal-reference correction failed for ${artifactId}: ${safeMessage(error)}`,
      );
    }
    await installCorrectedArtifact(state, artifactIndex, item);
  }

  const final = validate();
  if (!final.valid) {
    throw internalReferenceError(final.errors);
  }
}

async function installCorrectedArtifact(state, artifactIndex, item) {
  const artifactId = item.artifact.id;
  await writeJsonAtomic(state.run.runRoot, item.resultPath, item.result);
  await writeTextAtomic(state.run.runRoot, item.contentPath, item.content);
  state.resolvedArtifacts[artifactIndex] = item.artifact;
  state.authoredContent.set(artifactId, item.content);
  state.contentPaths.set(artifactId, item.contentPath);
  if (item.artifact.authoring === 'markdown') {
    const links = expansionLinks(state.resolvedArtifacts);
    const model = assertValidContentModel(
      state.recipe,
      markdownContentModel(
        item.artifact,
        state.run.slug,
        item.content,
        item.artifact.origin === 'floor' ? links : [],
      ),
      item.artifact,
    );
    const modelIndex = state.contentModels.findIndex(
      ({ artifactId: id }) => id === artifactId,
    );
    state.contentModels[modelIndex] = model;
  }
  const rendered =
    item.artifact.authoring === 'markdown'
      ? await renderArtifact({
          recipeArtifact: renderDescriptor(item.artifact),
          content: state.contentModels.find(
            ({ artifactId: id }) => id === artifactId,
          ),
          factBase: state.factBase,
          theme: state.theme,
          renderStrategy: state.renderStrategy,
          ...(state.run.request.publicBaseUrl && {
            publicBaseUrl: state.run.request.publicBaseUrl,
          }),
        })
      : artisticRender(state, item.artifact);
  await writeTextAtomic(
    state.run.runRoot,
    rendered.renderedPath,
    rendered.html,
  );
  const renderedIndex = state.rendered.findIndex(
    ({ artifactId: id }) => id === artifactId,
  );
  state.rendered[renderedIndex] = rendered;
  state.artifacts[renderedIndex] = artifactRecord(state, rendered);
}

function internalReferenceError(errors) {
  return codedError(
    'E_INTERNAL_REFERENCE',
    errors
      .map(
        ({ code, renderedPath, reference, message }) =>
          `${code}: ${renderedPath ?? 'site'}${reference ? ` references ${reference}` : ''}: ${message}`,
      )
      .join('; '),
  );
}

function resolveVisualCritic(options) {
  if (options.visualCritic === undefined) return null;
  if (typeof options.visualCritic !== 'function') {
    throw codedError(
      'E_VISUAL_REVIEW',
      'options.visualCritic must be a function when supplied.',
    );
  }
  if (
    options.visualCritic === options.author ||
    options.visualCritic === options.critic
  ) {
    throw codedError(
      'E_VISUAL_REVIEW',
      'The visual critic must be distinct from the artifact author and fact critic.',
    );
  }
  return options.visualCritic;
}

function requiresRecapVisualReview(state) {
  return (
    state.recipe.id === 'project-recap' &&
    state.run.request.mode === 'unattended'
  );
}

async function reviewAndRetain(state, visualCritic, attempt) {
  state.visualReviewAttempt = attempt;
  try {
    state.visualReview = await runVisualReview({
      plan: state.setPlan,
      rendered: state.rendered,
      evidence: state.browserEvidence,
      visualCritic,
      runRoot: state.run.runRoot,
    });
    state.visualReviewPaths.push(
      ...(await writeVisualReviewAttempt(state.run, {
        attempt,
        review: state.visualReview,
      })),
    );
  } catch (error) {
    throw codedError('E_VISUAL_REVIEW', error?.message ?? String(error));
  }
}

async function applyVisualCorrection(state, options, now) {
  const findings = state.visualReview.result.findings;
  const artifactIds = [
    ...new Set(findings.map(({ artifactId }) => artifactId)),
  ];
  const correctionAuthor = options.correctArtifact ?? options.author;
  if (typeof correctionAuthor !== 'function') {
    throw codedError(
      'E_VISUAL_CORRECTION',
      'A correct disposition requires an artifact correction callback.',
    );
  }
  const trust = authorTrustContext(options, now);
  const changes = [];
  for (const artifactId of artifactIds) {
    const artifactIndex = state.resolvedArtifacts.findIndex(
      ({ id }) => id === artifactId,
    );
    if (artifactIndex < 0) {
      throw codedError(
        'E_VISUAL_CORRECTION',
        `Visual correction references unknown artifact ${artifactId}.`,
      );
    }
    const artifact = state.resolvedArtifacts[artifactIndex];
    const previousContent = state.authoredContent.get(artifactId);
    let item;
    try {
      item = await authorArtifact(
        state,
        artifact,
        correctionAuthor,
        trust,
        canonicalArtifactLinks(
          state.resolvedArtifacts,
          artifact.id,
          state.run.slug,
        ),
        {
          attempt: 1,
          findings: structuredClone(
            findings.filter((finding) => finding.artifactId === artifactId),
          ),
          previousContentPath: state.contentPaths.get(artifactId),
        },
      );
    } catch (error) {
      throw codedError(
        'E_VISUAL_CORRECTION',
        `Visual correction callback failed for ${artifactId}: ${error?.message ?? String(error)}`,
      );
    }
    if ((item.result.proposedArtifacts ?? []).length > 0) {
      throw codedError(
        'E_VISUAL_CORRECTION',
        'Visual correction cannot change the validated artifact portfolio.',
      );
    }
    if (item.artifact.authoring === 'html') {
      const safety = validateHtmlSafety({
        html: item.content,
        shell: item.artifact.shellContent,
        shellName: item.artifact.shell ?? item.artifact.template,
      });
      if (!safety.valid) {
        throw codedError(
          'E_QA',
          `Corrected artifact ${artifactId} failed DOM safety validation.`,
        );
      }
    }
    await writeJsonAtomic(state.run.runRoot, item.resultPath, item.result);
    await writeTextAtomic(state.run.runRoot, item.contentPath, item.content);
    state.resolvedArtifacts[artifactIndex] = item.artifact;
    state.authoredContent.set(artifactId, item.content);
    state.contentPaths.set(artifactId, item.contentPath);
    if (item.artifact.authoring === 'markdown') {
      const links = expansionLinks(state.resolvedArtifacts);
      const model = assertValidContentModel(
        state.recipe,
        markdownContentModel(
          item.artifact,
          state.run.slug,
          item.content,
          item.artifact.origin === 'floor' ? links : [],
        ),
        item.artifact,
      );
      const modelIndex = state.contentModels.findIndex(
        ({ artifactId: id }) => id === artifactId,
      );
      state.contentModels[modelIndex] = model;
    }
    const rendered =
      item.artifact.authoring === 'markdown'
        ? await renderArtifact({
            recipeArtifact: renderDescriptor(item.artifact),
            content: state.contentModels.find(
              ({ artifactId: id }) => id === artifactId,
            ),
            factBase: state.factBase,
            theme: state.theme,
            renderStrategy: state.renderStrategy,
            ...(state.run.request.publicBaseUrl && {
              publicBaseUrl: state.run.request.publicBaseUrl,
            }),
          })
        : artisticRender(state, item.artifact);
    await writeTextAtomic(
      state.run.runRoot,
      rendered.renderedPath,
      rendered.html,
    );
    const renderedIndex = state.rendered.findIndex(
      ({ artifactId: id }) => id === artifactId,
    );
    state.rendered[renderedIndex] = rendered;
    state.artifacts[renderedIndex] = artifactRecord(state, rendered);
    changes.push({
      artifactId,
      contentPath: item.contentPath,
      authorResultPath: item.resultPath,
      previousHash: hashBytes(previousContent),
      revisedHash: hashBytes(item.content),
    });
  }
  state.visualReviewPaths.push(
    ...(await writeVisualRevision(state.run, { artifactIds, changes })),
  );
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

function isReviewGateError(error) {
  return ['E_VISUAL_REVIEW', 'E_VISUAL_CORRECTION'].includes(error?.code);
}

function normalizeReviewGateError(state, error) {
  if (!requiresRecapVisualReview(state)) return null;
  if (isReviewGateError(error)) return error;
  if (/^Browser (?:layout |theme |deck )?probe\b/.test(error?.message ?? '')) {
    return codedError('E_VISUAL_REVIEW', error.message);
  }
  return null;
}

function reviewGateWarning(error) {
  const reason =
    error?.code === 'E_VISUAL_CORRECTION'
      ? 'correction-failed'
      : 'review-chain-failed';
  return `visual-review-required:${reason}:${String(error?.message ?? 'unknown visual review failure')}`;
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

function normalizeRunRequest(request) {
  const normalized = structuredClone(request);
  if (
    normalized.recipe?.id === 'project-recap' &&
    normalized.recapMode === undefined
  ) {
    normalized.recapMode = 'artistic';
  }
  return normalized;
}

async function loadResumableRun(request, resumeToken) {
  const normalized = structuredClone(request);
  let canonicalOutputRoot;
  try {
    canonicalOutputRoot = await realpath(resolve(normalized.outputRoot));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  const runRoot = join(canonicalOutputRoot, normalized.slug);
  let runRootStats;
  try {
    runRootStats = await lstat(runRoot);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  if (runRootStats.isSymbolicLink() || !runRootStats.isDirectory()) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run root must be a real directory, not a symbolic link.',
    );
  }
  const canonicalRunRoot = await realpath(runRoot);
  if (
    canonicalRunRoot !== runRoot ||
    !isStrictDescendant(canonicalOutputRoot, canonicalRunRoot)
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run root escapes the configured output root.',
    );
  }
  let approval;
  let record;
  try {
    [approval, record] = await Promise.all([
      readJson(join(runRoot, 'source/content-approval.json')),
      readJson(join(runRoot, 'build-record.json')),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  if (typeof record.runId !== 'string') {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run has no valid retained run identity.',
    );
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
  const resumableRun = {
    runId: record.runId,
    slug: normalized.slug,
    outputRoot: canonicalOutputRoot,
    runRoot: canonicalRunRoot,
    requestPath: join(canonicalRunRoot, 'run-request.json'),
    buildRecordPath: join(canonicalRunRoot, 'build-record.json'),
    manifestPath: join(canonicalRunRoot, 'manifest.json'),
  };
  await verifySetPlanResumeToken(resumableRun, resumeToken);

  let persistedRequest;
  try {
    persistedRequest = await readJson(resumableRun.requestPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  if (
    typeof persistedRequest.outputRoot !== 'string' ||
    (isAbsolute(persistedRequest.outputRoot) &&
      persistedRequest.outputRoot !== canonicalOutputRoot)
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run does not match the original canonical output root.',
    );
  }

  const currentPersistedRequest = canonicalPersistedRunRequest(normalized, {
    outputRoot: canonicalOutputRoot,
  });
  if (
    canonicalHash(persistedRequest) !== canonicalHash(currentPersistedRequest)
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'The resumable run does not match the complete canonical request.',
    );
  }

  const resumedRequest = structuredClone(currentPersistedRequest);
  if (
    normalized.theme?.artDirection !== undefined &&
    resumedRequest.theme.artDirection === undefined
  ) {
    resumedRequest.theme.artDirection = normalized.theme.artDirection;
  }
  return {
    ...resumableRun,
    request: resumedRequest,
  };
}

function isStrictDescendant(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot.length > 0 &&
    pathFromRoot !== '..' &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

async function hydrateResumableState(state) {
  const [factBase, approval, theme, record] = await Promise.all([
    readJson(join(state.run.runRoot, 'source/fact-base.json')),
    readContentApproval(state.run).catch((error) => {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Retained content approval is invalid: ${error.message}`,
      );
    }),
    readJson(join(state.run.runRoot, 'theme.resolved.json')),
    readJson(state.run.buildRecordPath),
  ]);
  for (const [kind, value] of [
    ['fact-base', factBase],
    ['theme', theme],
    ['build-record', record],
  ]) {
    const validation = validateContract(kind, value);
    if (!validation.valid) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Retained ${kind} record is invalid during approval resume.`,
      );
    }
  }
  const retainedPlan = await readSetPlanRecords(state.run, {
    factBase,
    recipe: state.recipe,
  });
  const portfolioValidation = validatePlannedPortfolio(
    state.recipe,
    retainedPlan.plan.portfolio,
  );
  if (!portfolioValidation.valid) {
    throw codedError(
      'E_APPROVAL_RESUME',
      `Retained set-plan portfolio is invalid: ${portfolioValidation.errors.join('; ')}`,
    );
  }
  state.factBase = factBase;
  state.setPlan = retainedPlan.plan;
  state.setPlanPaths = retainedPlan.paths;
  state.theme = theme;
  state.themeWarnings = [];
  state.resumedApprovalStatus = approval.status;
  // Reopened stages rerun against the corrected content, so carrying their
  // prior warnings forward would outlive the fix that resolved them.
  const rerunning = approval.status === 'rejected' ? REOPENED_ON_REJECTION : [];
  state.warnings.push(
    ...record.stages
      .filter(({ id }) => !rerunning.includes(id))
      .flatMap(({ warnings = [] }) =>
        warnings.filter((warning) => !warning.startsWith('stage-reopened:')),
      ),
  );
  state.inputHashes = inputHashes(state.factBase);
  state.factBaseHash = canonicalHash(state.factBase);
  state.contentModels = [];
  const persistedArtifacts = validateResumedArtifactBindings(state, approval);
  for (const persisted of persistedArtifacts) {
    const authorPath = await resolveRootConfinedPath(
      state.run.runRoot,
      persisted.authorResultPath,
    );
    if (!authorPath.valid) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Retained author path for ${persisted.artifactId} is not confined to the run.`,
      );
    }
    const authorResult = await readJson(authorPath.absolutePath);
    const validation = validateContract('author-result/v2', authorResult);
    if (!validation.valid || authorResult.artifactId !== persisted.artifactId) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Retained author result identity for ${persisted.artifactId} is invalid.`,
      );
    }
  }
  const confinedContent = new Map();
  for (const persisted of persistedArtifacts) {
    const contentPath = await resolveRootConfinedPath(
      state.run.runRoot,
      persisted.contentPath,
    );
    if (!contentPath.valid) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Retained content path for ${persisted.artifactId} is not confined to the run.`,
      );
    }
    confinedContent.set(persisted.artifactId, contentPath.absolutePath);
  }
  for (const persisted of persistedArtifacts) {
    const artifact = resolvedArtifactFromApproval(state.recipe, persisted);
    if (artifact.authoring === 'html') {
      artifact.shellContent = await readSkillFile(
        `templates/${artifact.shell}.html`,
      );
    }
    const content = await readFile(
      confinedContent.get(persisted.artifactId),
      'utf8',
    );
    state.resolvedArtifacts.push(artifact);
    state.authoredContent.set(artifact.id, content);
    state.contentPaths.set(artifact.id, persisted.contentPath);
    state.authorResultPaths.push(persisted.authorResultPath);
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
            factBase: state.factBase,
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
          ...(options.sourceProvenance?.[source.id] ?? {}),
          hash: raw.sourceHash ?? hashBytes(serialized),
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
    return false;
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
    return false;
  }

  await updateBuildRecord(state.run, { id: 'durability', status: 'skipped' });
  await updateBuildRecord(state.run, { id: 'publish', status: 'running' });
  if (typeof options.publish !== 'function') {
    throw codedError(
      'E_PUBLISH',
      'Publish durability was requested without an explicit publisher callback.',
    );
  }
  await updateBuildRecord(state.run, {
    id: 'publish',
    status: 'warned',
    warnings: [
      'Publishing requires separately retained verified receipt evidence.',
    ],
  });
  await persistManifest(state, now());
  try {
    await options.publish({
      request: structuredClone(state.run.request.durability.publish),
      runRoot: state.run.runRoot,
      manifestPath: state.run.manifestPath,
    });
  } catch (error) {
    await updateBuildRecord(state.run, {
      id: 'publish',
      status: 'failed',
      error: {
        code: error.code ?? 'E_PUBLISH',
        message: safeMessage(error),
        recovery: ['Correct the publish failure and start a new run.'],
      },
    });
    throw error;
  }
  return true;
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
  const publicBaseUrl =
    state.run.request.publicBaseUrl ??
    state.run.request.durability?.publish?.publicBaseUrl;
  if (publicBaseUrl) {
    await writeJsonAtomic(
      state.run.runRoot,
      initiativeCatalogPath(manifest.slug),
      catalogFromManifest(manifest, publicBaseUrl),
    );
  }
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
      backlinks: manifestSourceBacklinks(state.factBase),
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

function manifestSourceBacklinks(factBase) {
  const backlinks = [
    ...(factBase?.sources ?? [])
      .filter(({ url }) => typeof url === 'string')
      .map(({ id, url }) => ({ sourceId: id, url })),
    ...(factBase?.claims ?? [])
      .flatMap(({ citations }) => citations ?? [])
      .filter(({ url }) => typeof url === 'string')
      .map(({ sourceId, url }) => ({ sourceId, url })),
    ...(factBase?.unresolvedClaims ?? [])
      .flatMap(({ citations }) => citations ?? [])
      .filter(({ url }) => typeof url === 'string')
      .map(({ sourceId, url }) => ({ sourceId, url })),
  ];
  return [
    ...new Map(
      backlinks
        .sort(
          (left, right) =>
            left.sourceId.localeCompare(right.sourceId) ||
            left.url.localeCompare(right.url),
        )
        .map((backlink) => [`${backlink.sourceId}\0${backlink.url}`, backlink]),
    ).values(),
  ];
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
  const artifacts = plannedArtifacts(state.recipe, state.setPlan);
  state.expansion = {
    valid: true,
    accepted: artifacts
      .filter(({ origin }) => origin === 'expansion')
      .map((artifact) => ({
        id: artifact.id,
        profileId: artifact.profileId,
        rationale: artifact.plannedArtifact.justification.rationale,
        status: 'accepted',
        profile: expansionProfile(state.recipe, artifact.profileId),
      })),
    rejected: [],
    warnings: [],
    errors: [],
  };
  const authored = [];
  const artifactLinkTables = new Map(
    artifacts.map((artifact) => [
      artifact.id,
      canonicalArtifactLinks(artifacts, artifact.id, state.run.slug),
    ]),
  );
  for (const artifact of artifacts) {
    const item = await authorArtifact(
      state,
      artifact,
      author,
      trust,
      artifactLinkTables.get(artifact.id),
    );
    if ((item.result.proposedArtifacts ?? []).length > 0) {
      throw codedError(
        'E_AUTHOR_RESULT',
        `Artifact ${artifact.id} cannot change the validated set plan.`,
      );
    }
    authored.push(item);
  }
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
        assertValidContentModel(
          state.recipe,
          markdownContentModel(
            item.artifact,
            state.run.slug,
            item.content,
            item.artifact.origin === 'floor' ? links : [],
          ),
          item.artifact,
        ),
      );
    }
  }
}

// Expansion artifacts are not recipe-floor entries, so only floor content models
// can be checked against the floor-scoped contract.
function assertValidContentModel(recipe, model, artifact) {
  if (artifact.origin !== 'floor') return model;
  const result = validateContentModel(recipe, model);
  if (!result.valid) {
    throw codedError(
      'E_CONTENT_MODEL',
      `Authored content for ${artifact.id} violates the narrative contract: ${result.errors.join('; ')}`,
    );
  }
  return model;
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

async function authorArtifact(
  state,
  artifact,
  author,
  trust,
  artifactLinks,
  correctionContext,
) {
  const [brief, visualAuthoringGuidance, shellContent] = await Promise.all([
    readSkillFile(artifact.briefRef),
    readSkillFile('references/visual-authoring.md'),
    artifact.authoring === 'html'
      ? readSkillFile(`templates/${artifact.shell}.html`)
      : undefined,
  ]);
  const resolvedArtifact = {
    ...artifact,
    ...(shellContent && { shellContent }),
  };
  const requiredNarrative =
    artifact.origin === 'floor'
      ? recipeRequiredNarrative(state.recipe, artifact.id)
      : [];
  const plannedDiagrams = diagramAnalyses(artifact.plannedArtifact.draft);
  const graphSemantics = graphSemanticsForArtisticAuthor(plannedDiagrams);
  if (
    graphSemantics.length > 0 &&
    resolveDiagramRenderingRoute(state.recipe, artifact, plannedDiagrams) !==
      'artistic'
  ) {
    throw codedError(
      'E_DIAGRAM_TOPOLOGY',
      `Artifact ${artifact.id} cannot preserve its planner-owned non-linear graph through inline rendering.`,
    );
  }
  const authorRequest = {
    schemaVersion: 'explainer-kit.author-request/v3',
    artifactId: artifact.id,
    artifactType: artifact.type,
    authoring: artifact.authoring,
    brief,
    visualAuthoringGuidance,
    factBase: structuredClone(state.factBase),
    ...(shellContent && { shell: shellContent }),
    theme: structuredClone(state.theme),
    setContext: structuredClone(state.setPlan),
    plannedArtifact: structuredClone(artifact.plannedArtifact),
    artifactLinks: structuredClone(artifactLinks),
    ...(graphSemantics.length > 0 && {
      graphSemantics: structuredClone(graphSemantics),
    }),
    ...(artifact.origin === 'floor' &&
      requiredNarrative.length > 0 && {
        floor: { requiredNarrative },
      }),
  };
  const requestValidation = validateContract(
    'author-request/v3',
    authorRequest,
  );
  if (!requestValidation.valid) {
    throw codedError(
      'E_AUTHOR_REQUEST',
      contractErrorMessage('author request', requestValidation.errors),
    );
  }

  const result =
    correctionContext === undefined
      ? await author(structuredClone(authorRequest))
      : await author(
          structuredClone(authorRequest),
          structuredClone(correctionContext),
        );
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
  if (artifact.authoring === 'markdown') {
    const diagrams = diagramAnalyses(content);
    if (
      diagrams.length > 0 &&
      resolveDiagramRenderingRoute(state.recipe, artifact, diagrams) ===
        'reject'
    ) {
      const features = [
        ...new Set(
          diagrams.flatMap(({ topology }) => topology?.features ?? []),
        ),
      ].join(', ');
      throw codedError(
        'E_DIAGRAM_TOPOLOGY',
        `Artifact ${artifact.id} contains ${features || 'non-linear'} diagram topology that requires artistic composition; inline rendering is rejected.`,
      );
    }
  } else if (graphSemantics.length > 0) {
    assertAuthoredGraphSemantics(content, graphSemantics);
  }
  const retained = {
    ...structuredClone(result),
    provenance: resolveAuthorProvenance(result.provenance, trust, artifact.id),
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

function canonicalArtifactLinks(artifacts, currentArtifactId, slug) {
  const paths = new Map(
    artifacts.map((artifact) => [
      artifact.id,
      artifactPath(renderDescriptor(artifact), slug),
    ]),
  );
  const currentPath = paths.get(currentArtifactId);
  if (!currentPath) {
    throw codedError(
      'E_AUTHOR_REQUEST',
      `Cannot construct canonical links for unknown artifact ${currentArtifactId}.`,
    );
  }
  return artifacts.map((artifact) => {
    const sitePath = paths.get(artifact.id);
    const href =
      posix.relative(posix.dirname(currentPath), sitePath) ||
      posix.basename(sitePath);
    return {
      artifactId: artifact.id,
      artifactType: artifact.type,
      sitePath,
      href,
    };
  });
}

function diagramAnalyses(markdown) {
  const ast = parseMarkdown(markdown);
  const diagrams = [];
  const visit = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'diagram') {
        diagrams.push(parseDiagram(node.source));
      }
      if (Array.isArray(node.children)) {
        visit(node.children);
      }
    }
  };
  visit(ast.children);
  return diagrams;
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

const LEAD_SECTION_IDS = ['overview', 'introduction', 'lead'];

function markdownContentModel(artifact, slug, markdown, artifactLinks) {
  const titleMatch = markdown.match(/^# (.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? humanize(artifact.id);
  const headings = [...markdown.matchAll(/^## (.+)$/gm)];
  if (headings.length === 0) {
    return contentModel({
      artifact,
      slug,
      title,
      artifactLinks,
      sections: [{ id: 'overview', title: 'Overview', content: markdown }],
    });
  }

  // Prose between the document title and the first `##` is authored content,
  // so it is carried as a leading section rather than silently dropped.
  const bodyStart = titleMatch ? titleMatch.index + titleMatch[0].length : 0;
  const lead = markdown.slice(bodyStart, headings[0].index).trim();
  const authoredIds = new Set(
    headings.map((heading) => slugify(heading[1].trim())),
  );
  const sections = headings.map((heading, index) => ({
    id: slugify(heading[1].trim()),
    title: heading[1].trim(),
    content: markdown
      .slice(
        heading.index + heading[0].length,
        headings[index + 1]?.index ?? markdown.length,
      )
      .trim(),
  }));
  if (lead.length > 0) {
    const leadId =
      LEAD_SECTION_IDS.find((candidate) => !authoredIds.has(candidate)) ??
      'lead';
    sections.unshift({
      id: leadId,
      title: humanize(leadId),
      content: lead,
    });
  }

  return contentModel({
    artifact,
    slug,
    title,
    artifactLinks,
    sections: disambiguateSectionIds(sections),
  });
}

// A repeated heading is legitimate authoring, but duplicate anchors break
// navigation, so later collisions get a deterministic suffix.
function disambiguateSectionIds(sections) {
  const used = new Map();
  return sections.map((section) => {
    const seen = used.get(section.id) ?? 0;
    used.set(section.id, seen + 1);
    if (seen === 0) return section;
    let candidate = `${section.id}-${seen + 1}`;
    let offset = seen + 1;
    while (used.has(candidate)) {
      offset += 1;
      candidate = `${section.id}-${offset}`;
    }
    used.set(candidate, 1);
    return { ...section, id: candidate };
  });
}

function contentModel({ artifact, slug, title, artifactLinks, sections }) {
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

function validateResumedArtifactBindings(state, approval) {
  const expected = plannedArtifacts(state.recipe, state.setPlan).map(
    (artifact) => ({
      artifactId: artifact.id,
      origin: artifact.origin,
      ...(artifact.profileId && { profileId: artifact.profileId }),
      authoring: artifact.authoring,
      contentPath: `source/content/${artifact.id}.${artifact.authoring === 'markdown' ? 'md' : 'html'}`,
      authorResultPath: `source/author/${artifact.id}.json`,
    }),
  );
  if (
    !Array.isArray(approval.artifacts) ||
    !Array.isArray(approval.authorResultPaths)
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'Approval resume requires retained artifact and author-result bindings.',
    );
  }
  const persistedById = new Map(
    approval.artifacts.map((artifact) => [artifact.artifactId, artifact]),
  );
  if (
    persistedById.size !== expected.length ||
    canonicalHash(approval.authorResultPaths) !==
      canonicalHash(expected.map(({ authorResultPath }) => authorResultPath))
  ) {
    throw codedError(
      'E_APPROVAL_RESUME',
      'Approval artifact set does not match the retained set-plan portfolio.',
    );
  }
  for (const artifact of expected) {
    const persisted = persistedById.get(artifact.artifactId);
    if (
      persisted === undefined ||
      canonicalHash(persisted) !== canonicalHash(artifact)
    ) {
      throw codedError(
        'E_APPROVAL_RESUME',
        `Approval artifact binding for ${artifact.artifactId} has drifted from the retained set plan.`,
      );
    }
  }
  return expected;
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
    ...state.setPlanPaths,
    ...state.authorResultPaths,
    ...state.contentPaths.values(),
    ...state.browserEvidence.flatMap(({ screenshotPath, metricsPath }) => [
      screenshotPath,
      metricsPath,
    ]),
    ...state.visualReviewPaths,
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
        : state.reviewGateBlocked
          ? 'built-needs-review'
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
        ...(state.resumeToken && { resumeToken: state.resumeToken }),
      },
    }),
    ...(state.visualReview && {
      visualReview: structuredClone(state.visualReview.result),
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
      'Usage: run.mjs --request <json> [--reviewed-source <json>] [--author-module <mjs>] [--critic-module <mjs>] [--publish-module <mjs>] [--durability-module <mjs>]',
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
