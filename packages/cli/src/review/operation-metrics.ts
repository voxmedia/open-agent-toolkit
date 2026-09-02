import { canonicalizeJson } from './canonical-json';
import { validateReviewPlan } from './plan-validator';
import type { PreparedReviewContextV1, ReviewPlanV1 } from './types';

export type ReviewOperationKind =
  | 'content-diff'
  | 'full-file-read'
  | 'semantic-replay'
  | 'tool-step';

export interface ReviewOperationMetricsV1 {
  schemaVersion: 1;
  fixture: string;
  changedFiles: number;
  strategy?: 'whole-diff-inline' | 'selective-inline' | 'delegated';
  operations: Array<{
    kind: ReviewOperationKind;
    count: number;
  }>;
  completion: 'complete' | 'blocked';
  accountingBytes: number;
}

export type ReviewOperationSource =
  | 'strategy'
  | 'evidence'
  | 'reconciliation'
  | 'output';

export interface ReviewOperationTraceEventV1 {
  sequence: number;
  kind: ReviewOperationKind;
  source: ReviewOperationSource;
  pathIndexes: number[];
}

export interface ReviewOperationTraceV1 {
  schemaVersion: 1;
  fixture: string;
  changedFiles: number;
  strategy: 'whole-diff-inline' | 'selective-inline' | 'delegated';
  producer: string;
  events: ReviewOperationTraceEventV1[];
  completion: 'complete' | 'blocked';
  accountingBytes: number;
}

export interface ReviewOperationComparison {
  baselineFixture: string;
  candidateFixture: string;
  changedFiles: number;
  broadContent: {
    baseline: number;
    candidate: number;
    saved: number;
    improved: boolean;
  };
  semanticReplay: {
    baseline: number;
    candidate: number;
    saved: number;
    improved: boolean;
  };
  toolSteps: {
    baseline: number;
    candidate: number;
    saved: number;
  };
  completion: {
    baseline: ReviewOperationMetricsV1['completion'];
    candidate: ReviewOperationMetricsV1['completion'];
  };
  accountingBytes: {
    baseline: number;
    candidate: number;
  };
  improvesBroadReview: boolean;
}

const OPERATION_KINDS = [
  'content-diff',
  'full-file-read',
  'semantic-replay',
  'tool-step',
] as const satisfies readonly ReviewOperationKind[];
const OPERATION_SOURCES = [
  'strategy',
  'evidence',
  'reconciliation',
  'output',
] as const satisfies readonly ReviewOperationSource[];
const PRODUCTION_TRACE_PRODUCER = 'review-operation-recorder/v1';
const PRODUCTION_TRACES = new WeakSet<ReviewOperationTraceV1>();

function isOperationKind(value: unknown): value is ReviewOperationKind {
  return OPERATION_KINDS.some((kind) => kind === value);
}

function isOperationSource(value: unknown): value is ReviewOperationSource {
  return OPERATION_SOURCES.some((source) => source === value);
}

function isStrategy(
  value: unknown,
): value is ReviewOperationTraceV1['strategy'] {
  return (
    value === 'whole-diff-inline' ||
    value === 'selective-inline' ||
    value === 'delegated'
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  pointer: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${pointer} must be an object`);
  }
  const object = value as Record<string, unknown>;
  const expected = new Set(keys);
  for (const key of Object.keys(object)) {
    if (!expected.has(key))
      throw new Error(`${pointer} has unknown field ${key}`);
  }
  for (const key of keys) {
    if (!(key in object)) throw new Error(`${pointer} is missing ${key}`);
  }
  return object;
}

function nonEmptyString(value: unknown, pointer: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${pointer} must be a non-empty string`);
  }
  return value;
}

function parseOperationTrace(value: unknown): ReviewOperationTraceV1 {
  const trace = exactObject(
    value,
    [
      'schemaVersion',
      'fixture',
      'changedFiles',
      'strategy',
      'producer',
      'events',
      'completion',
      'accountingBytes',
    ],
    '$',
  );
  if (trace['schemaVersion'] !== 1) {
    throw new Error('$/schemaVersion must be 1');
  }
  if (
    !Number.isSafeInteger(trace['changedFiles']) ||
    (trace['changedFiles'] as number) < 0
  ) {
    throw new Error('$/changedFiles must be a non-negative safe integer');
  }
  if (
    !Number.isSafeInteger(trace['accountingBytes']) ||
    (trace['accountingBytes'] as number) < 0
  ) {
    throw new Error('$/accountingBytes must be a non-negative safe integer');
  }
  if (!isStrategy(trace['strategy'])) {
    throw new Error('$/strategy has invalid value');
  }
  if (trace['producer'] !== PRODUCTION_TRACE_PRODUCER) {
    throw new Error('trace must come from the production operation recorder');
  }
  if (trace['completion'] !== 'complete' && trace['completion'] !== 'blocked') {
    throw new Error('$/completion has invalid value');
  }
  if (!Array.isArray(trace['events']))
    throw new Error('$/events must be an array');

  const changedFiles = trace['changedFiles'] as number;
  const events = trace['events'].map((entry, index) => {
    const pointer = `$/events/${index}`;
    const event = exactObject(
      entry,
      ['sequence', 'kind', 'source', 'pathIndexes'],
      pointer,
    );
    if (event['sequence'] !== index) {
      throw new Error(`${pointer}/sequence must be contiguous and ordered`);
    }
    if (!isOperationKind(event['kind'])) {
      throw new Error(`${pointer}/kind has invalid value`);
    }
    if (!isOperationSource(event['source'])) {
      throw new Error(`${pointer}/source has invalid value`);
    }
    if (!Array.isArray(event['pathIndexes'])) {
      throw new Error(`${pointer}/pathIndexes must be an array`);
    }
    const pathIndexes = event['pathIndexes'].map(
      (pathIndex, pathIndexOffset) => {
        if (
          !Number.isSafeInteger(pathIndex) ||
          (pathIndex as number) < 0 ||
          (pathIndex as number) >= changedFiles
        ) {
          throw new Error(
            `${pointer}/pathIndexes/${pathIndexOffset} is outside the changed-file scope`,
          );
        }
        return pathIndex as number;
      },
    );
    if (new Set(pathIndexes).size !== pathIndexes.length) {
      throw new Error(`${pointer}/pathIndexes contains duplicates`);
    }
    if (
      (event['kind'] === 'full-file-read' ||
        event['kind'] === 'semantic-replay') &&
      pathIndexes.length !== 1
    ) {
      throw new Error(
        `${pointer} path operation must identify exactly one path`,
      );
    }
    if (event['kind'] === 'content-diff' && pathIndexes.length === 0) {
      throw new Error(`${pointer} content diff must identify reviewed paths`);
    }
    if (event['kind'] === 'tool-step' && pathIndexes.length !== 0) {
      throw new Error(`${pointer} tool step cannot claim path operations`);
    }
    return {
      sequence: index,
      kind: event['kind'],
      source: event['source'],
      pathIndexes,
    };
  });

  if (trace['strategy'] === 'whole-diff-inline') {
    const contentDiffs = events.filter(
      (event) => event.kind === 'content-diff',
    );
    if (
      contentDiffs.length !== 1 ||
      contentDiffs[0]!.pathIndexes.length !== changedFiles ||
      events.some(
        (event) =>
          event.kind === 'full-file-read' || event.kind === 'semantic-replay',
      )
    ) {
      throw new Error(
        'whole-diff-inline traces require one complete diff and no broad reads or replay',
      );
    }
  } else if (
    trace['completion'] === 'complete' &&
    changedFiles > 0 &&
    !events.some((event) => event.source === 'evidence')
  ) {
    throw new Error(
      'complete non-empty selective traces require evidence operations',
    );
  }

  return {
    schemaVersion: 1,
    fixture: nonEmptyString(trace['fixture'], '$/fixture'),
    changedFiles,
    strategy: trace['strategy'],
    producer: PRODUCTION_TRACE_PRODUCER,
    events,
    completion: trace['completion'],
    accountingBytes: trace['accountingBytes'] as number,
  };
}

function createReviewOperationTrace(
  input: Omit<ReviewOperationTraceV1, 'schemaVersion' | 'producer' | 'events'>,
): ReviewOperationTraceV1 {
  if (
    input.fixture.trim().length === 0 ||
    !Number.isSafeInteger(input.changedFiles) ||
    input.changedFiles < 0 ||
    !isStrategy(input.strategy) ||
    (input.completion !== 'complete' && input.completion !== 'blocked') ||
    !Number.isSafeInteger(input.accountingBytes) ||
    input.accountingBytes < 0
  ) {
    throw new Error('invalid production operation trace metadata');
  }
  return {
    schemaVersion: 1,
    producer: PRODUCTION_TRACE_PRODUCER,
    events: [],
    ...input,
  };
}

function recordReviewOperation(
  trace: ReviewOperationTraceV1,
  event: Omit<ReviewOperationTraceEventV1, 'sequence'>,
): void {
  if (trace.producer !== PRODUCTION_TRACE_PRODUCER) {
    throw new Error('trace must come from the production operation recorder');
  }
  trace.events.push({
    sequence: trace.events.length,
    ...structuredClone(event),
  });
}

function pathIndexesFor(
  context: PreparedReviewContextV1,
  paths: readonly string[],
): number[] {
  const indexesByPath = new Map(
    context.changeMap.files.map((file, index) => [file.path, index]),
  );
  return paths.map((path) => {
    const index = indexesByPath.get(path);
    if (index === undefined) {
      throw new Error(`validated execution path ${path} is not authoritative`);
    }
    return index;
  });
}

function recordPathStrategy(
  trace: ReviewOperationTraceV1,
  strategy: ReviewPlanV1['lanes'][number]['strategy'],
  replay: ReviewPlanV1['lanes'][number]['replay'],
  pathIndexes: number[],
): void {
  if (strategy === 'path-diff' && pathIndexes.length > 0) {
    recordReviewOperation(trace, {
      kind: 'content-diff',
      source: 'evidence',
      pathIndexes,
    });
  } else if (strategy === 'full-file') {
    for (const pathIndex of pathIndexes) {
      recordReviewOperation(trace, {
        kind: 'full-file-read',
        source: 'evidence',
        pathIndexes: [pathIndex],
      });
    }
  } else if (strategy === 'command' || strategy === 'inventory') {
    recordReviewOperation(trace, {
      kind: 'tool-step',
      source: 'evidence',
      pathIndexes: [],
    });
  }

  const replayIndexes =
    replay === 'direct-verify'
      ? pathIndexes
      : replay === 'sample'
        ? pathIndexes.slice(0, 1)
        : [];
  for (const pathIndex of replayIndexes) {
    recordReviewOperation(trace, {
      kind: 'semantic-replay',
      source: 'reconciliation',
      pathIndexes: [pathIndex],
    });
  }
}

export function executeValidatedReviewStrategy(
  context: PreparedReviewContextV1,
  plan: ReviewPlanV1,
  fixture: string,
): ReviewOperationTraceV1 {
  const validationErrors = validateReviewPlan(context, plan);
  if (validationErrors.length > 0) {
    throw new Error(
      `operation strategy requires a validated review plan: ${canonicalizeJson(validationErrors)}`,
    );
  }

  const trace = createReviewOperationTrace({
    fixture,
    changedFiles: context.changeMap.files.length,
    strategy: plan.strategy,
    completion: 'complete',
    accountingBytes: 0,
  });
  recordReviewOperation(trace, {
    kind: 'tool-step',
    source: 'strategy',
    pathIndexes: [],
  });

  if (plan.strategy === 'whole-diff-inline') {
    recordReviewOperation(trace, {
      kind: 'content-diff',
      source: 'evidence',
      pathIndexes: context.changeMap.files.map((_, index) => index),
    });
  } else {
    for (const lane of plan.lanes) {
      recordPathStrategy(
        trace,
        lane.strategy,
        lane.replay,
        pathIndexesFor(context, lane.paths),
      );
    }
    for (const classification of plan.classifications) {
      const pathIndexes = pathIndexesFor(context, classification.paths);
      if (classification.strategy === 'path-diff' && pathIndexes.length > 0) {
        recordReviewOperation(trace, {
          kind: 'content-diff',
          source: 'evidence',
          pathIndexes,
        });
      } else {
        recordReviewOperation(trace, {
          kind: 'tool-step',
          source: 'evidence',
          pathIndexes: [],
        });
      }
    }
  }

  recordReviewOperation(trace, {
    kind: 'tool-step',
    source: 'output',
    pathIndexes: [],
  });
  trace.accountingBytes = Buffer.byteLength(
    canonicalizeJson({
      contextDigest: plan.contextDigest,
      strategy: plan.strategy,
      events: trace.events,
    }),
  );
  const validatedTrace = parseOperationTrace(trace);
  for (const event of validatedTrace.events) {
    Object.freeze(event.pathIndexes);
    Object.freeze(event);
  }
  Object.freeze(validatedTrace.events);
  Object.freeze(validatedTrace);
  PRODUCTION_TRACES.add(validatedTrace);
  return validatedTrace;
}

export function deriveOperationMetrics(
  value: unknown,
): ReviewOperationMetricsV1 {
  if (
    value === null ||
    typeof value !== 'object' ||
    !PRODUCTION_TRACES.has(value as ReviewOperationTraceV1)
  ) {
    throw new Error(
      'operation metrics require output from the production execution harness',
    );
  }
  const trace = parseOperationTrace(value);
  const counts = new Map<ReviewOperationKind, number>(
    OPERATION_KINDS.map((kind) => [kind, 0]),
  );
  for (const event of trace.events) {
    counts.set(event.kind, counts.get(event.kind)! + 1);
  }
  return {
    schemaVersion: 1,
    fixture: trace.fixture,
    changedFiles: trace.changedFiles,
    strategy: trace.strategy,
    operations: OPERATION_KINDS.map((kind) => ({
      kind,
      count: counts.get(kind)!,
    })),
    completion: trace.completion,
    accountingBytes: trace.accountingBytes,
  };
}

function operationCounts(
  metrics: ReviewOperationMetricsV1,
): Record<ReviewOperationKind, number> {
  if (
    metrics.schemaVersion !== 1 ||
    metrics.fixture.trim().length === 0 ||
    !Number.isSafeInteger(metrics.changedFiles) ||
    metrics.changedFiles < 0 ||
    !Number.isSafeInteger(metrics.accountingBytes) ||
    metrics.accountingBytes < 0 ||
    !(['complete', 'blocked'] as const).includes(metrics.completion) ||
    (metrics.strategy !== undefined &&
      !(
        ['whole-diff-inline', 'selective-inline', 'delegated'] as const
      ).includes(metrics.strategy))
  ) {
    throw new Error(`invalid operation metrics fixture ${metrics.fixture}`);
  }

  const counts = new Map<ReviewOperationKind, number>();
  for (const operation of metrics.operations) {
    if (
      !OPERATION_KINDS.includes(operation.kind) ||
      !Number.isSafeInteger(operation.count) ||
      operation.count < 0
    ) {
      throw new Error(
        `invalid ${operation.kind} count in fixture ${metrics.fixture}`,
      );
    }
    if (counts.has(operation.kind)) {
      throw new Error(
        `fixture ${metrics.fixture} must contain exactly one count for ${operation.kind}`,
      );
    }
    counts.set(operation.kind, operation.count);
  }
  for (const kind of OPERATION_KINDS) {
    if (!counts.has(kind)) {
      throw new Error(
        `fixture ${metrics.fixture} must contain exactly one count for ${kind}`,
      );
    }
  }
  return Object.fromEntries(counts) as Record<ReviewOperationKind, number>;
}

export function compareOperationMetrics(
  baseline: ReviewOperationMetricsV1,
  candidate: ReviewOperationMetricsV1,
): ReviewOperationComparison {
  const baselineCounts = operationCounts(baseline);
  const candidateCounts = operationCounts(candidate);
  if (baseline.changedFiles !== candidate.changedFiles) {
    throw new Error(
      'operation metrics must compare the same changed-file scope',
    );
  }

  const baselineBroad =
    baselineCounts['content-diff'] + baselineCounts['full-file-read'];
  const candidateBroad =
    candidateCounts['content-diff'] + candidateCounts['full-file-read'];
  const broadImproved = candidateBroad < baselineBroad;
  const replayImproved =
    candidateCounts['semantic-replay'] < baselineCounts['semantic-replay'];

  return {
    baselineFixture: baseline.fixture,
    candidateFixture: candidate.fixture,
    changedFiles: baseline.changedFiles,
    broadContent: {
      baseline: baselineBroad,
      candidate: candidateBroad,
      saved: baselineBroad - candidateBroad,
      improved: broadImproved,
    },
    semanticReplay: {
      baseline: baselineCounts['semantic-replay'],
      candidate: candidateCounts['semantic-replay'],
      saved:
        baselineCounts['semantic-replay'] - candidateCounts['semantic-replay'],
      improved: replayImproved,
    },
    toolSteps: {
      baseline: baselineCounts['tool-step'],
      candidate: candidateCounts['tool-step'],
      saved: baselineCounts['tool-step'] - candidateCounts['tool-step'],
    },
    completion: {
      baseline: baseline.completion,
      candidate: candidate.completion,
    },
    accountingBytes: {
      baseline: baseline.accountingBytes,
      candidate: candidate.accountingBytes,
    },
    improvesBroadReview: broadImproved && replayImproved,
  };
}
