import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyGitHubReadObservation,
  githubAdapter,
  normalizeGitHubIssueObservation,
  parseGitHubIssueReference,
  planDuplicateSearch,
  planGitHubMutation,
  validateGitHubHostCapability,
  validateDuplicateSearchObservation,
  verifyGitHubMutationObservation,
  type GitHubHostCapabilityObservation,
} from './github';

const observation: SanitizedProviderObservation = {
  provider: 'github',
  context: {
    host: 'github.example',
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
  capabilityEvidenceDigest: 'sha256:capability',
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
      stableId: 'github:github.example:repo_123:issue_node_42',
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
        pullRequests: ['https://github.example/acme/widgets/pull/99'],
      },
    });
  });

  it('keeps stable identity unchanged when display aliases move', () => {
    const moved = normalizeGitHubIssueObservation({
      ...observation,
      context: { ...observation.context, owner: 'new-owner', name: 'new-name' },
      fields: {
        ...observation.fields,
        owner: 'new-owner',
        name: 'new-name',
        number: 84,
        url: 'https://github.example/new-owner/new-name/issues/84',
      },
    });
    expect(moved.stableId).toBe(githubAdapter.normalize(observation).stableId);
    expect(moved.aliases).toContain('new-owner/new-name#84');
    expect(moved.aliases).toContain('legacy/widgets#7');
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
        authoritativeDeletion: true,
        deletionEvidenceDigest: 'sha256:deletion',
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
      const result = classifyGitHubReadObservation({
        action: githubAdapter.plan('read', {
          context: hostCapability.context,
          currentAlias: 'acme/widgets#42',
          stableNodeId: 'issue_node_42',
        }),
        hostCapability,
        observedAt: '2026-09-01T12:01:00.000Z',
        ...input,
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
    expect(
      planGitHubMutation({
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
      }),
    ).toEqual({
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
      },
    });
  });

  it('plans full-body updates and a safe priority extension', () => {
    const projection = {
      description: 'Approved complete body',
      priority: 'high',
    };
    const action = planGitHubMutation({
      operation: 'update',
      context: hostCapability.context,
      bindingId: 'binding_123',
      stableId: 'github:github.example:repo_123:issue_node_42',
      fieldMask: ['description', 'priority'],
      descriptionMode: 'replace',
      projection,
      outboundSafety: assessOutboundProjectionSafety(projection, {
        assessedAt: '2026-09-02T12:00:00.000Z',
      }),
    });
    expect(action.intent.projection).toEqual(projection);
    expect(action.intent.postconditions).toEqual(projection);
  });

  it('rejects unsupported masks and unsafe priority extensions', () => {
    const safe = assessOutboundProjectionSafety(
      { title: 'Safe' },
      { assessedAt: '2026-09-02T12:00:00.000Z' },
    );
    expect(() =>
      planGitHubMutation({
        operation: 'update',
        context: hostCapability.context,
        bindingId: 'binding_123',
        stableId: 'stable',
        fieldMask: ['labels' as 'title'],
        descriptionMode: 'none',
        projection: { title: 'Safe' },
        outboundSafety: safe,
      }),
    ).toThrow('Unsupported GitHub mutation field');
    const priorityProjection = { priority: 'critical' };
    expect(() =>
      planGitHubMutation({
        operation: 'update',
        context: hostCapability.context,
        bindingId: 'binding_123',
        stableId: 'stable',
        fieldMask: ['priority'],
        descriptionMode: 'none',
        projection: priorityProjection,
        outboundSafety: assessOutboundProjectionSafety(priorityProjection, {
          assessedAt: '2026-09-02T12:00:00.000Z',
        }),
      }),
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
      const action = githubAdapter.plan(operation, {
        context: hostCapability.context,
        stableId: observation.identity.stableId,
        postconditions,
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
          readback: {
            ...observation,
            context: hostCapability.context,
            fields: fields ?? observation.fields,
            capabilityEvidenceDigest: hostCapability.evidenceDigest,
          },
        }),
      ).toMatchObject({ classification: 'verified', retryAllowed: false });
    },
  );

  it('classifies silently dropped fields as partial and blocks retry', () => {
    const action = githubAdapter.plan('update', {
      context: hostCapability.context,
      stableId: observation.identity.stableId,
      postconditions: { title: 'Normalize GitHub issues', priority: 'urgent' },
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
        readback: {
          ...observation,
          context: hostCapability.context,
          capabilityEvidenceDigest: hostCapability.evidenceDigest,
        },
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
      action: githubAdapter.plan('update', {
        context: hostCapability.context,
        stableId: observation.identity.stableId,
        postconditions: { title: 'Normalize GitHub issues' },
      }),
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
    const result = verifyGitHubMutationObservation({
      action: githubAdapter.plan('update', {
        context: hostCapability.context,
        stableId: observation.identity.stableId,
        postconditions: { title: 'Normalize GitHub issues' },
      }),
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: hostCapability.evidenceDigest,
      },
      hostCapability,
      readback: {
        ...observation,
        context: hostCapability.context,
        capabilityEvidenceDigest: 'sha256:different-surface',
      },
    });
    expect(result).toMatchObject({
      classification: 'uncertain',
      reason: 'readback-surface-mismatch',
      retryAllowed: false,
    });
  });

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

  it('accepts one exact-repository provenance match only after stable identity verification', () => {
    expect(
      validateDuplicateSearchObservation({
        action: duplicateSearchAction(),
        hostCapability,
        observation: duplicateObservation([
          {
            stableId: 'issue_node_42',
            aliases: ['acme/widgets#42'],
            context: hostCapability.context,
            matchedBy: 'provenance',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: [],
          },
        ]),
      }),
    ).toEqual({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'issue_node_42',
      reasons: [],
    });
  });

  it('accepts a transferred alias only with verified identity and historical repository context', () => {
    expect(
      validateDuplicateSearchObservation({
        action: duplicateSearchAction(),
        hostCapability,
        observation: duplicateObservation([
          {
            stableId: 'issue_node_42',
            aliases: ['legacy/widgets#7'],
            context: {
              ...hostCapability.context,
              repositoryId: 'repo_456',
              owner: 'platform',
            },
            matchedBy: 'alias',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: ['repo_123'],
          },
        ]),
      }),
    ).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'issue_node_42',
    });
  });

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
});

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
    stableId,
    aliases: ['acme/widgets#42'],
    context: hostCapability.context,
    matchedBy: 'alias' as const,
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
    results,
  };
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
  ],
  observableFields: ['stable-identity', 'title', 'state', 'revision'],
  evidenceDigest: 'sha256:bounded-capability',
};
