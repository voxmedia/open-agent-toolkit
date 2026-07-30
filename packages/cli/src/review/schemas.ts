import type {
  ChangeMapV1,
  ContextBudgetTelemetry,
  PreparedReviewContextV1,
  PriorReviewEvidenceV1,
  ReviewBudgetV1,
  ReviewObligationV1,
  ReviewPreparationV1,
} from './types';

export class ReviewSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewSchemaError';
  }
}

type JsonObject = Record<string, unknown>;

function object(value: unknown, pointer: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ReviewSchemaError(`${pointer} must be an object`);
  }
  return value as JsonObject;
}

function keys(
  value: JsonObject,
  allowed: readonly string[],
  pointer: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new ReviewSchemaError(`${pointer} has unknown field ${unknown[0]}`);
  }
  for (const key of allowed) {
    if (!(key in value)) {
      throw new ReviewSchemaError(`${pointer} is missing ${key}`);
    }
  }
}

function string(value: unknown, pointer: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ReviewSchemaError(`${pointer} must be a non-empty string`);
  }
}

function nullableString(value: unknown, pointer: string): void {
  if (value !== null) string(value, pointer);
}

function safeNumber(value: unknown, pointer: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ReviewSchemaError(
      `${pointer} must be a non-negative safe integer`,
    );
  }
}

function array(value: unknown, pointer: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ReviewSchemaError(`${pointer} must be an array`);
  }
  return value;
}

function enumValue(
  value: unknown,
  values: readonly string[],
  pointer: string,
): void {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new ReviewSchemaError(`${pointer} has an invalid value`);
  }
}

function isoDate(value: unknown, pointer: string): void {
  string(value, pointer);
  if (Number.isNaN(Date.parse(value))) {
    throw new ReviewSchemaError(`${pointer} must be an ISO date`);
  }
}

function sha(value: unknown, pointer: string): void {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    throw new ReviewSchemaError(
      `${pointer} must be a lowercase 40-character SHA`,
    );
  }
}

function path(value: unknown, pointer: string): asserts value is string {
  string(value, pointer);
  if (
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new ReviewSchemaError(
      `${pointer} must be a normalized repository path`,
    );
  }
}

function stringArray(value: unknown, pointer: string): string[] {
  return array(value, pointer).map((entry, index) => {
    string(entry, `${pointer}/${index}`);
    return entry;
  });
}

function parseTelemetry(
  value: unknown,
  pointer: string,
): ContextBudgetTelemetry | null {
  if (value === null) return null;
  const item = object(value, pointer);
  keys(
    item,
    [
      'observedAt',
      'contextWindowTokens',
      'consumedTokens',
      'remainingTokens',
      'adapterId',
      'source',
    ],
    pointer,
  );
  isoDate(item['observedAt'], `${pointer}/observedAt`);
  safeNumber(item['contextWindowTokens'], `${pointer}/contextWindowTokens`);
  safeNumber(item['consumedTokens'], `${pointer}/consumedTokens`);
  safeNumber(item['remainingTokens'], `${pointer}/remainingTokens`);
  string(item['adapterId'], `${pointer}/adapterId`);
  string(item['source'], `${pointer}/source`);
  if (
    item['contextWindowTokens'] === 0 ||
    item['consumedTokens'] > item['contextWindowTokens'] ||
    item['remainingTokens'] !==
      item['contextWindowTokens'] - item['consumedTokens']
  ) {
    throw new ReviewSchemaError(`${pointer} has inconsistent token arithmetic`);
  }
  return item as unknown as ContextBudgetTelemetry;
}

function parseChangeMap(value: unknown, pointer: string): ChangeMapV1 {
  const map = object(value, pointer);
  keys(map, ['files', 'totals'], pointer);
  const seen = new Set<string>();
  array(map['files'], `${pointer}/files`).forEach((entry, index) => {
    const file = object(entry, `${pointer}/files/${index}`);
    const allowed = [
      'path',
      'status',
      'isBinary',
      'additions',
      'deletions',
      'generatedHint',
      'bookkeepingHint',
    ];
    if ('previousPath' in file) allowed.push('previousPath');
    keys(file, allowed, `${pointer}/files/${index}`);
    path(file['path'], `${pointer}/files/${index}/path`);
    if (seen.has(file['path'])) {
      throw new ReviewSchemaError(
        `${pointer}/files has duplicate path ${file['path']}`,
      );
    }
    seen.add(file['path']);
    enumValue(
      file['status'],
      ['added', 'modified', 'deleted', 'renamed'],
      `${pointer}/files/${index}/status`,
    );
    if (file['status'] === 'renamed') {
      path(file['previousPath'], `${pointer}/files/${index}/previousPath`);
    } else if ('previousPath' in file) {
      throw new ReviewSchemaError(
        `${pointer}/files/${index}/previousPath is only valid for renamed files`,
      );
    }
    if (
      typeof file['isBinary'] !== 'boolean' ||
      typeof file['generatedHint'] !== 'boolean' ||
      typeof file['bookkeepingHint'] !== 'boolean'
    ) {
      throw new ReviewSchemaError(
        `${pointer}/files/${index} has invalid boolean fields`,
      );
    }
    for (const field of ['additions', 'deletions'] as const) {
      if (file[field] !== null)
        safeNumber(file[field], `${pointer}/files/${index}/${field}`);
    }
  });
  const totals = object(map['totals'], `${pointer}/totals`);
  keys(
    totals,
    [
      'files',
      'additions',
      'deletions',
      'binaryFiles',
      'numstatChangedLines',
      'numstatTokenDenialEstimate',
      'patchBytes',
      'patchByteLowerBound',
      'patchEstimateState',
      'patchCountingSkippedReason',
      'estimatedPatchTokens',
    ],
    `${pointer}/totals`,
  );
  for (const field of [
    'files',
    'additions',
    'deletions',
    'binaryFiles',
    'numstatChangedLines',
    'numstatTokenDenialEstimate',
  ] as const) {
    safeNumber(totals[field], `${pointer}/totals/${field}`);
  }
  for (const field of [
    'patchBytes',
    'patchByteLowerBound',
    'estimatedPatchTokens',
  ] as const) {
    if (totals[field] !== null)
      safeNumber(totals[field], `${pointer}/totals/${field}`);
  }
  enumValue(
    totals['patchEstimateState'],
    ['exact', 'coarse-denied', 'lower-bound'],
    `${pointer}/totals/patchEstimateState`,
  );
  if (totals['patchCountingSkippedReason'] !== null) {
    enumValue(
      totals['patchCountingSkippedReason'],
      ['missing-context-telemetry', 'numstat-denial'],
      `${pointer}/totals/patchCountingSkippedReason`,
    );
  }
  return map as unknown as ChangeMapV1;
}

function parseObligations(
  value: unknown,
  pointer: string,
): ReviewObligationV1[] {
  const seen = new Set<string>();
  return array(value, pointer).map((entry, index) => {
    const item = object(entry, `${pointer}/${index}`);
    keys(
      item,
      ['id', 'kind', 'source', 'summary', 'expectedPaths', 'expectedChecks'],
      `${pointer}/${index}`,
    );
    string(item['id'], `${pointer}/${index}/id`);
    if (seen.has(item['id'])) {
      throw new ReviewSchemaError(
        `${pointer} has duplicate obligation ${item['id']}`,
      );
    }
    seen.add(item['id']);
    enumValue(
      item['kind'],
      ['requirement', 'task', 'deferred-finding', 'deviation'],
      `${pointer}/${index}/kind`,
    );
    string(item['source'], `${pointer}/${index}/source`);
    string(item['summary'], `${pointer}/${index}/summary`);
    const paths = stringArray(
      item['expectedPaths'],
      `${pointer}/${index}/expectedPaths`,
    );
    paths.forEach((entryPath, pathIndex) =>
      path(entryPath, `${pointer}/${index}/expectedPaths/${pathIndex}`),
    );
    stringArray(item['expectedChecks'], `${pointer}/${index}/expectedChecks`);
    return item as unknown as ReviewObligationV1;
  });
}

function parsePriorEvidence(
  value: unknown,
  pointer: string,
): PriorReviewEvidenceV1[] {
  return array(value, pointer).map((entry, index) => {
    const at = `${pointer}/${index}`;
    const item = object(entry, at);
    keys(
      item,
      [
        'artifactRef',
        'lineage',
        'reviewedRange',
        'riskHints',
        'verificationHistory',
        'deferredFindingIds',
      ],
      at,
    );
    string(item['artifactRef'], `${at}/artifactRef`);
    const lineage = object(item['lineage'], `${at}/lineage`);
    keys(lineage, ['project', 'gateId', 'target'], `${at}/lineage`);
    string(lineage['project'], `${at}/lineage/project`);
    nullableString(lineage['gateId'], `${at}/lineage/gateId`);
    string(lineage['target'], `${at}/lineage/target`);
    const range = object(item['reviewedRange'], `${at}/reviewedRange`);
    keys(range, ['baseSha', 'headSha'], `${at}/reviewedRange`);
    sha(range['baseSha'], `${at}/reviewedRange/baseSha`);
    sha(range['headSha'], `${at}/reviewedRange/headSha`);
    stringArray(item['riskHints'], `${at}/riskHints`);
    array(item['verificationHistory'], `${at}/verificationHistory`).forEach(
      (history, historyIndex) => {
        const record = object(
          history,
          `${at}/verificationHistory/${historyIndex}`,
        );
        keys(
          record,
          ['check', 'scopePaths', 'result', 'provenance'],
          `${at}/verificationHistory/${historyIndex}`,
        );
        string(
          record['check'],
          `${at}/verificationHistory/${historyIndex}/check`,
        );
        stringArray(
          record['scopePaths'],
          `${at}/verificationHistory/${historyIndex}/scopePaths`,
        ).forEach((entryPath, pathIndex) =>
          path(
            entryPath,
            `${at}/verificationHistory/${historyIndex}/scopePaths/${pathIndex}`,
          ),
        );
        string(
          record['result'],
          `${at}/verificationHistory/${historyIndex}/result`,
        );
        string(
          record['provenance'],
          `${at}/verificationHistory/${historyIndex}/provenance`,
        );
      },
    );
    stringArray(item['deferredFindingIds'], `${at}/deferredFindingIds`);
    return item as unknown as PriorReviewEvidenceV1;
  });
}

function parseTimeBudget(
  value: unknown,
  pointer: string,
): ReviewBudgetV1['time'] {
  if (value === null) return null;
  const budget = object(value, pointer);
  keys(budget, ['totalMs', 'source', 'deadlineMs'], pointer);
  safeNumber(budget['totalMs'], `${pointer}/totalMs`);
  string(budget['source'], `${pointer}/source`);
  safeNumber(budget['deadlineMs'], `${pointer}/deadlineMs`);
  return budget as unknown as ReviewBudgetV1['time'];
}

const PREPARATION_KEYS = [
  'schemaVersion',
  'runId',
  'mode',
  'project',
  'scope',
  'invocation',
  'sink',
  'correlation',
  'range',
  'changeMap',
  'obligations',
  'priorEvidence',
  'prepareContextTelemetry',
  'prepareTelemetryEvidenceDigest',
  'preparationDigest',
  'createdAt',
  'expiresAt',
] as const;

function parsePreparationFields(value: JsonObject, pointer: string): void {
  if (value['schemaVersion'] !== 1)
    throw new ReviewSchemaError(`${pointer}/schemaVersion must be 1`);
  string(value['runId'], `${pointer}/runId`);
  if (value['mode'] !== 'enforce')
    throw new ReviewSchemaError(`${pointer}/mode must be enforce`);
  string(value['project'], `${pointer}/project`);
  string(value['scope'], `${pointer}/scope`);
  enumValue(
    value['invocation'],
    ['manual', 'auto', 'gate'],
    `${pointer}/invocation`,
  );
  enumValue(value['sink'], ['artifact', 'structured'], `${pointer}/sink`);
  const correlation = object(value['correlation'], `${pointer}/correlation`);
  keys(correlation, ['gateRunId', 'launchAttemptId'], `${pointer}/correlation`);
  nullableString(correlation['gateRunId'], `${pointer}/correlation/gateRunId`);
  string(
    correlation['launchAttemptId'],
    `${pointer}/correlation/launchAttemptId`,
  );
  if (
    (value['invocation'] === 'gate') !==
    (correlation['gateRunId'] !== null)
  ) {
    throw new ReviewSchemaError(
      `${pointer}/correlation does not match invocation`,
    );
  }
  const range = object(value['range'], `${pointer}/range`);
  keys(range, ['baseSha', 'headSha'], `${pointer}/range`);
  sha(range['baseSha'], `${pointer}/range/baseSha`);
  sha(range['headSha'], `${pointer}/range/headSha`);
  parseChangeMap(value['changeMap'], `${pointer}/changeMap`);
  parseObligations(value['obligations'], `${pointer}/obligations`);
  parsePriorEvidence(value['priorEvidence'], `${pointer}/priorEvidence`);
  parseTelemetry(
    value['prepareContextTelemetry'],
    `${pointer}/prepareContextTelemetry`,
  );
  string(
    value['prepareTelemetryEvidenceDigest'],
    `${pointer}/prepareTelemetryEvidenceDigest`,
  );
  string(value['preparationDigest'], `${pointer}/preparationDigest`);
  isoDate(value['createdAt'], `${pointer}/createdAt`);
  isoDate(value['expiresAt'], `${pointer}/expiresAt`);
}

export function parseReviewPreparationV1(value: unknown): ReviewPreparationV1 {
  const preparation = object(value, '$');
  keys(preparation, [...PREPARATION_KEYS, 'timeBudget'], '$');
  parsePreparationFields(preparation, '$');
  parseTimeBudget(preparation['timeBudget'], '$/timeBudget');
  return preparation as unknown as ReviewPreparationV1;
}

export function parsePreparedReviewContextV1(
  value: unknown,
): PreparedReviewContextV1 {
  const context = object(value, '$');
  keys(
    context,
    [
      ...PREPARATION_KEYS,
      'budget',
      'postArtifactTelemetryEvidenceDigest',
      'artifactCheckpointAt',
      'contextDigest',
    ],
    '$',
  );
  parsePreparationFields(context, '$');
  const budget = object(context['budget'], '$/budget');
  keys(budget, ['time', 'context'], '$/budget');
  parseTimeBudget(budget['time'], '$/budget/time');
  if (budget['context'] !== null) {
    const contextBudget = object(budget['context'], '$/budget/context');
    keys(
      contextBudget,
      [
        'totalTokens',
        'consumedAtPlanTokens',
        'outputReserveTokens',
        'reconciliationReserveTokens',
        'evidenceBudgetTokens',
        'source',
      ],
      '$/budget/context',
    );
    for (const field of [
      'totalTokens',
      'consumedAtPlanTokens',
      'outputReserveTokens',
      'reconciliationReserveTokens',
      'evidenceBudgetTokens',
    ] as const) {
      safeNumber(contextBudget[field], `$/budget/context/${field}`);
    }
    string(contextBudget['source'], '$/budget/context/source');
  }
  string(
    context['postArtifactTelemetryEvidenceDigest'],
    '$/postArtifactTelemetryEvidenceDigest',
  );
  isoDate(context['artifactCheckpointAt'], '$/artifactCheckpointAt');
  string(context['contextDigest'], '$/contextDigest');
  return context as unknown as PreparedReviewContextV1;
}
