import { hashCanonicalJson, parseStrictJson } from './canonical-json';
import type {
  ReviewCommandEvidenceV1,
  ReviewEvidenceRefV1,
  ReviewLaneV1,
  ReviewPlanV1,
  ReviewScopeRefV1,
  WorkerDossierV1,
} from './types';

export interface WorkerDossierValidationError {
  code: string;
  pointer: string;
  message: string;
}

export class WorkerDossierParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkerDossierParseError';
  }
}

function parseObject(value: unknown, pointer: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkerDossierParseError(`${pointer} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseArray(value: unknown, pointer: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new WorkerDossierParseError(`${pointer} must be an array`);
  }
  return value;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  pointer: string,
): void {
  const expectedKeys = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) {
      throw new WorkerDossierParseError(`${pointer} has unknown field ${key}`);
    }
  }
  for (const key of expected) {
    if (!(key in value)) {
      throw new WorkerDossierParseError(`${pointer} is missing ${key}`);
    }
  }
}

function parseString(value: unknown, pointer: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkerDossierParseError(`${pointer} must be a non-empty string`);
  }
  return value;
}

function parseStringArray(value: unknown, pointer: string): string[] {
  return parseArray(value, pointer).map((entry, index) =>
    parseString(entry, `${pointer}/${index}`),
  );
}

function parseScopeRef(value: unknown, pointer: string): ReviewScopeRefV1 {
  const ref = parseObject(value, pointer);
  exactKeys(ref, ['bucket', 'bucketId', 'pathIndexes'], pointer);
  if (ref['bucket'] !== 'lane' && ref['bucket'] !== 'classification') {
    throw new WorkerDossierParseError(`${pointer}/bucket has invalid value`);
  }
  const pathIndexes = parseArray(
    ref['pathIndexes'],
    `${pointer}/pathIndexes`,
  ).map((entry, index) => {
    if (!Number.isSafeInteger(entry) || (entry as number) < 0) {
      throw new WorkerDossierParseError(
        `${pointer}/pathIndexes/${index} must be a non-negative safe integer`,
      );
    }
    return entry as number;
  });
  return {
    bucket: ref['bucket'],
    bucketId: parseString(ref['bucketId'], `${pointer}/bucketId`),
    pathIndexes,
  };
}

function parseScopeRefs(value: unknown, pointer: string): ReviewScopeRefV1[] {
  return parseArray(value, pointer).map((entry, index) =>
    parseScopeRef(entry, `${pointer}/${index}`),
  );
}

function parseCommand(
  value: unknown,
  pointer: string,
): ReviewCommandEvidenceV1 {
  const command = parseObject(value, pointer);
  exactKeys(
    command,
    ['id', 'command', 'cwd', 'scopeRefs', 'provenance', 'result'],
    pointer,
  );
  const provenance = parseObject(
    command['provenance'],
    `${pointer}/provenance`,
  );
  exactKeys(
    provenance,
    ['runner', 'invocationDigest', 'capturedAt'],
    `${pointer}/provenance`,
  );
  const capturedAt = parseString(
    provenance['capturedAt'],
    `${pointer}/provenance/capturedAt`,
  );
  if (
    !Number.isFinite(Date.parse(capturedAt)) ||
    new Date(capturedAt).toISOString() !== capturedAt
  ) {
    throw new WorkerDossierParseError(
      `${pointer}/provenance/capturedAt must be a canonical ISO timestamp`,
    );
  }

  const result = parseObject(command['result'], `${pointer}/result`);
  let parsedResult: ReviewCommandEvidenceV1['result'];
  if (result['status'] === 'completed') {
    exactKeys(
      result,
      ['status', 'exitCode', 'outputDigest'],
      `${pointer}/result`,
    );
    if (!Number.isSafeInteger(result['exitCode'])) {
      throw new WorkerDossierParseError(
        `${pointer}/result/exitCode must be a safe integer`,
      );
    }
    parsedResult = {
      status: 'completed',
      exitCode: result['exitCode'] as number,
      outputDigest: parseString(
        result['outputDigest'],
        `${pointer}/result/outputDigest`,
      ),
    };
  } else if (result['status'] === 'interrupted') {
    exactKeys(
      result,
      ['status', 'signal', 'outputDigest'],
      `${pointer}/result`,
    );
    parsedResult = {
      status: 'interrupted',
      signal: parseString(result['signal'], `${pointer}/result/signal`),
      outputDigest: parseString(
        result['outputDigest'],
        `${pointer}/result/outputDigest`,
      ),
    };
  } else {
    throw new WorkerDossierParseError(
      `${pointer}/result/status has invalid value`,
    );
  }

  return {
    id: parseString(command['id'], `${pointer}/id`),
    command: parseString(command['command'], `${pointer}/command`),
    cwd: parseString(command['cwd'], `${pointer}/cwd`),
    scopeRefs: parseScopeRefs(command['scopeRefs'], `${pointer}/scopeRefs`),
    provenance: {
      runner: parseString(provenance['runner'], `${pointer}/provenance/runner`),
      invocationDigest: parseString(
        provenance['invocationDigest'],
        `${pointer}/provenance/invocationDigest`,
      ),
      capturedAt,
    },
    result: parsedResult,
  };
}

function parseEvidence(value: unknown, pointer: string): ReviewEvidenceRefV1 {
  const evidence = parseObject(value, pointer);
  exactKeys(
    evidence,
    [
      'id',
      'kind',
      'locator',
      'scopeRefs',
      'provenance',
      'digest',
      'commandId',
      'commandResultDigest',
    ],
    pointer,
  );
  const common = {
    id: parseString(evidence['id'], `${pointer}/id`),
    locator: parseString(evidence['locator'], `${pointer}/locator`),
    scopeRefs: parseScopeRefs(evidence['scopeRefs'], `${pointer}/scopeRefs`),
    provenance: parseString(evidence['provenance'], `${pointer}/provenance`),
    digest: parseString(evidence['digest'], `${pointer}/digest`),
  };
  if (evidence['kind'] === 'command') {
    return {
      ...common,
      kind: 'command',
      commandId: parseString(evidence['commandId'], `${pointer}/commandId`),
      commandResultDigest: parseString(
        evidence['commandResultDigest'],
        `${pointer}/commandResultDigest`,
      ),
    };
  }
  if (
    evidence['kind'] !== 'source' &&
    evidence['kind'] !== 'diff' &&
    evidence['kind'] !== 'artifact' &&
    evidence['kind'] !== 'inventory'
  ) {
    throw new WorkerDossierParseError(`${pointer}/kind has invalid value`);
  }
  if (
    evidence['commandId'] !== null ||
    evidence['commandResultDigest'] !== null
  ) {
    throw new WorkerDossierParseError(
      `${pointer} non-command evidence must use null command fields`,
    );
  }
  return {
    ...common,
    kind: evidence['kind'],
    commandId: null,
    commandResultDigest: null,
  };
}

export function parseWorkerDossierV1(value: unknown): WorkerDossierV1 {
  let input = value;
  if (typeof value === 'string') {
    try {
      input = parseStrictJson(value);
    } catch (error) {
      throw new WorkerDossierParseError(
        `invalid worker dossier JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const dossier = parseObject(input, '$');
  exactKeys(
    dossier,
    [
      'schemaVersion',
      'runId',
      'planDigest',
      'laneId',
      'outcome',
      'inspectedPaths',
      'inspectedObligationIds',
      'commands',
      'evidence',
      'candidateFindings',
      'uncoveredObligationIds',
      'uncertainty',
    ],
    '$',
  );
  if (dossier['schemaVersion'] !== 1) {
    throw new WorkerDossierParseError('$/schemaVersion must be 1');
  }
  if (dossier['outcome'] !== 'complete' && dossier['outcome'] !== 'partial') {
    throw new WorkerDossierParseError('$/outcome has invalid value');
  }
  const commands = parseArray(dossier['commands'], '$/commands').map(
    (entry, index) => parseCommand(entry, `$/commands/${index}`),
  );
  const evidence = parseArray(dossier['evidence'], '$/evidence').map(
    (entry, index) => parseEvidence(entry, `$/evidence/${index}`),
  );
  const candidateFindings = parseArray(
    dossier['candidateFindings'],
    '$/candidateFindings',
  ).map((entry, index) => {
    const pointer = `$/candidateFindings/${index}`;
    const finding = parseObject(entry, pointer);
    exactKeys(
      finding,
      ['id', 'summary', 'locations', 'evidenceRefIds'],
      pointer,
    );
    return {
      id: parseString(finding['id'], `${pointer}/id`),
      summary: parseString(finding['summary'], `${pointer}/summary`),
      locations: parseStringArray(finding['locations'], `${pointer}/locations`),
      evidenceRefIds: parseStringArray(
        finding['evidenceRefIds'],
        `${pointer}/evidenceRefIds`,
      ),
    };
  });
  return {
    schemaVersion: 1,
    runId: parseString(dossier['runId'], '$/runId'),
    planDigest: parseString(dossier['planDigest'], '$/planDigest'),
    laneId: parseString(dossier['laneId'], '$/laneId'),
    outcome: dossier['outcome'],
    inspectedPaths: parseStringArray(
      dossier['inspectedPaths'],
      '$/inspectedPaths',
    ),
    inspectedObligationIds: parseStringArray(
      dossier['inspectedObligationIds'],
      '$/inspectedObligationIds',
    ),
    commands,
    evidence,
    candidateFindings,
    uncoveredObligationIds: parseStringArray(
      dossier['uncoveredObligationIds'],
      '$/uncoveredObligationIds',
    ),
    uncertainty: parseStringArray(dossier['uncertainty'], '$/uncertainty'),
  };
}

function duplicateErrors(
  values: readonly string[],
  code: string,
  pointer: string,
  label: string,
): WorkerDossierValidationError[] {
  const seen = new Set<string>();
  const errors: WorkerDossierValidationError[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) {
      errors.push({
        code,
        pointer: `${pointer}/${index}`,
        message: `${label} ${value} is duplicated`,
      });
    }
    seen.add(value);
  });
  return errors;
}

function validateScopeRefs(
  refs: readonly ReviewScopeRefV1[],
  pointer: string,
  lane: ReviewLaneV1,
): WorkerDossierValidationError[] {
  const errors: WorkerDossierValidationError[] = [];
  if (refs.length === 0) {
    errors.push({
      code: 'empty-dossier-scope',
      pointer,
      message: 'worker command and evidence scopes must be non-empty',
    });
  }
  refs.forEach((ref, refIndex) => {
    const refPointer = `${pointer}/${refIndex}`;
    if (ref.bucket !== 'lane' || ref.bucketId !== lane.id) {
      errors.push({
        code: 'dossier-scope-out-of-lane',
        pointer: refPointer,
        message: 'worker evidence scope must reference its assigned lane',
      });
    }
    if (ref.pathIndexes.length === 0) {
      errors.push({
        code: 'empty-dossier-scope',
        pointer: `${refPointer}/pathIndexes`,
        message: 'worker scope references must identify at least one lane path',
      });
    }
    errors.push(
      ...duplicateErrors(
        ref.pathIndexes.map(String),
        'duplicate-scope-path-index',
        `${refPointer}/pathIndexes`,
        'path index',
      ),
    );
    ref.pathIndexes.forEach((pathIndex, index) => {
      if (
        !Number.isInteger(pathIndex) ||
        pathIndex < 0 ||
        pathIndex >= lane.paths.length
      ) {
        errors.push({
          code: 'dossier-scope-path-index-out-of-bounds',
          pointer: `${refPointer}/pathIndexes/${index}`,
          message: `path index ${pathIndex} is outside lane ${lane.id}`,
        });
      }
    });
  });
  return errors;
}

function boundedValueErrors(
  values: readonly string[],
  allowed: ReadonlySet<string>,
  pointer: string,
  duplicateCode: string,
  outOfScopeCode: string,
  label: string,
): WorkerDossierValidationError[] {
  const errors = duplicateErrors(values, duplicateCode, pointer, label);
  values.forEach((value, index) => {
    if (!allowed.has(value)) {
      errors.push({
        code: outOfScopeCode,
        pointer: `${pointer}/${index}`,
        message: `${label} ${value} is outside the assigned lane`,
      });
    }
  });
  return errors;
}

export function validateWorkerDossier(
  plan: ReviewPlanV1,
  expectedPlanDigest: string,
  input: unknown,
): WorkerDossierValidationError[] {
  let dossier: WorkerDossierV1;
  try {
    dossier = parseWorkerDossierV1(input);
  } catch (error) {
    return [
      {
        code: 'invalid-worker-dossier',
        pointer: '/',
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
  const errors: WorkerDossierValidationError[] = [];
  if (dossier.runId !== plan.runId) {
    errors.push({
      code: 'dossier-run-mismatch',
      pointer: '/runId',
      message: 'dossier run does not match the validated plan',
    });
  }
  if (dossier.planDigest !== expectedPlanDigest) {
    errors.push({
      code: 'dossier-plan-mismatch',
      pointer: '/planDigest',
      message: 'dossier plan digest does not match the validated plan',
    });
  }

  const lane = plan.lanes.find((candidate) => candidate.id === dossier.laneId);
  if (lane === undefined || !lane.delegated) {
    errors.push({
      code: 'dossier-lane-mismatch',
      pointer: '/laneId',
      message: 'dossier lane must identify a delegated plan lane',
    });
    return errors;
  }

  const allowedPaths = new Set(lane.paths);
  const allowedObligations = new Set([
    ...lane.primaryObligationIds,
    ...lane.seamObligationIds,
  ]);
  errors.push(
    ...boundedValueErrors(
      dossier.inspectedPaths,
      allowedPaths,
      '/inspectedPaths',
      'duplicate-inspected-path',
      'dossier-path-out-of-scope',
      'inspected path',
    ),
    ...boundedValueErrors(
      dossier.inspectedObligationIds,
      allowedObligations,
      '/inspectedObligationIds',
      'duplicate-inspected-obligation',
      'dossier-obligation-out-of-scope',
      'inspected obligation',
    ),
    ...boundedValueErrors(
      dossier.uncoveredObligationIds,
      new Set(lane.primaryObligationIds),
      '/uncoveredObligationIds',
      'duplicate-uncovered-obligation',
      'uncovered-obligation-out-of-scope',
      'uncovered obligation',
    ),
  );

  const commandIds = dossier.commands.map((command) => command.id);
  const evidenceIds = dossier.evidence.map((evidence) => evidence.id);
  const candidateFindingIds = dossier.candidateFindings.map(
    (finding) => finding.id,
  );
  errors.push(
    ...duplicateErrors(
      commandIds,
      'duplicate-command-id',
      '/commands',
      'command ID',
    ),
    ...duplicateErrors(
      evidenceIds,
      'duplicate-evidence-id',
      '/evidence',
      'evidence ID',
    ),
    ...duplicateErrors(
      candidateFindingIds,
      'duplicate-candidate-finding-id',
      '/candidateFindings',
      'candidate finding ID',
    ),
  );

  const commandIdSet = new Set(commandIds);
  const commandResultDigests = new Map(
    dossier.commands.map((command) => [
      command.id,
      hashCanonicalJson(command.result),
    ]),
  );
  const evidenceIdSet = new Set(evidenceIds);
  dossier.commands.forEach((command, index) => {
    errors.push(
      ...validateScopeRefs(
        command.scopeRefs,
        `/commands/${index}/scopeRefs`,
        lane,
      ),
    );
  });
  dossier.evidence.forEach((evidence, index) => {
    errors.push(
      ...validateScopeRefs(
        evidence.scopeRefs,
        `/evidence/${index}/scopeRefs`,
        lane,
      ),
    );
    if (evidence.kind === 'command') {
      if (!commandIdSet.has(evidence.commandId)) {
        errors.push({
          code: 'unknown-command-reference',
          pointer: `/evidence/${index}/commandId`,
          message: `command ${evidence.commandId} does not exist in the dossier`,
        });
      } else if (
        evidence.commandResultDigest !==
        commandResultDigests.get(evidence.commandId)
      ) {
        errors.push({
          code: 'command-result-digest-mismatch',
          pointer: `/evidence/${index}/commandResultDigest`,
          message:
            'command evidence digest does not match the canonical referenced command result',
        });
      }
    }
  });
  dossier.candidateFindings.forEach((finding, findingIndex) => {
    errors.push(
      ...duplicateErrors(
        finding.evidenceRefIds,
        'duplicate-finding-evidence-reference',
        `/candidateFindings/${findingIndex}/evidenceRefIds`,
        'evidence reference',
      ),
    );
    finding.evidenceRefIds.forEach((evidenceId, evidenceIndex) => {
      if (!evidenceIdSet.has(evidenceId)) {
        errors.push({
          code: 'unknown-evidence-reference',
          pointer: `/candidateFindings/${findingIndex}/evidenceRefIds/${evidenceIndex}`,
          message: `evidence ${evidenceId} does not exist in the dossier`,
        });
      }
    });
  });

  const inspectedPaths = new Set(dossier.inspectedPaths);
  const inspectedObligations = new Set(dossier.inspectedObligationIds);
  const uncoveredObligations = new Set(dossier.uncoveredObligationIds);
  const missingPath = lane.paths.some((path) => !inspectedPaths.has(path));
  const missingPrimaryObligation = lane.primaryObligationIds.some(
    (id) => !inspectedObligations.has(id),
  );
  const invalidObligationPartition = lane.primaryObligationIds.some(
    (id) => inspectedObligations.has(id) === uncoveredObligations.has(id),
  );

  if (dossier.outcome === 'complete' && lane.replay === 'accept-provenance') {
    if (lane.strategy === 'command') {
      const hasBoundCommandEvidence = dossier.evidence.some(
        (evidence) =>
          evidence.kind === 'command' &&
          commandResultDigests.get(evidence.commandId) ===
            evidence.commandResultDigest,
      );
      if (!hasBoundCommandEvidence) {
        errors.push({
          code: 'missing-command-provenance-evidence',
          pointer: '/evidence',
          message:
            'complete command dossiers accepted by provenance require canonical command-result evidence',
        });
      }
    } else if (
      lane.strategy === 'inventory' &&
      !dossier.evidence.some((evidence) => evidence.kind === 'inventory')
    ) {
      errors.push({
        code: 'missing-inventory-provenance-evidence',
        pointer: '/evidence',
        message:
          'complete inventory dossiers accepted by provenance require inventory evidence',
      });
    }
  }

  if (
    dossier.outcome === 'complete' &&
    (missingPath ||
      missingPrimaryObligation ||
      dossier.uncoveredObligationIds.length > 0)
  ) {
    errors.push({
      code: 'complete-dossier-incomplete',
      pointer: '/outcome',
      message:
        'complete dossiers must cover every lane path and primary obligation',
    });
  }
  if (dossier.outcome === 'partial') {
    if (dossier.uncertainty.length === 0) {
      errors.push({
        code: 'partial-dossier-without-uncertainty',
        pointer: '/uncertainty',
        message: 'partial dossiers must state bounded uncertainty explicitly',
      });
    }
    if (
      !missingPath &&
      !missingPrimaryObligation &&
      dossier.uncoveredObligationIds.length === 0
    ) {
      errors.push({
        code: 'partial-dossier-without-gap',
        pointer: '/outcome',
        message: 'partial dossiers must identify incomplete coverage',
      });
    }
    if (invalidObligationPartition) {
      errors.push({
        code: 'invalid-partial-obligation-partition',
        pointer: '/uncoveredObligationIds',
        message:
          'partial dossiers must partition primary obligations into inspected and uncovered sets',
      });
    }
  }
  return errors;
}
