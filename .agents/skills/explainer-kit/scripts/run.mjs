#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveContentApproval } from './lib/content-approval.mjs';
import { canonicalHash, validateContract } from './lib/contracts.mjs';
import { processFactBase } from './lib/fact-base.mjs';
import { writeJsonAtomic } from './lib/fs-safe.mjs';
import { auditArtifactSet } from './lib/qa.mjs';
import {
  loadRecipe,
  shouldStopDiscovery,
  validateContentModel,
  validateSourceBindings,
} from './lib/recipes.mjs';
import {
  initializeRun,
  updateBuildRecord,
  writeManifestAtomic,
} from './lib/records.mjs';
import { renderArtifact } from './lib/render.mjs';
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
    theme: null,
    renderStrategy: run.request.theme.renderStrategy,
    rendered: [],
    artifacts: [],
    warnings: [],
    discovery: { rounds: 0, findings: [], reason: 'not-requested' },
    approval: null,
  };

  try {
    if (resumed) {
      await hydrateResumableState(state);
    } else {
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
        await mkdir(join(run.runRoot, 'source'), { recursive: true });
        await writeJsonAtomic(
          run.runRoot,
          'source/fact-base.json',
          state.factBase,
        );
        await writeText(
          join(run.runRoot, 'source/fact-base.md'),
          factBaseMarkdown(state.factBase),
        );
        validateRecipeSources(recipe, state.factBase);
        return {
          outputPaths: ['source/fact-base.json', 'source/fact-base.md'],
          warnings: processed.checks.warnings,
          status: processed.checks.warnings.length > 0 ? 'warned' : 'passed',
        };
      });
      await executeStage(run, 'content', options, async () => {
        state.discovery = await runDiscovery(recipe, state.factBase, options);
        state.contentModels = recipe.artifacts.map((artifact) =>
          createContentModel(recipe, artifact, run.slug, state.factBase),
        );
        await mkdir(join(run.runRoot, 'source/content'), { recursive: true });
        for (const model of state.contentModels) {
          const validation = validateContentModel(recipe, model);
          if (!validation.valid) {
            throw codedError(
              'E_CONTENT',
              `Invalid content model: ${validation.errors.join('; ')}`,
            );
          }
          const path = `source/content/${model.artifactId}.md`;
          await writeText(join(run.runRoot, path), contentMarkdown(model));
          state.contentPaths.set(model.artifactId, path);
        }
        return { outputPaths: [...state.contentPaths.values()] };
      });
    }

    state.approval = await resolveContentApproval(
      run,
      run.request.mode,
      options.reviewedSource,
    );
    if (!state.approval.canResume) {
      return resultFor(state);
    }

    await executeStage(run, 'theme', options, async () => {
      const resolved = await resolveTheme(run.request.theme);
      state.theme = resolved.theme;
      state.renderStrategy = resolved.renderStrategy;
      state.warnings.push(...resolved.warnings);
      await writeJsonAtomic(run.runRoot, 'theme.resolved.json', state.theme);
      return {
        outputPaths: ['theme.resolved.json'],
        warnings: resolved.warnings,
        status: resolved.warnings.length > 0 ? 'warned' : 'passed',
      };
    });
    await executeStage(run, 'render', options, async () => {
      for (const recipeArtifact of recipe.artifacts) {
        const content = state.contentModels.find(
          ({ artifactId }) => artifactId === recipeArtifact.id,
        );
        const rendered = await renderArtifact({
          recipeArtifact,
          content,
          theme: state.theme,
          renderStrategy: state.renderStrategy,
          ...(run.request.publicBaseUrl && {
            publicBaseUrl: run.request.publicBaseUrl,
          }),
        });
        await writeText(
          join(run.runRoot, rendered.renderedPath),
          rendered.html,
        );
        state.rendered.push(rendered);
        state.artifacts.push({
          id: rendered.artifactId,
          type: rendered.type,
          contentPath: state.contentPaths.get(rendered.artifactId),
          renderedPath: rendered.renderedPath,
          mediaType: rendered.mediaType,
          status: 'built',
          hash: hashBytes(rendered.html),
          rebuildable: false,
        });
      }
      return {
        outputPaths: state.rendered.map(({ renderedPath }) => renderedPath),
      };
    });
    await executeStage(run, 'qa', options, async () => {
      const report = await auditArtifactSet({
        artifacts: state.rendered.map((artifact) => ({
          id: artifact.artifactId,
          type: artifact.type,
          html: artifact.html,
        })),
        ...(options.denylist && { denylist: options.denylist }),
        ...(options.browserProbe && { browserProbe: options.browserProbe }),
        ...(options.widths && { widths: options.widths }),
      });
      if (!report.valid) {
        throw codedError(
          'E_QA',
          report.issues
            .map(({ code, message }) => `${code}: ${message}`)
            .join('; '),
        );
      }
      return {
        outputPaths: state.rendered.map(({ renderedPath }) => renderedPath),
      };
    });

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

  const content = record.stages?.find(({ id }) => id === 'content');
  const theme = record.stages?.find(({ id }) => id === 'theme');
  if (
    content?.status !== 'passed' ||
    theme?.status !== 'pending' ||
    approval.runId !== record.runId
  ) {
    return null;
  }
  if (
    persistedRequest.slug !== normalized.slug ||
    persistedRequest.recipe?.id !== normalized.recipe.id ||
    persistedRequest.recipe?.version !== normalized.recipe.version ||
    persistedRequest.mode !== normalized.mode
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
  state.factBase = await readJson(
    join(state.run.runRoot, 'source/fact-base.json'),
  );
  state.inputHashes = inputHashes(state.factBase);
  state.factBaseHash = canonicalHash(state.factBase);
  state.contentModels = [];
  for (const artifact of state.recipe.artifacts) {
    const base = createContentModel(
      state.recipe,
      artifact,
      state.run.slug,
      state.factBase,
    );
    const path = `source/content/${base.artifactId}.md`;
    const model = contentModelFromMarkdown(
      base,
      await readFile(join(state.run.runRoot, path), 'utf8'),
    );
    const validation = validateContentModel(state.recipe, model);
    if (!validation.valid) {
      throw codedError(
        'E_CONTENT',
        `Reviewed content is invalid: ${validation.errors.join('; ')}`,
      );
    }
    state.contentModels.push(model);
    state.contentPaths.set(model.artifactId, path);
  }
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
      warnings: result.warnings ?? [],
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
  const manifest = manifestFor(state, record, createdAt);
  await writeManifestAtomic(state.run, manifest);
  return manifest;
}

async function persistFailureManifest(state, error, createdAt) {
  const record = JSON.parse(await readFile(state.run.buildRecordPath, 'utf8'));
  const recordedIds = new Set(state.artifacts.map(({ id }) => id));
  state.artifacts.push(
    ...state.recipe.artifacts
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
  return writeManifestAtomic(state.run, manifestFor(state, record, createdAt));
}

function manifestFor(state, buildRecord, createdAt) {
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
    },
    theme: {
      path: 'theme.resolved.json',
      hash: canonicalHash(state.theme),
      derived: state.theme.provenance.derived,
    },
    artifacts: state.artifacts,
    outcome: buildRecord.outcome,
    buildRecord: {
      path: 'build-record.json',
      hash: canonicalHash(buildRecord),
    },
    warnings: [...new Set(state.warnings)],
  };
}

function createContentModel(recipe, artifact, slug, factBase) {
  const facts = [
    ...factBase.claims.map(({ text }) => text),
    ...factBase.unresolvedClaims.map(
      ({ text }) => `Needs confirmation: ${text}`,
    ),
  ];
  const summary = facts.length > 0 ? facts.join(' ') : 'No confirmed facts.';
  return {
    artifactId: artifact.id,
    slug,
    title: humanize(recipe.id),
    description: `Approved-source ${humanize(recipe.id).toLowerCase()}.`,
    eyebrow: 'Explainer Kit',
    footer: 'Generated from the retained reconciled fact base.',
    sections: recipe.requiredNarrative.map((id) => ({
      id,
      title: humanize(id),
      content: summary,
    })),
    artifactLinks: [],
  };
}

function validateRecipeSources(recipe, factBase) {
  const primaryRole = recipe.sourceRoles[0]?.role;
  const bindings = factBase.sources
    .filter(({ id }) => !id.startsWith('critic:'))
    .slice(0, 1)
    .map((source) => ({ role: primaryRole, kind: source.kind }));
  const result = validateSourceBindings(recipe, bindings);
  if (!result.valid) {
    throw codedError('E_FACT_BASE', result.errors.join('; '));
  }
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

function contentMarkdown(model) {
  return `# ${model.title}\n\n${model.sections
    .map(({ title, content }) => `## ${title}\n\n${content}`)
    .join('\n\n')}\n`;
}

function contentModelFromMarkdown(base, markdown) {
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim();
  const sections = [];
  const headings = [...markdown.matchAll(/^## (.+)$/gm)];
  for (const [index, heading] of headings.entries()) {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const sectionTitle = heading[1].trim();
    sections.push({
      id: slugify(sectionTitle),
      title: sectionTitle,
      content: markdown.slice(start, end).trim(),
    });
  }
  return {
    ...base,
    ...(title && { title }),
    sections,
  };
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, { encoding: 'utf8', mode: 0o600 });
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
    warnings: [...new Set(state.warnings)],
    discovery: state.discovery,
    ...(state.approval && {
      approval: {
        status: state.approval.status,
        path: state.approval.path,
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
    } else if (
      ['--critic-module', '--publish-module', '--durability-module'].includes(
        value,
      )
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
      'Usage: run.mjs --request <json> [--reviewed-source <json>] [--critic-module <mjs>] [--publish-module <mjs>] [--durability-module <mjs>]',
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
