import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { extractReviewAccounting } from './artifact-accounting';
import { canonicalizeJson, hashCanonicalJson } from './canonical-json';
import { ReviewDomainError } from './errors';
import { projectValidatedAssignments } from './plan-validator';
import {
  parseHostTelemetryEvidenceV1,
  parsePlanValidationReceiptV1,
  parsePreparedReviewContextV1,
  parseReviewPlanV1,
  parseReviewPreparationV1,
} from './schemas';
import type {
  HostTelemetryEvidenceV1,
  PlanValidationReceiptV1,
  PreparedReviewContextV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewProgress,
  ValidatedAssignmentProjectionV1,
  ValidatedWorkerCoverageProjectionV1,
  WorkerDossierV1,
} from './types';
import {
  ephemeralValidationStoreAuthority,
  type ValidationStoreAuthority,
} from './validation-store-authority';
import { parseWorkerDossierV1, validateWorkerDossier } from './worker-dossier';

export interface AcceptedArtifactPublicationIntent {
  destination: string;
  reservationId: string;
  destinationDevice: number | null;
  destinationInode: number | null;
}

export interface ValidationRunState {
  schemaVersion: 1;
  preparation: ReviewPreparationV1;
  phase: ReviewProgress;
  draft: {
    path: string;
    device: number;
    inode: number;
  } | null;
  acceptedHandleDigest: string | null;
  capabilities: {
    checkpointDigest: string;
    planDigest: string;
    checkpointUsed: boolean;
    planUsed: boolean;
  } | null;
  telemetry: HostTelemetryEvidenceV1[];
  context: PreparedReviewContextV1 | null;
  plan: ReviewPlanV1 | null;
  assignment: ValidatedAssignmentProjectionV1 | null;
  receipt: PlanValidationReceiptV1 | null;
  workerCoverage: ValidatedWorkerCoverageProjectionV1[];
  planValidationAttempts: number;
  output: {
    immutableSubstanceDigest: string | null;
    attempts: number;
    terminalClassification?: 'reviewer-blocked' | 'accounting-invalid' | null;
  };
  acceptedSnapshot: {
    id: string;
    bytesBase64: string;
    digest: string;
    accounting: import('./types').ReviewAccountingV1;
    publication: 'available' | 'consuming' | 'consumed';
    publicationIntent: AcceptedArtifactPublicationIntent | null;
  } | null;
}

export interface StoredValidationRun {
  runId: string;
  runDirectory: string;
  statePath: string;
  artifactDraftPath: string | null;
  draftDevice: number | null;
  draftInode: number | null;
  state: ValidationRunState;
}

export interface AccountingInvalidTerminalReceipt {
  schemaVersion: 1;
  gateRunId: string;
  launchAttemptId: string;
  validationRunId: string;
  validationAttempts: number;
  repairAttempts: number;
  expiresAt: string;
}

const NOFOLLOW =
  'O_NOFOLLOW' in constants ? constants.O_NOFOLLOW : (0 as number);
const EXCLUSIVE_WRITE =
  constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | NOFOLLOW;
const LOCK_LEASE_MS = 30_000;

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'EPERM'
    );
  }
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  name: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== [...expected].sort().join(',')) {
    throw new Error(`${name} has an invalid schema`);
  }
  return record;
}

function parseValidationRunState(
  value: unknown,
  runId: string,
): ValidationRunState {
  let normalizedValue =
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !('workerCoverage' in value)
      ? { ...value, workerCoverage: [] }
      : value;
  if (
    typeof normalizedValue === 'object' &&
    normalizedValue !== null &&
    !Array.isArray(normalizedValue) &&
    'output' in normalizedValue &&
    typeof normalizedValue.output === 'object' &&
    normalizedValue.output !== null &&
    !Array.isArray(normalizedValue.output) &&
    !('terminalClassification' in normalizedValue.output)
  ) {
    normalizedValue = {
      ...normalizedValue,
      output: {
        ...normalizedValue.output,
        terminalClassification: null,
      },
    };
  }
  const state = exactKeys(
    normalizedValue,
    [
      'schemaVersion',
      'preparation',
      'phase',
      'draft',
      'acceptedHandleDigest',
      'capabilities',
      'telemetry',
      'context',
      'plan',
      'assignment',
      'receipt',
      'workerCoverage',
      'planValidationAttempts',
      'output',
      'acceptedSnapshot',
    ],
    'validation state',
  );
  if (state.schemaVersion !== 1) {
    throw new Error('validation state schema version is invalid');
  }
  const preparation = parseReviewPreparationV1(state.preparation);
  if (preparation.runId !== runId) {
    throw new Error('validation state identity mismatch');
  }
  if (
    ![
      'prepared',
      'artifacts_loaded',
      'plan_validated',
      'evidence_started',
      'accounting_repair',
      'accepted',
      'terminal',
    ].includes(state.phase as string)
  ) {
    throw new Error('validation state phase is invalid');
  }
  let draft: ValidationRunState['draft'] = null;
  if (state.draft !== null) {
    const parsed = exactKeys(
      state.draft,
      ['path', 'device', 'inode'],
      'validation draft',
    );
    if (
      typeof parsed.path !== 'string' ||
      !Number.isSafeInteger(parsed.device) ||
      !Number.isSafeInteger(parsed.inode)
    ) {
      throw new Error('validation draft schema is invalid');
    }
    draft = parsed as unknown as ValidationRunState['draft'];
  }
  if (
    state.acceptedHandleDigest !== null &&
    typeof state.acceptedHandleDigest !== 'string'
  ) {
    throw new Error('accepted handle digest is invalid');
  }
  let capabilities: ValidationRunState['capabilities'] = null;
  if (state.capabilities !== null) {
    const parsed = exactKeys(
      state.capabilities,
      ['checkpointDigest', 'planDigest', 'checkpointUsed', 'planUsed'],
      'validation capabilities',
    );
    if (
      typeof parsed.checkpointDigest !== 'string' ||
      typeof parsed.planDigest !== 'string' ||
      typeof parsed.checkpointUsed !== 'boolean' ||
      typeof parsed.planUsed !== 'boolean'
    ) {
      throw new Error('validation capabilities schema is invalid');
    }
    capabilities = parsed as unknown as ValidationRunState['capabilities'];
  }
  if (!Array.isArray(state.telemetry)) {
    throw new Error('validation telemetry must be an array');
  }
  const telemetry = state.telemetry.map((evidence) =>
    parseHostTelemetryEvidenceV1(evidence, runId),
  );
  const telemetryPhases = telemetry.map((evidence) => evidence.phase);
  if (
    new Set(telemetryPhases).size !== telemetryPhases.length ||
    telemetryPhases.length > 2 ||
    (telemetryPhases.length === 2 &&
      telemetryPhases.join(',') !== 'pre_artifact,post_artifact')
  ) {
    throw new Error('validation telemetry phase sequence is invalid');
  }
  const context =
    state.context === null ? null : parsePreparedReviewContextV1(state.context);
  const plan = state.plan === null ? null : parseReviewPlanV1(state.plan);
  let assignment: ValidatedAssignmentProjectionV1 | null = null;
  if (state.assignment !== null) {
    if (plan === null) {
      throw new Error('validation assignment requires a plan');
    }
    const expected = projectValidatedAssignments(plan);
    if (canonicalizeJson(state.assignment) !== canonicalizeJson(expected)) {
      throw new Error('validation assignment schema or identity is invalid');
    }
    assignment = expected;
  }
  const receipt =
    state.receipt === null ? null : parsePlanValidationReceiptV1(state.receipt);
  if (!Array.isArray(state.workerCoverage)) {
    throw new Error('validation worker coverage must be an array');
  }
  const workerCoverage = state.workerCoverage.map((entry, index) => {
    const pointer = `validation worker coverage ${index}`;
    const coverage = exactKeys(
      entry,
      [
        'validationRunId',
        'planDigest',
        'laneId',
        'dossierDigest',
        'outcome',
        'inspectedPathIndexes',
        'uncoveredPathIndexes',
        'inspectedObligationIds',
        'uncoveredObligationIds',
      ],
      pointer,
    );
    if (
      typeof coverage.validationRunId !== 'string' ||
      typeof coverage.planDigest !== 'string' ||
      typeof coverage.laneId !== 'string' ||
      typeof coverage.dossierDigest !== 'string' ||
      !/^[0-9a-f]{64}$/.test(coverage.dossierDigest) ||
      !['complete', 'partial'].includes(coverage.outcome as string) ||
      !Array.isArray(coverage.inspectedPathIndexes) ||
      !Array.isArray(coverage.uncoveredPathIndexes) ||
      !Array.isArray(coverage.inspectedObligationIds) ||
      !Array.isArray(coverage.uncoveredObligationIds)
    ) {
      throw new Error(`${pointer} schema is invalid`);
    }
    return structuredClone(
      coverage,
    ) as unknown as ValidatedWorkerCoverageProjectionV1;
  });
  if (
    new Set(workerCoverage.map((coverage) => coverage.laneId)).size !==
    workerCoverage.length
  ) {
    throw new Error('validation worker coverage lane identity is duplicated');
  }
  const phase = state.phase as ValidationRunState['phase'];
  if (phase === 'prepared') {
    if (
      telemetryPhases.includes('post_artifact') ||
      context !== null ||
      plan !== null ||
      assignment !== null ||
      receipt !== null ||
      workerCoverage.length > 0
    ) {
      throw new Error('prepared validation state is incoherent');
    }
  } else {
    if (
      (telemetry.length > 0 && !telemetryPhases.includes('post_artifact')) ||
      context === null
    ) {
      throw new Error('post-checkpoint validation state is incoherent');
    }
    if (
      phase === 'artifacts_loaded' &&
      (plan !== null || assignment !== null || receipt !== null)
    ) {
      throw new Error('artifact-loaded validation state is incoherent');
    }
    if (
      phase !== 'artifacts_loaded' &&
      (plan === null || assignment === null || receipt === null)
    ) {
      throw new Error('post-validation state is incoherent');
    }
  }
  if (workerCoverage.length > 0) {
    if (plan === null || receipt === null) {
      throw new Error('validation worker coverage requires a validated plan');
    }
    workerCoverage.forEach((coverage) => {
      const lane = plan.lanes.find(
        (candidate) => candidate.id === coverage.laneId,
      );
      const pathIndexes = [
        ...coverage.inspectedPathIndexes,
        ...coverage.uncoveredPathIndexes,
      ];
      const obligationIds = [
        ...coverage.inspectedObligationIds,
        ...coverage.uncoveredObligationIds,
      ];
      if (
        coverage.validationRunId !== receipt.validationRunId ||
        coverage.planDigest !== receipt.planDigest ||
        lane === undefined ||
        !lane.delegated ||
        new Set(pathIndexes).size !== pathIndexes.length ||
        pathIndexes.some(
          (pathIndex) =>
            !Number.isSafeInteger(pathIndex) ||
            pathIndex < 0 ||
            pathIndex >= lane.paths.length,
        ) ||
        pathIndexes.length !== lane.paths.length ||
        new Set(obligationIds).size !== obligationIds.length ||
        obligationIds.some(
          (obligationId) =>
            typeof obligationId !== 'string' ||
            !lane.primaryObligationIds.includes(obligationId),
        ) ||
        obligationIds.length !== lane.primaryObligationIds.length ||
        (coverage.outcome === 'complete' &&
          (coverage.uncoveredPathIndexes.length > 0 ||
            coverage.uncoveredObligationIds.length > 0))
      ) {
        throw new Error('validation worker coverage identity is invalid');
      }
    });
  }
  const preArtifact = telemetry.find(
    (evidence) => evidence.phase === 'pre_artifact',
  );
  if (
    preArtifact !== undefined &&
    hashCanonicalJson(preArtifact) !==
      preparation.prepareTelemetryEvidenceDigest
  ) {
    throw new Error('pre-artifact telemetry digest mismatch');
  }
  const postArtifact = telemetry.find(
    (evidence) => evidence.phase === 'post_artifact',
  );
  if (
    postArtifact !== undefined &&
    context !== null &&
    hashCanonicalJson(postArtifact) !==
      context.postArtifactTelemetryEvidenceDigest
  ) {
    throw new Error('post-artifact telemetry digest mismatch');
  }
  if (
    !Number.isSafeInteger(state.planValidationAttempts) ||
    (state.planValidationAttempts as number) < 0
  ) {
    throw new Error('plan validation attempts are invalid');
  }
  const output = exactKeys(
    state.output,
    ['immutableSubstanceDigest', 'attempts', 'terminalClassification'],
    'validation output state',
  );
  if (
    !Number.isSafeInteger(output.attempts) ||
    (output.attempts as number) < 0 ||
    (output.attempts as number) > 3 ||
    (output.immutableSubstanceDigest !== null &&
      (typeof output.immutableSubstanceDigest !== 'string' ||
        !/^[0-9a-f]{64}$/.test(output.immutableSubstanceDigest))) ||
    ![null, 'reviewer-blocked', 'accounting-invalid'].includes(
      output.terminalClassification as string | null,
    )
  ) {
    throw new Error('validation output state is invalid');
  }
  const attempts = output.attempts as number;
  const immutableSubstanceDigest = output.immutableSubstanceDigest as
    | string
    | null;
  const terminalClassification = output.terminalClassification as
    | 'reviewer-blocked'
    | 'accounting-invalid'
    | null;
  if (
    (attempts === 0) !== (immutableSubstanceDigest === null) ||
    (phase === 'accounting_repair' && (attempts < 1 || attempts > 2)) ||
    ((phase === 'accepted' || phase === 'terminal') && attempts < 1) ||
    (!['accounting_repair', 'accepted', 'terminal'].includes(phase) &&
      attempts !== 0) ||
    (phase !== 'terminal' && terminalClassification !== null)
  ) {
    throw new Error('validation output phase is incoherent');
  }
  let acceptedSnapshot: ValidationRunState['acceptedSnapshot'] = null;
  if (state.acceptedSnapshot !== null) {
    const normalizedSnapshot =
      typeof state.acceptedSnapshot === 'object' &&
      state.acceptedSnapshot !== null &&
      !Array.isArray(state.acceptedSnapshot) &&
      !('publicationIntent' in state.acceptedSnapshot)
        ? { ...state.acceptedSnapshot, publicationIntent: null }
        : state.acceptedSnapshot;
    const snapshot = exactKeys(
      normalizedSnapshot,
      [
        'id',
        'bytesBase64',
        'digest',
        'accounting',
        'publication',
        'publicationIntent',
      ],
      'accepted artifact snapshot',
    );
    if (
      typeof snapshot.id !== 'string' ||
      !/^[0-9a-f]{64}$/.test(snapshot.id) ||
      typeof snapshot.bytesBase64 !== 'string' ||
      typeof snapshot.digest !== 'string' ||
      !/^[0-9a-f]{64}$/.test(snapshot.digest) ||
      !['available', 'consuming', 'consumed'].includes(
        snapshot.publication as string,
      )
    ) {
      throw new Error('accepted artifact snapshot schema is invalid');
    }
    const bytes = Buffer.from(snapshot.bytesBase64, 'base64');
    if (
      bytes.toString('base64') !== snapshot.bytesBase64 ||
      createHash('sha256').update(bytes).digest('hex') !== snapshot.digest
    ) {
      throw new Error('accepted artifact snapshot digest is invalid');
    }
    const accounting = extractReviewAccounting(bytes);
    if (
      canonicalizeJson(accounting) !== canonicalizeJson(snapshot.accounting)
    ) {
      throw new Error('accepted artifact snapshot accounting is invalid');
    }
    let publicationIntent: AcceptedArtifactPublicationIntent | null = null;
    if (snapshot.publicationIntent !== null) {
      const intent = exactKeys(
        snapshot.publicationIntent,
        [
          'destination',
          'reservationId',
          'destinationDevice',
          'destinationInode',
        ],
        'accepted artifact publication intent',
      );
      if (
        typeof intent.destination !== 'string' ||
        !isAbsolute(intent.destination) ||
        resolve(intent.destination) !== intent.destination ||
        typeof intent.reservationId !== 'string' ||
        !/^[0-9a-f]{64}$/.test(intent.reservationId) ||
        (intent.destinationDevice !== null &&
          (!Number.isSafeInteger(intent.destinationDevice) ||
            (intent.destinationDevice as number) < 0)) ||
        (intent.destinationInode !== null &&
          (!Number.isSafeInteger(intent.destinationInode) ||
            (intent.destinationInode as number) < 0)) ||
        (intent.destinationDevice === null) !==
          (intent.destinationInode === null)
      ) {
        throw new Error('accepted artifact publication intent is invalid');
      }
      publicationIntent =
        intent as unknown as AcceptedArtifactPublicationIntent;
    }
    if (
      (snapshot.publication === 'available' && publicationIntent !== null) ||
      (snapshot.publication === 'consuming' &&
        publicationIntent !== null &&
        publicationIntent.destinationDevice !== null) ||
      (snapshot.publication === 'consumed' &&
        publicationIntent !== null &&
        publicationIntent.destinationDevice === null)
    ) {
      throw new Error('accepted artifact publication state is incoherent');
    }
    acceptedSnapshot = {
      id: snapshot.id,
      bytesBase64: snapshot.bytesBase64,
      digest: snapshot.digest,
      accounting,
      publication: snapshot.publication as
        | 'available'
        | 'consuming'
        | 'consumed',
      publicationIntent,
    };
  }
  if (acceptedSnapshot !== null && phase !== 'accepted') {
    throw new Error('accepted artifact snapshot phase is incoherent');
  }
  return {
    schemaVersion: 1,
    preparation,
    phase,
    draft,
    acceptedHandleDigest: state.acceptedHandleDigest as string | null,
    capabilities,
    telemetry,
    context,
    plan,
    assignment,
    receipt,
    workerCoverage,
    planValidationAttempts: state.planValidationAttempts as number,
    output: {
      immutableSubstanceDigest,
      attempts,
      terminalClassification,
    },
    acceptedSnapshot,
  };
}

async function writeExclusive(path: string, content: string): Promise<void> {
  const handle = await open(path, EXCLUSIVE_WRITE, 0o600);
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export class ValidationStore {
  readonly root: string;
  readonly #authority: ValidationStoreAuthority;
  readonly #clock: () => Date;

  constructor(
    root = join(tmpdir(), 'oat-review-validation-v1'),
    authority = ephemeralValidationStoreAuthority(),
    clock: () => Date = () => new Date(),
  ) {
    this.root = root;
    this.#authority = authority;
    this.#clock = clock;
  }

  private async ensureRoot(): Promise<void> {
    let info;
    try {
      info = await lstat(this.root);
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
      await mkdir(this.root, { mode: 0o700 });
      info = await lstat(this.root);
    }
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error('validation store root must be a real directory');
    }
    await chmod(this.root, 0o700);
  }

  private async withLock<T>(
    operation: (assertOwnership: () => Promise<void>) => Promise<T>,
  ): Promise<T> {
    await this.ensureRoot();
    const lockPath = join(this.root, '.store.lock');
    const owner = {
      schemaVersion: 1,
      pid: process.pid,
      nonce: randomUUID(),
      acquiredAtMs: Date.now(),
      leaseMs: LOCK_LEASE_MS,
    };
    for (;;) {
      try {
        await mkdir(lockPath, { mode: 0o700 });
        break;
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 'EEXIST'
        ) {
          throw error;
        }
        const info = await lstat(lockPath);
        if (info.isDirectory()) break;
        try {
          await rm(lockPath);
        } catch (removeError) {
          if (
            typeof removeError !== 'object' ||
            removeError === null ||
            !('code' in removeError) ||
            !['ENOENT', 'EISDIR', 'EPERM'].includes(String(removeError.code))
          ) {
            throw removeError;
          }
        }
      }
    }
    const claimPath = join(lockPath, `${owner.nonce}.claim`);
    await writeExclusive(claimPath, `${JSON.stringify(owner)}\n`);
    let acquired = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const liveClaims: Array<{ acquiredAtMs: number; nonce: string }> = [];
      for (const name of await readdir(lockPath)) {
        if (!name.endsWith('.claim')) continue;
        const candidatePath = join(lockPath, name);
        try {
          const existing = JSON.parse(
            await readFile(candidatePath, 'utf8'),
          ) as {
            schemaVersion?: unknown;
            pid?: unknown;
            nonce?: unknown;
            acquiredAtMs?: unknown;
            leaseMs?: unknown;
          };
          const stale =
            existing.schemaVersion !== 1 ||
            !Number.isSafeInteger(existing.pid) ||
            typeof existing.nonce !== 'string' ||
            `${existing.nonce}.claim` !== name ||
            !Number.isSafeInteger(existing.acquiredAtMs) ||
            !Number.isSafeInteger(existing.leaseMs) ||
            !processIsAlive(existing.pid as number);
          if (stale) {
            await rm(candidatePath, { force: true });
            continue;
          }
          liveClaims.push({
            acquiredAtMs: existing.acquiredAtMs as number,
            nonce: existing.nonce as string,
          });
        } catch (readError) {
          if (
            typeof readError === 'object' &&
            readError !== null &&
            'code' in readError &&
            readError.code === 'ENOENT'
          ) {
            continue;
          }
          const info = await stat(candidatePath);
          if (Date.now() - info.mtimeMs > LOCK_LEASE_MS) {
            await rm(candidatePath, { force: true });
            continue;
          }
          liveClaims.push({
            acquiredAtMs: info.mtimeMs,
            nonce: name.slice(0, -'.claim'.length),
          });
        }
      }
      liveClaims.sort(
        (left, right) =>
          left.acquiredAtMs - right.acquiredAtMs ||
          left.nonce.localeCompare(right.nonce),
      );
      if (liveClaims[0]?.nonce === owner.nonce) {
        acquired = true;
        break;
      }
      await delay(10);
    }
    if (!acquired) {
      await rm(claimPath, { force: true });
      throw new Error('validation store lock timeout');
    }
    const assertOwnership = async () => {
      try {
        const current = JSON.parse(await readFile(claimPath, 'utf8')) as {
          pid?: unknown;
          nonce?: unknown;
        };
        if (current.pid === owner.pid && current.nonce === owner.nonce) return;
      } catch {
        // A missing or malformed owner claim is a lost fencing token.
      }
      throw new Error('validation store lock fencing token was superseded');
    };
    let outcome: { ok: true; value: T } | { ok: false; error: unknown };
    try {
      await assertOwnership();
      outcome = { ok: true, value: await operation(assertOwnership) };
    } catch (error) {
      outcome = { ok: false, error };
    }
    let cleanupError: unknown;
    try {
      await rm(claimPath);
    } catch (error) {
      cleanupError = error;
    }
    try {
      await rmdir(lockPath);
    } catch (error) {
      if (
        (typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          !['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(String(error.code))) &&
        cleanupError === undefined
      ) {
        cleanupError = error;
      }
    }
    if (!outcome.ok) throw outcome.error;
    if (cleanupError !== undefined) throw cleanupError;
    return outcome.value;
  }

  private runDirectory(runId: string): string {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(runId)) {
      throw new Error('validation run ID is malformed');
    }
    return join(this.root, `run-${runId}`);
  }

  private correlationDigest(
    gateRunId: string,
    launchAttemptId: string,
  ): string {
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(gateRunId) ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(launchAttemptId)
    ) {
      throw new Error('gate correlation IDs are malformed');
    }
    return createHash('sha256')
      .update(JSON.stringify([gateRunId, launchAttemptId]))
      .digest('hex');
  }

  private correlationPath(gateRunId: string, launchAttemptId: string): string {
    return join(
      this.root,
      `correlation-${this.correlationDigest(gateRunId, launchAttemptId)}.json`,
    );
  }

  private terminalReceiptPath(
    gateRunId: string,
    launchAttemptId: string,
  ): string {
    return join(
      this.root,
      `terminal-${this.correlationDigest(gateRunId, launchAttemptId)}.json`,
    );
  }

  async createRun(input: {
    preparation: ReviewPreparationV1;
    artifactDraft: boolean;
  }): Promise<StoredValidationRun> {
    await this.ensureRoot();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.preparation.runId)) {
      throw new Error('validation run ID is malformed');
    }
    const runDirectory = this.runDirectory(input.preparation.runId);
    await mkdir(runDirectory, { mode: 0o700 });
    await chmod(runDirectory, 0o700);
    const resolvedRoot = await realpath(this.root);
    const resolvedRun = await realpath(runDirectory);
    if (!resolvedRun.startsWith(`${resolvedRoot}/`)) {
      throw new Error('validation run escaped the private root');
    }

    let draft: { path: string; device: number; inode: number } | null = null;
    try {
      if (input.artifactDraft) {
        const path = join(runDirectory, 'artifact-draft.md');
        await writeExclusive(path, '');
        const info = await stat(path);
        if (!info.isFile() || info.nlink !== 1) {
          throw new Error('artifact draft must be a single-link regular file');
        }
        draft = { path, device: info.dev, inode: info.ino };
      }
      const state: ValidationRunState = {
        schemaVersion: 1,
        preparation: structuredClone(input.preparation),
        phase: 'prepared',
        draft,
        acceptedHandleDigest: null,
        capabilities: null,
        telemetry: [],
        context: null,
        plan: null,
        assignment: null,
        receipt: null,
        workerCoverage: [],
        planValidationAttempts: 0,
        output: {
          immutableSubstanceDigest: null,
          attempts: 0,
          terminalClassification: null,
        },
        acceptedSnapshot: null,
      };
      const statePath = join(runDirectory, 'state.json');
      await writeExclusive(statePath, this.#authority.seal(state));
      const stateInfo = await stat(statePath);
      if (!stateInfo.isFile() || stateInfo.mode & 0o077) {
        throw new Error('validation state permissions are unsafe');
      }
      return {
        runId: input.preparation.runId,
        runDirectory,
        statePath,
        artifactDraftPath: draft?.path ?? null,
        draftDevice: draft?.device ?? null,
        draftInode: draft?.inode ?? null,
        state,
      };
    } catch (error) {
      await rm(runDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async unsafeReadStateForTesting(runId: string): Promise<unknown> {
    return this.#authority.open(
      await readFile(join(this.runDirectory(runId), 'state.json'), 'utf8'),
    );
  }

  private async readRunWithoutDraftIdentity(
    runId: string,
  ): Promise<StoredValidationRun> {
    await this.ensureRoot();
    const runDirectory = this.runDirectory(runId);
    const runInfo = await lstat(runDirectory);
    if (!runInfo.isDirectory() || runInfo.isSymbolicLink()) {
      throw new Error('validation run directory identity is unsafe');
    }
    const [resolvedRoot, resolvedRun] = await Promise.all([
      realpath(this.root),
      realpath(runDirectory),
    ]);
    if (resolvedRun !== join(resolvedRoot, `run-${runId}`)) {
      throw new Error('validation run escaped the private root');
    }
    const statePath = join(runDirectory, 'state.json');
    const handle = await open(statePath, constants.O_RDONLY | NOFOLLOW);
    let source: string;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
        throw new Error('validation state identity or permissions are unsafe');
      }
      source = await handle.readFile('utf8');
    } finally {
      await handle.close();
    }
    const state = parseValidationRunState(this.#authority.open(source), runId);
    return {
      runId,
      runDirectory,
      statePath,
      artifactDraftPath: state.draft?.path ?? null,
      draftDevice: state.draft?.device ?? null,
      draftInode: state.draft?.inode ?? null,
      state,
    };
  }

  async readRun(runId: string, now = new Date()): Promise<StoredValidationRun> {
    const run = await this.readRunWithoutDraftIdentity(runId);
    const { state } = run;
    if (Date.parse(state.preparation.expiresAt) <= now.getTime()) {
      throw new Error('validation state has expired');
    }
    if (state.draft !== null) {
      const draftInfo = await lstat(state.draft.path);
      if (
        !draftInfo.isFile() ||
        draftInfo.isSymbolicLink() ||
        draftInfo.nlink !== 1 ||
        draftInfo.dev !== state.draft.device ||
        draftInfo.ino !== state.draft.inode ||
        draftInfo.mode & 0o077
      ) {
        throw new Error('artifact draft identity mismatch');
      }
    }
    return run;
  }

  async updateRun(
    runId: string,
    update: (state: ValidationRunState) => ValidationRunState,
  ): Promise<StoredValidationRun> {
    return this.withLock(async (assertOwnership) => {
      const current = await this.readRun(runId);
      const next = update(structuredClone(current.state));
      if (
        next.schemaVersion !== 1 ||
        next.preparation.runId !== runId ||
        next.preparation.expiresAt !== current.state.preparation.expiresAt
      ) {
        throw new Error('validation update changed immutable identity');
      }
      const validatedNext = parseValidationRunState(next, runId);
      const temporaryPath = join(
        current.runDirectory,
        `.state-${randomUUID()}.tmp`,
      );
      await writeExclusive(temporaryPath, this.#authority.seal(validatedNext));
      await assertOwnership();
      await rename(temporaryPath, current.statePath);
      return this.readRun(runId);
    });
  }

  async bindValidatedWorkerDossier(
    runId: string,
    input: { receipt: string; dossier: WorkerDossierV1 },
  ): Promise<ValidatedWorkerCoverageProjectionV1> {
    let bound: ValidatedWorkerCoverageProjectionV1 | undefined;
    await this.updateRun(runId, (state) => {
      if (
        state.phase !== 'evidence_started' ||
        state.context === null ||
        state.plan === null ||
        state.assignment === null ||
        state.receipt === null ||
        state.output.attempts !== 0
      ) {
        throw new ReviewDomainError({
          category: 'contract',
          code: 'worker-dossier-binding-phase-invalid',
          message:
            'worker dossier binding requires pre-output evidence-started state',
        });
      }
      if (
        state.receipt.token !== input.receipt ||
        state.receipt.validationRunId !== runId ||
        state.receipt.contextDigest !== state.context.contextDigest ||
        state.receipt.planDigest !== hashCanonicalJson(state.plan) ||
        state.receipt.assignmentDigest !==
          hashCanonicalJson(state.assignment) ||
        state.receipt.acceptedHandleDigest !== state.acceptedHandleDigest ||
        state.receipt.gateRunId !== state.preparation.correlation.gateRunId ||
        state.receipt.launchAttemptId !==
          state.preparation.correlation.launchAttemptId
      ) {
        throw new ReviewDomainError({
          category: 'validation',
          code: 'worker-dossier-receipt-mismatch',
          message: 'worker dossier receipt identity mismatch',
        });
      }
      const dossier = parseWorkerDossierV1(input.dossier);
      const validationErrors = validateWorkerDossier(
        state.plan,
        state.receipt.planDigest,
        dossier,
      );
      if (validationErrors.length > 0) {
        throw new ReviewDomainError({
          category: 'validation',
          code: 'worker-dossier-validation-failed',
          message: `worker dossier validation failed: ${validationErrors
            .map((error) => error.code)
            .join(', ')}`,
          details: { errorCount: validationErrors.length },
        });
      }
      const lane = state.plan.lanes.find(
        (candidate) => candidate.id === dossier.laneId,
      );
      if (lane === undefined) {
        throw new Error('validated worker dossier lane is missing');
      }
      const inspectedPathSet = new Set(dossier.inspectedPaths);
      const inspectedObligationSet = new Set(dossier.inspectedObligationIds);
      const projection: ValidatedWorkerCoverageProjectionV1 = {
        validationRunId: state.receipt.validationRunId,
        planDigest: state.receipt.planDigest,
        laneId: dossier.laneId,
        dossierDigest: hashCanonicalJson(dossier),
        outcome: dossier.outcome,
        inspectedPathIndexes: lane.paths.flatMap((path, index) =>
          inspectedPathSet.has(path) ? [index] : [],
        ),
        uncoveredPathIndexes: lane.paths.flatMap((path, index) =>
          inspectedPathSet.has(path) ? [] : [index],
        ),
        inspectedObligationIds: lane.primaryObligationIds.filter((id) =>
          inspectedObligationSet.has(id),
        ),
        uncoveredObligationIds: [...dossier.uncoveredObligationIds],
      };
      const existing = state.workerCoverage.find(
        (coverage) => coverage.laneId === projection.laneId,
      );
      if (
        existing !== undefined &&
        canonicalizeJson(existing) !== canonicalizeJson(projection)
      ) {
        throw new ReviewDomainError({
          category: 'contract',
          code: 'worker-dossier-replacement-rejected',
          message: 'worker dossier coverage is already bound',
        });
      }
      if (existing === undefined) state.workerCoverage.push(projection);
      bound = structuredClone(projection);
      return state;
    });
    if (bound === undefined) {
      throw new Error('worker dossier binding produced no coverage');
    }
    return bound;
  }

  async bindGateCorrelation(
    gateRunId: string,
    launchAttemptId: string,
    runId: string,
  ): Promise<void> {
    await this.withLock(async (assertOwnership) => {
      const run = await this.readRun(runId);
      if (
        run.state.preparation.correlation.gateRunId !== gateRunId ||
        run.state.preparation.correlation.launchAttemptId !== launchAttemptId
      ) {
        throw new Error('gate correlation does not match validation state');
      }
      await assertOwnership();
      await writeExclusive(
        this.correlationPath(gateRunId, launchAttemptId),
        `${JSON.stringify({
          schemaVersion: 1,
          gateRunId,
          launchAttemptId,
          runId,
        })}\n`,
      );
    });
  }

  async resolveGateCorrelation(
    gateRunId: string,
    launchAttemptId: string,
  ): Promise<string> {
    const path = this.correlationPath(gateRunId, launchAttemptId);
    const handle = await open(path, constants.O_RDONLY | NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
        throw new Error('gate correlation identity is unsafe');
      }
      const record = JSON.parse(await handle.readFile('utf8')) as {
        schemaVersion?: unknown;
        gateRunId?: unknown;
        launchAttemptId?: unknown;
        runId?: unknown;
      };
      if (
        record.schemaVersion !== 1 ||
        record.gateRunId !== gateRunId ||
        record.launchAttemptId !== launchAttemptId ||
        typeof record.runId !== 'string'
      ) {
        throw new Error('gate correlation schema is invalid');
      }
      const run = await this.readRun(record.runId);
      if (
        run.state.preparation.correlation.gateRunId !== gateRunId ||
        run.state.preparation.correlation.launchAttemptId !== launchAttemptId
      ) {
        throw new Error('gate correlation does not match validation state');
      }
      return record.runId;
    } finally {
      await handle.close();
    }
  }

  private async deleteExactGateCorrelation(
    gateRunId: string,
    launchAttemptId: string,
    runId: string,
  ): Promise<void> {
    const path = this.correlationPath(gateRunId, launchAttemptId);
    let handle;
    try {
      handle = await open(path, constants.O_RDONLY | NOFOLLOW);
    } catch (error) {
      if (isMissingFileError(error)) return;
      throw error;
    }
    let exact = false;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) return;
      const record = JSON.parse(await handle.readFile('utf8')) as {
        schemaVersion?: unknown;
        gateRunId?: unknown;
        launchAttemptId?: unknown;
        runId?: unknown;
      };
      exact =
        record.schemaVersion === 1 &&
        record.gateRunId === gateRunId &&
        record.launchAttemptId === launchAttemptId &&
        record.runId === runId;
    } finally {
      await handle.close();
    }
    if (exact) await rm(path, { force: true });
  }

  async recordAccountingInvalidTerminal(runId: string): Promise<void> {
    await this.withLock(async (assertOwnership) => {
      const run = await this.readRun(runId, new Date(0));
      const { correlation } = run.state.preparation;
      if (
        run.state.phase !== 'terminal' ||
        run.state.output.terminalClassification !== 'accounting-invalid' ||
        correlation.gateRunId === null ||
        run.state.receipt === null ||
        run.state.receipt.validationRunId !== runId
      ) {
        throw new Error(
          'accounting-invalid terminal receipt state is incoherent',
        );
      }
      const receipt: AccountingInvalidTerminalReceipt = {
        schemaVersion: 1,
        gateRunId: correlation.gateRunId,
        launchAttemptId: correlation.launchAttemptId,
        validationRunId: runId,
        validationAttempts: run.state.output.attempts,
        repairAttempts: run.state.output.attempts - 1,
        expiresAt: run.state.preparation.expiresAt,
      };
      await assertOwnership();
      await writeExclusive(
        this.terminalReceiptPath(receipt.gateRunId, receipt.launchAttemptId),
        `${JSON.stringify(receipt)}\n`,
      );
    });
  }

  async resolveAccountingInvalidTerminal(
    gateRunId: string,
    launchAttemptId: string,
  ): Promise<AccountingInvalidTerminalReceipt> {
    const handle = await open(
      this.terminalReceiptPath(gateRunId, launchAttemptId),
      constants.O_RDONLY | NOFOLLOW,
    );
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
        throw new Error('accounting-invalid terminal receipt is unsafe');
      }
      const receipt = exactKeys(
        JSON.parse(await handle.readFile('utf8')),
        [
          'schemaVersion',
          'gateRunId',
          'launchAttemptId',
          'validationRunId',
          'validationAttempts',
          'repairAttempts',
          'expiresAt',
        ],
        'accounting-invalid terminal receipt',
      );
      if (
        receipt.schemaVersion !== 1 ||
        receipt.gateRunId !== gateRunId ||
        receipt.launchAttemptId !== launchAttemptId ||
        typeof receipt.validationRunId !== 'string' ||
        !Number.isSafeInteger(receipt.validationAttempts) ||
        (receipt.validationAttempts as number) < 1 ||
        (receipt.validationAttempts as number) > 3 ||
        receipt.repairAttempts !== (receipt.validationAttempts as number) - 1 ||
        typeof receipt.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(receipt.expiresAt))
      ) {
        throw new Error('accounting-invalid terminal receipt is invalid');
      }
      if (Date.parse(receipt.expiresAt as string) <= this.#clock().getTime()) {
        throw new Error('accounting-invalid terminal receipt has expired');
      }
      return receipt as unknown as AccountingInvalidTerminalReceipt;
    } finally {
      await handle.close();
    }
  }

  async retainTerminalDiagnostic(
    receipt: AccountingInvalidTerminalReceipt,
  ): Promise<string> {
    return this.withLock(async (assertOwnership) => {
      const current = await this.resolveAccountingInvalidTerminal(
        receipt.gateRunId,
        receipt.launchAttemptId,
      );
      if (canonicalizeJson(current) !== canonicalizeJson(receipt)) {
        throw new Error('accounting-invalid terminal receipt changed');
      }
      const diagnosticPath = join(
        this.root,
        `diagnostic-${this.correlationDigest(
          receipt.gateRunId,
          receipt.launchAttemptId,
        )}.json`,
      );
      await assertOwnership();
      await writeExclusive(
        diagnosticPath,
        `${JSON.stringify({
          ...receipt,
          kind: 'review_complete_accounting_invalid',
        })}\n`,
      );
      await rm(
        this.correlationPath(receipt.gateRunId, receipt.launchAttemptId),
        { force: true },
      );
      await rm(this.runDirectory(receipt.validationRunId), {
        recursive: true,
        force: true,
      });
      await rm(
        this.terminalReceiptPath(receipt.gateRunId, receipt.launchAttemptId),
        { force: true },
      );
      return diagnosticPath;
    });
  }

  async deletePreStartRejectedGateRun(
    gateRunId: string,
    launchAttemptId: string,
  ): Promise<void> {
    await this.withLock(async (assertOwnership) => {
      const runId = await this.resolveGateCorrelation(
        gateRunId,
        launchAttemptId,
      );
      const run = await this.readRun(runId, new Date(0));
      if (
        run.state.phase !== 'prepared' ||
        run.state.acceptedHandleDigest !== null
      ) {
        throw new Error(
          'accepted gate launch attempt cannot be replaced or deleted',
        );
      }
      await assertOwnership();
      await rm(this.correlationPath(gateRunId, launchAttemptId), {
        force: true,
      });
      await rm(this.runDirectory(runId), { recursive: true, force: true });
    });
  }

  async deleteRun(runId: string): Promise<void> {
    await this.withLock(async (assertOwnership) => {
      const run = await this.readRunWithoutDraftIdentity(runId);
      await this.deleteStoredRun(run, assertOwnership);
    });
  }

  async deleteRunIfExpired(runId: string, now: Date): Promise<boolean> {
    if (!Number.isFinite(now.getTime())) {
      throw new Error('validation expiry time is invalid');
    }
    return this.withLock(async (assertOwnership) => {
      const run = await this.readRunWithoutDraftIdentity(runId);
      if (Date.parse(run.state.preparation.expiresAt) > now.getTime()) {
        return false;
      }
      await this.deleteStoredRun(run, assertOwnership);
      return true;
    });
  }

  private async deleteStoredRun(
    run: StoredValidationRun,
    assertOwnership: () => Promise<void>,
  ): Promise<void> {
    const correlation = run.state.preparation.correlation;
    await assertOwnership();
    if (correlation.gateRunId !== null) {
      await this.deleteExactGateCorrelation(
        correlation.gateRunId,
        correlation.launchAttemptId,
        run.runId,
      );
    }
    await rm(run.runDirectory, { recursive: true, force: true });
  }
}
