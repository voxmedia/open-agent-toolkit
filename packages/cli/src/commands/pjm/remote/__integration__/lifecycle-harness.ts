import {
  buildExternalAction,
  type ExternalActionEnvelope,
} from '../external-action';
import {
  assessOutboundProjectionSafety,
  type OutboundProjection,
} from '../outbound-projection-safety';

export type CrashPoint =
  | 'after-planned'
  | 'after-attempt-started'
  | 'after-observation'
  | 'after-metadata'
  | 'after-state'
  | 'after-snapshot'
  | 'after-baseline'
  | 'after-association'
  | 'after-terminal'
  | null;

export interface HarnessOperation {
  operationId: string;
  bindingId: string;
  state:
    | 'planned'
    | 'attempt-started'
    | 'verification-pending'
    | 'materializing'
    | 'verified'
    | 'uncertain'
    | 'blocked';
  previewDigest: string;
  approvalDigest: string;
  capabilityEvidenceDigest: string;
  action: ExternalActionEnvelope | null;
  observationDigest: string | null;
  materializationSteps: string[];
}

export class FakeLifecycleStore {
  readonly operations = new Map<string, HarnessOperation>();
}

export class GenericHostExecutor {
  calls = 0;
  constructor(
    readonly result: {
      classification: 'committed' | 'unknown';
      observationDigest: string;
    } = {
      classification: 'committed',
      observationDigest: 'sha256:observation',
    },
  ) {}

  async execute(_action: ExternalActionEnvelope) {
    this.calls += 1;
    return this.result;
  }
}

export interface LifecycleHarnessOptions {
  store?: FakeLifecycleStore;
  executor?: GenericHostExecutor;
  now?: () => string;
  id?: () => string;
  readback?: () => Promise<OutboundProjection>;
}

export class LifecycleHarness {
  readonly store: FakeLifecycleStore;
  readonly executor: GenericHostExecutor;
  readonly now: () => string;
  readonly id: () => string;
  readonly readback: () => Promise<OutboundProjection>;

  constructor(options: LifecycleHarnessOptions = {}) {
    this.store = options.store ?? new FakeLifecycleStore();
    this.executor = options.executor ?? new GenericHostExecutor();
    this.now = options.now ?? (() => '2026-08-31T12:00:00.000Z');
    this.id = options.id ?? (() => 'op_harness_001');
    this.readback =
      options.readback ?? (async () => ({ title: 'Published title' }));
  }

  async publish(input: {
    operationId?: string;
    bindingId: string;
    provider: 'github' | 'linear' | 'jira';
    context: Record<string, string>;
    projection: OutboundProjection;
    previewDigest: string;
    approvalDigest: string;
    capabilityEvidenceDigest: string;
    crashAt?: CrashPoint;
  }): Promise<HarnessOperation> {
    const operationId = input.operationId ?? this.id();
    let operation = this.store.operations.get(operationId);
    if (
      operation?.state === 'verified' ||
      operation?.state === 'blocked' ||
      operation?.state === 'uncertain'
    ) {
      return operation;
    }
    if (!operation) {
      if (input.approvalDigest !== input.previewDigest) {
        operation = {
          operationId,
          bindingId: input.bindingId,
          state: 'blocked',
          previewDigest: input.previewDigest,
          approvalDigest: input.approvalDigest,
          capabilityEvidenceDigest: input.capabilityEvidenceDigest,
          action: null,
          observationDigest: null,
          materializationSteps: [],
        };
        this.store.operations.set(operationId, operation);
        return operation;
      }
      operation = {
        operationId,
        bindingId: input.bindingId,
        state: 'planned',
        previewDigest: input.previewDigest,
        approvalDigest: input.approvalDigest,
        capabilityEvidenceDigest: input.capabilityEvidenceDigest,
        action: null,
        observationDigest: null,
        materializationSteps: [],
      };
      this.store.operations.set(operationId, operation);
      this.crash(input.crashAt, 'after-planned');
    }

    if (operation.capabilityEvidenceDigest !== input.capabilityEvidenceDigest) {
      operation.state = 'blocked';
      return operation;
    }
    if (operation.state === 'attempt-started') {
      operation.state = 'uncertain';
      return operation;
    }
    if (operation.state === 'planned') {
      const safety = assessOutboundProjectionSafety(input.projection, {
        assessedAt: this.now(),
      });
      operation.action = buildExternalAction({
        operationId,
        stepId: 'step_harness_001',
        provider: input.provider,
        semanticOperation: 'update',
        context: input.context,
        intent: { fields: input.projection },
        expectedObservation: {
          fields: Object.keys(input.projection),
          requireIdentity: true,
          stableId: null,
          capabilityEvidenceDigest: input.capabilityEvidenceDigest,
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection: input.projection,
        outboundSafety: safety,
      });
      operation.state = 'attempt-started';
      this.crash(input.crashAt, 'after-attempt-started');
      const observation = await this.executor.execute(operation.action);
      operation.observationDigest = observation.observationDigest;
      if (observation.classification === 'unknown') {
        operation.state = 'uncertain';
        return operation;
      }
      operation.state = 'verification-pending';
      this.crash(input.crashAt, 'after-observation');
    }

    if (operation.state === 'verification-pending') {
      try {
        const observed = await this.readback();
        if (
          !Object.entries(input.projection).every(
            ([field, value]) =>
              observed[field as keyof OutboundProjection] === value,
          )
        ) {
          operation.state = 'uncertain';
          return operation;
        }
        operation.state = 'materializing';
      } catch {
        operation.state = 'uncertain';
        return operation;
      }
    }
    if (operation.state === 'materializing') {
      for (const step of [
        'metadata',
        'state',
        'snapshot',
        'baseline',
        'association',
      ] as const) {
        if (operation.materializationSteps.includes(step)) continue;
        operation.materializationSteps.push(step);
        this.crash(input.crashAt, `after-${step}`);
      }
      operation.state = 'verified';
      this.crash(input.crashAt, 'after-terminal');
    }
    return operation;
  }

  private crash(configured: CrashPoint | undefined, actual: CrashPoint): void {
    if (configured === actual) throw new Error(`crash:${actual}`);
  }
}
