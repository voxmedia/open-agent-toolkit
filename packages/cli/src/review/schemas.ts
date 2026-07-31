import { isAbsolute } from 'node:path';

import type {
  ChangeMapV1,
  ContextBudgetTelemetry,
  HostTelemetryEvidenceV1,
  PreparedReviewContextV1,
  PlanValidationReceiptV1,
  PrepareReviewContextInputV1,
  PriorReviewEvidenceV1,
  ReviewBudgetV1,
  ReviewCommandInvocationV1,
  ReviewObligationV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewerTerminalV1,
} from './types';

export class ReviewSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewSchemaError';
  }
}

export function parseReviewCommandInvocationV1(
  value: unknown,
): ReviewCommandInvocationV1 {
  const invocation = object(value, '$');
  keys(invocation, ['executable', 'argv', 'stdin'], '$');
  string(invocation['executable'], '$/executable');
  const argv = stringArray(invocation['argv'], '$/argv');
  enumValue(invocation['stdin'], ['none', 'review-plan-json'], '$/stdin');
  return {
    executable: invocation['executable'] as string,
    argv,
    stdin: invocation['stdin'] as ReviewCommandInvocationV1['stdin'],
  };
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

export function parseHostTelemetryEvidenceV1(
  value: unknown,
  expectedRunId?: string,
): HostTelemetryEvidenceV1 {
  const evidence = object(value, '$');
  keys(
    evidence,
    [
      'schemaVersion',
      'validationRunId',
      'phase',
      'adapterId',
      'requestStartedAt',
      'requestCompletedAt',
      'observation',
      'disposition',
      'rejectionReason',
    ],
    '$',
  );
  if (evidence['schemaVersion'] !== 1) {
    throw new ReviewSchemaError('$/schemaVersion must equal 1');
  }
  string(evidence['validationRunId'], '$/validationRunId');
  if (
    expectedRunId !== undefined &&
    evidence['validationRunId'] !== expectedRunId
  ) {
    throw new ReviewSchemaError('$/validationRunId does not match state');
  }
  enumValue(evidence['phase'], ['pre_artifact', 'post_artifact'], '$/phase');
  nullableString(evidence['adapterId'], '$/adapterId');
  isoDate(evidence['requestStartedAt'], '$/requestStartedAt');
  isoDate(evidence['requestCompletedAt'], '$/requestCompletedAt');
  for (const key of ['requestStartedAt', 'requestCompletedAt'] as const) {
    const timestamp = evidence[key] as string;
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp) ||
      new Date(timestamp).toISOString() !== timestamp
    ) {
      throw new ReviewSchemaError(`$/${key} must be an exact UTC timestamp`);
    }
  }
  if (
    Date.parse(evidence['requestCompletedAt'] as string) <
    Date.parse(evidence['requestStartedAt'] as string)
  ) {
    throw new ReviewSchemaError(
      '$/requestCompletedAt precedes requestStartedAt',
    );
  }
  const observation = parseTelemetry(evidence['observation'], '$/observation');
  enumValue(
    evidence['disposition'],
    ['accepted', 'missing', 'invalid'],
    '$/disposition',
  );
  nullableString(evidence['rejectionReason'], '$/rejectionReason');
  const disposition = evidence['disposition'];
  if (disposition === 'accepted') {
    if (
      observation === null ||
      evidence['adapterId'] === null ||
      evidence['rejectionReason'] !== null ||
      observation.adapterId !== evidence['adapterId'] ||
      Date.parse(observation.observedAt) <
        Date.parse(evidence['requestStartedAt'] as string) ||
      Date.parse(observation.observedAt) >
        Date.parse(evidence['requestCompletedAt'] as string)
    ) {
      throw new ReviewSchemaError('$/accepted telemetry is incoherent');
    }
  } else if (disposition === 'missing') {
    if (observation !== null || evidence['rejectionReason'] !== null) {
      throw new ReviewSchemaError('$/missing telemetry is incoherent');
    }
  } else {
    if (
      observation !== null ||
      evidence['adapterId'] === null ||
      typeof evidence['rejectionReason'] !== 'string' ||
      ![
        'adapter-error',
        'stale-observation',
        'future-observation',
        'non-monotonic-observation',
        'wrong-adapter',
        'inconsistent-token-arithmetic',
        'missing-source',
      ].includes(evidence['rejectionReason'])
    ) {
      throw new ReviewSchemaError('$/invalid telemetry is incoherent');
    }
  }
  return evidence as unknown as HostTelemetryEvidenceV1;
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

function parsePreparationSource(value: unknown, pointer: string) {
  if (value === null) return null;
  const source = object(value, pointer);
  keys(source, ['source', 'path'], pointer);
  string(source['source'], `${pointer}/source`);
  path(source['path'], `${pointer}/path`);
  return source as { source: string; path: string };
}

export function parsePrepareReviewContextInputV1(
  value: unknown,
): PrepareReviewContextInputV1 {
  const input = object(value, '$');
  keys(
    input,
    [
      'schemaVersion',
      'repoRoot',
      'project',
      'scope',
      'workflowMode',
      'range',
      'sink',
      'invocation',
      'budget',
      'gateRunId',
      'launchAttemptId',
      'obligationSources',
      'priorEvidenceCandidates',
      'target',
    ],
    '$',
  );
  if (input['schemaVersion'] !== 1) {
    throw new ReviewSchemaError('$/schemaVersion must equal 1');
  }
  string(input['repoRoot'], '$/repoRoot');
  if (!isAbsolute(input['repoRoot'])) {
    throw new ReviewSchemaError('$/repoRoot must be absolute');
  }
  string(input['project'], '$/project');
  string(input['scope'], '$/scope');
  if (!/^(?:p\d{2}(?:-t\d{2})?|final)$/.test(input['scope'])) {
    throw new ReviewSchemaError('$/scope has an invalid value');
  }
  enumValue(
    input['workflowMode'],
    ['spec-driven', 'quick', 'import'],
    '$/workflowMode',
  );
  const range = object(input['range'], '$/range');
  keys(range, ['baseSha', 'headSha'], '$/range');
  sha(range['baseSha'], '$/range/baseSha');
  sha(range['headSha'], '$/range/headSha');
  if (range['baseSha'] === range['headSha']) {
    throw new ReviewSchemaError('$/range must contain distinct SHAs');
  }
  enumValue(input['sink'], ['artifact', 'structured'], '$/sink');
  enumValue(input['invocation'], ['manual', 'auto', 'gate'], '$/invocation');
  if (input['budget'] !== null) {
    const budget = object(input['budget'], '$/budget');
    keys(budget, ['totalMs', 'source'], '$/budget');
    safeNumber(budget['totalMs'], '$/budget/totalMs');
    string(budget['source'], '$/budget/source');
  }
  nullableString(input['gateRunId'], '$/gateRunId');
  nullableString(input['launchAttemptId'], '$/launchAttemptId');
  const isGate = input['invocation'] === 'gate';
  if (
    (isGate &&
      (input['gateRunId'] === null || input['launchAttemptId'] === null)) ||
    (!isGate &&
      (input['gateRunId'] !== null || input['launchAttemptId'] !== null))
  ) {
    throw new ReviewSchemaError('$/gate correlation does not match invocation');
  }
  const sources = object(input['obligationSources'], '$/obligationSources');
  keys(sources, ['plan', 'spec', 'implementation'], '$/obligationSources');
  parsePreparationSource(sources['plan'], '$/obligationSources/plan');
  if (sources['plan'] === null) {
    throw new ReviewSchemaError('$/obligationSources/plan must be an object');
  }
  parsePreparationSource(sources['spec'], '$/obligationSources/spec');
  parsePreparationSource(
    sources['implementation'],
    '$/obligationSources/implementation',
  );
  parsePriorEvidence(
    input['priorEvidenceCandidates'],
    '$/priorEvidenceCandidates',
  );
  string(input['target'], '$/target');
  return input as unknown as PrepareReviewContextInputV1;
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

function parseReviewLane(value: unknown, pointer: string): void {
  const lane = object(value, pointer);
  keys(
    lane,
    [
      'id',
      'paths',
      'primaryObligationIds',
      'seamObligationIds',
      'risk',
      'evidenceClass',
      'strategy',
      'checks',
      'delegated',
      'independenceRationale',
      'substantial',
      'substantialityRationale',
      'deadlineMs',
      'dossier',
      'replay',
      'primaryContingency',
    ],
    pointer,
  );
  string(lane['id'], `${pointer}/id`);
  stringArray(lane['paths'], `${pointer}/paths`).forEach((entry, index) =>
    path(entry, `${pointer}/paths/${index}`),
  );
  stringArray(lane['primaryObligationIds'], `${pointer}/primaryObligationIds`);
  stringArray(lane['seamObligationIds'], `${pointer}/seamObligationIds`);
  enumValue(
    lane['risk'],
    ['low', 'medium', 'high', 'consequential'],
    `${pointer}/risk`,
  );
  enumValue(
    lane['evidenceClass'],
    ['deterministic', 'semantic', 'mixed'],
    `${pointer}/evidenceClass`,
  );
  enumValue(
    lane['strategy'],
    ['path-diff', 'full-file', 'command', 'inventory'],
    `${pointer}/strategy`,
  );
  stringArray(lane['checks'], `${pointer}/checks`);
  if (
    typeof lane['delegated'] !== 'boolean' ||
    typeof lane['substantial'] !== 'boolean'
  ) {
    throw new ReviewSchemaError(`${pointer} has invalid delegation booleans`);
  }
  nullableString(
    lane['independenceRationale'],
    `${pointer}/independenceRationale`,
  );
  nullableString(
    lane['substantialityRationale'],
    `${pointer}/substantialityRationale`,
  );
  if (lane['deadlineMs'] !== null)
    safeNumber(lane['deadlineMs'], `${pointer}/deadlineMs`);
  const dossier = object(lane['dossier'], `${pointer}/dossier`);
  keys(dossier, ['contractVersion', 'partialAllowed'], `${pointer}/dossier`);
  if (dossier['contractVersion'] !== 1 || dossier['partialAllowed'] !== true) {
    throw new ReviewSchemaError(
      `${pointer}/dossier has invalid contract fields`,
    );
  }
  enumValue(
    lane['replay'],
    ['accept-provenance', 'sample', 'direct-verify'],
    `${pointer}/replay`,
  );
  const contingency = object(
    lane['primaryContingency'],
    `${pointer}/primaryContingency`,
  );
  keys(
    contingency,
    ['allowed', 'paths', 'obligationIds'],
    `${pointer}/primaryContingency`,
  );
  if (typeof contingency['allowed'] !== 'boolean') {
    throw new ReviewSchemaError(
      `${pointer}/primaryContingency/allowed must be boolean`,
    );
  }
  stringArray(
    contingency['paths'],
    `${pointer}/primaryContingency/paths`,
  ).forEach((entry, index) =>
    path(entry, `${pointer}/primaryContingency/paths/${index}`),
  );
  stringArray(
    contingency['obligationIds'],
    `${pointer}/primaryContingency/obligationIds`,
  );
}

function parseClassification(value: unknown, pointer: string): void {
  const classification = object(value, pointer);
  keys(
    classification,
    [
      'id',
      'kind',
      'reason',
      'paths',
      'disposition',
      'strategy',
      'checks',
      'exclusionAuthority',
    ],
    pointer,
  );
  string(classification['id'], `${pointer}/id`);
  enumValue(
    classification['kind'],
    ['generated', 'bookkeeping', 'excluded'],
    `${pointer}/kind`,
  );
  string(classification['reason'], `${pointer}/reason`);
  stringArray(classification['paths'], `${pointer}/paths`).forEach(
    (entry, index) => path(entry, `${pointer}/paths/${index}`),
  );
  enumValue(
    classification['disposition'],
    ['inspect', 'justified-exclusion'],
    `${pointer}/disposition`,
  );
  enumValue(
    classification['strategy'],
    ['path-diff', 'inventory', 'manifest-check', 'none'],
    `${pointer}/strategy`,
  );
  stringArray(classification['checks'], `${pointer}/checks`);
  nullableString(
    classification['exclusionAuthority'],
    `${pointer}/exclusionAuthority`,
  );
}

export function parseReviewPlanV1(value: unknown): ReviewPlanV1 {
  const plan = object(value, '$');
  keys(
    plan,
    [
      'schemaVersion',
      'runId',
      'contextDigest',
      'strategy',
      'lanes',
      'classifications',
      'crossLaneInvariants',
      'delegationEconomics',
      'verificationBoundary',
      'wholeDiff',
      'timeAllocation',
    ],
    '$',
  );
  if (plan['schemaVersion'] !== 1)
    throw new ReviewSchemaError('$/schemaVersion must be 1');
  string(plan['runId'], '$/runId');
  string(plan['contextDigest'], '$/contextDigest');
  enumValue(
    plan['strategy'],
    ['whole-diff-inline', 'selective-inline', 'delegated'],
    '$/strategy',
  );
  array(plan['lanes'], '$/lanes').forEach((lane, index) =>
    parseReviewLane(lane, `$/lanes/${index}`),
  );
  array(plan['classifications'], '$/classifications').forEach(
    (classification, index) =>
      parseClassification(classification, `$/classifications/${index}`),
  );
  stringArray(plan['crossLaneInvariants'], '$/crossLaneInvariants');
  const economics = object(
    plan['delegationEconomics'],
    '$/delegationEconomics',
  );
  keys(
    economics,
    [
      'independentLaneIds',
      'nonReplayedLaneIds',
      'expectedSavings',
      'coordinationCosts',
      'decisionRationale',
      'decision',
    ],
    '$/delegationEconomics',
  );
  stringArray(
    economics['independentLaneIds'],
    '$/delegationEconomics/independentLaneIds',
  );
  stringArray(
    economics['nonReplayedLaneIds'],
    '$/delegationEconomics/nonReplayedLaneIds',
  );
  stringArray(
    economics['expectedSavings'],
    '$/delegationEconomics/expectedSavings',
  );
  stringArray(
    economics['coordinationCosts'],
    '$/delegationEconomics/coordinationCosts',
  );
  string(
    economics['decisionRationale'],
    '$/delegationEconomics/decisionRationale',
  );
  enumValue(
    economics['decision'],
    ['inline', 'delegate'],
    '$/delegationEconomics/decision',
  );
  const boundary = object(
    plan['verificationBoundary'],
    '$/verificationBoundary',
  );
  keys(
    boundary,
    ['requiredClaims', 'positiveCoverage', 'deterministicAcceptance'],
    '$/verificationBoundary',
  );
  array(
    boundary['requiredClaims'],
    '$/verificationBoundary/requiredClaims',
  ).forEach((claim, index) => {
    const item = object(
      claim,
      `$/verificationBoundary/requiredClaims/${index}`,
    );
    keys(
      item,
      ['kind', 'mode'],
      `$/verificationBoundary/requiredClaims/${index}`,
    );
    enumValue(
      item['kind'],
      [
        'promoted-finding',
        'consequential-absence',
        'worker-conflict',
        'cross-lane-gap',
      ],
      `$/verificationBoundary/requiredClaims/${index}/kind`,
    );
    if (item['mode'] !== 'direct')
      throw new ReviewSchemaError('required claim mode must be direct');
  });
  const positive = object(
    boundary['positiveCoverage'],
    '$/verificationBoundary/positiveCoverage',
  );
  keys(
    positive,
    ['mode', 'laneIds', 'rationale'],
    '$/verificationBoundary/positiveCoverage',
  );
  if (positive['mode'] !== 'sample')
    throw new ReviewSchemaError('positive coverage mode must be sample');
  stringArray(
    positive['laneIds'],
    '$/verificationBoundary/positiveCoverage/laneIds',
  );
  string(
    positive['rationale'],
    '$/verificationBoundary/positiveCoverage/rationale',
  );
  const deterministic = object(
    boundary['deterministicAcceptance'],
    '$/verificationBoundary/deterministicAcceptance',
  );
  keys(
    deterministic,
    ['mode', 'requiredFields'],
    '$/verificationBoundary/deterministicAcceptance',
  );
  if (deterministic['mode'] !== 'provenance') {
    throw new ReviewSchemaError(
      'deterministic acceptance mode must be provenance',
    );
  }
  const requiredFields = stringArray(
    deterministic['requiredFields'],
    '$/verificationBoundary/deterministicAcceptance/requiredFields',
  );
  const expectedFields = [
    'command',
    'cwd',
    'scopeRefs',
    'provenance',
    'result',
  ];
  if (
    requiredFields.length !== expectedFields.length ||
    expectedFields.some((field) => !requiredFields.includes(field))
  ) {
    throw new ReviewSchemaError(
      'deterministic acceptance fields are incomplete',
    );
  }
  const wholeDiff = object(plan['wholeDiff'], '$/wholeDiff');
  keys(
    wholeDiff,
    ['allowed', 'estimatedTokens', 'evidenceBudgetTokens', 'reason'],
    '$/wholeDiff',
  );
  if (typeof wholeDiff['allowed'] !== 'boolean')
    throw new ReviewSchemaError('$/wholeDiff/allowed must be boolean');
  if (wholeDiff['estimatedTokens'] !== null)
    safeNumber(wholeDiff['estimatedTokens'], '$/wholeDiff/estimatedTokens');
  if (wholeDiff['evidenceBudgetTokens'] !== null)
    safeNumber(
      wholeDiff['evidenceBudgetTokens'],
      '$/wholeDiff/evidenceBudgetTokens',
    );
  string(wholeDiff['reason'], '$/wholeDiff/reason');
  if (plan['timeAllocation'] !== null) {
    const allocation = object(plan['timeAllocation'], '$/timeAllocation');
    keys(
      allocation,
      [
        'planningDeadlineMs',
        'evidenceDeadlineMs',
        'reconciliationDeadlineMs',
        'outputDeadlineMs',
        'outputReserveMs',
        'reconciliationReserveMs',
      ],
      '$/timeAllocation',
    );
    Object.entries(allocation).forEach(([field, entry]) =>
      safeNumber(entry, `$/timeAllocation/${field}`),
    );
  }
  return plan as unknown as ReviewPlanV1;
}

export function parsePlanValidationReceiptV1(
  value: unknown,
): PlanValidationReceiptV1 {
  const receipt = object(value, '$');
  keys(
    receipt,
    [
      'token',
      'validationRunId',
      'gateRunId',
      'launchAttemptId',
      'acceptedHandleDigest',
      'contractVersion',
      'contextDigest',
      'planDigest',
      'assignmentDigest',
      'validatedAt',
      'expiresAt',
    ],
    '$',
  );
  for (const field of [
    'token',
    'validationRunId',
    'launchAttemptId',
    'acceptedHandleDigest',
    'contextDigest',
    'planDigest',
    'assignmentDigest',
  ] as const) {
    string(receipt[field], `$/${field}`);
  }
  nullableString(receipt['gateRunId'], '$/gateRunId');
  if (receipt['contractVersion'] !== 1)
    throw new ReviewSchemaError('$/contractVersion must be 1');
  isoDate(receipt['validatedAt'], '$/validatedAt');
  isoDate(receipt['expiresAt'], '$/expiresAt');
  return receipt as unknown as PlanValidationReceiptV1;
}

function parseScopeRef(value: unknown, pointer: string): void {
  const scopeRef = object(value, pointer);
  keys(scopeRef, ['bucket', 'bucketId', 'pathIndexes'], pointer);
  enumValue(
    scopeRef['bucket'],
    ['lane', 'classification'],
    `${pointer}/bucket`,
  );
  string(scopeRef['bucketId'], `${pointer}/bucketId`);
  array(scopeRef['pathIndexes'], `${pointer}/pathIndexes`).forEach(
    (index, itemIndex) =>
      safeNumber(index, `${pointer}/pathIndexes/${itemIndex}`),
  );
}

function parseCommandEvidence(value: unknown, pointer: string): void {
  const command = object(value, pointer);
  keys(
    command,
    ['id', 'command', 'cwd', 'scopeRefs', 'provenance', 'result'],
    pointer,
  );
  string(command['id'], `${pointer}/id`);
  string(command['command'], `${pointer}/command`);
  string(command['cwd'], `${pointer}/cwd`);
  array(command['scopeRefs'], `${pointer}/scopeRefs`).forEach(
    (scopeRef, index) =>
      parseScopeRef(scopeRef, `${pointer}/scopeRefs/${index}`),
  );

  const provenance = object(command['provenance'], `${pointer}/provenance`);
  keys(
    provenance,
    ['runner', 'invocationDigest', 'capturedAt'],
    `${pointer}/provenance`,
  );
  string(provenance['runner'], `${pointer}/provenance/runner`);
  string(
    provenance['invocationDigest'],
    `${pointer}/provenance/invocationDigest`,
  );
  isoDate(provenance['capturedAt'], `${pointer}/provenance/capturedAt`);

  const result = object(command['result'], `${pointer}/result`);
  if (result['status'] === 'completed') {
    keys(result, ['status', 'exitCode', 'outputDigest'], `${pointer}/result`);
    safeNumber(result['exitCode'], `${pointer}/result/exitCode`);
  } else if (result['status'] === 'interrupted') {
    keys(result, ['status', 'signal', 'outputDigest'], `${pointer}/result`);
    string(result['signal'], `${pointer}/result/signal`);
  } else {
    throw new ReviewSchemaError(
      `${pointer}/result/status has an invalid value`,
    );
  }
  string(result['outputDigest'], `${pointer}/result/outputDigest`);
}

function parseEvidenceRef(value: unknown, pointer: string): void {
  const evidence = object(value, pointer);
  const commonKeys = [
    'id',
    'kind',
    'locator',
    'scopeRefs',
    'provenance',
    'digest',
    'commandId',
    'commandResultDigest',
  ];
  keys(evidence, commonKeys, pointer);
  string(evidence['id'], `${pointer}/id`);
  string(evidence['locator'], `${pointer}/locator`);
  array(evidence['scopeRefs'], `${pointer}/scopeRefs`).forEach(
    (scopeRef, index) =>
      parseScopeRef(scopeRef, `${pointer}/scopeRefs/${index}`),
  );
  string(evidence['provenance'], `${pointer}/provenance`);
  string(evidence['digest'], `${pointer}/digest`);

  if (evidence['kind'] === 'command') {
    string(evidence['commandId'], `${pointer}/commandId`);
    string(evidence['commandResultDigest'], `${pointer}/commandResultDigest`);
  } else {
    enumValue(
      evidence['kind'],
      ['source', 'diff', 'artifact', 'inventory'],
      `${pointer}/kind`,
    );
    if (
      evidence['commandId'] !== null ||
      evidence['commandResultDigest'] !== null
    ) {
      throw new ReviewSchemaError(
        `${pointer} non-command evidence must use null command fields`,
      );
    }
  }
}

function parsePrimaryCompletion(value: unknown, pointer: string): void {
  const completion = object(value, pointer);
  keys(
    completion,
    [
      'outcome',
      'completedPathIndexes',
      'completedObligationIds',
      'commands',
      'evidenceRefIds',
    ],
    pointer,
  );
  enumValue(
    completion['outcome'],
    ['not-needed', 'not-attempted', 'complete', 'partial', 'not-permitted'],
    `${pointer}/outcome`,
  );
  array(
    completion['completedPathIndexes'],
    `${pointer}/completedPathIndexes`,
  ).forEach((index, itemIndex) =>
    safeNumber(index, `${pointer}/completedPathIndexes/${itemIndex}`),
  );
  stringArray(
    completion['completedObligationIds'],
    `${pointer}/completedObligationIds`,
  );
  array(completion['commands'], `${pointer}/commands`).forEach(
    (command, index) =>
      parseCommandEvidence(command, `${pointer}/commands/${index}`),
  );
  stringArray(completion['evidenceRefIds'], `${pointer}/evidenceRefIds`);
}

function parseAccountingLane(value: unknown, pointer: string): void {
  const lane = object(value, pointer);
  keys(
    lane,
    [
      'id',
      'paths',
      'primaryObligationIds',
      'seamObligationIds',
      'workerOutcome',
      'dossierDigest',
      'inspectionCoverage',
      'uninspectedPathIndexes',
      'uncoveredObligationIds',
      'commands',
      'evidenceRefIds',
      'uncertainty',
      'primaryCompletion',
    ],
    pointer,
  );
  string(lane['id'], `${pointer}/id`);
  stringArray(lane['paths'], `${pointer}/paths`).forEach((entry, index) =>
    path(entry, `${pointer}/paths/${index}`),
  );
  stringArray(lane['primaryObligationIds'], `${pointer}/primaryObligationIds`);
  stringArray(lane['seamObligationIds'], `${pointer}/seamObligationIds`);
  enumValue(
    lane['workerOutcome'],
    ['not-delegated', 'complete', 'partial', 'uncovered'],
    `${pointer}/workerOutcome`,
  );
  nullableString(lane['dossierDigest'], `${pointer}/dossierDigest`);
  enumValue(
    lane['inspectionCoverage'],
    ['all', 'partial', 'none'],
    `${pointer}/inspectionCoverage`,
  );
  array(
    lane['uninspectedPathIndexes'],
    `${pointer}/uninspectedPathIndexes`,
  ).forEach((index, itemIndex) =>
    safeNumber(index, `${pointer}/uninspectedPathIndexes/${itemIndex}`),
  );
  stringArray(
    lane['uncoveredObligationIds'],
    `${pointer}/uncoveredObligationIds`,
  );
  array(lane['commands'], `${pointer}/commands`).forEach((command, index) =>
    parseCommandEvidence(command, `${pointer}/commands/${index}`),
  );
  stringArray(lane['evidenceRefIds'], `${pointer}/evidenceRefIds`);
  stringArray(lane['uncertainty'], `${pointer}/uncertainty`);
  parsePrimaryCompletion(
    lane['primaryCompletion'],
    `${pointer}/primaryCompletion`,
  );
}

function parseAccountingClassification(value: unknown, pointer: string): void {
  const classification = object(value, pointer);
  keys(
    classification,
    [
      'id',
      'kind',
      'reason',
      'paths',
      'planDisposition',
      'strategy',
      'plannedChecks',
      'exclusionAuthority',
      'outcome',
      'inspectionCoverage',
      'uninspectedPathIndexes',
      'commands',
      'uncertainty',
    ],
    pointer,
  );
  string(classification['id'], `${pointer}/id`);
  enumValue(
    classification['kind'],
    ['generated', 'bookkeeping', 'excluded'],
    `${pointer}/kind`,
  );
  string(classification['reason'], `${pointer}/reason`);
  stringArray(classification['paths'], `${pointer}/paths`).forEach(
    (entry, index) => path(entry, `${pointer}/paths/${index}`),
  );
  enumValue(
    classification['planDisposition'],
    ['inspect', 'justified-exclusion'],
    `${pointer}/planDisposition`,
  );
  enumValue(
    classification['strategy'],
    ['path-diff', 'inventory', 'manifest-check', 'none'],
    `${pointer}/strategy`,
  );
  stringArray(classification['plannedChecks'], `${pointer}/plannedChecks`);
  nullableString(
    classification['exclusionAuthority'],
    `${pointer}/exclusionAuthority`,
  );
  enumValue(
    classification['outcome'],
    ['complete', 'partial', 'uncovered', 'excluded'],
    `${pointer}/outcome`,
  );
  enumValue(
    classification['inspectionCoverage'],
    ['all', 'partial', 'none', 'excluded'],
    `${pointer}/inspectionCoverage`,
  );
  array(
    classification['uninspectedPathIndexes'],
    `${pointer}/uninspectedPathIndexes`,
  ).forEach((index, itemIndex) =>
    safeNumber(index, `${pointer}/uninspectedPathIndexes/${itemIndex}`),
  );
  array(classification['commands'], `${pointer}/commands`).forEach(
    (command, index) =>
      parseCommandEvidence(command, `${pointer}/commands/${index}`),
  );
  stringArray(classification['uncertainty'], `${pointer}/uncertainty`);
}

function parseClaimVerification(value: unknown, pointer: string): void {
  const claim = object(value, pointer);
  keys(
    claim,
    [
      'claimId',
      'kind',
      'findingId',
      'laneIds',
      'mode',
      'disposition',
      'evidenceRefIds',
    ],
    pointer,
  );
  string(claim['claimId'], `${pointer}/claimId`);
  enumValue(
    claim['kind'],
    [
      'promoted-finding',
      'consequential-absence',
      'worker-conflict',
      'cross-lane-gap',
      'positive-coverage-sample',
      'deterministic-result',
    ],
    `${pointer}/kind`,
  );
  nullableString(claim['findingId'], `${pointer}/findingId`);
  stringArray(claim['laneIds'], `${pointer}/laneIds`);
  enumValue(
    claim['mode'],
    ['direct', 'sample', 'provenance'],
    `${pointer}/mode`,
  );
  enumValue(
    claim['disposition'],
    ['verified', 'rejected', 'unresolved'],
    `${pointer}/disposition`,
  );
  stringArray(claim['evidenceRefIds'], `${pointer}/evidenceRefIds`);
}

function parseAccounting(
  value: unknown,
  pointer: string,
  expectedCompletion: string,
): void {
  const accounting = object(value, pointer);
  keys(
    accounting,
    [
      'schemaVersion',
      'receipt',
      'contextDigest',
      'planDigest',
      'assignmentDigest',
      'strategy',
      'completion',
      'evidence',
      'lanes',
      'classifications',
      'verification',
      'budget',
    ],
    pointer,
  );
  if (accounting['schemaVersion'] !== 1)
    throw new ReviewSchemaError(`${pointer}/schemaVersion must be 1`);
  for (const field of [
    'receipt',
    'contextDigest',
    'planDigest',
    'assignmentDigest',
  ] as const) {
    string(accounting[field], `${pointer}/${field}`);
  }
  enumValue(
    accounting['strategy'],
    ['whole-diff-inline', 'selective-inline', 'delegated'],
    `${pointer}/strategy`,
  );
  if (accounting['completion'] !== expectedCompletion) {
    throw new ReviewSchemaError(
      `${pointer}/completion contradicts terminal status`,
    );
  }
  array(accounting['evidence'], `${pointer}/evidence`).forEach(
    (evidence, index) =>
      parseEvidenceRef(evidence, `${pointer}/evidence/${index}`),
  );
  array(accounting['lanes'], `${pointer}/lanes`).forEach((lane, index) =>
    parseAccountingLane(lane, `${pointer}/lanes/${index}`),
  );
  array(accounting['classifications'], `${pointer}/classifications`).forEach(
    (classification, index) =>
      parseAccountingClassification(
        classification,
        `${pointer}/classifications/${index}`,
      ),
  );
  array(accounting['verification'], `${pointer}/verification`).forEach(
    (claim, index) =>
      parseClaimVerification(claim, `${pointer}/verification/${index}`),
  );
  const budget = object(accounting['budget'], `${pointer}/budget`);
  keys(
    budget,
    ['evidenceStoppedAt', 'outputReservePreserved'],
    `${pointer}/budget`,
  );
  if (budget['evidenceStoppedAt'] !== null)
    isoDate(budget['evidenceStoppedAt'], `${pointer}/budget/evidenceStoppedAt`);
  if (
    budget['outputReservePreserved'] !== null &&
    typeof budget['outputReservePreserved'] !== 'boolean'
  ) {
    throw new ReviewSchemaError(
      `${pointer}/budget/outputReservePreserved must be boolean or null`,
    );
  }
}

function parseStructuredFinding(value: unknown, pointer: string): void {
  const finding = object(value, pointer);
  keys(
    finding,
    ['id', 'severity', 'title', 'file', 'line', 'body', 'fix_guidance'],
    pointer,
  );
  string(finding['id'], `${pointer}/id`);
  enumValue(
    finding['severity'],
    ['critical', 'important', 'medium', 'minor'],
    `${pointer}/severity`,
  );
  if (typeof finding['title'] !== 'string') {
    throw new ReviewSchemaError(`${pointer}/title must be a string`);
  }
  if (typeof finding['body'] !== 'string') {
    throw new ReviewSchemaError(`${pointer}/body must be a string`);
  }
  const hasLocation = finding['file'] !== null || finding['line'] !== null;
  if (hasLocation) {
    if (typeof finding['file'] !== 'string') {
      throw new ReviewSchemaError(`${pointer}/file must be a string or null`);
    }
    safeNumber(finding['line'], `${pointer}/line`);
    if (finding['line'] === 0) {
      throw new ReviewSchemaError(`${pointer}/line must be at least 1`);
    }
  } else if (finding['file'] !== null || finding['line'] !== null) {
    throw new ReviewSchemaError(
      `${pointer} must set both file and line, or set both to null`,
    );
  }
  if (
    finding['fix_guidance'] !== null &&
    typeof finding['fix_guidance'] !== 'string'
  ) {
    throw new ReviewSchemaError(
      `${pointer}/fix_guidance must be a string or null`,
    );
  }
}

export function parseReviewerTerminalV1(value: unknown): ReviewerTerminalV1 {
  const terminal = object(value, '$');
  if (terminal['status'] === 'complete') {
    keys(
      terminal,
      ['schemaVersion', 'status', 'candidate', 'reviewAccounting'],
      '$',
    );
    if (terminal['schemaVersion'] !== 1)
      throw new ReviewSchemaError('$/schemaVersion must be 1');
    const candidate = object(terminal['candidate'], '$/candidate');
    if (candidate['kind'] === 'artifact-draft') {
      keys(candidate, ['kind', 'privateDraftPath'], '$/candidate');
      string(candidate['privateDraftPath'], '$/candidate/privateDraftPath');
      if (!candidate['privateDraftPath'].startsWith('/')) {
        throw new ReviewSchemaError(
          '$/candidate/privateDraftPath must be absolute',
        );
      }
    } else if (candidate['kind'] === 'structured') {
      keys(candidate, ['kind', 'review'], '$/candidate');
      const review = object(candidate['review'], '$/candidate/review');
      keys(
        review,
        ['summary', 'findings', 'verification_commands'],
        '$/candidate/review',
      );
      if (typeof review['summary'] !== 'string') {
        throw new ReviewSchemaError(
          '$/candidate/review/summary must be a string',
        );
      }
      array(review['findings'], '$/candidate/review/findings').forEach(
        (finding, index) =>
          parseStructuredFinding(
            finding,
            `$/candidate/review/findings/${index}`,
          ),
      );
      stringArray(
        review['verification_commands'],
        '$/candidate/review/verification_commands',
      );
    } else {
      throw new ReviewSchemaError('$/candidate/kind has an invalid value');
    }
    parseAccounting(
      terminal['reviewAccounting'],
      '$/reviewAccounting',
      'complete',
    );
  } else if (terminal['status'] === 'blocked') {
    keys(
      terminal,
      ['schemaVersion', 'status', 'reason', 'diagnostics', 'reviewAccounting'],
      '$',
    );
    if (terminal['schemaVersion'] !== 1)
      throw new ReviewSchemaError('$/schemaVersion must be 1');
    string(terminal['reason'], '$/reason');
    stringArray(terminal['diagnostics'], '$/diagnostics');
    parseAccounting(
      terminal['reviewAccounting'],
      '$/reviewAccounting',
      'blocked-incomplete',
    );
  } else {
    throw new ReviewSchemaError('$/status has an invalid value');
  }
  return terminal as unknown as ReviewerTerminalV1;
}
