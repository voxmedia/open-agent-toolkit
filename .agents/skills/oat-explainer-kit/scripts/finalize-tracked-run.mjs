import { readFile, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const MODES = new Set(['dedicated', 'completion-bookkeeping']);
const ARTIFACT_COMMIT_TOKEN = '$ARTIFACT_COMMIT';
const SHA_PATTERN = /^[a-f0-9]{40}$/;

export async function planTrackedRunFinalization(request, context = {}) {
  assertRequest(request);
  const repoRoot = await realpathRequired(context.repoRoot, 'repoRoot');
  const runRoot = await realpathRequired(request.runRoot, 'runRoot');
  assertWithin(repoRoot, runRoot, 'runRoot');

  const manifestPath = await realpath(request.manifestPath);
  if (manifestPath !== resolve(runRoot, 'manifest.json')) {
    throw new Error('manifestPath must identify manifest.json in runRoot.');
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 'explainer-kit.manifest/v1') {
    throw new Error(
      'Finalization requires an explainer-kit.manifest/v1 record.',
    );
  }

  const immutablePaths = immutablePackagePaths(manifest).map((path) =>
    toRepoPath(repoRoot, resolveRunPath(runRoot, path)),
  );
  const mutablePaths = [
    toRepoPath(repoRoot, manifestPath),
    toRepoPath(repoRoot, resolveRunPath(runRoot, manifest.buildRecord?.path)),
  ];
  const artifactCommit =
    request.commitMode === 'completion-bookkeeping'
      ? requiredSha(context.artifactCommit)
      : context.artifactCommit
        ? requiredSha(context.artifactCommit)
        : ARTIFACT_COMMIT_TOKEN;
  const evidenceParent = context.currentHead
    ? requiredSha(context.currentHead)
    : artifactCommit;

  if (hasCommitEvidence(manifest, artifactCommit, immutablePaths)) {
    return {
      schemaVersion: 'oat-explainer-kit.finalization-plan/v1',
      status: 'complete',
      outcome: 'built-durable',
      commands: [],
      push: null,
    };
  }

  const project = nonEmpty(context.project, 'project');
  const recipe = nonEmpty(manifest.recipe?.id, 'manifest recipe id');
  const artifact =
    request.commitMode === 'dedicated' && !context.artifactCommit
      ? {
          mode: 'create',
          ref: ARTIFACT_COMMIT_TOKEN,
          paths: immutablePaths,
          commands: commitCommands(
            immutablePaths,
            `docs(oat): persist ${recipe} for ${project}`,
          ),
        }
      : {
          mode: 'existing',
          ref: artifactCommit,
          paths: immutablePaths,
          commands: [],
        };
  const evidenceCommit = {
    parent: evidenceParent,
    paths: mutablePaths,
    commands: commitCommands(
      mutablePaths,
      `docs(oat): attest ${recipe} durability for ${project}`,
    ),
  };
  const attestation = {
    coreCreatesCommits: false,
    request: {
      schemaVersion: 'explainer-kit.durability-evidence/v1',
      manifestPath,
      evidence: {
        kind: 'commit',
        repoRoot,
        commit: artifactCommit,
        paths: immutablePaths,
      },
    },
  };
  const push = {
    after: ['artifactCommit', 'evidenceCommit'],
    commands: [{ command: 'git', args: ['push'] }],
    instruction:
      'Invoke one push only after the artifact and evidence commits exist; push both commits together.',
  };

  return {
    schemaVersion: 'oat-explainer-kit.finalization-plan/v1',
    status: 'ready',
    commitMode: request.commitMode,
    repoRoot,
    runRoot,
    manifestPath,
    relocatedFrom: request.relocatedFrom,
    artifactCommit: artifact,
    attestation,
    evidenceCommit,
    push,
    commands: [
      {
        stage: 'artifact-commit',
        commands: artifact.commands,
      },
      {
        stage: 'attestation',
        action: 'call-core-recordDurability',
        request: attestation.request,
      },
      {
        stage: 'evidence-commit',
        commands: evidenceCommit.commands,
      },
      { stage: 'push', commands: push.commands },
    ],
  };
}

export function verifyTrackedRunFinalization(plan, observation) {
  if (plan?.status === 'complete') {
    return {
      ok: true,
      outcome: 'built-durable',
      pushAllowed: false,
      errors: [],
    };
  }
  const errors = [];
  if (plan?.status !== 'ready') {
    errors.push(error('invalid-plan', 'Finalization plan is not ready.'));
    return failed(errors);
  }

  const artifact = observation?.artifactCommit;
  if (!SHA_PATTERN.test(artifact?.sha ?? '')) {
    errors.push(error('artifact-commit', 'Artifact commit SHA is missing.'));
  }
  if (
    plan.artifactCommit.mode === 'existing' &&
    artifact?.sha !== plan.artifactCommit.ref
  ) {
    errors.push(
      error('artifact-commit', 'Observed artifact commit does not match plan.'),
    );
  }
  comparePaths({
    expected: plan.artifactCommit.paths,
    actual: artifact?.paths,
    exact: plan.artifactCommit.mode === 'create',
    label: 'artifact commit',
    errors,
  });
  for (const path of plan.attestation.request.evidence.paths) {
    if (isMutableRecord(path)) {
      errors.push(
        error(
          'mutable-record',
          `Commit evidence includes mutable record ${path}.`,
        ),
      );
    }
  }

  const attestation = observation?.attestation;
  const outcome = attestation?.outcome;
  if (
    !attestation ||
    typeof attestation !== 'object' ||
    typeof attestation.durable !== 'boolean' ||
    !Array.isArray(attestation.errors) ||
    !(
      (attestation.durable === true && outcome === 'built-durable') ||
      (attestation.durable === false && outcome === 'built-not-durable')
    )
  ) {
    errors.push(
      error(
        'attestation-outcome',
        'Core attestation must include boolean durability, the corresponding exact terminal outcome, and an errors array.',
      ),
    );
  }

  const evidence = observation?.evidenceCommit;
  if (!SHA_PATTERN.test(evidence?.sha ?? '')) {
    errors.push(error('evidence-commit', 'Evidence commit SHA is missing.'));
  }
  const expectedEvidenceParent =
    plan.evidenceCommit.parent === ARTIFACT_COMMIT_TOKEN
      ? artifact?.sha
      : plan.evidenceCommit.parent;
  if (evidence?.parent !== expectedEvidenceParent) {
    errors.push(
      error(
        'commit-order',
        'Evidence commit must immediately follow the artifact commit.',
      ),
    );
  }
  comparePaths({
    expected: plan.evidenceCommit.paths,
    actual: evidence?.paths,
    exact: true,
    label: 'evidence commit',
    errors,
  });

  if (
    !sameSet(
      observation?.unrelatedChangesBefore ?? [],
      observation?.unrelatedChangesAfter ?? [],
    )
  ) {
    errors.push(
      error(
        'unrelated-change',
        'Finalization changed or consumed an unrelated working-tree change.',
      ),
    );
  }

  return errors.length === 0
    ? { ok: true, outcome, pushAllowed: true, errors: [] }
    : failed(errors);
}

function commitCommands(paths, subject) {
  return [
    { command: 'git', args: ['add', '--', ...paths] },
    {
      command: 'git',
      args: ['commit', '--only', '-m', subject, '--', ...paths],
    },
  ];
}

function immutablePackagePaths(manifest) {
  if (
    !manifest.immutableHashes ||
    typeof manifest.immutableHashes !== 'object' ||
    Array.isArray(manifest.immutableHashes)
  ) {
    throw new Error('Manifest does not identify immutable package hashes.');
  }
  const paths = Object.keys(manifest.immutableHashes);
  if (paths.length === 0) {
    throw new Error('Manifest does not identify a complete immutable package.');
  }
  return paths;
}

function resolveRunPath(runRoot, path) {
  const target = resolve(runRoot, path);
  assertWithin(runRoot, target, `Manifest path ${path}`);
  return target;
}

function hasCommitEvidence(manifest, commit, paths) {
  if (manifest.outcome !== 'built-durable' || !SHA_PATTERN.test(commit)) {
    return false;
  }
  return (manifest.artifacts ?? [])
    .filter(
      ({ status, rebuildable }) => status === 'built' && rebuildable !== true,
    )
    .every(({ durableEvidence = [] }) =>
      durableEvidence.some(
        (evidence) =>
          evidence.kind === 'commit' &&
          evidence.ref === commit &&
          arraysEqual(evidence.paths, paths),
      ),
    );
}

function comparePaths({ expected, actual, exact, label, errors }) {
  if (!Array.isArray(actual)) {
    errors.push(error('commit-paths', `Observed ${label} paths are missing.`));
    return;
  }
  const missing = expected.filter((path) => !actual.includes(path));
  const extra = exact ? actual.filter((path) => !expected.includes(path)) : [];
  if (missing.length > 0 || extra.length > 0) {
    errors.push(
      error(
        'unrelated-change',
        `${label} paths differ from the plan (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}).`,
      ),
    );
  }
}

function assertRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new TypeError('Finalization request is required.');
  }
  if (!MODES.has(request.commitMode)) {
    throw new Error(
      `Unsupported commitMode: ${request.commitMode ?? 'missing'}.`,
    );
  }
  nonEmpty(request.runRoot, 'runRoot');
  nonEmpty(request.manifestPath, 'manifestPath');
  if (
    request.relocatedFrom !== undefined &&
    typeof request.relocatedFrom !== 'string'
  ) {
    throw new TypeError('relocatedFrom must be a string when supplied.');
  }
}

async function realpathRequired(value, label) {
  return realpath(nonEmpty(value, label));
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} is required.`);
  }
  return value;
}

function requiredSha(value) {
  if (!SHA_PATTERN.test(value ?? '')) {
    throw new TypeError(
      'completion-bookkeeping requires a full artifactCommit SHA.',
    );
  }
  return value;
}

function assertWithin(root, target, label) {
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes the repository or run root.`);
  }
}

function toRepoPath(repoRoot, absolutePath) {
  assertWithin(repoRoot, absolutePath, 'Finalization path');
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

function isMutableRecord(path) {
  return (
    path === 'manifest.json' ||
    path === 'build-record.json' ||
    path.endsWith('/manifest.json') ||
    path.endsWith('/build-record.json')
  );
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameSet(left, right) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

function error(code, message) {
  return { code, message };
}

function failed(errors) {
  return {
    ok: false,
    outcome: 'built-not-durable',
    pushAllowed: false,
    errors,
  };
}
