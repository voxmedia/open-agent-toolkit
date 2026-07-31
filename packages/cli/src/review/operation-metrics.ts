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
