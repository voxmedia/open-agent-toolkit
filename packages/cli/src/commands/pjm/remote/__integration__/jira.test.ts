import {
  insertJiraAdfManagedContent,
  replaceJiraAdfManagedContent,
  verifyJiraAdfReplacement,
} from '@commands/pjm/remote/jira-adf';
import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  SanitizedProviderObservation,
  SemanticAction,
} from '@commands/pjm/remote/provider';
import {
  classifyJiraReadObservation,
  jiraAdapter,
  planJiraDuplicateSearch,
  planJiraMutation,
  planJiraRead,
  previewJiraMutation,
  validateJiraDuplicateSearchObservation,
  verifyJiraMutationObservation,
  type JiraHostCapabilityObservation,
  type JiraMutationField,
} from '@commands/pjm/remote/providers/jira';
import { describe, expect, it } from 'vitest';

import {
  FakeLifecycleStore,
  GenericHostExecutor,
  LifecycleHarness,
} from './lifecycle-harness';

const context = {
  host: 'jira.example',
  accountId: 'acct_jira',
  siteId: 'site_01',
  projectId: 'project_200',
};

const capability: JiraHostCapabilityObservation = {
  provider: 'jira',
  context,
  availability: 'available',
  accountId: 'acct_jira',
  siteId: 'site_01',
  projectId: 'project_200',
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
    'description-adf',
    'status',
    'priority',
    'revision',
    'project-context',
    'metadata',
    'transitions',
  ],
  semanticCapabilities: ['structural-description-write'],
  evidenceDigest: 'sha256:jira-capability',
  observedAt: '2026-09-05T12:00:00.000Z',
};

const metadata = {
  evidenceDigest: 'sha256:jira-metadata',
  writableFields: [
    'title',
    'description',
    'priority',
    'status',
    'annotation',
  ] as JiraMutationField[],
  transitions: ['Done'],
};

const observation: SanitizedProviderObservation = {
  provider: 'jira',
  context,
  identity: { stableId: '10042', aliases: ['NEW-42', 'OLD-42'] },
  fields: {
    issueId: '10042',
    siteId: 'site_01',
    projectId: 'project_200',
    key: 'NEW-42',
    historicalKeys: ['OLD-42'],
    historicalProjectIds: ['project_100'],
    title: 'Jira planning issue',
    descriptionText: 'Provider-neutral fixture',
    descriptionAdf: { type: 'doc', version: 1, content: [] },
    status: 'In Progress',
    statusId: '3',
    priority: 'High',
    priorityId: '2',
    issueType: 'Task',
    lifecycle: 'active',
    hostCapability: capability,
  },
  revision: { token: 'jira-rev-1', contentDigest: 'sha256:jira-content' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

class InspectableJiraStore {
  readonly attempted = new Set<string>();
  readonly outcomes = new Map<string, string>();
  externalEffects = 0;
}

function planMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
) {
  const projection =
    operation === 'transition'
      ? { status: 'Done' }
      : operation === 'annotate'
        ? { annotation: 'Completed locally' }
        : operation === 'create'
          ? { title: 'Created title' }
          : { title: 'Updated title' };
  const input = {
    operation,
    context,
    hostCapability: capability,
    normalizedMetadata: metadata,
    bindingId: `binding_jira_${operation}`,
    ...(operation === 'create'
      ? {
          provenance: {
            bindingId: `binding_jira_${operation}`,
            origin: 'local:item-42',
          },
        }
      : { stableId: 'jira:site_01:10042' }),
    fieldMask: Object.keys(projection),
    projection,
    outboundSafety: assessOutboundProjectionSafety(projection, {
      assessedAt: '2026-09-05T12:00:00.000Z',
    }),
  };
  const preview = previewJiraMutation(input);
  return planJiraMutation({
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function planDescriptionMutation(
  before: ReturnType<typeof insertJiraAdfManagedContent>,
  after: ReturnType<typeof replaceJiraAdfManagedContent>,
) {
  const projection = { description: 'updated' };
  const input = {
    operation: 'update' as const,
    context,
    hostCapability: capability,
    normalizedMetadata: metadata,
    bindingId: 'binding_jira_update',
    stableId: 'jira:site_01:10042',
    fieldMask: ['description'],
    projection,
    outboundSafety: assessOutboundProjectionSafety(projection, {
      assessedAt: '2026-09-05T12:00:00.000Z',
    }),
    descriptionAdf: {
      bindingId: 'binding_jira_update',
      before,
      after,
    },
  };
  const preview = previewJiraMutation(input);
  return planJiraMutation({
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function readback(action: SemanticAction, patch: Record<string, unknown> = {}) {
  const projection = action.intent.projection as Record<string, unknown>;
  return {
    ...observation,
    fields: {
      ...observation.fields,
      ...(projection.title === undefined ? {} : { title: projection.title }),
      ...(projection.description === undefined
        ? {}
        : { descriptionText: projection.description }),
      ...(projection.status === undefined ? {} : { status: projection.status }),
      ...(projection.annotation === undefined
        ? {}
        : { annotations: [projection.annotation] }),
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
      ...patch,
    },
  } as SanitizedProviderObservation;
}

function continueMutation(
  store: InspectableJiraStore,
  action: SemanticAction,
  mutationReadback: SanitizedProviderObservation | null,
  outcome: 'accepted' | 'rejected' | 'unknown' = 'accepted',
) {
  const digest = String(action.intent.actionDigest);
  if (!store.attempted.has(digest)) {
    store.attempted.add(digest);
    store.externalEffects += 1;
  }
  const verification = verifyJiraMutationObservation({
    action,
    attempt: {
      count: 1,
      outcome,
      capabilityEvidenceDigest: capability.evidenceDigest,
      metadataEvidenceDigest: metadata.evidenceDigest,
    },
    hostCapability: capability,
    normalizedMetadata: metadata,
    readback: mutationReadback,
  });
  store.outcomes.set(digest, verification.classification);
  return verification;
}

describe('Jira remote lifecycle integration', () => {
  it('intakes and refreshes through immutable issue identity while retaining key history', () => {
    const intaken = jiraAdapter.normalize(observation);
    const action = planJiraRead({
      context,
      hostCapability: capability,
      stableId: intaken.stableId,
      issueId: '10042',
      currentKey: 'OLD-42',
      stepId: 'jira-refresh',
    });
    expect(jiraAdapter.validateObservation(action, observation)).toEqual({
      valid: true,
      reasons: [],
    });
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation,
      }),
    ).toMatchObject({
      classification: 'moved',
      issue: { stableId: 'jira:site_01:10042' },
    });
  });

  it('retains immutable issue identity across a validated project move and rejects forged move history', () => {
    const priorContext = { ...context, projectId: 'project_100' };
    const priorCapability = {
      ...capability,
      context: priorContext,
      projectId: 'project_100',
      evidenceDigest: 'sha256:jira-prior-capability',
      observedAt: '2026-09-05T11:00:00.000Z',
    };
    const action = planJiraRead({
      context: priorContext,
      hostCapability: priorCapability,
      stableId: 'jira:site_01:10042',
      issueId: '10042',
      currentKey: 'OLD-42',
      stepId: 'jira-project-move-refresh',
    });
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation,
      }),
    ).toMatchObject({
      classification: 'moved',
      issue: { stableId: 'jira:site_01:10042' },
    });
    expect(
      jiraAdapter.validateObservation(action, {
        ...observation,
        fields: {
          ...observation.fields,
          historicalProjectIds: ['project_unrelated'],
        },
      }).valid,
    ).toBe(false);
  });

  it('publishes and reconciles while preserving remote-owned ADF structurally', () => {
    const before = {
      type: 'doc' as const,
      version: 1 as const,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Remote-owned' }],
        },
      ],
    };
    const inserted = insertJiraAdfManagedContent(
      before,
      'binding_jira_update',
      'first',
    );
    const after = replaceJiraAdfManagedContent(
      inserted,
      'binding_jira_update',
      'updated',
    );
    expect(
      verifyJiraAdfReplacement(
        inserted,
        after,
        'binding_jira_update',
        'updated',
      ),
    ).toBe(true);
    const store = new InspectableJiraStore();
    const action = planDescriptionMutation(inserted, after);
    expect(
      continueMutation(
        store,
        action,
        readback(action, { descriptionAdf: after }),
      ).classification,
    ).toBe('verified');
    const lossy = { type: 'doc', version: 1, content: [] };
    expect(
      continueMutation(
        store,
        action,
        readback(action, { descriptionAdf: lossy }),
      ).classification,
    ).toBe('uncertain');
    expect(store.externalEffects).toBe(1);
  });

  it('resumes the shared lifecycle store after observation without replaying the effect', async () => {
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    const action = planMutation('update');
    const lifecycleContext = {
      host: context.host,
      siteId: context.siteId,
      projectId: context.projectId,
    };
    const input = {
      operationId: 'op_jira_resume',
      bindingId: 'binding_jira_update',
      provider: 'jira' as const,
      context: lifecycleContext,
      projection: action.intent.projection as { title: string },
      previewDigest: String(action.intent.previewDigest),
      approvalDigest: String(action.intent.executionEvidence.approvalDigest),
      capabilityEvidenceDigest: String(action.intent.capabilityEvidenceDigest),
    };
    const crashed = new LifecycleHarness({ store, executor });
    await expect(
      crashed.publish({ ...input, crashAt: 'after-observation' }),
    ).rejects.toThrow('crash:after-observation');

    const resumed = new LifecycleHarness({
      store,
      executor,
      readback: async () => input.projection,
    });
    await expect(resumed.publish(input)).resolves.toMatchObject({
      state: 'verified',
      materializationSteps: [
        'metadata',
        'state',
        'snapshot',
        'baseline',
        'association',
      ],
    });
    expect(executor.calls).toBe(1);
  });

  it('fails shared lifecycle recovery closed after an uncertain attempt or mismatched readback', async () => {
    const action = planMutation('update');
    const lifecycleContext = {
      host: context.host,
      siteId: context.siteId,
      projectId: context.projectId,
    };
    const input = {
      bindingId: 'binding_jira_update',
      provider: 'jira' as const,
      context: lifecycleContext,
      projection: action.intent.projection as { title: string },
      previewDigest: String(action.intent.previewDigest),
      approvalDigest: String(action.intent.executionEvidence.approvalDigest),
      capabilityEvidenceDigest: String(action.intent.capabilityEvidenceDigest),
    };
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    const crashed = new LifecycleHarness({ store, executor });
    await expect(
      crashed.publish({
        ...input,
        operationId: 'op_jira_uncertain',
        crashAt: 'after-attempt-started',
      }),
    ).rejects.toThrow('crash:after-attempt-started');
    await expect(
      new LifecycleHarness({ store, executor }).publish({
        ...input,
        operationId: 'op_jira_uncertain',
      }),
    ).resolves.toMatchObject({ state: 'uncertain' });
    expect(executor.calls).toBe(0);

    await expect(
      new LifecycleHarness({
        readback: async () => ({ title: 'mismatched' }),
      }).publish({ ...input, operationId: 'op_jira_mismatch' }),
    ).resolves.toMatchObject({ state: 'uncertain' });
  });

  it('persists an unknown create attempt and never blindly retries it', () => {
    const store = new InspectableJiraStore();
    const action = planMutation('create');
    expect(continueMutation(store, action, null, 'unknown')).toMatchObject({
      classification: 'uncertain',
      retryAllowed: false,
    });
    expect(
      continueMutation(store, action, null, 'unknown').classification,
    ).toBe('uncertain');
    expect(store.externalEffects).toBe(1);
  });

  it('fails closed before an unavailable transition or stale metadata can become an effect', () => {
    expect(() =>
      previewJiraMutation({
        operation: 'transition',
        context,
        hostCapability: { ...capability, operations: ['read'] },
        normalizedMetadata: metadata,
        bindingId: 'binding_transition',
        stableId: 'jira:site_01:10042',
        fieldMask: ['status'],
        projection: { status: 'Done' },
        outboundSafety: assessOutboundProjectionSafety(
          { status: 'Done' },
          { assessedAt: '2026-09-05T12:00:00.000Z' },
        ),
      }),
    ).toThrow('capability');
    expect(() =>
      previewJiraMutation({
        operation: 'transition',
        context,
        hostCapability: capability,
        normalizedMetadata: { ...metadata, transitions: [] },
        bindingId: 'binding_transition',
        stableId: 'jira:site_01:10042',
        fieldMask: ['status'],
        projection: { status: 'Done' },
        outboundSafety: assessOutboundProjectionSafety(
          { status: 'Done' },
          { assessedAt: '2026-09-05T12:00:00.000Z' },
        ),
      }),
    ).toThrow('transition');
  });

  it('records annotation and transition closeout outcomes independently', () => {
    const store = new InspectableJiraStore();
    const annotation = planMutation('annotate');
    const transition = planMutation('transition');
    expect(
      continueMutation(store, annotation, readback(annotation)).classification,
    ).toBe('verified');
    expect(
      continueMutation(store, transition, null, 'rejected').classification,
    ).toBe('rejected');
    expect(store.externalEffects).toBe(2);
  });

  it('uses only generic external-action evidence and rejects unpinned readback', () => {
    const action = planMutation('update');
    expect(JSON.stringify(action)).not.toMatch(
      /command|executable|arguments|catalog/i,
    );
    expect(
      jiraAdapter.validateObservation(action, {
        ...readback(action),
        context: { ...context, siteId: 'site_other' },
      }).valid,
    ).toBe(false);
  });

  it('plans duplicate recovery from provenance and historical keys without a native query', () => {
    const action = planJiraDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42'],
      maxResults: 20,
    });
    expect(action.intent).toMatchObject({
      query: {
        historicalKeys: ['OLD-42'],
        siteId: 'site_01',
        projectId: 'project_200',
      },
      resultContract: { maxResults: 20, requireExactContext: true },
    });
    expect(JSON.stringify(action)).not.toMatch(
      /command|executable|arguments|catalog|query language/i,
    );
  });

  it('recovers one duplicate only after pinned capability, identity, and context verification', () => {
    const action = planJiraDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42'],
      maxResults: 20,
    });
    expect(
      validateJiraDuplicateSearchObservation({
        action,
        hostCapability: capability,
        observation: {
          provider: 'jira',
          context,
          availability: 'available',
          capabilityEvidenceDigest: capability.evidenceDigest,
          queryDigest: String(action.intent.queryDigest),
          observedAt: '2026-09-05T12:00:00.000Z',
          results: [
            {
              issueId: '10042',
              stableId: 'jira:site_01:10042',
              keys: ['NEW-42', 'OLD-42'],
              context,
              matchedBy: 'historical-key',
              matchedHistoricalKey: 'OLD-42',
              stableIdentityVerified: true,
              contextVerified: true,
            },
          ],
        },
      }),
    ).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'jira:site_01:10042',
    });
  });

  it('does not treat lagging or ambiguous duplicate evidence as recoverable', () => {
    const action = planJiraDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42'],
      maxResults: 20,
    });
    const base = {
      provider: 'jira' as const,
      context,
      capabilityEvidenceDigest: capability.evidenceDigest,
      queryDigest: String(action.intent.queryDigest),
      observedAt: '2026-09-05T12:00:00.000Z',
      results: [],
    };
    expect(
      validateJiraDuplicateSearchObservation({
        action,
        hostCapability: capability,
        observation: { ...base, availability: 'lagging' },
      }),
    ).toMatchObject({ accepted: false, classification: 'lagging' });
    const candidate = {
      issueId: '10042',
      stableId: 'jira:site_01:10042',
      keys: ['OLD-42'],
      context,
      matchedBy: 'historical-key' as const,
      matchedHistoricalKey: 'OLD-42',
      stableIdentityVerified: true,
      contextVerified: true,
    };
    expect(
      validateJiraDuplicateSearchObservation({
        action,
        hostCapability: capability,
        observation: {
          ...base,
          availability: 'available',
          results: [
            candidate,
            { ...candidate, issueId: '10043', stableId: 'jira:site_01:10043' },
          ],
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'ambiguous' });
  });
});
