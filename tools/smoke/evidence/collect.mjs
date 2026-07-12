import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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

const DISPATCH_PATH = 'workspace/evidence/dispatch.jsonl';
const ORCHESTRATION_PATH = 'workspace/evidence/orchestration.jsonl';
const REVIEW_FRONTMATTER_KEYS = new Set([
  'oat_gate_run_id',
  'oat_gate_runtime',
  'oat_gate_target',
  'oat_invocation_model',
  'oat_invocation_reasoning_effort',
  'oat_invocation_source',
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

async function readJsonLines(path, { optional = false } = {}) {
  let contents;
  try {
    contents = await readFile(path, 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') {
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

function normalizeRuntimeIdentity(value) {
  if (!isPlainObject(value)) {
    return {
      confidence: 'not-reported',
      effort: null,
      model: null,
      producer: null,
      provenance: 'not-reported',
      status: 'not-reported',
    };
  }

  const reported = ['producer', 'model', 'effort'].some(
    (key) => optionalString(value[key]) !== null,
  );
  if (!reported) {
    return {
      confidence: optionalString(value.confidence) ?? 'not-reported',
      effort: null,
      model: null,
      producer: null,
      provenance: optionalString(value.provenance) ?? 'not-reported',
      status: 'not-reported',
    };
  }

  return {
    confidence: optionalString(value.confidence) ?? 'unknown',
    effort: optionalString(value.effort),
    model: optionalString(value.model),
    producer: optionalString(value.producer),
    provenance: optionalString(value.provenance) ?? 'unknown',
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
    },
    role: requireString(record.role, `dispatch[${index}].role`),
    runtimeIdentity: normalizeRuntimeIdentity(record.runtimeIdentity),
    scope: requireString(record.scope, `dispatch[${index}].scope`),
    selection: {
      candidatesConsidered: Array.isArray(selection.candidatesConsidered)
        ? selection.candidatesConsidered
            .map((candidate) => String(candidate))
            .sort()
        : [],
      reason: optionalString(selection.reason),
    },
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
      const frontmatter = parseFrontmatter(await readFile(path, 'utf8'));
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
        lines: (await readFile(join(logsDirectory, entry.name), 'utf8'))
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
  const { timestamp: _timestamp, ...stable } = record;
  return deepSort({
    ...stable,
    sequence:
      Number.isSafeInteger(record.sequence) && record.sequence >= 0
        ? record.sequence
        : index + 1,
  });
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

async function collectGitTopology(worktreePath, manifest) {
  const branches = [
    manifest.branch,
    ...(manifest.ownershipJournal?.resources ?? []).map(
      (resource) => resource.branch,
    ),
  ]
    .filter((branch) => typeof branch === 'string' && branch.length > 0)
    .sort();
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
      existingRefs.push(branch);
    }
  }

  const revisionArgs = existingRefs.length > 0 ? existingRefs : ['HEAD'];
  const sourceCommit = optionalString(manifest.sourceCommitSha);
  const logArgs = [
    'log',
    '--reverse',
    '--topo-order',
    '--format=%H%x09%P%x09%s',
    '--max-count=500',
    ...revisionArgs,
  ];
  if (sourceCommit) {
    logArgs.push('--not', sourceCommit);
  }
  const log = await runGit(logArgs, worktreePath);
  const commits = log
    ? log.split(/\r?\n/u).map((line) => {
        const [sha, parents = '', ...subject] = line.split('\t');
        return {
          parents: parents.split(' ').filter(Boolean),
          sha,
          subject: subject.join('\t'),
        };
      })
    : [];

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
    commits,
    head: await runGit(['rev-parse', 'HEAD'], worktreePath),
    worktrees,
  };
}

function normalizeManifest(manifest) {
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
    branchOwnership: manifest.branchOwnership ?? null,
    effectiveCloseoutPolicy: manifest.effectiveCloseoutPolicy ?? null,
    effectiveSmokeBootstrap: normalizeBootstrap(
      manifest.effectiveSmokeBootstrap,
    ),
    harness: optionalString(manifest.harness),
    ownershipJournal,
    provisioningState: optionalString(manifest.provisioningState),
    readiness: manifest.readiness ?? null,
    runIdentity: optionalString(manifest.runIdentity),
    sourceCommitSha: optionalString(manifest.sourceCommitSha),
    writableRoots,
  });
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

  const dispatches = (
    await readJsonLines(join(canonicalWorktree, DISPATCH_PATH), {
      optional: true,
    })
  )
    .map(normalizeDispatch)
    .sort((left, right) =>
      [left.scope, left.action, left.role]
        .join('\0')
        .localeCompare([right.scope, right.action, right.role].join('\0')),
    );
  const orchestrationEvents = (
    await readJsonLines(join(canonicalWorktree, ORCHESTRATION_PATH), {
      optional: true,
    })
  )
    .map(normalizeOrchestrationEvent)
    .sort((left, right) => left.sequence - right.sequence);

  const bundle = {
    dispatches,
    fixtureLogs: await collectFixtureLogs(canonicalWorktree),
    git: await collectGitTopology(canonicalWorktree, manifest),
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
