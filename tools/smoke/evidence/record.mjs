import { randomUUID } from 'node:crypto';
import {
  link,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIONS = new Set(['implementation', 'review']);
const LAUNCH_STATUSES = new Set(['accepted', 'pre-start-rejected']);
const OUTCOMES = new Set(['completed', 'failed', 'rejected']);
const SELECTION_REASONS = new Set([
  'inherit',
  'native-catalog',
  'native-catalog-unsatisfying',
  'pre-start-rejection',
]);

export class DispatchRecordError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DispatchRecordError';
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

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DispatchRecordError(`${label} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function normalizeDispatchRecord(record) {
  if (!isPlainObject(record) || record.schemaVersion !== 1) {
    throw new DispatchRecordError(
      'Dispatch record must be a schemaVersion 1 object.',
    );
  }
  const action = requiredString(record.action, 'action');
  const attempt = record.attempt;
  const scope = requiredString(record.scope, 'scope');
  if (!ACTIONS.has(action)) {
    throw new DispatchRecordError(`Unsupported dispatch action: ${action}`);
  }
  if (!/^(?:p\d{2}(?:-t\d{2})?|final)$/u.test(scope)) {
    throw new DispatchRecordError(`Invalid dispatch scope: ${scope}`);
  }
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new DispatchRecordError('attempt must be a positive integer.');
  }
  if (!isPlainObject(record.configuredInvocation)) {
    throw new DispatchRecordError('configuredInvocation must be an object.');
  }
  if (!isPlainObject(record.selection)) {
    throw new DispatchRecordError('selection must be an object.');
  }
  if (!isPlainObject(record.launch)) {
    throw new DispatchRecordError('launch must be an object.');
  }
  const launchStatus = requiredString(record.launch.status, 'launch.status');
  const outcome = requiredString(record.launch.outcome, 'launch.outcome');
  const selectionReason = requiredString(
    record.selection.reason,
    'selection.reason',
  );
  if (!LAUNCH_STATUSES.has(launchStatus)) {
    throw new DispatchRecordError(`Invalid launch status: ${launchStatus}`);
  }
  if (!OUTCOMES.has(outcome)) {
    throw new DispatchRecordError(`Invalid launch outcome: ${outcome}`);
  }
  if (!SELECTION_REASONS.has(selectionReason)) {
    throw new DispatchRecordError(
      `Invalid selection reason: ${selectionReason}`,
    );
  }
  const accepted = launchStatus === 'accepted';
  if (
    (accepted && outcome === 'rejected') ||
    (!accepted && outcome !== 'rejected')
  ) {
    throw new DispatchRecordError(
      'launch status and outcome are inconsistent.',
    );
  }
  if (
    typeof record.selection.atOrBelowCeiling !== 'boolean' ||
    !Array.isArray(record.selection.candidatesConsidered)
  ) {
    throw new DispatchRecordError(
      'selection requires atOrBelowCeiling and candidatesConsidered.',
    );
  }

  const role = requiredString(record.role, 'role');
  if (!/^[a-z][a-z0-9-]*$/u.test(role)) {
    throw new DispatchRecordError(
      'role must be a lowercase kebab-case identifier.',
    );
  }

  return {
    action,
    attempt,
    configuredInvocation: {
      candidateTier: requiredString(
        record.configuredInvocation.candidateTier,
        'configuredInvocation.candidateTier',
      ),
      ceiling: requiredString(
        record.configuredInvocation.ceiling,
        'configuredInvocation.ceiling',
      ),
      ceilingEffortAxis: requiredString(
        record.configuredInvocation.ceilingEffortAxis,
        'configuredInvocation.ceilingEffortAxis',
      ),
      ceilingModelAxis: requiredString(
        record.configuredInvocation.ceilingModelAxis,
        'configuredInvocation.ceilingModelAxis',
      ),
      effortAxis: requiredString(
        record.configuredInvocation.effortAxis,
        'configuredInvocation.effortAxis',
      ),
      modelAxis: requiredString(
        record.configuredInvocation.modelAxis,
        'configuredInvocation.modelAxis',
      ),
      policy: requiredString(
        record.configuredInvocation.policy,
        'configuredInvocation.policy',
      ),
      target: requiredString(
        record.configuredInvocation.target,
        'configuredInvocation.target',
      ),
    },
    launch: {
      accepted,
      mechanism: requiredString(record.launch.mechanism, 'launch.mechanism'),
      outcome,
      status: launchStatus,
    },
    role,
    runtimeIdentity: isPlainObject(record.runtimeIdentity)
      ? {
          confidence: optionalString(record.runtimeIdentity.confidence),
          effort: optionalString(record.runtimeIdentity.effort),
          model: optionalString(record.runtimeIdentity.model),
          producer: optionalString(record.runtimeIdentity.producer),
          provenance: optionalString(record.runtimeIdentity.provenance),
        }
      : null,
    schemaVersion: 1,
    scope,
    selection: {
      atOrBelowCeiling: record.selection.atOrBelowCeiling,
      candidatesConsidered: record.selection.candidatesConsidered.map(
        (candidate) => requiredString(candidate, 'candidate'),
      ),
      reason: selectionReason,
    },
  };
}

async function publishImmutableRecord({
  canonicalWorktree,
  directory,
  fileName,
  record,
}) {
  const evidenceDirectory = join(canonicalWorktree, directory);
  if (!isWithin(canonicalWorktree, evidenceDirectory)) {
    throw new DispatchRecordError('Evidence directory escaped the worktree.');
  }
  await mkdir(evidenceDirectory, { recursive: true });
  const targetPath = join(evidenceDirectory, fileName);
  const temporaryPath = join(
    evidenceDirectory,
    `.${fileName}-${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, {
      flag: 'wx',
    });
    await link(temporaryPath, targetPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new DispatchRecordError(
        `Evidence record already exists: ${fileName}`,
      );
    }
    throw error;
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return targetPath;
}

export async function writeDispatchRecord({ inputPath, worktreePath }) {
  const canonicalWorktree = await realpath(worktreePath);
  const record = normalizeDispatchRecord(
    JSON.parse(await readFile(inputPath, 'utf8')),
  );
  return publishImmutableRecord({
    canonicalWorktree,
    directory: 'workspace/evidence/dispatch',
    fileName: `${record.scope}-${record.action}-${record.role}-${String(record.attempt).padStart(3, '0')}.json`,
    record,
  });
}

export function normalizeStateTransitionRecord(record) {
  if (
    !isPlainObject(record) ||
    record.schemaVersion !== 1 ||
    record.event !== 'state-transition'
  ) {
    throw new DispatchRecordError(
      'State transition must be a schemaVersion 1 state-transition object.',
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 1) {
    throw new DispatchRecordError('sequence must be a positive integer.');
  }
  const commitSha = requiredString(record.commitSha, 'commitSha');
  if (!/^[0-9a-f]{40}$/u.test(commitSha)) {
    throw new DispatchRecordError('commitSha must be a full commit SHA.');
  }
  return {
    commitSha,
    event: 'state-transition',
    from: requiredString(record.from, 'from'),
    schemaVersion: 1,
    sequence: record.sequence,
    to: requiredString(record.to, 'to'),
  };
}

export async function writeStateTransitionRecord({ inputPath, worktreePath }) {
  const canonicalWorktree = await realpath(worktreePath);
  const record = normalizeStateTransitionRecord(
    JSON.parse(await readFile(inputPath, 'utf8')),
  );
  return publishImmutableRecord({
    canonicalWorktree,
    directory: 'workspace/evidence/orchestration',
    fileName: `${String(record.sequence).padStart(3, '0')}-state-transition.json`,
    record,
  });
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!['--worktree', '--input', '--kind'].includes(option)) {
      throw new DispatchRecordError(`Unknown argument: ${option}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--') || values[option]) {
      throw new DispatchRecordError(`Invalid value for ${option}.`);
    }
    values[option] = value;
    index += 1;
  }
  if (!values['--worktree'] || !values['--input']) {
    throw new DispatchRecordError(
      'Usage: record.mjs --worktree <path> --input <record.json>',
    );
  }
  return {
    inputPath: resolve(values['--input']),
    kind: values['--kind'] ?? 'dispatch',
    worktreePath: resolve(values['--worktree']),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const writer =
    options.kind === 'dispatch'
      ? writeDispatchRecord
      : options.kind === 'state-transition'
        ? writeStateTransitionRecord
        : null;
  if (!writer) {
    throw new DispatchRecordError(`Unknown record kind: ${options.kind}`);
  }
  process.stdout.write(`${await writer(options)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
