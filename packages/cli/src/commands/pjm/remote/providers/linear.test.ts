import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyLinearReadObservation,
  normalizeLinearIssueObservation,
  parseLinearIssueReference,
  planLinearDuplicateSearch,
  planLinearMutation,
  planLinearDiscussionRead,
  planLinearRead,
  previewLinearMutation,
  validateLinearDiscussionReadObservation,
  validateLinearDuplicateSearchObservation,
  verifyLinearMutationObservation,
  type LinearHostCapabilityObservation,
} from './linear';

export const linearContext = {
  host: 'linear.example',
  accountId: 'acct_linear',
  workspaceId: 'workspace_01',
  teamId: 'team_alpha',
};

export const linearObservation: SanitizedProviderObservation = {
  provider: 'linear',
  context: linearContext,
  identity: {
    stableId: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    aliases: ['ALPHA-42', 'OLD-19'],
  },
  fields: {
    uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    identifier: 'ALPHA-42',
    historicalIdentifiers: ['OLD-19'],
    workspaceId: 'workspace_01',
    teamId: 'team_alpha',
    historicalTeamIds: ['team_old'],
    title: 'Linear planning issue',
    description: 'Provider-neutral fixture',
    state: 'started',
    priority: 'high',
    archived: false,
    estimate: 3,
    cycleId: 'cycle_17',
  },
  revision: {
    token: 'rev-linear-42',
    updatedAt: '2026-09-02T12:00:00.000Z',
    contentDigest: 'sha256:linear-content',
  },
  capabilityEvidenceDigest: 'sha256:linear-capability',
};

export const linearCapability: LinearHostCapabilityObservation = {
  provider: 'linear',
  context: linearContext,
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

describe('Linear identity and normalization', () => {
  it.each([
    ['ALPHA-42', { identifier: 'ALPHA-42' }],
    [
      'https://linear.example/acme/issue/ALPHA-42/example',
      { host: 'linear.example', identifier: 'ALPHA-42' },
    ],
  ])(
    'parses %s without treating the mutable identifier as identity',
    (value, expected) => {
      expect(parseLinearIssueReference(value)).toMatchObject(expected);
    },
  );

  it('normalizes by durable UUID and retains only allowlisted extensions', () => {
    expect(normalizeLinearIssueObservation(linearObservation)).toEqual({
      provider: 'linear',
      context: linearContext,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      aliases: ['ALPHA-42', 'OLD-19'],
      title: 'Linear planning issue',
      description: 'Provider-neutral fixture',
      priority: 'high',
      status: 'started',
      revisionDigest: expect.stringMatching(/^sha256:/),
      extensions: {
        uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        workspaceId: 'workspace_01',
        teamId: 'team_alpha',
        historicalTeamIds: ['team_old'],
        currentIdentifier: 'ALPHA-42',
        historicalIdentifiers: ['OLD-19'],
        archived: false,
        estimate: 3,
        cycleId: 'cycle_17',
        suppressedFields: [],
      },
    });
  });

  it('suppresses an entire allowlisted inbound text field and marks incompleteness', () => {
    const issue = normalizeLinearIssueObservation({
      ...linearObservation,
      fields: {
        ...linearObservation.fields,
        description: 'Access token: do not retain this value',
      },
    });
    expect(issue.description).toBe('[SUPPRESSED:SENSITIVE-CONTENT]');
    expect(issue.extensions.suppressedFields).toEqual(['description']);
    expect(JSON.stringify(issue)).not.toContain('do not retain this value');
  });

  it('rejects identity and context mismatches', () => {
    expect(() =>
      normalizeLinearIssueObservation({
        ...linearObservation,
        context: { ...linearContext, teamId: 'team_other' },
      }),
    ).toThrow('context');
  });
});

describe('Linear semantic read intents', () => {
  it('plans a provider-neutral pinned lookup without a native invocation', () => {
    const action = planLinearRead({
      context: linearContext,
      hostCapability: linearCapability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      currentIdentifier: 'ALPHA-42',
      stepId: 'linear-read-01',
    });
    expect(action).toMatchObject({
      provider: 'linear',
      operation: 'read',
      context: linearContext,
      intent: {
        uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        currentIdentifier: 'ALPHA-42',
        capabilityEvidenceDigest: 'sha256:linear-capability',
        resultContract: {
          requireStableIdentity: true,
          requireExactContext: true,
        },
      },
    });
    expect(action).not.toHaveProperty('tool');
    expect(action).not.toHaveProperty('command');
    expect(JSON.stringify(action)).not.toMatch(/graphql|mcp|linear-cli/i);
  });

  it('fails closed on workspace/team ambiguity and missing capability', () => {
    expect(() =>
      planLinearRead({
        context: { ...linearContext, teamId: undefined },
        hostCapability: linearCapability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        currentIdentifier: 'ALPHA-42',
        stepId: 'linear-read-02',
      }),
    ).toThrow('context');
    expect(() =>
      planLinearRead({
        context: linearContext,
        hostCapability: { ...linearCapability, operations: [] },
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        currentIdentifier: 'ALPHA-42',
        stepId: 'linear-read-03',
      }),
    ).toThrow('capability');
  });

  it('plans bounded, non-persistent discussion evidence', () => {
    const action = planLinearDiscussionRead({
      context: linearContext,
      hostCapability: linearCapability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      cursor: null,
      limit: 25,
    });
    expect(action).toMatchObject({
      operation: 'read-discussion',
      intent: {
        cursor: null,
        limit: 25,
        resultContract: { maxItems: 25, persistable: false },
      },
    });
    expect(() =>
      planLinearDiscussionRead({
        context: linearContext,
        hostCapability: linearCapability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        cursor: null,
        limit: 101,
      }),
    ).toThrow('bounds');
  });
});

describe('Linear semantic mutation intents', () => {
  const mutationInput = {
    operation: 'update' as const,
    context: linearContext,
    hostCapability: linearCapability,
    bindingId: 'binding_linear_42',
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    fieldMask: ['title', 'priority'] as const,
    projection: { title: 'Updated title', priority: 'urgent' },
    outboundSafety: assessOutboundProjectionSafety(
      { title: 'Updated title', priority: 'urgent' },
      { assessedAt: '2026-09-02T12:00:00.000Z' },
    ),
  };

  it('binds projection, safety, preview, approval, action, and readback evidence', () => {
    const preview = previewLinearMutation(mutationInput);
    const action = planLinearMutation({
      ...mutationInput,
      approvedPreviewDigest: preview.previewDigest,
    });
    expect(action).toMatchObject({
      provider: 'linear',
      operation: 'update',
      context: linearContext,
      intent: {
        bindingId: 'binding_linear_42',
        fieldMask: ['title', 'priority'],
        projection: { title: 'Updated title', priority: 'urgent' },
        postconditions: { title: 'Updated title', priority: 'urgent' },
        previewDigest: preview.previewDigest,
        approvalDigest: preview.previewDigest,
        readbackContract: {
          pinned: true,
          requireStableIdentity: true,
          requireExactContext: true,
        },
      },
    });
    expect(action.intent).toHaveProperty('actionDigest');
    expect(action).not.toHaveProperty('tool');
    expect(action).not.toHaveProperty('command');
  });

  it.each([
    ['create', { title: 'New Linear issue' }],
    ['transition', { status: 'completed' }],
    ['annotate', { annotation: 'Completed locally' }],
  ] as const)(
    'plans %s only from an explicit normalized projection',
    (operation, projection) => {
      const outboundSafety = assessOutboundProjectionSafety(projection, {
        assessedAt: '2026-09-02T12:00:00.000Z',
      });
      const input = {
        operation,
        context: linearContext,
        hostCapability: linearCapability,
        bindingId: 'binding_linear_42',
        ...(operation === 'create'
          ? {
              provenance: {
                bindingId: 'binding_linear_42',
                origin: 'local:item-42',
              },
            }
          : {
              stableId:
                'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
            }),
        fieldMask: Object.keys(projection),
        projection,
        outboundSafety,
      };
      const preview = previewLinearMutation(input);
      expect(
        planLinearMutation({
          ...input,
          approvedPreviewDigest: preview.previewDigest,
        }),
      ).toMatchObject({ operation, intent: { projection } });
    },
  );

  it('blocks missing capability, blocked safety, and stale approval before an attempt', () => {
    expect(() =>
      previewLinearMutation({
        ...mutationInput,
        hostCapability: { ...linearCapability, operations: ['read'] },
      }),
    ).toThrow('capability');
    expect(() =>
      previewLinearMutation({
        ...mutationInput,
        projection: { title: 'api key should not leave OAT' },
        fieldMask: ['title'],
        outboundSafety: assessOutboundProjectionSafety(
          { title: 'api key should not leave OAT' },
          { assessedAt: '2026-09-02T12:00:00.000Z' },
        ),
      }),
    ).toThrow('blocks');
    expect(() =>
      planLinearMutation({
        ...mutationInput,
        approvedPreviewDigest: 'sha256:stale',
      }),
    ).toThrow('approval');
  });
});

describe('Linear read observations', () => {
  const readAction = planLinearRead({
    context: linearContext,
    hostCapability: linearCapability,
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    currentIdentifier: 'ALPHA-42',
    stepId: 'linear-read-observation',
  });

  it('accepts a sanitized exact-context observation and detects archive/move', () => {
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: linearObservation,
      }),
    ).toMatchObject({
      classification: 'current',
      preservePriorEvidence: false,
    });
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...linearObservation,
          fields: { ...linearObservation.fields, archived: true },
        },
      }).classification,
    ).toBe('archived');
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...linearObservation,
          fields: {
            ...linearObservation.fields,
            identifier: 'BETA-42',
            historicalIdentifiers: ['ALPHA-42'],
          },
        },
      }).classification,
    ).toBe('moved');
  });

  it.each([
    [
      'unavailable',
      { ...linearCapability, availability: 'unavailable' as const },
    ],
    [
      'authorization-required',
      { ...linearCapability, availability: 'authorization-required' as const },
    ],
    [
      'context-mismatch',
      { ...linearCapability, context: { ...linearContext, teamId: 'wrong' } },
    ],
  ])('fails closed for %s capability evidence', (_name, hostCapability) => {
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: linearObservation,
      }),
    ).toMatchObject({
      classification: 'inaccessible',
      preservePriorEvidence: true,
    });
  });

  it('marks partial response and temporary failure without retaining native payloads', () => {
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...linearObservation,
          fields: { ...linearObservation.fields, title: undefined },
        },
      }).classification,
    ).toBe('partial');
    expect(
      classifyLinearReadObservation({
        action: readAction,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'temporary-failure',
      }).classification,
    ).toBe('temporarily-unavailable');
  });

  it('validates a bounded sanitized discussion page as non-persistent evidence', () => {
    const action = planLinearDiscussionRead({
      context: linearContext,
      hostCapability: linearCapability,
      stableId: readAction.intent.stableId as string,
      cursor: null,
      limit: 2,
    });
    expect(
      validateLinearDiscussionReadObservation({
        action,
        hostCapability: linearCapability,
        observation: {
          provider: 'linear',
          context: linearContext,
          stableId: readAction.intent.stableId as string,
          availability: 'available',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
          requestedCursor: null,
          nextCursor: 'cursor_2',
          items: [
            {
              id: 'comment_1',
              body: 'Discussion evidence',
              observedAt: '2026-09-02T12:01:00.000Z',
            },
          ],
        },
      }),
    ).toMatchObject({ classification: 'page', persistable: false });
  });
});

describe('Linear mutation observations', () => {
  const projection = { title: 'Updated title', priority: 'urgent' };
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const mutationInput = {
    operation: 'update' as const,
    context: linearContext,
    hostCapability: linearCapability,
    bindingId: 'binding_linear_42',
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    fieldMask: ['title', 'priority'],
    projection,
    outboundSafety,
  };
  const preview = previewLinearMutation(mutationInput);
  const action = planLinearMutation({
    ...mutationInput,
    approvedPreviewDigest: preview.previewDigest,
  });
  const readback = {
    ...linearObservation,
    fields: {
      ...linearObservation.fields,
      title: 'Updated title',
      priority: 'urgent',
      mutationEvidence: action.intent.executionEvidence,
    },
  };

  it('requires one accepted attempt and exact pinned authoritative readback', () => {
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback,
      }),
    ).toEqual({
      classification: 'verified',
      reason: 'authoritative-readback-matched',
      fields: [
        { field: 'title', status: 'verified' },
        { field: 'priority', status: 'verified' },
      ],
      retryAllowed: false,
    });
  });

  it('classifies rejection, unknown-after-attempt, and missing readback without retry', () => {
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'rejected',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: null,
      }).classification,
    ).toBe('rejected');
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'unknown',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: null,
      }),
    ).toMatchObject({ classification: 'uncertain', retryAllowed: false });
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: null,
      }).classification,
    ).toBe('uncertain');
  });

  it('detects silently dropped fields and mismatched pinned evidence', () => {
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: {
          ...readback,
          fields: { ...readback.fields, priority: 'high' },
        },
      }),
    ).toMatchObject({
      classification: 'partial',
      fields: [
        { field: 'title', status: 'verified' },
        { field: 'priority', status: 'mismatch' },
      ],
      retryAllowed: false,
    });
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: {
          ...readback,
          context: { ...linearContext, teamId: 'wrong' },
        },
      }).classification,
    ).toBe('uncertain');
  });
});

describe('Linear duplicate-search intents', () => {
  it('plans a bounded provenance and historical-identifier search', () => {
    const action = planLinearDuplicateSearch({
      context: linearContext,
      hostCapability: linearCapability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_linear_42',
      historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
      maxResults: 10,
    });
    expect(action).toMatchObject({
      provider: 'linear',
      operation: 'search-duplicates',
      context: linearContext,
      intent: {
        query: {
          provenanceToken: 'origin:local:item-42',
          reservedBindingId: 'binding_linear_42',
          historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
          workspaceId: 'workspace_01',
          teamId: 'team_alpha',
        },
        resultContract: {
          maxResults: 10,
          requireStableUuid: true,
          requireExactContext: true,
        },
      },
    });
    expect(action.intent).toHaveProperty('queryDigest');
    expect(JSON.stringify(action)).not.toMatch(/graphql|mcp|toolName|command/i);
  });

  it('fails closed when search is unavailable or unbounded', () => {
    const base = {
      context: linearContext,
      hostCapability: linearCapability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_linear_42',
      historicalIdentifiers: ['ALPHA-42'],
      maxResults: 10,
    };
    expect(() =>
      planLinearDuplicateSearch({
        ...base,
        hostCapability: { ...linearCapability, operations: ['read'] },
      }),
    ).toThrow('unavailable');
    expect(() =>
      planLinearDuplicateSearch({ ...base, maxResults: 101 }),
    ).toThrow('bounds');
    expect(() =>
      planLinearDuplicateSearch({
        ...base,
        historicalIdentifiers: ['ALPHA-42', 'ALPHA-42'],
      }),
    ).toThrow('bounds');
  });
});

describe('Linear duplicate-search observations', () => {
  const action = planLinearDuplicateSearch({
    context: linearContext,
    hostCapability: linearCapability,
    provenanceToken: 'origin:local:item-42',
    reservedBindingId: 'binding_linear_42',
    historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
    maxResults: 10,
  });
  const candidate = {
    uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    identifiers: ['ALPHA-42'],
    context: linearContext,
    matchedBy: 'provenance' as const,
    matchedProvenanceToken: 'origin:local:item-42',
    stableIdentityVerified: true,
    contextVerified: true,
  };
  const observation = {
    provider: 'linear' as const,
    context: linearContext,
    availability: 'available' as const,
    capabilityEvidenceDigest: linearCapability.evidenceDigest,
    queryDigest: action.intent.queryDigest as string,
    observedAt: '2026-09-02T12:05:00.000Z',
    results: [candidate],
  };

  it('accepts exactly one stable UUID/context match from provenance', () => {
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: linearCapability,
        observation,
      }),
    ).toEqual({
      accepted: true,
      classification: 'one-verified-match',
      stableId: candidate.stableId,
      reasons: [],
    });
  });

  it('accepts one exact historical-identifier match but not an unplanned alias', () => {
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: linearCapability,
        observation: {
          ...observation,
          results: [
            {
              ...candidate,
              matchedBy: 'identifier',
              matchedProvenanceToken: undefined,
              matchedIdentifier: 'OLD-19',
              identifiers: ['ALPHA-42', 'OLD-19'],
            },
          ],
        },
      }).accepted,
    ).toBe(true);
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: linearCapability,
        observation: {
          ...observation,
          results: [
            {
              ...candidate,
              matchedBy: 'identifier',
              matchedProvenanceToken: undefined,
              matchedIdentifier: 'OTHER-7',
            },
          ],
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'ambiguous' });
  });

  it('returns no-match, unavailable, and bounded ambiguity explicitly', () => {
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: linearCapability,
        observation: { ...observation, results: [] },
      }),
    ).toMatchObject({ accepted: true, classification: 'no-match' });
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: { ...linearCapability, availability: 'unavailable' },
        observation: {
          ...observation,
          availability: 'unavailable',
          results: [],
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'unavailable' });
    expect(
      validateLinearDuplicateSearchObservation({
        action,
        hostCapability: linearCapability,
        observation: {
          ...observation,
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
  });

  it('rejects mismatched context, query, capability, and unverified identity', () => {
    for (const changed of [
      { ...observation, context: { ...linearContext, teamId: 'wrong' } },
      { ...observation, queryDigest: 'sha256:wrong' },
      { ...observation, capabilityEvidenceDigest: 'sha256:wrong' },
      {
        ...observation,
        results: [{ ...candidate, stableIdentityVerified: false }],
      },
    ]) {
      expect(
        validateLinearDuplicateSearchObservation({
          action,
          hostCapability: linearCapability,
          observation: changed,
        }).accepted,
      ).toBe(false);
    }
  });
});
