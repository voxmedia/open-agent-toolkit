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
  provenanceToken: string;
}

export interface CreateBindingDependencies {
  reserveIntent(intent: BindingCreateIntent): Promise<void>;
  readIntent(operationId: string): Promise<BindingCreateIntent | null>;
  recordAction(
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
  crash?(
    point: 'after-intent' | 'after-observation' | 'after-materialize',
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
    continuation?: { action: ExternalActionEnvelope; observation: unknown };
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
      },
      persistedPreview: input.intent,
      projection: input.intent.projection,
      outboundSafety: input.safety,
    });
    await dependencies.recordAction(input.intent.operationId, action);
    return { status: 'pending', action };
  }

  const persisted = await dependencies.readIntent(input.intent.operationId);
  if (
    !persisted ||
    JSON.stringify(persisted) !== JSON.stringify(input.intent)
  ) {
    throw new Error('Create continuation does not match the persisted intent.');
  }
  const observation = acceptExternalObservation({
    action: input.continuation.action,
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
  await dependencies.materialize({
    intent: input.intent,
    stableId: observation.outcome.identity.stableId,
    aliases: observation.outcome.identity.aliases,
    observedFields: observation.outcome.fields,
    revisionDigest: observation.outcome.revisionDigest,
  });
  dependencies.crash?.('after-materialize');
  await dependencies.writeAssociation({
    target: input.intent.target,
    provider: input.intent.provider,
    ref:
      observation.outcome.identity.aliases[0] ??
      observation.outcome.identity.stableId,
    bindingId: input.intent.bindingId,
  });
  return { status: 'verified', bindingId: input.intent.bindingId };
}
