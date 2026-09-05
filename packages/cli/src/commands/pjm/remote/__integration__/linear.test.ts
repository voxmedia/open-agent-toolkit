import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  SanitizedProviderObservation,
  SemanticAction,
} from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyLinearReadObservation,
  linearAdapter,
  normalizeLinearIssueObservation,
  planLinearDiscussionRead,
  planLinearDuplicateSearch,
  planLinearRead,
  previewLinearMutation,
  validateLinearDiscussionReadObservation,
  validateLinearDuplicateSearchObservation,
  verifyLinearMutationObservation,
  type LinearHostCapabilityObservation,
} from '../providers/linear';

const context = {
  host: 'linear.example',
  accountId: 'acct_linear',
  workspaceId: 'workspace_01',
  teamId: 'team_alpha',
};

const capability: LinearHostCapabilityObservation = {
  provider: 'linear',
  context,
  availability: 'available',
  accountId: 'acct_linear',
  workspaceId: 'workspace_01',
  teamId: 'team_alpha',
  operations: [
    'read',
    'read-discussion',
    'create',
    'update',
    'transition',
    'annotate',
    'search-duplicates',
  ],
  observableFields: [
    'stable-identity',
    'title',
    'state',
    'revision',
    'team-context',
  ],
  evidenceDigest: 'sha256:linear-capability',
};

const observation: SanitizedProviderObservation = {
  provider: 'linear',
  context,
  identity: {
    stableId: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    aliases: ['ALPHA-42'],
  },
  fields: {
    uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    identifier: 'ALPHA-42',
    historicalIdentifiers: [],
    workspaceId: 'workspace_01',
    teamId: 'team_alpha',
    historicalTeamIds: [],
    title: 'Linear planning issue',
    description: 'Provider-neutral fixture',
    state: 'started',
    priority: 'high',
    archived: false,
    hostCapability: capability,
  },
  revision: { token: 'linear-rev-1', contentDigest: 'sha256:linear-content' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

class InspectableLinearStore {
  readonly records = new Map<
    string,
    ReturnType<typeof normalizeLinearIssueObservation>
  >();
  readonly attemptedActions = new Set<string>();
  readonly outcomes = new Map<string, string>();
  externalEffects = 0;
  discussionWrites = 0;
}

function continueRead(
  store: InspectableLinearStore,
  action: SemanticAction,
  readback: SanitizedProviderObservation,
  normalizedIssue = linearAdapter.normalize(readback),
) {
  const publicValidation = linearAdapter.validateObservation(action, readback);
  const verification = linearAdapter.verify(action, normalizedIssue);
  if (
    !publicValidation.valid ||
    verification.some((field) => field.status !== 'verified')
  ) {
    return { publicValidation, verification, persisted: false };
  }
  store.records.set(String(action.intent.actionDigest), normalizedIssue);
  return { publicValidation, verification, persisted: true };
}

function planMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
): SemanticAction {
  const projection =
    operation === 'transition'
      ? { status: 'completed' }
      : operation === 'annotate'
        ? { annotation: 'Completed locally' }
        : { title: `${operation} title` };
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const input = {
    operation,
    context,
    hostCapability: capability,
    bindingId: `binding_${operation}`,
    ...(operation === 'create'
      ? {
          provenance: {
            bindingId: `binding_${operation}`,
            origin: 'local:item-42',
          },
        }
      : {
          stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        }),
    fieldMask: Object.keys(projection),
    projection,
    outboundSafety,
  };
  const preview = previewLinearMutation(input);
  return linearAdapter.plan(operation, {
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function mutationReadback(
  action: SemanticAction,
  patch: Partial<SanitizedProviderObservation> = {},
): SanitizedProviderObservation {
  const projection = action.intent.projection as Record<string, unknown>;
  return {
    ...observation,
    ...patch,
    fields: {
      ...observation.fields,
      ...(projection.title === undefined ? {} : { title: projection.title }),
      ...(projection.status === undefined ? {} : { state: projection.status }),
      ...(projection.annotation === undefined
        ? {}
        : { annotations: [projection.annotation] }),
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
      ...patch.fields,
    },
  };
}

function continueMutation(
  store: InspectableLinearStore,
  action: SemanticAction,
  readback: SanitizedProviderObservation,
  options: { crashAfterVerification?: boolean } = {},
) {
  const actionDigest = String(action.intent.actionDigest);
  if (!store.attemptedActions.has(actionDigest)) {
    store.attemptedActions.add(actionDigest);
    store.externalEffects += 1;
  }
  const publicValidation = linearAdapter.validateObservation(action, readback);
  const verification = verifyLinearMutationObservation({
    action,
    attempt: {
      count: 1,
      outcome: 'accepted',
      capabilityEvidenceDigest: capability.evidenceDigest,
    },
    hostCapability: capability,
    readback,
  });
  if (!publicValidation.valid || verification.classification !== 'verified') {
    store.outcomes.set(actionDigest, verification.classification);
    return { publicValidation, verification, persisted: false };
  }
  if (options.crashAfterVerification) {
    throw new Error('crash:after-linear-verification');
  }
  const issue = linearAdapter.normalize(readback);
  store.records.set(actionDigest, issue);
  store.outcomes.set(actionDigest, 'verified');
  return { publicValidation, verification, persisted: true };
}

describe('Linear remote lifecycle integration', () => {
  it('intakes and refreshes through the real public adapter', () => {
    const intaken = linearAdapter.normalize(observation);
    const action = linearAdapter.plan('read', {
      context,
      hostCapability: capability,
      stableId: intaken.stableId,
      uuid: observation.fields.uuid,
      currentIdentifier: observation.fields.identifier,
      stepId: 'linear-refresh',
    });
    expect(linearAdapter.validateObservation(action, observation)).toEqual({
      valid: true,
      reasons: [],
    });
    expect(
      classifyLinearReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation,
      }),
    ).toMatchObject({ classification: 'current', issue: intaken });
  });

  it('does not persist an intact read action paired with another issue identity', () => {
    const store = new InspectableLinearStore();
    const action = linearAdapter.plan('read', {
      context,
      hostCapability: capability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      uuid: observation.fields.uuid,
      currentIdentifier: observation.fields.identifier,
      stepId: 'linear-wrong-readback',
    });
    const unrelated = {
      ...observation,
      identity: {
        stableId: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        aliases: ['BETA-7'],
      },
      fields: {
        ...observation.fields,
        uuid: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        identifier: 'BETA-7',
      },
    };
    expect(continueRead(store, action, unrelated)).toMatchObject({
      publicValidation: {
        valid: false,
        reasons: ['observation-identity-mismatch'],
      },
      verification: [{ field: 'stable-identity', status: 'mismatch' }],
      persisted: false,
    });
    expect(store.records).toHaveLength(0);
  });

  it.each([
    ['stale', 'sha256:stale'],
    ['missing', ''],
    ['misattributed', 'sha256:other-capability'],
  ] as const)(
    'does not persist %s read capability evidence',
    (_name, evidenceDigest) => {
      const store = new InspectableLinearStore();
      const action = linearAdapter.plan('read', {
        context,
        hostCapability: capability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        uuid: observation.fields.uuid,
        currentIdentifier: observation.fields.identifier,
        stepId: 'linear-capability-bound-read',
      });
      const readback = {
        ...observation,
        capabilityEvidenceDigest: evidenceDigest,
        fields: {
          ...observation.fields,
          hostCapability: { ...capability, evidenceDigest },
        },
      };
      const issue = linearAdapter.normalize(observation);
      issue.extensions.capabilityEvidenceDigest = evidenceDigest || undefined;

      expect(continueRead(store, action, readback, issue)).toMatchObject({
        publicValidation: { valid: false },
        verification: [{ field: 'stable-identity', status: 'unavailable' }],
        persisted: false,
      });
      expect(store.records).toHaveLength(0);
    },
  );

  it.each(['create', 'update', 'transition', 'annotate'] as const)(
    'persists only after real public and typed %s verification',
    (operation) => {
      const store = new InspectableLinearStore();
      const action = planMutation(operation);
      const result = continueMutation(store, action, mutationReadback(action));
      expect(result).toMatchObject({
        publicValidation: { valid: true },
        verification: { classification: 'verified' },
        persisted: true,
      });
      expect(store.records).toHaveLength(1);
    },
  );

  it('does not persist mismatched readback or altered action evidence', () => {
    const store = new InspectableLinearStore();
    const action = planMutation('update');
    const mismatch = mutationReadback(action, {
      fields: { title: 'silently unchanged' },
    });
    expect(continueMutation(store, action, mismatch)).toMatchObject({
      verification: { classification: 'partial' },
      persisted: false,
    });
    const altered = structuredClone(action);
    altered.intent.actionDigest = 'sha256:altered';
    expect(
      continueMutation(store, altered, mutationReadback(altered)),
    ).toMatchObject({
      publicValidation: { valid: false },
      verification: { classification: 'uncertain' },
      persisted: false,
    });
    expect(store.records).toHaveLength(0);
  });

  it('does not persist a create result with forged planned provenance', () => {
    const store = new InspectableLinearStore();
    const action = planMutation('create');
    const readback = mutationReadback(action, {
      fields: {
        createProvenance: {
          bindingId: action.intent.bindingId,
          origin: 'local:other',
        },
      },
    });
    expect(continueMutation(store, action, readback)).toMatchObject({
      publicValidation: {
        valid: false,
        reasons: ['create-provenance-mismatch'],
      },
      persisted: false,
    });
    expect(store.records).toHaveLength(0);
  });

  it('resumes after verified observation without repeating the remote effect', () => {
    const store = new InspectableLinearStore();
    const action = planMutation('update');
    const readback = mutationReadback(action);
    expect(() =>
      continueMutation(store, action, readback, {
        crashAfterVerification: true,
      }),
    ).toThrow('crash:after-linear-verification');
    expect(store.records).toHaveLength(0);
    expect(continueMutation(store, action, readback).persisted).toBe(true);
    expect(store.externalEffects).toBe(1);
  });

  it('keeps transition and annotation closeout outcomes independent', () => {
    const store = new InspectableLinearStore();
    const transition = planMutation('transition');
    const annotation = planMutation('annotate');
    expect(
      continueMutation(store, transition, mutationReadback(transition))
        .persisted,
    ).toBe(true);
    expect(
      continueMutation(
        store,
        annotation,
        mutationReadback(annotation, { fields: { annotations: [] } }),
      ).persisted,
    ).toBe(false);
    expect(store.outcomes.get(String(transition.intent.actionDigest))).toBe(
      'verified',
    );
    expect(store.outcomes.get(String(annotation.intent.actionDigest))).toBe(
      'partial',
    );
  });

  it('returns discussion evidence without crossing the persistence boundary', () => {
    const store = new InspectableLinearStore();
    const action = planLinearDiscussionRead({
      context,
      hostCapability: capability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      cursor: null,
      limit: 1,
    });
    expect(
      linearAdapter.validateObservation(action, observation),
    ).toMatchObject({ valid: false });
    expect(
      validateLinearDiscussionReadObservation({
        action,
        hostCapability: capability,
        observation: {
          provider: 'linear',
          context,
          stableId: action.intent.stableId as string,
          availability: 'available',
          capabilityEvidenceDigest: capability.evidenceDigest,
          requestedCursor: null,
          nextCursor: null,
          items: [
            {
              id: 'comment_1',
              body: 'Discussion evidence',
              observedAt: '2026-09-02T12:03:00.000Z',
            },
          ],
        },
      }),
    ).toMatchObject({ classification: 'page', persistable: false });
    expect(store.discussionWrites).toBe(0);
    expect(store.records).toHaveLength(0);
  });

  it('performs exact-context duplicate recovery without persisting ambiguous evidence', () => {
    const store = new InspectableLinearStore();
    const action = planLinearDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_linear_42',
      historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
      maxResults: 10,
    });
    const candidate = {
      uuid: observation.fields.uuid as string,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      identifiers: ['ALPHA-42'],
      context,
      matchedBy: 'reserved-binding' as const,
      matchedReservedBindingId: 'binding_linear_42',
      stableIdentityVerified: true,
      contextVerified: true,
    };
    const base = {
      provider: 'linear' as const,
      context,
      availability: 'available' as const,
      capabilityEvidenceDigest: capability.evidenceDigest,
      queryDigest: action.intent.queryDigest as string,
      observedAt: '2026-09-02T12:05:00.000Z',
    };
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: capability,
        observation: { ...base, results: [candidate] },
      }),
    ).toMatchObject({ accepted: true, classification: 'one-verified-match' });
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: capability,
        observation: {
          ...base,
          results: [
            candidate,
            {
              ...candidate,
              uuid: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
              stableId:
                'linear:workspace_01:9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
            },
          ],
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'ambiguous' });
    expect(store.records).toHaveLength(0);
  });

  it('preserves archived lifecycle evidence without mutation', () => {
    const action = planLinearRead({
      context,
      hostCapability: capability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      uuid: observation.fields.uuid as string,
      currentIdentifier: observation.fields.identifier as string,
      stepId: 'linear-archive-refresh',
    });
    expect(
      classifyLinearReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-02T12:06:00.000Z',
        outcome: 'found',
        observation: {
          ...observation,
          fields: { ...observation.fields, archived: true },
        },
      }).classification,
    ).toBe('archived');
  });
});
