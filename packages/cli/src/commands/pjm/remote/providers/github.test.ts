import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import {
  semanticDigest,
  type SanitizedProviderObservation,
  type SemanticAction,
} from '@commands/pjm/remote/provider';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from '@commands/pjm/remote/schema';
import { describe, expect, it } from 'vitest';

import {
  classifyGitHubReadObservation,
  githubAdapter,
  normalizeGitHubIssueObservation,
  parseGitHubIssueReference,
  planDuplicateSearch,
  planDiscussionRead,
  planGitHubMutation,
  previewGitHubMutation,
  validateDuplicateSearchObservation,
  validateDiscussionReadObservation,
  validateGitHubHostCapability,
  verifyGitHubMutationObservation,
  type GitHubHostCapabilityObservation,
  type GitHubMutationField,
} from './github';
import {
  assessGitHubPublicationSafety,
  observeGitHubRepositoryVisibility,
} from './github-publication-safety';

const observation: SanitizedProviderObservation = {
  provider: 'github',
  context: {
    host: 'github.example',
    accountId: 'account_123',
    repositoryId: 'repo_123',
    owner: 'acme',
    name: 'widgets',
  },
  identity: {
    stableId: 'issue_node_42',
    aliases: [
      'https://github.example/acme/widgets/issues/42',
      'legacy/widgets#7',
    ],
  },
  fields: {
    databaseId: 4200,
    nodeId: 'issue_node_42',
    owner: 'acme',
    name: 'widgets',
    number: 42,
    url: 'https://github.example/acme/widgets/issues/42',
    title: 'Normalize GitHub issues',
    body: 'Bounded issue body',
    state: 'open',
    priority: 'high',
    pullRequests: [
      'https://github.example/acme/widgets/pull/99',
      'https://github.example/acme/widgets/pull/99',
    ],
  },
  revision: {
    token: 'revision-42',
    updatedAt: '2026-09-01T12:00:00.000Z',
    contentDigest: 'sha256:remote',
  },
  capabilityEvidenceDigest: 'sha256:bounded-capability',
};

describe('GitHub semantic adapter', () => {
  it('parses URL and owner/repository issue references without native invocation details', () => {
    expect(
      parseGitHubIssueReference(
        'https://github.example/acme/widgets/issues/42',
      ),
    ).toEqual({
      host: 'github.example',
      owner: 'acme',
      name: 'widgets',
      number: 42,
      alias: 'https://github.example/acme/widgets/issues/42',
    });
    expect(parseGitHubIssueReference('acme/widgets#42')).toEqual({
      owner: 'acme',
      name: 'widgets',
      number: 42,
      alias: 'acme/widgets#42',
    });
    expect(parseGitHubIssueReference('widgets-42')).toBeNull();
  });

  it('normalizes a bounded issue snapshot with stable identity and transfer aliases', () => {
    expect(normalizeGitHubIssueObservation(observation)).toEqual({
      provider: 'github',
      context: observation.context,
      stableId: 'github:github.example:issue_node_42',
      aliases: [
        'acme/widgets#42',
        'https://github.example/acme/widgets/issues/42',
        'legacy/widgets#7',
      ],
      title: 'Normalize GitHub issues',
      description: 'Bounded issue body',
      priority: 'high',
      status: 'open',
      revisionDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      extensions: {
        databaseId: 4200,
        nodeId: 'issue_node_42',
        repositoryId: 'repo_123',
        historicalRepositoryIds: [],
        pullRequests: ['https://github.example/acme/widgets/pull/99'],
      },
    });
  });

  it('keeps stable identity and aliases when repository ID, owner, name, number, and URL move', () => {
    const moved = normalizeGitHubIssueObservation({
      ...observation,
      context: {
        ...observation.context,
        repositoryId: 'repo_456',
        owner: 'new-owner',
        name: 'new-name',
      },
      identity: {
        ...observation.identity,
        aliases: [...observation.identity.aliases, 'acme/widgets#42'],
      },
      fields: {
        ...observation.fields,
        historicalRepositoryIds: ['repo_123'],
        owner: 'new-owner',
        name: 'new-name',
        number: 84,
        url: 'https://github.example/new-owner/new-name/issues/84',
      },
    });
    expect(moved.stableId).toBe(githubAdapter.normalize(observation).stableId);
    expect(moved.aliases).toContain('new-owner/new-name#84');
    expect(moved.aliases).toContain('legacy/widgets#7');
    expect(moved.aliases).toContain('acme/widgets#42');
    expect(moved.extensions).toMatchObject({
      repositoryId: 'repo_456',
      historicalRepositoryIds: ['repo_123'],
    });
  });

  it.each([
    {
      name: 'unavailable access',
      patch: { availability: 'unavailable' as const },
      reasons: ['access-unavailable'],
    },
    {
      name: 'authorization mismatch',
      patch: { accountId: 'account_other' },
      reasons: ['account-mismatch'],
    },
    {
      name: 'repository mismatch',
      patch: { repositoryId: 'repo_other' },
      reasons: ['repository-mismatch'],
    },
    {
      name: 'missing semantic fields',
      patch: { observableFields: ['stable-identity', 'title', 'state'] },
      reasons: ['semantic-field-missing:revision'],
    },
    {
      name: 'rate limiting',
      patch: { availability: 'rate-limited' as const },
      reasons: ['rate-limited'],
    },
    {
      name: 'missing capability',
      patch: { operations: [] },
      reasons: ['capability-missing:read'],
    },
  ])('rejects $name using bounded semantic evidence', ({ patch, reasons }) => {
    expect(
      validateGitHubHostCapability(
        { operation: 'read', context: hostCapability.context },
        { ...hostCapability, ...patch },
      ),
    ).toEqual({ valid: false, reasons });
  });

  it('accepts sufficient capability evidence without persisting auth or a tool catalog', () => {
    expect(
      validateGitHubHostCapability(
        { operation: 'read', context: hostCapability.context },
        hostCapability,
      ),
    ).toEqual({ valid: true, reasons: [] });
    expect(hostCapability).not.toHaveProperty('auth');
    expect(hostCapability).not.toHaveProperty('tools');
    expect(hostCapability).not.toHaveProperty('schema');
  });

  it.each([
    {
      name: 'current',
      input: { outcome: 'found' as const, observation },
      classification: 'current',
    },
    {
      name: 'renamed',
      input: {
        outcome: 'found' as const,
        observation: {
          ...observation,
          context: { ...observation.context, name: 'renamed' },
          fields: {
            ...observation.fields,
            name: 'renamed',
            url: 'https://github.example/acme/renamed/issues/42',
          },
        },
      },
      classification: 'renamed',
    },
    {
      name: 'transferred',
      input: {
        outcome: 'found' as const,
        observation: {
          ...observation,
          context: {
            ...observation.context,
            repositoryId: 'repo_456',
            owner: 'other',
          },
          fields: {
            ...observation.fields,
            owner: 'other',
            number: 84,
            url: 'https://github.example/other/widgets/issues/84',
            transferEvidence: transferEvidence('repo_123', 'repo_456'),
          },
        },
      },
      classification: 'transferred',
    },
    {
      name: 'archived',
      input: { outcome: 'found' as const, observation, archived: true },
      classification: 'archived',
    },
    {
      name: 'inaccessible',
      input: { outcome: 'not-found' as const, authoritativeDeletion: false },
      classification: 'inaccessible',
    },
    {
      name: 'deleted',
      input: {
        outcome: 'not-found' as const,
        structuredDeletion: true,
      },
      classification: 'deleted',
    },
    {
      name: 'temporary failure',
      input: { outcome: 'temporary-failure' as const },
      classification: 'temporarily-unavailable',
    },
  ])(
    'classifies $name without discarding prior binding evidence',
    ({ input, classification }) => {
      const action = githubAdapter.plan('read', {
        context: hostCapability.context,
        currentAlias: 'acme/widgets#42',
        stableNodeId: 'issue_node_42',
        stableId: 'github:github.example:issue_node_42',
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
        stepId: 'lifecycle-read-step',
      });
      const deletionBase = {
        provider: 'github' as const,
        stableId: 'github:github.example:issue_node_42',
        context: hostCapability.context,
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
        actionDigest: action.intent.actionDigest as string,
        stepId: action.intent.stepId as string,
        observedAt: '2026-09-01T12:01:00.000Z',
      };
      const result = classifyGitHubReadObservation({
        action,
        hostCapability,
        observedAt: '2026-09-01T12:01:00.000Z',
        ...('structuredDeletion' in input
          ? {
              outcome: input.outcome,
              deletionEvidence: {
                ...deletionBase,
                evidenceDigest: semanticDigest(deletionBase),
              },
            }
          : input),
      });
      expect(result.classification).toBe(classification);
      expect(result.preservePriorEvidence).toBe(
        !['current', 'renamed', 'transferred', 'archived'].includes(
          classification,
        ),
      );
      if (result.issue) {
        expect(result.freshness).toEqual({
          observedAt: '2026-09-01T12:01:00.000Z',
          revisionStrength: 'strong',
        });
      }
    },
  );

  it.each([
    ['create', { title: 'Normalize GitHub issues' }],
    ['update', { title: 'Normalize GitHub issues' }],
    ['transition', { status: 'closed' }],
    ['annotate', { annotation: 'Completed locally' }],
  ] as const)(
    'fails closed for missing, blocked, stale, mismatched, and altered %s evidence',
    (operation, projection) => {
      const base = mutationInput(operation, projection);
      expect(() =>
        previewGitHubMutation({ ...base, publicationSafety: null as never }),
      ).toThrow();
      expect(() =>
        previewGitHubMutation({
          ...base,
          outboundSafety: { ...base.outboundSafety, verdict: 'blocked' },
        }),
      ).toThrow('blocks execution');
      expect(() =>
        previewGitHubMutation({
          ...base,
          projection: { ...projection, sourceRevision: 'changed' },
        }),
      ).toThrow();
      const preview = previewGitHubMutation(base);
      expect(() =>
        planGitHubMutation({
          ...base,
          approvedPreviewDigest: 'sha256:mismatched-approval',
        }),
      ).toThrow('approval');
      const action = planGitHubMutation({
        ...base,
        approvedPreviewDigest: preview.previewDigest,
      });
      const altered = {
        ...action,
        intent: {
          ...action.intent,
          projection: { ...projection, sourceRevision: 'altered' },
        },
      };
      expect(
        verifyGitHubMutationObservation({
          action: altered,
          attempt: {
            count: 1,
            outcome: 'accepted',
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          },
          hostCapability,
          readback: mutationReadback(action, observation),
        }),
      ).toMatchObject({
        classification: 'uncertain',
        reason: 'action-evidence-invalid',
      });
    },
  );

  it.each([
    {
      name: 'declared stable identity',
      patch: {
        identity: { ...observation.identity, stableId: 'wrong_identity' },
      },
      reason: 'observation-identity-mismatch',
    },
    {
      name: 'capability surface',
      patch: { capabilityEvidenceDigest: 'sha256:other-surface' },
      reason: 'observation-capability-mismatch',
    },
    {
      name: 'account context',
      patch: {
        context: { ...observation.context, accountId: 'account_other' },
      },
      reason: 'observation-account-mismatch',
    },
    {
      name: 'missing account context',
      patch: {
        context: { ...observation.context, accountId: undefined },
      },
      reason: 'observation-account-mismatch',
    },
  ])('rejects a read with mismatched $name', ({ patch, reason }) => {
    const result = classifyGitHubReadObservation({
      action: githubAdapter.plan('read', {
        context: hostCapability.context,
        currentAlias: 'acme/widgets#42',
        stableNodeId: 'issue_node_42',
        stableId: 'github:github.example:issue_node_42',
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
        stepId: 'mismatch-read-step',
      }),
      hostCapability,
      observedAt: '2026-09-01T12:01:00.000Z',
      outcome: 'found',
      observation: { ...observation, ...patch },
    });
    expect(result).toMatchObject({
      classification: 'inaccessible',
      issue: null,
      reasons: [reason],
    });
  });

  it('requires structured transfer evidence before accepting moved repository context', () => {
    const action = githubAdapter.plan('read', {
      context: hostCapability.context,
      currentAlias: 'acme/widgets#42',
      stableNodeId: 'issue_node_42',
      stableId: 'github:github.example:issue_node_42',
      capabilityEvidenceDigest: hostCapability.evidenceDigest,
      stepId: 'transfer-read-step',
    });
    const moved = {
      ...observation,
      context: {
        ...observation.context,
        repositoryId: 'repo_456',
        owner: 'platform',
      },
      fields: {
        ...observation.fields,
        owner: 'platform',
        number: 84,
        url: 'https://github.example/platform/widgets/issues/84',
      },
    };
    expect(
      classifyGitHubReadObservation({
        action,
        hostCapability,
        observedAt: '2026-09-01T12:01:00.000Z',
        outcome: 'found',
        observation: moved,
      }),
    ).toMatchObject({
      classification: 'inaccessible',
      reasons: ['transfer-evidence-missing-or-invalid'],
    });
    expect(
      classifyGitHubReadObservation({
        action,
        hostCapability,
        observedAt: '2026-09-01T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...moved,
          fields: {
            ...moved.fields,
            transferEvidence: transferEvidence('repo_123', 'repo_456'),
          },
        },
      }),
    ).toMatchObject({ classification: 'transferred' });
  });

  it.each([
    {
      name: 'stale',
      evidenceAt: '2020-01-01T00:00:00.000Z',
      actionDigest: 'planned',
      stepId: 'read-step-42',
      legacyDigest: true,
      classification: 'inaccessible',
    },
    {
      name: 'future',
      evidenceAt: '2026-09-01T12:02:00.000Z',
      actionDigest: 'planned',
      stepId: 'read-step-42',
      legacyDigest: false,
      classification: 'inaccessible',
    },
    {
      name: 'wrong action',
      evidenceAt: '2026-09-01T12:01:00.000Z',
      actionDigest: 'sha256:wrong-action',
      stepId: 'read-step-42',
      legacyDigest: true,
      classification: 'inaccessible',
    },
    {
      name: 'wrong step',
      evidenceAt: '2026-09-01T12:01:00.000Z',
      actionDigest: 'planned',
      stepId: 'wrong-step',
      legacyDigest: true,
      classification: 'inaccessible',
    },
    {
      name: 'current exact action and step',
      evidenceAt: '2026-09-01T12:01:00.000Z',
      actionDigest: 'planned',
      stepId: 'read-step-42',
      legacyDigest: false,
      classification: 'deleted',
    },
  ])(
    'classifies $name deletion evidence against the current read',
    ({ evidenceAt, actionDigest, stepId, legacyDigest, classification }) => {
      const action = plannedReadAction();
      const evidence = deletionEvidenceForRead({
        actionDigest:
          actionDigest === 'planned' ? plannedReadActionDigest() : actionDigest,
        stepId,
        observedAt: evidenceAt,
        legacyDigest,
      });
      expect(
        classifyGitHubReadObservation({
          action,
          hostCapability,
          observedAt: '2026-09-01T12:01:00.000Z',
          outcome: 'not-found',
          deletionEvidence: evidence,
        }),
      ).toMatchObject({
        classification,
        preservePriorEvidence: true,
      });
    },
  );

  it('plans create provenance and exact title/managed-body postconditions from a safe projection', () => {
    const projection = {
      title: 'Published title',
      description: 'OAT-owned summary',
    };
    const managedBody =
      'Remote-owned introduction.\n\n<!-- OAT-MANAGED:binding_123:START -->\n## OAT-managed\n\nOAT-owned summary\n<!-- OAT-MANAGED:binding_123:END -->';
    const safety = assessOutboundProjectionSafety(
      { ...projection, description: managedBody },
      {
        assessedAt: '2026-09-02T12:00:00.000Z',
      },
    );
    const base = {
      operation: 'create',
      context: hostCapability.context,
      bindingId: 'binding_123',
      provenance: {
        bindingId: 'binding_123',
        origin: 'local-project:item-42',
      },
      fieldMask: ['title', 'description'],
      descriptionMode: 'managed-section',
      currentBody: 'Remote-owned introduction.',
      projection,
      outboundSafety: safety,
      hostCapability,
      publicationSafety: assessGitHubPublicationSafety({
        visibilityObservation: observeGitHubRepositoryVisibility({
          context: hostCapability.context,
          visibility: 'public',
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
          observedAt: '2026-09-02T12:00:00.000Z',
        }),
        projection: { ...projection, description: managedBody },
        outboundSafety: safety,
        assessedAt: '2026-09-02T12:00:00.000Z',
      }),
    } as const;
    const preview = previewGitHubMutation(base);
    expect(
      planGitHubMutation({
        ...base,
        approvedPreviewDigest: preview.previewDigest,
      }),
    ).toMatchObject({
      provider: 'github',
      operation: 'create',
      context: hostCapability.context,
      intent: {
        bindingId: 'binding_123',
        stableId: null,
        provenance: {
          bindingId: 'binding_123',
          origin: 'local-project:item-42',
        },
        fieldMask: ['title', 'description'],
        projection: {
          title: 'Published title',
          description: managedBody,
        },
        postconditions: {
          title: 'Published title',
          description: managedBody,
        },
        outboundSafety: {
          projectionDigest: safety.projectionDigest,
          resultDigest: safety.resultDigest,
        },
        previewDigest: preview.previewDigest,
        approvalDigest: preview.previewDigest,
      },
    });
  });

  it('plans full-body updates and a safe priority extension', () => {
    const projection = {
      description: 'Approved complete body',
      priority: 'high',
    };
    const action = mutationAction('update', projection);
    expect(action.intent.projection).toEqual(projection);
    expect(action.intent.postconditions).toEqual(projection);
  });

  it('rejects unsupported masks and unsafe priority extensions', () => {
    expect(() =>
      previewGitHubMutation({
        ...mutationInput('update', { title: 'Safe' }),
        fieldMask: ['labels' as 'title'],
      }),
    ).toThrow('Unsupported GitHub mutation field');
    const priorityProjection = { priority: 'critical' };
    expect(() =>
      previewGitHubMutation(mutationInput('update', priorityProjection)),
    ).toThrow('Unsupported GitHub priority');
  });

  it.each([
    {
      name: 'create',
      operation: 'create' as const,
      postconditions: { title: 'Normalize GitHub issues' },
    },
    {
      name: 'edit',
      operation: 'update' as const,
      postconditions: { title: 'Normalize GitHub issues' },
    },
    {
      name: 'close',
      operation: 'transition' as const,
      postconditions: { status: 'closed' },
      fields: { ...observation.fields, state: 'closed' },
    },
    {
      name: 'reopen',
      operation: 'transition' as const,
      postconditions: { status: 'open' },
    },
    {
      name: 'comment',
      operation: 'annotate' as const,
      postconditions: { annotation: 'Completed locally' },
      fields: { ...observation.fields, annotations: ['Completed locally'] },
    },
  ])(
    'verifies one-attempt $name postconditions through pinned readback',
    ({ operation, postconditions, fields }) => {
      const action = mutationAction(operation, postconditions);
      expect(
        verifyGitHubMutationObservation({
          action,
          attempt: {
            count: 1,
            outcome: 'accepted',
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          },
          hostCapability,
          readback: mutationReadback(action, {
            ...observation,
            context: hostCapability.context,
            fields: fields ?? observation.fields,
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          }),
        }),
      ).toMatchObject({ classification: 'verified', retryAllowed: false });
    },
  );

  it('classifies silently dropped fields as partial and blocks retry', () => {
    const action = mutationAction('update', {
      title: 'Normalize GitHub issues',
      priority: 'urgent',
    });
    expect(
      verifyGitHubMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
        },
        hostCapability,
        readback: mutationReadback(action, {
          ...observation,
          context: hostCapability.context,
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
        }),
      }),
    ).toMatchObject({
      classification: 'partial',
      retryAllowed: false,
      fields: [
        { field: 'title', status: 'verified' },
        { field: 'priority', status: 'mismatch' },
      ],
    });
  });

  it.each([
    { outcome: 'rejected' as const, classification: 'rejected' },
    { outcome: 'unknown' as const, classification: 'uncertain' },
  ])('stops after a $outcome attempt', ({ outcome, classification }) => {
    const result = verifyGitHubMutationObservation({
      action: mutationAction('update', { title: 'Normalize GitHub issues' }),
      attempt: {
        count: 1,
        outcome,
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
      },
      hostCapability,
      readback: null,
    });
    expect(result).toMatchObject({ classification, retryAllowed: false });
  });

  it('rejects readback from a capability other than the attempted pinned surface', () => {
    const action = mutationAction('update', {
      title: 'Normalize GitHub issues',
    });
    const result = verifyGitHubMutationObservation({
      action,
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
      },
      hostCapability,
      readback: mutationReadback(action, {
        ...observation,
        context: hostCapability.context,
        capabilityEvidenceDigest: 'sha256:different-surface',
      }),
    });
    expect(result).toMatchObject({
      classification: 'uncertain',
      reason: 'readback-surface-mismatch',
      retryAllowed: false,
    });
  });

  it.each(['create', 'update', 'transition', 'annotate'] as const)(
    'rejects an incomplete generic %s intent that bypasses safety planning',
    (operation) => {
      expect(() =>
        githubAdapter.plan(operation, {
          context: hostCapability.context,
          stableId: observation.identity.stableId,
          postconditions: { title: 'Unsafe bypass' },
        }),
      ).toThrow('complete GitHub mutation input');
    },
  );

  it.each([
    ['create', { title: 'Normalize GitHub issues' }],
    ['update', { title: 'Normalize GitHub issues' }],
    ['transition', { status: 'closed' }],
    ['annotate', { annotation: 'Completed locally' }],
  ] as const)(
    'binds %s projection, capability, safety, publication, approval, identity, and readback evidence',
    (operation, projection) => {
      const action = mutationAction(operation, projection);
      expect(action.intent).toMatchObject({
        projection,
        postconditions: projection,
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
        previewDigest: expect.stringMatching(/^sha256:/),
        approvalDigest: expect.stringMatching(/^sha256:/),
        actionDigest: expect.stringMatching(/^sha256:/),
      });
      const exact = mutationReadback(action, {
        ...observation,
        fields: {
          ...observation.fields,
          ...(operation === 'transition' ? { state: 'closed' } : {}),
          ...(operation === 'annotate'
            ? { annotations: ['Completed locally'] }
            : {}),
        },
      });
      expect(
        verifyGitHubMutationObservation({
          action,
          attempt: {
            count: 1,
            outcome: 'accepted',
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          },
          hostCapability,
          readback: exact,
        }),
      ).toMatchObject({ classification: 'verified' });
      expect(
        verifyGitHubMutationObservation({
          action,
          attempt: {
            count: 1,
            outcome: 'accepted',
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          },
          hostCapability,
          readback: {
            ...exact,
            fields: {
              ...exact.fields,
              mutationEvidence: {
                ...(exact.fields.mutationEvidence as Record<string, unknown>),
                publicationSafetyResultDigest: 'sha256:altered',
              },
            },
          },
        }),
      ).toMatchObject({
        classification: 'uncertain',
        reason: 'readback-action-evidence-mismatch',
      });
    },
  );

  it('plans a bounded duplicate search from provenance, reserved binding ID, aliases, and exact context', () => {
    expect(
      planDuplicateSearch({
        context: hostCapability.context,
        hostCapability,
        provenanceToken: 'origin:local-project:item-42',
        reservedBindingId: 'binding_reserved_42',
        historicalAliases: [
          'acme/widgets#42',
          'legacy/widgets#7',
          'acme/widgets#42',
        ],
        maxResults: 10,
      }),
    ).toEqual({
      provider: 'github',
      operation: 'search-duplicates',
      context: hostCapability.context,
      intent: {
        query: {
          provenanceToken: 'origin:local-project:item-42',
          reservedBindingId: 'binding_reserved_42',
          historicalAliases: ['acme/widgets#42', 'legacy/widgets#7'],
          repository: {
            host: 'github.example',
            repositoryId: 'repo_123',
            owner: 'acme',
            name: 'widgets',
          },
        },
        queryDigest: expect.stringMatching(/^sha256:/),
        resultContract: {
          maxResults: 10,
          classifications: ['no-match', 'one-match', 'ambiguous'],
          matchStatus: 'evidence-until-identity-and-context-verified',
        },
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
      },
    });
  });

  it('fails closed when duplicate search is unsupported or unbounded', () => {
    expect(() =>
      planDuplicateSearch({
        context: hostCapability.context,
        hostCapability: {
          ...hostCapability,
          operations: hostCapability.operations.filter(
            (operation) => operation !== 'search-duplicates',
          ),
        },
        provenanceToken: 'origin:local-project:item-42',
        reservedBindingId: 'binding_reserved_42',
        historicalAliases: [],
        maxResults: 10,
      }),
    ).toThrow('GitHub duplicate search capability is unavailable');
    expect(() =>
      planDuplicateSearch({
        context: hostCapability.context,
        hostCapability,
        provenanceToken: 'origin:local-project:item-42',
        reservedBindingId: 'binding_reserved_42',
        historicalAliases: [],
        maxResults: 101,
      }),
    ).toThrow('GitHub duplicate search bounds are invalid');
  });

  it('routes public duplicate planning through the bounded planner', () => {
    const input = {
      context: hostCapability.context,
      hostCapability,
      provenanceToken: 'origin:local-project:item-42',
      reservedBindingId: 'binding_reserved_42',
      historicalAliases: ['acme/widgets#42'],
      maxResults: 10,
    };
    expect(githubAdapter.plan('search-duplicates', input)).toEqual(
      planDuplicateSearch(input),
    );
    expect(() =>
      githubAdapter.plan('search-duplicates', {
        ...input,
        maxResults: 1_000_000,
      }),
    ).toThrow('GitHub duplicate search bounds are invalid');
    expect(() =>
      githubAdapter.plan('search-duplicates', {
        context: hostCapability.context,
        maxResults: 1_000_000,
      }),
    ).toThrow('complete GitHub duplicate search input');
  });

  it('rejects a directly forged duplicate action with recomputed oversized contracts', () => {
    const action = duplicateSearchAction();
    const forged = {
      ...action,
      intent: {
        ...action.intent,
        resultContract: {
          maxResults: 1_000_000,
          classifications: ['no-match', 'one-match', 'ambiguous'],
          matchStatus: 'evidence-until-identity-and-context-verified',
        },
      },
    };
    expect(
      validateDuplicateSearchObservation({
        action: forged,
        hostCapability,
        observation: {
          ...duplicateObservation([duplicateCandidate('issue_1')]),
          queryDigest: String(forged.intent.queryDigest),
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'invalid' });
  });

  it('accepts one exact-repository provenance match only after stable identity verification', () => {
    expect(
      validateDuplicateSearchObservation({
        action: duplicateSearchAction(),
        hostCapability,
        observation: duplicateObservation([
          {
            stableId: 'github:github.example:issue_node_42',
            aliases: ['acme/widgets#42'],
            context: hostCapability.context,
            matchedBy: 'provenance',
            matchedProvenanceToken: 'origin:local-project:item-42',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: [],
          },
        ]),
      }),
    ).toEqual({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'github:github.example:issue_node_42',
      reasons: [],
    });
  });

  it('accepts a transferred alias only with verified structured transfer evidence', () => {
    const action = duplicateSearchAction();
    const stableId = 'github:github.example:issue_node_42';
    const movedContext = {
      ...hostCapability.context,
      repositoryId: 'repo_456',
      owner: 'platform',
    };
    expect(
      validateDuplicateSearchObservation({
        action,
        hostCapability,
        observation: duplicateObservation([
          {
            stableId,
            aliases: ['legacy/widgets#7'],
            context: movedContext,
            matchedBy: 'alias',
            matchedAlias: 'legacy/widgets#7',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: ['repo_123'],
            transferEvidence: duplicateTransferEvidence(
              action,
              stableId,
              movedContext,
            ),
          },
        ]),
      }),
    ).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId,
    });
  });

  it.each([
    {
      name: 'wrong host',
      stableId: 'github:evil.example:issue_node_42',
      context: { ...hostCapability.context, host: 'evil.example' },
      historicalRepositoryIds: [],
    },
    {
      name: 'wrong account',
      stableId: 'github:github.example:issue_node_42',
      context: { ...hostCapability.context, accountId: 'account_attacker' },
      historicalRepositoryIds: [],
    },
    {
      name: 'wrong owner',
      stableId: 'github:github.example:issue_node_42',
      context: { ...hostCapability.context, owner: 'attacker' },
      historicalRepositoryIds: [],
    },
    {
      name: 'wrong repository name',
      stableId: 'github:github.example:issue_node_42',
      context: { ...hostCapability.context, name: 'other' },
      historicalRepositoryIds: [],
    },
    {
      name: 'wrong stable identity host namespace',
      stableId: 'github:evil.example:issue_node_42',
      context: hostCapability.context,
      historicalRepositoryIds: [],
    },
    {
      name: 'forged historical repository list',
      stableId: 'github:github.example:issue_node_42',
      context: {
        ...hostCapability.context,
        repositoryId: 'repo_456',
        owner: 'platform',
      },
      historicalRepositoryIds: ['repo_123'],
    },
  ])(
    'rejects duplicate candidate with $name',
    ({ stableId, context, historicalRepositoryIds }) => {
      expect(
        validateDuplicateSearchObservation({
          action: duplicateSearchAction(),
          hostCapability,
          observation: duplicateObservation([
            {
              ...duplicateCandidate(stableId),
              context,
              historicalRepositoryIds,
            },
          ]),
        }),
      ).toMatchObject({ accepted: false });
    },
  );

  it('accepts a moved duplicate only with exact structured transfer evidence', () => {
    const action = duplicateSearchAction();
    const stableId = 'github:github.example:issue_node_42';
    const movedContext = {
      ...hostCapability.context,
      repositoryId: 'repo_456',
      owner: 'platform',
    };
    const moved = {
      ...duplicateCandidate(stableId),
      context: movedContext,
      historicalRepositoryIds: ['repo_123'],
      transferEvidence: duplicateTransferEvidence(
        action,
        stableId,
        movedContext,
      ),
    };
    expect(
      validateDuplicateSearchObservation({
        action,
        hostCapability,
        observation: duplicateObservation([moved]),
      }),
    ).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId,
    });
  });

  it.each([
    {
      name: 'stable identity',
      patch: { stableId: 'github:github.example:issue_other' },
    },
    {
      name: 'planned context',
      patch: {
        fromContext: { ...hostCapability.context, repositoryId: 'repo_other' },
      },
    },
    {
      name: 'current context',
      patch: { toContext: hostCapability.context },
    },
    {
      name: 'capability digest',
      patch: { capabilityEvidenceDigest: 'sha256:other-capability' },
    },
    {
      name: 'query digest',
      patch: { queryDigest: 'sha256:other-query' },
    },
    {
      name: 'observation time',
      patch: { observedAt: '2026-09-02T12:04:00.000Z' },
    },
  ])(
    'rejects transferred duplicate with mismatched $name evidence even when self-digested',
    ({ patch }) => {
      const action = duplicateSearchAction();
      const stableId = 'github:github.example:issue_node_42';
      const movedContext = {
        ...hostCapability.context,
        repositoryId: 'repo_456',
        owner: 'platform',
      };
      const exact = duplicateTransferEvidence(action, stableId, movedContext);
      const moved = {
        ...duplicateCandidate(stableId),
        context: movedContext,
        transferEvidence: alterDuplicateTransferEvidence(exact, patch),
      };
      expect(
        validateDuplicateSearchObservation({
          action,
          hostCapability,
          observation: duplicateObservation([moved]),
        }),
      ).toMatchObject({ accepted: false });
    },
  );

  it.each([
    {
      name: 'no match',
      observation: duplicateObservation([]),
      classification: 'no-match',
      accepted: true,
    },
    {
      name: 'ambiguous matches',
      observation: duplicateObservation([
        duplicateCandidate('issue_1'),
        duplicateCandidate('issue_2'),
      ]),
      classification: 'ambiguous',
      accepted: false,
    },
    {
      name: 'unverified stable identity',
      observation: duplicateObservation([
        { ...duplicateCandidate('issue_1'), stableIdentityVerified: false },
      ]),
      classification: 'ambiguous',
      accepted: false,
    },
    {
      name: 'unavailable capability',
      observation: {
        ...duplicateObservation([]),
        availability: 'unavailable' as const,
      },
      classification: 'unavailable',
      accepted: false,
    },
    {
      name: 'result bound exceeded',
      observation: duplicateObservation(
        Array.from({ length: 11 }, (_, index) =>
          duplicateCandidate(`issue_${index}`),
        ),
      ),
      classification: 'invalid',
      accepted: false,
    },
  ])(
    'classifies $name without accepting ambiguous evidence',
    ({ observation: result, classification, accepted }) => {
      expect(
        validateDuplicateSearchObservation({
          action: duplicateSearchAction(),
          hostCapability,
          observation: result,
        }),
      ).toMatchObject({ classification, accepted });
    },
  );

  it.each([
    {
      name: 'planned capability',
      mutate: (value: ReturnType<typeof duplicateObservation>) => ({
        ...value,
        capabilityEvidenceDigest: 'sha256:other-capability',
      }),
    },
    {
      name: 'planned query',
      mutate: (value: ReturnType<typeof duplicateObservation>) => ({
        ...value,
        queryDigest: 'sha256:other-query',
      }),
    },
    {
      name: 'reserved binding evidence',
      mutate: (value: ReturnType<typeof duplicateObservation>) => ({
        ...value,
        results: [
          {
            ...duplicateCandidate('issue_1'),
            matchedBy: 'reserved-binding' as const,
            matchedAlias: undefined,
            matchedReservedBindingId: 'binding_other',
          },
        ],
      }),
    },
  ])('rejects duplicate evidence mismatched to the $name', ({ mutate }) => {
    expect(
      validateDuplicateSearchObservation({
        action: duplicateSearchAction(),
        hostCapability,
        observation: mutate(
          duplicateObservation([duplicateCandidate('issue_1')]),
        ),
      }),
    ).toMatchObject({ accepted: false });
  });

  it.each([
    { name: 'provider', patch: { provider: 'linear' as never } },
    {
      name: 'context',
      patch: {
        context: { ...hostCapability.context, repositoryId: 'repo_other' },
      },
    },
    {
      name: 'capability',
      patch: { capabilityEvidenceDigest: 'sha256:other-capability' },
    },
    { name: 'query', patch: { queryDigest: 'sha256:other-query' } },
  ])(
    'rejects an unavailable duplicate observation before attributing mismatched $name evidence',
    ({ patch }) => {
      expect(
        validateDuplicateSearchObservation({
          action: duplicateSearchAction(),
          hostCapability,
          observation: {
            ...duplicateObservation([]),
            availability: 'unavailable',
            ...patch,
          },
        }),
      ).toMatchObject({ classification: 'invalid' });
    },
  );

  it('plans a bounded semantic discussion read with a sanitized cursor contract', () => {
    expect(
      planDiscussionRead({
        context: hostCapability.context,
        hostCapability,
        stableId: observation.identity.stableId,
        evidenceKind: 'comments',
        cursor: 'cursor_1',
        limit: 20,
      }),
    ).toEqual({
      provider: 'github',
      operation: 'read-discussion',
      context: hostCapability.context,
      intent: {
        stableId: observation.identity.stableId,
        evidenceKind: 'comments',
        cursor: 'cursor_1',
        limit: 20,
        resultContract: {
          maxItems: 20,
          content: 'sanitized-non-persistent-evidence',
        },
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
      },
    });
    expect(() =>
      planDiscussionRead({
        context: hostCapability.context,
        hostCapability,
        stableId: observation.identity.stableId,
        evidenceKind: 'activity',
        cursor: null,
        limit: 101,
      }),
    ).toThrow('GitHub discussion read bounds are invalid');
  });

  it('routes public discussion planning through the bounded planner', () => {
    const input = {
      context: hostCapability.context,
      hostCapability,
      stableId: 'github:github.example:issue_node_42',
      evidenceKind: 'comments' as const,
      cursor: null,
      limit: 10,
    };
    expect(githubAdapter.plan('read-discussion', input)).toEqual(
      planDiscussionRead(input),
    );
    expect(() =>
      githubAdapter.plan('read-discussion', {
        ...input,
        limit: 1_000_000,
      }),
    ).toThrow('GitHub discussion read bounds are invalid');
    expect(() =>
      githubAdapter.plan('read-discussion', {
        context: hostCapability.context,
        limit: 1_000_000,
      }),
    ).toThrow('complete GitHub discussion read input');
  });

  it('rejects a directly forged discussion action with recomputed oversized contracts', () => {
    const action = planDiscussionRead({
      context: hostCapability.context,
      hostCapability,
      stableId: 'github:github.example:issue_node_42',
      evidenceKind: 'comments',
      cursor: null,
      limit: 10,
    });
    const forged = {
      ...action,
      intent: {
        ...action.intent,
        limit: 1_000_000,
        resultContract: {
          maxItems: 1_000_000,
          content: 'sanitized-non-persistent-evidence',
        },
      },
    };
    expect(
      validateDiscussionReadObservation({
        action: forged,
        hostCapability,
        observation: {
          provider: 'github',
          context: hostCapability.context,
          stableId: 'github:github.example:issue_node_42',
          availability: 'available',
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
          requestedCursor: null,
          nextCursor: null,
          items: [],
        },
      }),
    ).toMatchObject({ classification: 'invalid' });
  });

  it('accepts a sanitized bounded page and suppresses the whole signaled field', () => {
    const action = planDiscussionRead({
      context: hostCapability.context,
      hostCapability,
      stableId: observation.identity.stableId,
      evidenceKind: 'comments',
      cursor: 'cursor_1',
      limit: 20,
    });
    expect(
      validateDiscussionReadObservation({
        action,
        hostCapability,
        observation: {
          provider: 'github',
          context: hostCapability.context,
          stableId: observation.identity.stableId,
          availability: 'available',
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
          requestedCursor: 'cursor_1',
          nextCursor: 'cursor_2',
          items: [
            {
              id: 'comment_1',
              kind: 'comment',
              body: 'Safe discussion summary',
              observedAt: '2026-09-02T12:00:00.000Z',
            },
            {
              id: 'activity_1',
              kind: 'activity',
              body: 'An api key was accidentally posted',
              observedAt: '2026-09-02T12:01:00.000Z',
            },
          ],
        },
      }),
    ).toEqual({
      classification: 'page',
      page: {
        items: [
          {
            id: 'comment_1',
            kind: 'comment',
            body: 'Safe discussion summary',
            observedAt: '2026-09-02T12:00:00.000Z',
            contentSuppressed: false,
          },
          {
            id: 'activity_1',
            kind: 'activity',
            body: WHOLE_FIELD_SUPPRESSION_MARKER,
            observedAt: '2026-09-02T12:01:00.000Z',
            contentSuppressed: true,
          },
        ],
        nextCursor: 'cursor_2',
      },
      persistable: false,
      reasons: [],
    });
  });

  it.each([
    { availability: 'rate-limited' as const, classification: 'rate-limited' },
    {
      availability: 'permission-denied' as const,
      classification: 'permission-denied',
    },
  ])(
    'classifies $availability without returning content',
    ({ availability, classification }) => {
      const result = validateDiscussionReadObservation({
        action: planDiscussionRead({
          context: hostCapability.context,
          hostCapability,
          stableId: observation.identity.stableId,
          evidenceKind: 'activity',
          cursor: null,
          limit: 10,
        }),
        hostCapability,
        observation: {
          provider: 'github',
          context: hostCapability.context,
          stableId: observation.identity.stableId,
          availability,
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
          requestedCursor: null,
          nextCursor: null,
          items: [],
        },
      });
      expect(result).toMatchObject({
        classification,
        page: null,
        persistable: false,
      });
    },
  );

  it('rejects discussion evidence for another action capability or issue', () => {
    const action = planDiscussionRead({
      context: hostCapability.context,
      hostCapability,
      stableId: observation.identity.stableId,
      evidenceKind: 'comments',
      cursor: null,
      limit: 10,
    });
    const base = {
      provider: 'github' as const,
      context: hostCapability.context,
      stableId: observation.identity.stableId,
      availability: 'available' as const,
      capabilityEvidenceDigest: hostCapability.evidenceDigest,
      requestedCursor: null,
      nextCursor: null,
      items: [],
    };
    expect(
      validateDiscussionReadObservation({
        action,
        hostCapability,
        observation: { ...base, stableId: 'issue_other' },
      }),
    ).toMatchObject({ classification: 'invalid' });
    expect(
      validateDiscussionReadObservation({
        action,
        hostCapability,
        observation: {
          ...base,
          capabilityEvidenceDigest: 'sha256:other-capability',
        },
      }),
    ).toMatchObject({ classification: 'invalid' });
  });

  it.each([
    { name: 'provider', patch: { provider: 'linear' as never } },
    {
      name: 'context',
      patch: {
        context: { ...hostCapability.context, repositoryId: 'repo_other' },
      },
    },
    {
      name: 'capability',
      patch: { capabilityEvidenceDigest: 'sha256:other-capability' },
    },
    {
      name: 'stable identity',
      patch: { stableId: 'github:github.example:issue_other' },
    },
    { name: 'cursor', patch: { requestedCursor: 'cursor_other' } },
  ])(
    'rejects a rate-limited discussion observation before attributing mismatched $name evidence',
    ({ patch }) => {
      const action = planDiscussionRead({
        context: hostCapability.context,
        hostCapability,
        stableId: 'github:github.example:issue_node_42',
        evidenceKind: 'comments',
        cursor: 'cursor_1',
        limit: 10,
      });
      expect(
        validateDiscussionReadObservation({
          action,
          hostCapability,
          observation: {
            provider: 'github',
            context: hostCapability.context,
            stableId: 'github:github.example:issue_node_42',
            availability: 'rate-limited',
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
            requestedCursor: 'cursor_1',
            nextCursor: null,
            items: [],
            ...patch,
          },
        }),
      ).toMatchObject({ classification: 'invalid' });
    },
  );

  it.each(['search-duplicates', 'read-discussion'] as const)(
    'fails closed for generic issue validation of specialized %s evidence',
    (operation) => {
      const action =
        operation === 'search-duplicates'
          ? duplicateSearchAction()
          : planDiscussionRead({
              context: hostCapability.context,
              hostCapability,
              stableId: 'github:github.example:issue_node_42',
              evidenceKind: 'comments',
              cursor: null,
              limit: 10,
            });
      const issueObservation = {
        ...observation,
        context: hostCapability.context,
        fields: { ...observation.fields, hostCapability },
      };
      const validationKind =
        operation === 'search-duplicates'
          ? 'duplicate-search'
          : 'discussion-read';
      expect(
        githubAdapter.validateObservation(action, issueObservation),
      ).toEqual({
        valid: false,
        reasons: [`${validationKind}-observation-validator-required`],
      });
      expect(githubAdapter.verificationFields(action)).toEqual([
        `${validationKind}-observation-validation`,
      ]);
      expect(
        githubAdapter.verify(action, githubAdapter.normalize(issueObservation)),
      ).toEqual([
        {
          field: `${validationKind}-observation-validation`,
          status: 'unavailable',
        },
      ]);
    },
  );
});

function mutationInput(
  operation: 'create' | 'update' | 'transition' | 'annotate',
  projection: Record<string, string | null>,
) {
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const publicationSafety = assessGitHubPublicationSafety({
    visibilityObservation: observeGitHubRepositoryVisibility({
      context: hostCapability.context,
      visibility: 'public',
      capabilityEvidenceDigest: hostCapability.evidenceDigest,
      observedAt: '2026-09-02T12:00:00.000Z',
    }),
    projection,
    outboundSafety,
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  return {
    operation,
    context: hostCapability.context,
    bindingId: 'binding_123',
    stableId:
      operation === 'create'
        ? undefined
        : 'github:github.example:issue_node_42',
    provenance:
      operation === 'create'
        ? { bindingId: 'binding_123', origin: 'local-project:item-42' }
        : undefined,
    fieldMask: Object.keys(projection) as GitHubMutationField[],
    descriptionMode: 'replace' as const,
    projection,
    outboundSafety,
    hostCapability,
    publicationSafety,
  };
}

function transferEvidence(fromRepositoryId: string, toRepositoryId: string) {
  const content = {
    provider: 'github' as const,
    stableId: 'github:github.example:issue_node_42',
    fromRepositoryId,
    toRepositoryId,
    capabilityEvidenceDigest: hostCapability.evidenceDigest,
    observedAt: '2026-09-01T12:01:00.000Z',
  };
  return { ...content, evidenceDigest: semanticDigest(content) };
}

function plannedReadAction() {
  return githubAdapter.plan('read', {
    context: hostCapability.context,
    currentAlias: 'acme/widgets#42',
    stableNodeId: 'issue_node_42',
    stableId: 'github:github.example:issue_node_42',
    capabilityEvidenceDigest: hostCapability.evidenceDigest,
    stepId: 'read-step-42',
  });
}

function plannedReadActionDigest() {
  return semanticDigest({
    provider: 'github',
    operation: 'read',
    context: hostCapability.context,
    stableId: 'github:github.example:issue_node_42',
    stableNodeId: 'issue_node_42',
    currentAlias: 'acme/widgets#42',
    capabilityEvidenceDigest: hostCapability.evidenceDigest,
    stepId: 'read-step-42',
  });
}

function deletionEvidenceForRead(input: {
  actionDigest: string;
  stepId: string;
  observedAt: string;
  legacyDigest: boolean;
}) {
  const base = {
    provider: 'github' as const,
    stableId: 'github:github.example:issue_node_42',
    context: hostCapability.context,
    capabilityEvidenceDigest: hostCapability.evidenceDigest,
    observedAt: input.observedAt,
  };
  const evidence = {
    ...base,
    actionDigest: input.actionDigest,
    stepId: input.stepId,
  };
  return {
    ...evidence,
    evidenceDigest: semanticDigest(input.legacyDigest ? base : evidence),
  };
}

function mutationAction(
  operation: 'create' | 'update' | 'transition' | 'annotate',
  projection: Record<string, string | null>,
) {
  const input = mutationInput(operation, projection);
  const preview = previewGitHubMutation(input);
  return planGitHubMutation({
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function mutationReadback(
  action: SemanticAction,
  source: SanitizedProviderObservation,
): SanitizedProviderObservation {
  return {
    ...source,
    context: hostCapability.context,
    fields: {
      ...source.fields,
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
    },
  };
}

function duplicateSearchAction() {
  return planDuplicateSearch({
    context: hostCapability.context,
    hostCapability,
    provenanceToken: 'origin:local-project:item-42',
    reservedBindingId: 'binding_reserved_42',
    historicalAliases: ['acme/widgets#42', 'legacy/widgets#7'],
    maxResults: 10,
  });
}

function duplicateCandidate(stableId: string) {
  return {
    stableId: stableId.startsWith('github:')
      ? stableId
      : `github:github.example:${stableId}`,
    aliases: ['acme/widgets#42'],
    context: hostCapability.context,
    matchedBy: 'alias' as const,
    matchedAlias: 'acme/widgets#42',
    stableIdentityVerified: true,
    contextVerified: true,
    historicalRepositoryIds: [] as string[],
  };
}

function duplicateObservation(
  results: ReturnType<typeof duplicateCandidate>[],
) {
  return {
    provider: 'github' as const,
    context: hostCapability.context,
    availability: 'available' as const,
    capabilityEvidenceDigest: hostCapability.evidenceDigest,
    queryDigest: duplicateSearchAction().intent.queryDigest as string,
    observedAt: '2026-09-02T12:05:00.000Z',
    results,
  };
}

function duplicateTransferEvidence(
  action: SemanticAction,
  stableId: string,
  toContext: typeof hostCapability.context,
) {
  const content = {
    provider: 'github' as const,
    stableId,
    fromContext: action.context,
    toContext,
    capabilityEvidenceDigest: action.intent.capabilityEvidenceDigest as string,
    queryDigest: action.intent.queryDigest as string,
    observedAt: '2026-09-02T12:05:00.000Z',
  };
  return { ...content, evidenceDigest: semanticDigest(content) };
}

function alterDuplicateTransferEvidence(
  evidence: ReturnType<typeof duplicateTransferEvidence>,
  patch: Record<string, unknown>,
) {
  const content: Record<string, unknown> = { ...evidence, ...patch };
  delete content.evidenceDigest;
  return { ...content, evidenceDigest: semanticDigest(content) } as ReturnType<
    typeof duplicateTransferEvidence
  >;
}

const hostCapability: GitHubHostCapabilityObservation = {
  provider: 'github',
  context: {
    host: 'github.example',
    accountId: 'account_123',
    repositoryId: 'repo_123',
    owner: 'acme',
    name: 'widgets',
  },
  availability: 'available',
  accountId: 'account_123',
  repositoryId: 'repo_123',
  operations: [
    'read',
    'create',
    'update',
    'transition',
    'annotate',
    'search-duplicates',
    'read-discussion',
  ],
  observableFields: ['stable-identity', 'title', 'state', 'revision'],
  evidenceDigest: 'sha256:bounded-capability',
};
