import {
  acceptExternalObservation,
  buildExternalAction,
  type ExternalActionEnvelope,
} from './external-action';
import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from './outbound-projection-safety';

export interface BindingCreateIntent {
  bindingId: string;
  operationId: string;
  provider: 'github' | 'linear' | 'jira';
  context: Record<string, string>;
  target: {
    kind: 'backlog' | 'project';
    id: string;
    scope: 'shared' | 'synced' | 'local';
  };
  projection: OutboundProjection;
  previewDigest: string;
  projectionDigest: string;
  safetyResultDigest: string;
  capabilityEvidenceDigest: string;
  provenanceToken: string;
}

export interface CreateBindingDependencies {
  reserveIntent(intent: BindingCreateIntent): Promise<void>;
  readIntent(operationId: string): Promise<BindingCreateIntent | null>;
  readAction(operationId: string): Promise<ExternalActionEnvelope | null>;
  recordAction(
    operationId: string,
    action: ExternalActionEnvelope,
  ): Promise<void>;
  recordVerificationPending(
    operationId: string,
    action: ExternalActionEnvelope,
  ): Promise<void>;
  recordTerminal(
    operationId: string,
    state: 'rejected' | 'uncertain',
  ): Promise<void>;
  materialize(input: {
    intent: BindingCreateIntent;
    stableId: string;
    aliases: string[];
    observedFields: Record<string, string | number | boolean | null>;
    revisionDigest: string;
  }): Promise<void>;
  writeAssociation(input: {
    target: BindingCreateIntent['target'];
    provider: string;
    ref: string;
    bindingId: string;
  }): Promise<void>;
  readMaterializationProgress?(
    operationId: string,
  ): Promise<Array<'materialized' | 'associated' | 'terminal'>>;
  recordMaterializationProgress?(
    operationId: string,
    step: 'materialized' | 'associated' | 'terminal',
  ): Promise<void>;
  recordVerified?(operationId: string): Promise<void>;
  crash?(
    point:
      | 'after-intent'
      | 'after-observation'
      | 'after-materialize'
      | 'after-association'
      | 'after-terminal',
  ): void;
}

export type CreateBindingResult =
  | { status: 'pending'; action: ExternalActionEnvelope }
  | { status: 'verified'; bindingId: string }
  | { status: 'rejected' | 'uncertain'; bindingId: null };

export async function createAndBindRemoteIssue(
  input: {
    intent: BindingCreateIntent;
    safety: OutboundProjectionSafetyResult | null;
    continuation?: { observation: unknown };
  },
  dependencies: CreateBindingDependencies,
): Promise<CreateBindingResult> {
  if (!input.continuation) {
    await dependencies.reserveIntent(input.intent);
    dependencies.crash?.('after-intent');
    requireCurrentOutboundSafety(input.intent.projection, input.safety);
    if (
      input.intent.projectionDigest !== input.safety.projectionDigest ||
      input.intent.safetyResultDigest !== input.safety.resultDigest
    ) {
      throw new Error('Create intent safety evidence is stale or mismatched.');
    }
    const action = buildExternalAction({
      operationId: input.intent.operationId,
      stepId: `step_${input.intent.operationId}`,
      provider: input.intent.provider,
      semanticOperation: 'create',
      context: input.intent.context,
      intent: {
        target: input.intent.target,
        fields: input.intent.projection,
        provenanceToken: input.intent.provenanceToken,
      },
      expectedObservation: {
        fields: Object.keys(input.intent.projection),
        requireIdentity: true,
        stableId: null,
        capabilityEvidenceDigest: input.intent.capabilityEvidenceDigest,
      },
      persistedPreview: input.intent,
      projection: input.intent.projection,
      outboundSafety: input.safety,
    });
    await dependencies.recordAction(input.intent.operationId, action);
    return { status: 'pending', action };
  }

  const progress = new Set(
    (await dependencies.readMaterializationProgress?.(
      input.intent.operationId,
    )) ?? [],
  );
  if (progress.has('terminal')) {
    throw new Error(
      'Create operation is terminal; observation replay rejected.',
    );
  }

  const persisted = await dependencies.readIntent(input.intent.operationId);
  if (
    !persisted ||
    JSON.stringify(persisted) !== JSON.stringify(input.intent)
  ) {
    throw new Error('Create continuation does not match the persisted intent.');
  }
  const durableAction = await dependencies.readAction(input.intent.operationId);
  if (!durableAction) {
    throw new Error('Create continuation has no durable current action.');
  }
  const observation = acceptExternalObservation({
    action: durableAction,
    observation: input.continuation.observation,
  });
  if (observation.outcome.classification === 'rejected') {
    await dependencies.recordTerminal(input.intent.operationId, 'rejected');
    return { status: 'rejected', bindingId: null };
  }
  if (
    observation.outcome.classification !== 'observed' ||
    !observation.outcome.identity
  ) {
    await dependencies.recordTerminal(input.intent.operationId, 'uncertain');
    return { status: 'uncertain', bindingId: null };
  }
  dependencies.crash?.('after-observation');
  if (durableAction.semanticOperation === 'create') {
    if (
      observation.outcome.classification !== 'observed' ||
      !observation.outcome.identity
    ) {
      await dependencies.recordTerminal(input.intent.operationId, 'uncertain');
      return { status: 'uncertain', bindingId: null };
    }
    const readAction = buildExternalAction({
      operationId: input.intent.operationId,
      stepId: `verify_${input.intent.operationId}`,
      provider: input.intent.provider,
      semanticOperation: 'read',
      context: input.intent.context,
      intent: { stableId: observation.outcome.identity.stableId },
      expectedObservation: {
        fields: Object.keys(input.intent.projection),
        requireIdentity: true,
        stableId: observation.outcome.identity.stableId,
        capabilityEvidenceDigest: input.intent.capabilityEvidenceDigest,
      },
      persistedPreview: {},
    });
    await dependencies.recordVerificationPending(
      input.intent.operationId,
      readAction,
    );
    return { status: 'pending', action: readAction };
  }
  if (durableAction.semanticOperation !== 'read') {
    throw new Error('Create continuation durable action is not current.');
  }
  for (const [field, expected] of Object.entries(input.intent.projection)) {
    if (observation.outcome.fields[field] !== expected) {
      await dependencies.recordTerminal(input.intent.operationId, 'uncertain');
      return { status: 'uncertain', bindingId: null };
    }
  }
  if (!observation.outcome.revisionDigest) {
    await dependencies.recordTerminal(input.intent.operationId, 'uncertain');
    return { status: 'uncertain', bindingId: null };
  }
  if (!progress.has('materialized')) {
    await dependencies.materialize({
      intent: input.intent,
      stableId: observation.outcome.identity.stableId,
      aliases: observation.outcome.identity.aliases,
      observedFields: observation.outcome.fields,
      revisionDigest: observation.outcome.revisionDigest,
    });
    await dependencies.recordMaterializationProgress?.(
      input.intent.operationId,
      'materialized',
    );
    dependencies.crash?.('after-materialize');
  }
  if (!progress.has('associated')) {
    await dependencies.writeAssociation({
      target: input.intent.target,
      provider: input.intent.provider,
      ref:
        observation.outcome.identity.aliases[0] ??
        observation.outcome.identity.stableId,
      bindingId: input.intent.bindingId,
    });
    await dependencies.recordMaterializationProgress?.(
      input.intent.operationId,
      'associated',
    );
    dependencies.crash?.('after-association');
  }
  await dependencies.recordVerified?.(input.intent.operationId);
  await dependencies.recordMaterializationProgress?.(
    input.intent.operationId,
    'terminal',
  );
  dependencies.crash?.('after-terminal');
  return { status: 'verified', bindingId: input.intent.bindingId };
}
