import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  SanitizedProviderObservation,
  SemanticAction,
} from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyLinearReadObservation,
  LINEAR_DISCUSSION_LIMITS,
  linearAdapter,
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

describe('Linear review safety regressions', () => {
  function plannedMutation(
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
      context: linearContext,
      hostCapability: linearCapability,
      bindingId: 'binding_linear_review',
      ...(operation === 'create'
        ? {
            provenance: {
              bindingId: 'binding_linear_review',
              origin: 'local:item-review',
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
    return planLinearMutation({
      ...input,
      approvedPreviewDigest: preview.previewDigest,
    });
  }

  function mutationReadback(
    action: SemanticAction,
  ): SanitizedProviderObservation {
    const projection = action.intent.projection as Record<string, unknown>;
    return {
      ...linearObservation,
      fields: {
        ...linearObservation.fields,
        hostCapability: linearCapability,
        ...(projection.title === undefined ? {} : { title: projection.title }),
        ...(projection.description === undefined
          ? {}
          : { description: projection.description }),
        ...(projection.priority === undefined
          ? {}
          : { priority: projection.priority }),
        ...(projection.status === undefined
          ? {}
          : { state: projection.status }),
        ...(projection.annotation === undefined
          ? {}
          : { annotations: [projection.annotation] }),
        mutationEvidence: action.intent.executionEvidence,
        ...(action.operation === 'create'
          ? { createProvenance: action.intent.provenance }
          : {}),
      },
    };
  }

  it.each(['create', 'update', 'transition', 'annotate'] as const)(
    'rejects a post-plan %s projection substitution even with matching readback',
    (operation) => {
      const action = structuredClone(plannedMutation(operation));
      const field = (action.intent.fieldMask as string[])[0]!;
      action.intent.projection = { [field]: 'substituted' };
      action.intent.postconditions = { [field]: 'substituted' };
      const readback = mutationReadback(action);
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
      ).toMatchObject({
        classification: 'uncertain',
        reason: 'mutation-attribution-invalid',
      });
      expect(linearAdapter.validateObservation(action, readback).valid).toBe(
        false,
      );
    },
  );

  it.each([
    ['context', (action: SemanticAction) => (action.context.teamId = 'other')],
    [
      'identity',
      (action: SemanticAction) =>
        (action.intent.stableId =
          'linear:workspace_01:9a8c5bc8-b2b5-4c75-9475-d112ca8f0150'),
    ],
    [
      'field mask',
      (action: SemanticAction) => (action.intent.fieldMask = ['priority']),
    ],
    [
      'postconditions',
      (action: SemanticAction) =>
        (action.intent.postconditions = { title: 'other' }),
    ],
    [
      'safety projection digest',
      (action: SemanticAction) =>
        ((
          action.intent.outboundSafety as Record<string, unknown>
        ).projectionDigest = 'sha256:other'),
    ],
    [
      'safety result digest',
      (action: SemanticAction) =>
        ((
          action.intent.outboundSafety as Record<string, unknown>
        ).resultDigest = 'sha256:other'),
    ],
    [
      'preview digest',
      (action: SemanticAction) =>
        (action.intent.previewDigest = 'sha256:other'),
    ],
    [
      'approval digest',
      (action: SemanticAction) =>
        (action.intent.approvalDigest = 'sha256:other'),
    ],
    [
      'action digest',
      (action: SemanticAction) => (action.intent.actionDigest = 'sha256:other'),
    ],
    [
      'capability evidence',
      (action: SemanticAction) =>
        (action.intent.capabilityEvidenceDigest = 'sha256:other'),
    ],
    [
      'execution evidence',
      (action: SemanticAction) =>
        ((
          action.intent.executionEvidence as Record<string, unknown>
        ).projectionDigest = 'sha256:other'),
    ],
    [
      'readback contract',
      (action: SemanticAction) =>
        ((action.intent.readbackContract as Record<string, unknown>).pinned =
          false),
    ],
  ])('rejects independently altered mutation %s', (_name, alter) => {
    const action = structuredClone(plannedMutation('update'));
    alter(action);
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: String(
            action.intent.capabilityEvidenceDigest,
          ),
        },
        hostCapability: linearCapability,
        readback: mutationReadback(action),
      }).classification,
    ).toBe('uncertain');
  });

  it.each([
    [
      'provenance binding',
      (action: SemanticAction) =>
        ((action.intent.provenance as Record<string, unknown>).bindingId =
          'other'),
    ],
    [
      'provenance origin',
      (action: SemanticAction) =>
        ((action.intent.provenance as Record<string, unknown>).origin =
          'other'),
    ],
    [
      'binding identity',
      (action: SemanticAction) => (action.intent.bindingId = 'other'),
    ],
  ])('rejects independently altered create %s', (_name, alter) => {
    const action = structuredClone(plannedMutation('create'));
    alter(action);
    expect(
      verifyLinearMutationObservation({
        action,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
        },
        hostCapability: linearCapability,
        readback: mutationReadback(action),
      }).classification,
    ).toBe('uncertain');
  });

  it.each([
    [
      'uuid',
      (action: SemanticAction) =>
        (action.intent.uuid = '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150'),
    ],
    [
      'stable identity',
      (action: SemanticAction) =>
        (action.intent.stableId =
          'linear:workspace_01:9a8c5bc8-b2b5-4c75-9475-d112ca8f0150'),
    ],
    [
      'identifier',
      (action: SemanticAction) => (action.intent.currentIdentifier = 'BETA-7'),
    ],
    ['step', (action: SemanticAction) => (action.intent.stepId = 'other-step')],
    ['context', (action: SemanticAction) => (action.context.teamId = 'other')],
    [
      'capability',
      (action: SemanticAction) =>
        (action.intent.capabilityEvidenceDigest = 'sha256:other'),
    ],
    [
      'result contract',
      (action: SemanticAction) =>
        (action.intent.resultContract = { requireStableIdentity: true }),
    ],
    [
      'action digest',
      (action: SemanticAction) => (action.intent.actionDigest = 'sha256:other'),
    ],
  ])('rejects an altered read %s before classification', (_name, alter) => {
    const action = structuredClone(
      planLinearRead({
        context: linearContext,
        hostCapability: linearCapability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        currentIdentifier: 'ALPHA-42',
        stepId: 'review-read',
      }),
    );
    alter(action);
    const candidate = {
      ...linearObservation,
      context: action.context,
      identity: {
        stableId: String(action.intent.uuid),
        aliases: ['BETA-7'],
      },
      fields: {
        ...linearObservation.fields,
        hostCapability: linearCapability,
        uuid: action.intent.uuid,
        identifier: action.intent.currentIdentifier ?? 'ALPHA-42',
        workspaceId: action.context.workspaceId,
        teamId: action.context.teamId,
      },
      capabilityEvidenceDigest: String(action.intent.capabilityEvidenceDigest),
    } as SanitizedProviderObservation;
    expect(
      classifyLinearReadObservation({
        action,
        hostCapability: linearCapability,
        observedAt: '2026-09-02T12:10:00.000Z',
        outcome: 'found',
        observation: candidate,
      }).classification,
    ).toBe('inaccessible');
    expect(linearAdapter.validateObservation(action, candidate).valid).toBe(
      false,
    );
  });

  it('rejects an intact read action paired with a different public observation identity', () => {
    const action = planLinearRead({
      context: linearContext,
      hostCapability: linearCapability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      currentIdentifier: 'ALPHA-42',
      stepId: 'review-public-read',
    });
    const unrelated = {
      ...linearObservation,
      identity: {
        stableId: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        aliases: ['BETA-7'],
      },
      fields: {
        ...linearObservation.fields,
        uuid: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        identifier: 'BETA-7',
        hostCapability: linearCapability,
      },
    };
    expect(linearAdapter.validateObservation(action, unrelated)).toEqual({
      valid: false,
      reasons: ['observation-identity-mismatch'],
    });
    expect(linearAdapter.verificationFields(action)).toEqual([
      'stable-identity',
    ]);
    expect(
      linearAdapter.verify(action, linearAdapter.normalize(unrelated)),
    ).toEqual([{ field: 'stable-identity', status: 'mismatch' }]);
  });

  it('rejects a forged incomplete duplicate action even for zero results', () => {
    const query = {};
    const forged: SemanticAction = {
      provider: 'linear',
      operation: 'search-duplicates',
      context: linearContext,
      intent: {
        query,
        queryDigest: 'sha256:forged',
        resultContract: { maxResults: 1 },
        capabilityEvidenceDigest: linearCapability.evidenceDigest,
      },
    };
    expect(
      validateLinearDuplicateSearchObservation({
        action: forged,
        hostCapability: linearCapability,
        observation: {
          provider: 'linear',
          context: linearContext,
          availability: 'available',
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
          queryDigest: 'sha256:forged',
          observedAt: '2026-09-02T12:10:00.000Z',
          results: [],
        },
      }),
    ).toMatchObject({ accepted: false, classification: 'invalid' });
  });

  it.each(['read-discussion', 'search-duplicates'] as const)(
    'fails closed on generic %s issue validation and verification',
    (operation) => {
      const action =
        operation === 'read-discussion'
          ? planLinearDiscussionRead({
              context: linearContext,
              hostCapability: linearCapability,
              stableId:
                'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
              cursor: null,
              limit: 1,
            })
          : planLinearDuplicateSearch({
              context: linearContext,
              hostCapability: linearCapability,
              provenanceToken: 'origin:local:item-42',
              reservedBindingId: 'binding_linear_42',
              historicalIdentifiers: ['ALPHA-42'],
              maxResults: 1,
            });
      const unrelated = {
        ...linearObservation,
        fields: {
          ...linearObservation.fields,
          hostCapability: linearCapability,
        },
      };
      expect(linearAdapter.validateObservation(action, unrelated)).toEqual({
        valid: false,
        reasons: [`typed-validator-required:${operation}`],
      });
      expect(
        linearAdapter.verify(
          action,
          normalizeLinearIssueObservation(unrelated),
        ),
      ).toEqual([{ field: `typed:${operation}`, status: 'unavailable' }]);
    },
  );

  function discussionAction(limit = LINEAR_DISCUSSION_LIMITS.maxItems) {
    return planLinearDiscussionRead({
      context: linearContext,
      hostCapability: linearCapability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      cursor: null,
      limit,
    });
  }

  function discussionObservation(items: Array<{ id: string; body: string }>) {
    const action = discussionAction();
    return {
      action,
      input: {
        action,
        hostCapability: linearCapability,
        observation: {
          provider: 'linear' as const,
          context: linearContext,
          stableId: action.intent.stableId as string,
          availability: 'available' as const,
          capabilityEvidenceDigest: linearCapability.evidenceDigest,
          requestedCursor: null,
          nextCursor: null,
          items: items.map((item) => ({
            ...item,
            observedAt: '2026-09-02T12:10:00.000Z',
          })),
        },
      },
    };
  }

  it('enforces exact and over-limit UTF-8 discussion item bounds', () => {
    const exact = discussionObservation([
      {
        id: 'i'.repeat(LINEAR_DISCUSSION_LIMITS.maxIdBytes),
        body: 'é'.repeat(LINEAR_DISCUSSION_LIMITS.maxBodyBytes / 2),
      },
    ]);
    expect(
      validateLinearDiscussionReadObservation(exact.input).classification,
    ).toBe('page');
    for (const items of [
      [{ id: 'i'.repeat(LINEAR_DISCUSSION_LIMITS.maxIdBytes + 1), body: '' }],
      [
        {
          id: 'i',
          body: `${'é'.repeat(LINEAR_DISCUSSION_LIMITS.maxBodyBytes / 2)}a`,
        },
      ],
    ]) {
      expect(
        validateLinearDiscussionReadObservation(
          discussionObservation(items).input,
        ).classification,
      ).toBe('invalid');
    }
  });

  it('enforces exact and over-limit discussion item-count and cursor bounds', () => {
    expect(
      planLinearDiscussionRead({
        context: linearContext,
        hostCapability: linearCapability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        cursor: 'c'.repeat(LINEAR_DISCUSSION_LIMITS.maxCursorBytes),
        limit: LINEAR_DISCUSSION_LIMITS.maxItems,
      }),
    ).toMatchObject({ operation: 'read-discussion' });
    expect(() =>
      planLinearDiscussionRead({
        context: linearContext,
        hostCapability: linearCapability,
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        cursor: `${'é'.repeat(LINEAR_DISCUSSION_LIMITS.maxCursorBytes / 2)}a`,
        limit: 1,
      }),
    ).toThrow('bounds');
    const exactItems = Array.from(
      { length: LINEAR_DISCUSSION_LIMITS.maxItems },
      (_, index) => ({ id: `i${index}`, body: '' }),
    );
    expect(
      validateLinearDiscussionReadObservation(
        discussionObservation(exactItems).input,
      ).classification,
    ).toBe('page');
    expect(
      validateLinearDiscussionReadObservation(
        discussionObservation([...exactItems, { id: 'over', body: '' }]).input,
      ).classification,
    ).toBe('invalid');
  });

  it('enforces total-page bytes before returning or suppressing content', () => {
    const exactItems = [
      { id: 'a', body: 'x'.repeat(16_384) },
      { id: 'b', body: 'x'.repeat(16_384) },
      { id: 'c', body: 'x'.repeat(16_384) },
      { id: 'd', body: 'x'.repeat(16_380) },
    ];
    expect(
      validateLinearDiscussionReadObservation(
        discussionObservation(exactItems).input,
      ).classification,
    ).toBe('page');
    exactItems[3]!.body += 'x';
    expect(
      validateLinearDiscussionReadObservation(
        discussionObservation(exactItems).input,
      ).classification,
    ).toBe('invalid');

    const signaled = discussionObservation([
      { id: 'signal', body: 'api key must not be retained' },
    ]);
    expect(
      validateLinearDiscussionReadObservation(signaled.input),
    ).toMatchObject({
      classification: 'page',
      persistable: false,
      page: {
        items: [
          {
            body: '[SUPPRESSED:SENSITIVE-CONTENT]',
            contentSuppressed: true,
          },
        ],
      },
    });
  });
});
