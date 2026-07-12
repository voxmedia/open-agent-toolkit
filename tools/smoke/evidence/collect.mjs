import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DISPATCH_DIRECTORY = 'workspace/evidence/dispatch';
const DISPATCH_PATH = 'workspace/evidence/dispatch.jsonl';
const GATE_DIRECTORY = 'workspace/evidence/gates';
const ORCHESTRATION_DIRECTORY = 'workspace/evidence/orchestration';
const ORCHESTRATION_PATH = 'workspace/evidence/orchestration.jsonl';
const OBSERVED_IDENTITY_PROVENANCE = new Set([
  'gate-corroborated',
  'provider-output',
  'runtime-observed',
]);
const ORCHESTRATION_EVENT_FIELDS = new Set([
  'afterHash',
  'beforeHash',
  'commitSha',
  'event',
  'from',
  'parallelGroupsAfter',
  'parallelGroupsBefore',
  'reviewPath',
  'scope',
  'sequence',
  'taskIdsAfter',
  'taskIdsBefore',
  'to',
]);
const REVIEW_FRONTMATTER_KEYS = new Set([
  'oat_gate_run_id',
  'oat_gate_runtime',
  'oat_gate_target',
  'oat_invocation_model',
  'oat_invocation_reasoning_effort',
  'oat_invocation_source',
  'oat_project',
  'oat_review_invocation',
  'oat_review_scope',
  'oat_review_type',
]);

export class EvidenceCollectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvidenceCollectionError';
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepSort(value) {
  if (Array.isArray(value)) {
    return value.map(deepSort);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, deepSort(entry)]),
  );
}

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

async function canonicalPathForCreation(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    const parent = dirname(path);
    if (parent === path) {
      return resolve(path);
    }
    return join(await canonicalPathForCreation(parent), basename(path));
  }
}

function requireString(value, label, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined)) {
    return null;
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new EvidenceCollectionError(`${label} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function safeReadFile(path, root, label) {
  let canonicalPath;
  try {
    canonicalPath = await realpath(path);
  } catch (error) {
    throw new EvidenceCollectionError(
      `${label} is not readable: ${error.message}`,
    );
  }
  if (!isWithin(root, canonicalPath)) {
    throw new EvidenceCollectionError(`${label} escaped its allowed root.`);
  }
  return readFile(canonicalPath, 'utf8');
}

async function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new EvidenceCollectionError(
      `${label} is not readable JSON: ${error.message}`,
    );
  }
  if (!isPlainObject(value)) {
    throw new EvidenceCollectionError(`${label} must be a JSON object.`);
  }
  return value;
}

async function readJsonLines(path, root, { optional = false } = {}) {
  let contents;
  try {
    contents = await safeReadFile(path, root, 'JSONL source');
  } catch (error) {
    if (optional && error.message.includes('ENOENT')) {
      return [];
    }
    throw new EvidenceCollectionError(
      `Could not read JSONL source ${path}: ${error.message}`,
    );
  }

  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let value;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new EvidenceCollectionError(
          `Invalid JSONL at ${path}:${index + 1}: ${error.message}`,
        );
      }
      if (!isPlainObject(value)) {
        throw new EvidenceCollectionError(
          `JSONL record at ${path}:${index + 1} must be an object.`,
        );
      }
      return value;
    });
}

export function normalizeRuntimeIdentity(value) {
  const provenance = isPlainObject(value)
    ? optionalString(value.provenance)
    : null;
  const producer = isPlainObject(value) ? optionalString(value.producer) : null;
  const model = isPlainObject(value) ? optionalString(value.model) : null;
  if (!OBSERVED_IDENTITY_PROVENANCE.has(provenance) || !producer || !model) {
    return {
      confidence: 'not-reported',
      effort: null,
      model: null,
      producer: null,
      provenance: 'not-reported',
      status: 'not-reported',
    };
  }

  return {
    confidence: optionalString(value.confidence) ?? 'unknown',
    effort: optionalString(value.effort),
    model,
    producer,
    provenance,
    status: 'reported',
  };
}

function normalizeDispatch(record, index) {
  const configured = isPlainObject(record.configuredInvocation)
    ? record.configuredInvocation
    : record;
  const selection = isPlainObject(record.selection) ? record.selection : {};
  const launch = isPlainObject(record.launch) ? record.launch : {};

  return {
    acceptance: optionalString(launch.acceptance ?? record.acceptance),
    action: requireString(record.action, `dispatch[${index}].action`),
    attempt:
      Number.isSafeInteger(record.attempt) && record.attempt > 0
        ? record.attempt
        : index + 1,
    configuredInvocation: {
      ceiling: optionalString(configured.ceiling ?? configured.dispatchCeiling),
      effortAxis: optionalString(
        configured.effortAxis ?? configured.effort_axis,
      ),
      modelAxis: optionalString(configured.modelAxis ?? configured.model_axis),
      policy: optionalString(configured.policy ?? configured.dispatchPolicy),
      target: optionalString(configured.target),
    },
    launch: {
      accepted: typeof launch.accepted === 'boolean' ? launch.accepted : null,
      mechanism: optionalString(launch.mechanism),
      outcome: optionalString(launch.outcome ?? record.outcome),
      status: optionalString(launch.status),
    },
    role: requireString(record.role, `dispatch[${index}].role`),
    runtimeIdentity: normalizeRuntimeIdentity(record.runtimeIdentity),
    scope: requireString(record.scope, `dispatch[${index}].scope`),
    selection: {
      atOrBelowCeiling:
        typeof selection.atOrBelowCeiling === 'boolean'
          ? selection.atOrBelowCeiling
          : null,
      candidatesConsidered: Array.isArray(selection.candidatesConsidered)
        ? selection.candidatesConsidered
            .map((candidate) => String(candidate))
            .sort()
        : [],
      reason: optionalString(selection.reason),
    },
  };
}

function parsePlanContract(contents) {
  const tasks = [
    ...contents.matchAll(
      /^### Task (p\d+-t\d+):[^\n]*\n([\s\S]*?)(?=^### Task |^## |(?![\s\S]))/gmu,
    ),
  ].map((match) => ({ body: match[2].trim(), id: match[1] }));
  const parallelGroups =
    contents.match(/^oat_plan_parallel_groups:\s*(.+)$/mu)?.[1] ?? null;
  const reviewRows = [
    ...contents.matchAll(
      /^\|\s*(p\d+|final|spec|design|plan)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gmu,
    ),
  ].map((match) => ({
    artifact: match[5].trim(),
    scope: match[1],
    status: match[3].trim(),
    type: match[2].trim(),
  }));
  const substantive = JSON.stringify({ parallelGroups, tasks });
  return {
    planHash: createHash('sha256').update(contents).digest('hex'),
    reviewRows,
    substantivePlanHash: createHash('sha256').update(substantive).digest('hex'),
    taskIds: tasks.map((task) => task.id),
  };
}

function parseDispatchPolicy(contents, harness) {
  const provider = harness?.startsWith('cursor') ? 'cursor' : harness;
  const policy = contents.match(/^\s+policy:\s*(\S+)\s*$/mu)?.[1] ?? null;
  const matrix = contents.match(
    new RegExp(
      `^    ${provider}:\\n([\\s\\S]*?)(?=^    \\S+:|^  source:|^oat_)`,
      'mu',
    ),
  )?.[1];
  if (!provider || !policy || !matrix) {
    return { ceilingCandidates: [], eligibleCandidates: [], policy, provider };
  }
  const tiers = [
    ...matrix.matchAll(
      /^      ([a-z][a-z0-9-]*):\n([\s\S]*?)(?=^      [a-z][a-z0-9-]*:|(?![\s\S]))/gmu,
    ),
  ].map((match) => {
    const body = match[2];
    const simple = [...body.matchAll(/^\s+-\s+(?!harness:)(\S+)\s*$/gmu)].map(
      (candidate) => candidate[1],
    );
    const structured = [
      ...body.matchAll(
        /^\s+-\s+harness:\s+\S+\s*\n\s+model:\s+(\S+)\s*\n\s+effort:\s+(\S+)\s*$/gmu,
      ),
    ].map((candidate) => `${candidate[1]}:${candidate[2]}`);
    return { candidates: [...simple, ...structured], name: match[1] };
  });
  const ceilingIndex = tiers.findIndex((tier) => tier.name === policy);
  return {
    ceilingCandidates: ceilingIndex >= 0 ? tiers[ceilingIndex].candidates : [],
    eligibleCandidates:
      ceilingIndex >= 0
        ? tiers.slice(0, ceilingIndex + 1).flatMap((tier) => tier.candidates)
        : [],
    policy,
    provider,
  };
}

async function collectFixtureContract(
  fixtureProjectPath,
  worktreePath,
  manifest,
) {
  const planPath = join(fixtureProjectPath, 'plan.md');
  const statePath = join(fixtureProjectPath, 'state.md');
  const contents = await safeReadFile(
    planPath,
    fixtureProjectPath,
    'Fixture plan',
  );
  const stateContents = await safeReadFile(
    statePath,
    fixtureProjectPath,
    'Fixture state',
  );
  const current = parsePlanContract(contents);
  const baselineCommitSha = validateSha(
    manifest.baselineCommitSha,
    'manifest.baselineCommitSha',
  );
  const repositoryPlanPath = relative(worktreePath, planPath);
  const repositoryStatePath = relative(worktreePath, statePath);
  const baselineContents = await runGitRaw(
    ['show', `${baselineCommitSha}:${repositoryPlanPath}`],
    worktreePath,
  );
  const headContents = await runGitRaw(
    ['show', `HEAD:${repositoryPlanPath}`],
    worktreePath,
  );
  const headStateContents = await runGitRaw(
    ['show', `HEAD:${repositoryStatePath}`],
    worktreePath,
  );
  const baseline = parsePlanContract(baselineContents);
  return {
    baselinePlanHash: baseline.planHash,
    baselineSubstantivePlanHash: baseline.substantivePlanHash,
    dispatchPolicy: parseDispatchPolicy(stateContents, manifest.harness),
    headPlanHash: createHash('sha256').update(headContents).digest('hex'),
    headStateHash: createHash('sha256').update(headStateContents).digest('hex'),
    planHash: current.planHash,
    reviewRows: current.reviewRows,
    substantivePlanHash: current.substantivePlanHash,
    stateHash: createHash('sha256').update(stateContents).digest('hex'),
    taskIds: current.taskIds,
  };
}

function parseFrontmatter(contents) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(contents);
  if (!match) {
    return {};
  }

  const values = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const separator = line.indexOf(':');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (
      !REVIEW_FRONTMATTER_KEYS.has(key) &&
      !key.startsWith('oat_corroboration_')
    ) {
      continue;
    }
    const rawValue = line.slice(separator + 1).trim();
    values[key] = rawValue.replace(/^(['"])(.*)\1$/u, '$2');
  }
  return values;
}

function parseAllFrontmatter(contents) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(contents);
  if (!match) {
    return {};
  }
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/u)
      .map((line) => {
        const separator = line.indexOf(':');
        return separator > 0
          ? [
              line.slice(0, separator).trim(),
              line
                .slice(separator + 1)
                .trim()
                .replace(/^(['"])(.*)\1$/u, '$2'),
            ]
          : null;
      })
      .filter(Boolean),
  );
}

async function listMarkdownFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

async function collectReviews(fixtureProjectPath) {
  const reviewsDirectory = join(fixtureProjectPath, 'reviews');
  const paths = await listMarkdownFiles(reviewsDirectory);

  return Promise.all(
    paths.map(async (path) => {
      const frontmatter = parseFrontmatter(
        await safeReadFile(path, fixtureProjectPath, 'Review artifact'),
      );
      const corroboration = Object.fromEntries(
        Object.entries(frontmatter).filter(
          ([key]) =>
            key.startsWith('oat_corroboration_') ||
            key === 'oat_gate_run_id' ||
            key === 'oat_gate_target' ||
            key === 'oat_gate_runtime',
        ),
      );
      return {
        corroboration,
        frontmatter,
        path: relative(fixtureProjectPath, path),
      };
    }),
  );
}

async function collectFixtureLogs(worktreePath) {
  const logsDirectory = join(worktreePath, 'workspace/logs');
  let entries;
  try {
    entries = await readdir(logsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => ({
        lines: (
          await safeReadFile(
            join(logsDirectory, entry.name),
            worktreePath,
            'Fixture log',
          )
        )
          .split(/\r?\n/u)
          .map((line) => line.trimEnd())
          .filter(Boolean)
          .map((line, index) => ({ line, sequence: index + 1 })),
        path: `workspace/logs/${entry.name}`,
        phase: entry.name.replace(/\.log$/u, ''),
      })),
  );
}

function normalizeOrchestrationEvent(record, index) {
  const stable = Object.fromEntries(
    Object.entries(record).filter(([key]) =>
      ORCHESTRATION_EVENT_FIELDS.has(key),
    ),
  );
  return deepSort({
    ...stable,
    sequence:
      Number.isSafeInteger(record.sequence) && record.sequence >= 0
        ? record.sequence
        : index + 1,
  });
}

async function readJsonDirectory(directory, root, label) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const records = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const path = join(directory, entry.name);
    let value;
    try {
      value = JSON.parse(await safeReadFile(path, root, label));
    } catch (error) {
      throw new EvidenceCollectionError(
        `${label} ${entry.name} is invalid: ${error.message}`,
      );
    }
    if (!isPlainObject(value)) {
      throw new EvidenceCollectionError(
        `${label} ${entry.name} must be an object.`,
      );
    }
    records.push(value);
  }
  return records;
}

function sameGateInvocation(left, right) {
  return (
    isPlainObject(left) &&
    isPlainObject(right) &&
    [
      'runId',
      'targetId',
      'runtime',
      'model',
      'reasoningEffort',
      'source',
    ].every((key) => left[key] === right[key])
  );
}

async function normalizeGate(record, index, fixtureProjectPath, worktreePath) {
  const invocation = isPlainObject(record.gateInvocation)
    ? record.gateInvocation
    : {};
  const corroboration = isPlainObject(record.corroboration)
    ? record.corroboration
    : {};
  const artifactPath = requireString(
    record.artifactPath,
    `gate[${index}].artifactPath`,
  );
  const artifactCandidate = isAbsolute(artifactPath)
    ? artifactPath
    : join(worktreePath, artifactPath);
  const canonicalArtifactPath = await realpath(artifactCandidate);
  if (!isWithin(fixtureProjectPath, canonicalArtifactPath)) {
    throw new EvidenceCollectionError(
      `gate[${index}].artifactPath is outside the fixture project.`,
    );
  }
  const project = requireString(record.project, `gate[${index}].project`);
  const projectCandidate = isAbsolute(project)
    ? project
    : join(worktreePath, project);
  const canonicalProjectPath = await realpath(projectCandidate);
  if (canonicalProjectPath !== fixtureProjectPath) {
    throw new EvidenceCollectionError(
      `gate[${index}].project does not match the fixture project.`,
    );
  }
  const projectPath = relative(worktreePath, canonicalProjectPath);
  const projectName = basename(projectPath);
  const invocationConsistent =
    invocation.runId === record.runId &&
    invocation.targetId === record.target &&
    sameGateInvocation(invocation, corroboration.expected?.invocation) &&
    sameGateInvocation(invocation, corroboration.actual?.invocation) &&
    corroboration.expected?.project === project &&
    [
      corroboration.actual?.artifactProject,
      corroboration.actual?.normalizedArtifactProject,
    ].includes(projectName);

  return {
    artifactPath: relative(fixtureProjectPath, canonicalArtifactPath),
    blocking: record.blocking === true,
    configuredInvocation: {
      effort: optionalString(invocation.reasoningEffort),
      model: optionalString(invocation.model),
      source: optionalString(invocation.source),
    },
    corroboration: {
      invocation: optionalString(corroboration.invocation),
      project: optionalString(corroboration.project),
      run: optionalString(corroboration.run),
    },
    invocation: optionalString(record.invocation),
    invocationConsistent,
    outcome: optionalString(record.outcome),
    projectName,
    projectPath,
    receiveEligible: record.receiveEligible === true,
    runId: requireString(record.runId, `gate[${index}].runId`),
    runtime: requireString(invocation.runtime, `gate[${index}].runtime`),
    scope: requireString(record.scope, `gate[${index}].scope`),
    status: optionalString(record.status),
    target: requireString(record.target, `gate[${index}].target`),
  };
}

function parseWorktreeList(contents) {
  const records = [];
  let current = {};
  for (const line of `${contents}\n`.split(/\r?\n/u)) {
    if (line === '') {
      if (current.worktree) {
        records.push(current);
      }
      current = {};
      continue;
    }
    const separator = line.indexOf(' ');
    if (separator === -1) {
      current[line] = true;
    } else {
      current[line.slice(0, separator)] = line.slice(separator + 1);
    }
  }
  return records;
}

async function runGit(args, cwd) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      encoding: 'utf8',
    });
    return stdout.trim();
  } catch (error) {
    throw new EvidenceCollectionError(
      `Git evidence command failed (${args.join(' ')}): ${error.message}`,
    );
  }
}

async function runGitRaw(args, cwd) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      encoding: 'utf8',
    });
    return stdout;
  } catch (error) {
    throw new EvidenceCollectionError(
      `Git evidence command failed (${args.join(' ')}): ${error.message}`,
    );
  }
}

function validateSha(value, label) {
  const sha = requireString(value, label);
  if (!/^[0-9a-f]{40}$/u.test(sha)) {
    throw new EvidenceCollectionError(`${label} must be a full commit SHA.`);
  }
  return sha;
}

async function validateBranch(branch, worktreePath) {
  if (
    typeof branch !== 'string' ||
    branch.length === 0 ||
    branch.startsWith('-')
  ) {
    throw new EvidenceCollectionError(`Invalid manifest branch: ${branch}`);
  }
  try {
    await runGit(['check-ref-format', `refs/heads/${branch}`], worktreePath);
  } catch {
    throw new EvidenceCollectionError(`Invalid manifest branch: ${branch}`);
  }
  return branch;
}

function parseGitLog(contents) {
  return contents
    ? contents.split(/\r?\n/u).map((line) => {
        const [sha, parents = '', ...subject] = line.split('\t');
        return {
          parents: parents.split(' ').filter(Boolean),
          sha,
          subject: subject.join('\t'),
        };
      })
    : [];
}

async function addCommitFiles(commits, worktreePath) {
  return Promise.all(
    commits.map(async (commit) => ({
      ...commit,
      files: (
        await runGit(
          ['show', '--format=', '--name-only', commit.sha, '--'],
          worktreePath,
        )
      )
        .split(/\r?\n/u)
        .filter(Boolean)
        .sort(),
    })),
  );
}

async function collectGitTopology(worktreePath, manifest) {
  const rawBranches = [
    manifest.branch,
    ...(manifest.ownershipJournal?.resources ?? []).map(
      (resource) => resource.branch,
    ),
  ].filter((branch) => branch !== null && branch !== undefined);
  const branches = [];
  for (const branch of rawBranches) {
    branches.push(await validateBranch(branch, worktreePath));
  }
  branches.sort();
  const existingRefs = [];
  for (const branch of branches) {
    const exists = await runGit(
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      worktreePath,
    ).then(
      () => true,
      () => false,
    );
    if (exists) {
      existingRefs.push(`refs/heads/${branch}`);
    }
  }

  const revisionArgs = existingRefs.length > 0 ? existingRefs : ['HEAD'];
  const sourceCommit = validateSha(
    manifest.sourceCommitSha,
    'manifest.sourceCommitSha',
  );
  const branchHistories = [];
  for (const ref of existingRefs) {
    branchHistories.push({
      branch: ref.replace(/^refs\/heads\//u, ''),
      commits: await addCommitFiles(
        parseGitLog(
          await runGit(
            [
              'log',
              '--reverse',
              '--topo-order',
              '--format=%H%x09%P%x09%s',
              `${sourceCommit}..${ref}`,
              '--',
            ],
            worktreePath,
          ),
        ),
        worktreePath,
      ),
    });
  }
  const logArgs = [
    'log',
    '--reverse',
    '--topo-order',
    '--format=%H%x09%P%x09%s',
    '--max-count=500',
    ...revisionArgs,
    '--not',
    sourceCommit,
    '--',
  ];
  const commits = await addCommitFiles(
    parseGitLog(await runGit(logArgs, worktreePath)),
    worktreePath,
  );
  const currentBranchCommits = await addCommitFiles(
    parseGitLog(
      await runGit(
        [
          'log',
          '--reverse',
          '--topo-order',
          '--format=%H%x09%P%x09%s',
          `${sourceCommit}..HEAD`,
          '--',
        ],
        worktreePath,
      ),
    ),
    worktreePath,
  );

  const branchSet = new Set(branches.map((branch) => `refs/heads/${branch}`));
  const worktrees = parseWorktreeList(
    await runGit(['worktree', 'list', '--porcelain'], worktreePath),
  )
    .filter(
      (entry) =>
        entry.worktree === worktreePath ||
        (typeof entry.branch === 'string' && branchSet.has(entry.branch)),
    )
    .map((entry) => ({
      branch:
        typeof entry.branch === 'string'
          ? entry.branch.replace(/^refs\/heads\//u, '')
          : null,
      head: optionalString(entry.HEAD),
      path:
        entry.worktree === worktreePath
          ? '<worktree>'
          : `journal:${entry.branch?.replace(/^refs\/heads\//u, '') ?? 'detached'}`,
    }))
    .sort((left, right) =>
      (left.branch ?? '').localeCompare(right.branch ?? ''),
    );

  return {
    branch: await runGit(['branch', '--show-current'], worktreePath),
    branchHistories,
    branchRefs: existingRefs,
    commits,
    currentBranchCommits,
    head: await runGit(['rev-parse', 'HEAD'], worktreePath),
    worktrees,
  };
}

function observedLifecycleState(stateContents, planContents) {
  const state = parseAllFrontmatter(stateContents);
  const plan = parseAllFrontmatter(planContents);
  const planReview = parsePlanContract(planContents).reviewRows.find(
    (row) => row.scope === 'plan',
  );
  if (
    state.oat_phase === 'implement' &&
    plan.oat_ready_for === 'oat-project-implement'
  ) {
    return 'implementation-ready';
  }
  if (state.oat_phase === 'plan' && planReview?.status === 'passed') {
    return 'reviewed';
  }
  return 'pre-review';
}

async function corroborateTransitions(
  events,
  worktreePath,
  fixtureProjectPath,
  gitTopology,
) {
  const currentShas = new Set(
    gitTopology.currentBranchCommits.map((commit) => commit.sha),
  );
  const statePath = relative(
    worktreePath,
    join(fixtureProjectPath, 'state.md'),
  );
  const planPath = relative(worktreePath, join(fixtureProjectPath, 'plan.md'));
  return Promise.all(
    events.map(async (event) => {
      if (event.event !== 'state-transition') {
        return event;
      }
      const commitSha = validateSha(
        event.commitSha,
        'state transition commitSha',
      );
      const parentSha = validateSha(
        await runGit(['rev-parse', `${commitSha}^`], worktreePath),
        'state transition parent',
      );
      const [stateBefore, stateAfter, planBefore, planAfter] =
        await Promise.all([
          runGitRaw(['show', `${parentSha}:${statePath}`], worktreePath),
          runGitRaw(['show', `${commitSha}:${statePath}`], worktreePath),
          runGitRaw(['show', `${parentSha}:${planPath}`], worktreePath),
          runGitRaw(['show', `${commitSha}:${planPath}`], worktreePath),
        ]);
      return {
        commitSha,
        contentChanged: stateBefore !== stateAfter && planBefore !== planAfter,
        event: 'state-transition',
        from: optionalString(event.from),
        observedFrom: observedLifecycleState(stateBefore, planBefore),
        observedTo: observedLifecycleState(stateAfter, planAfter),
        parentSha,
        reachableFromHead: currentShas.has(commitSha),
        sequence: event.sequence,
        to: optionalString(event.to),
      };
    }),
  );
}

function normalizeManifest(manifest) {
  const branchOwnership = isPlainObject(manifest.branchOwnership)
    ? {
        baseCommitSha: optionalString(manifest.branchOwnership.baseCommitSha),
        baselineCommitSha: optionalString(
          manifest.branchOwnership.baselineCommitSha,
        ),
        branch: optionalString(manifest.branchOwnership.branch),
        createdByRun: manifest.branchOwnership.createdByRun === true,
        runIdentity: optionalString(manifest.branchOwnership.runIdentity),
      }
    : null;
  const closeout = isPlainObject(manifest.effectiveCloseoutPolicy)
    ? {
        source: optionalString(manifest.effectiveCloseoutPolicy.source),
        value: {
          postApproval: Array.isArray(
            manifest.effectiveCloseoutPolicy.value?.postApproval,
          )
            ? manifest.effectiveCloseoutPolicy.value.postApproval.map(String)
            : [],
          preApproval: Array.isArray(
            manifest.effectiveCloseoutPolicy.value?.preApproval,
          )
            ? manifest.effectiveCloseoutPolicy.value.preApproval.map(String)
            : [],
        },
      }
    : null;
  const normalizeBootstrap = (bootstrap) =>
    isPlainObject(bootstrap)
      ? {
          branch: optionalString(bootstrap.branch),
          configSha256: optionalString(bootstrap.configSha256),
          policy: bootstrap.policy ?? null,
          runIdentity: optionalString(bootstrap.runIdentity),
        }
      : null;
  const ownershipJournal = isPlainObject(manifest.ownershipJournal)
    ? {
        resources: Array.isArray(manifest.ownershipJournal.resources)
          ? manifest.ownershipJournal.resources
              .map((resource) => ({
                baselineCommitSha: optionalString(resource.baselineCommitSha),
                branch: optionalString(resource.branch),
                runIdentity: optionalString(resource.runIdentity),
                worktree: `journal:${resource.branch ?? 'unknown'}`,
              }))
              .sort((left, right) =>
                (left.branch ?? '').localeCompare(right.branch ?? ''),
              )
          : [],
        schemaVersion: manifest.ownershipJournal.schemaVersion ?? null,
      }
    : { resources: [], schemaVersion: 1 };
  const writableRoots = Array.isArray(manifest.writableRoots)
    ? manifest.writableRoots
        .map((entry) => ({
          harness: optionalString(entry.harness),
          roots: Array.isArray(entry.roots)
            ? entry.roots
                .map((root) => ({
                  path: `<${root.purpose ?? 'writable-root'}>`,
                  purpose: optionalString(root.purpose),
                }))
                .sort((left, right) =>
                  (left.purpose ?? '').localeCompare(right.purpose ?? ''),
                )
            : [],
        }))
        .sort((left, right) =>
          (left.harness ?? '').localeCompare(right.harness ?? ''),
        )
    : [];

  return deepSort({
    appliedScenario: requireString(
      manifest.appliedScenario,
      'manifest.appliedScenario',
    ),
    baselineCommitSha: optionalString(manifest.baselineCommitSha),
    branch: requireString(manifest.branch, 'manifest.branch'),
    branchOwnership,
    effectiveCloseoutPolicy: closeout,
    effectiveSmokeBootstrap: normalizeBootstrap(
      manifest.effectiveSmokeBootstrap,
    ),
    harness: optionalString(manifest.harness),
    ownershipJournal,
    provisioningState: optionalString(manifest.provisioningState),
    readiness: isPlainObject(manifest.readiness)
      ? { status: optionalString(manifest.readiness.status) }
      : null,
    runIdentity: optionalString(manifest.runIdentity),
    sourceCommitSha: optionalString(manifest.sourceCommitSha),
    writableRoots,
  });
}

function validateNormalizedContent(value, path = 'bundle') {
  if (typeof value === 'string' && isAbsolute(value)) {
    throw new EvidenceCollectionError(
      `Normalized evidence contains an absolute path at ${path}.`,
    );
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateNormalizedContent(entry, `${path}[${index}]`),
    );
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (/^(?:timestamp|generatedAt|registeredAt)$/u.test(key)) {
      throw new EvidenceCollectionError(
        `Normalized evidence contains a timestamp field at ${path}.${key}.`,
      );
    }
    validateNormalizedContent(entry, `${path}.${key}`);
  }
}

async function publishBundle(bundle, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(deepSort(bundle), null, 2)}\n`,
    );
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

export function parseCollectorArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!['--worktree', '--manifest', '--out'].includes(option)) {
      throw new EvidenceCollectionError(
        `Unknown collector argument: ${option}`,
      );
    }
    if (Object.hasOwn(values, option)) {
      throw new EvidenceCollectionError(
        `Repeated collector argument: ${option}`,
      );
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new EvidenceCollectionError(`Missing value for ${option}.`);
    }
    values[option] = value;
    index += 1;
  }

  for (const option of ['--worktree', '--manifest', '--out']) {
    if (!values[option]) {
      throw new EvidenceCollectionError(`Missing required ${option}.`);
    }
  }

  return {
    manifestPath: resolve(values['--manifest']),
    outDirectory: resolve(values['--out']),
    worktreePath: resolve(values['--worktree']),
  };
}

export async function collectEvidence({
  manifestPath,
  outDirectory,
  worktreePath,
}) {
  if (
    ![manifestPath, outDirectory, worktreePath].every(
      (path) => typeof path === 'string' && isAbsolute(path),
    )
  ) {
    throw new EvidenceCollectionError('Collector paths must be absolute.');
  }

  let canonicalWorktree;
  try {
    canonicalWorktree = await realpath(worktreePath);
  } catch (error) {
    throw new EvidenceCollectionError(
      `Worktree path is not readable: ${error.message}`,
    );
  }
  const canonicalOutput = await canonicalPathForCreation(outDirectory);
  if (isWithin(canonicalWorktree, canonicalOutput)) {
    throw new EvidenceCollectionError(
      'Evidence output must be outside the disposable worktree.',
    );
  }

  const manifest = await readJson(manifestPath, 'Provisioning manifest');
  let manifestWorktree;
  try {
    manifestWorktree = await realpath(
      requireString(manifest.worktreePath, 'manifest.worktreePath'),
    );
  } catch (error) {
    throw new EvidenceCollectionError(
      `Manifest worktreePath is not readable: ${error.message}`,
    );
  }
  if (manifestWorktree !== canonicalWorktree) {
    throw new EvidenceCollectionError(
      'Manifest worktreePath does not match --worktree.',
    );
  }
  let fixtureProjectPath;
  try {
    fixtureProjectPath = await realpath(
      requireString(manifest.fixtureProjectPath, 'manifest.fixtureProjectPath'),
    );
  } catch (error) {
    throw new EvidenceCollectionError(
      `Manifest fixtureProjectPath is not readable: ${error.message}`,
    );
  }
  if (!isWithin(canonicalWorktree, fixtureProjectPath)) {
    throw new EvidenceCollectionError(
      'Manifest fixtureProjectPath is outside the worktree.',
    );
  }

  const dispatchRecords = [
    ...(await readJsonLines(
      join(canonicalWorktree, DISPATCH_PATH),
      canonicalWorktree,
      {
        optional: true,
      },
    )),
    ...(await readJsonDirectory(
      join(canonicalWorktree, DISPATCH_DIRECTORY),
      canonicalWorktree,
      'Dispatch record',
    )),
  ];
  const dispatches = dispatchRecords
    .map(normalizeDispatch)
    .sort((left, right) =>
      [left.scope, String(left.attempt).padStart(8, '0'), left.action]
        .join('\0')
        .localeCompare(
          [
            right.scope,
            String(right.attempt).padStart(8, '0'),
            right.action,
          ].join('\0'),
        ),
    );
  const gates = (
    await Promise.all(
      (
        await readJsonDirectory(
          join(canonicalWorktree, GATE_DIRECTORY),
          canonicalWorktree,
          'Gate result',
        )
      ).map((record, index) =>
        normalizeGate(record, index, fixtureProjectPath, canonicalWorktree),
      ),
    )
  ).sort((left, right) =>
    [left.scope, left.runId]
      .join('\0')
      .localeCompare([right.scope, right.runId].join('\0')),
  );
  const rawOrchestrationEvents = [
    ...(await readJsonLines(
      join(canonicalWorktree, ORCHESTRATION_PATH),
      canonicalWorktree,
      {
        optional: true,
      },
    )),
    ...(await readJsonDirectory(
      join(canonicalWorktree, ORCHESTRATION_DIRECTORY),
      canonicalWorktree,
      'Orchestration event',
    )),
  ]
    .map(normalizeOrchestrationEvent)
    .sort((left, right) => left.sequence - right.sequence);
  const gitTopology = await collectGitTopology(canonicalWorktree, manifest);
  const orchestrationEvents = await corroborateTransitions(
    rawOrchestrationEvents,
    canonicalWorktree,
    fixtureProjectPath,
    gitTopology,
  );

  const bundle = {
    dispatches,
    fixture: await collectFixtureContract(
      fixtureProjectPath,
      canonicalWorktree,
      manifest,
    ),
    fixtureLogs: await collectFixtureLogs(canonicalWorktree),
    gates,
    git: gitTopology,
    kind: 'workflow',
    manifest: normalizeManifest(manifest),
    orchestrationEvents,
    reviews: await collectReviews(fixtureProjectPath),
    scenario: manifest.appliedScenario,
    schemaVersion: 1,
    source: {
      rawPaths: {
        commonGitDir: manifest.commonGitDir ?? null,
        fixtureProjectPath: manifest.fixtureProjectPath,
        journalWorktreePaths: (manifest.ownershipJournal?.resources ?? []).map(
          (resource) => resource.worktreePath,
        ),
        manifestPath,
        writableRoots: manifest.writableRoots ?? [],
        worktreePath: manifest.worktreePath,
      },
    },
  };
  const { source: _rawSource, ...normalizedContent } = bundle;
  validateNormalizedContent(normalizedContent);
  const outputPath = join(canonicalOutput, 'bundle.json');
  await publishBundle(bundle, outputPath);
  return { bundle: deepSort(bundle), outputPath };
}

async function main() {
  const options = parseCollectorArgs(process.argv.slice(2));
  const result = await collectEvidence(options);
  process.stdout.write(`${result.outputPath}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
