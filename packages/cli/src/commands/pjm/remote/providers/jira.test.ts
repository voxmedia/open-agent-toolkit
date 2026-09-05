import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyJiraReadObservation,
  jiraAdapter,
  normalizeJiraIssueObservation,
  parseJiraIssueReference,
  planJiraDiscussionRead,
  planJiraDuplicateSearch,
  planJiraMetadataRead,
  planJiraMutation,
  planJiraRead,
  previewJiraMutation,
  validateJiraDiscussionReadObservation,
  validateJiraDuplicateSearchObservation,
  validateJiraMetadataObservation,
  verifyJiraMutationObservation,
  type JiraHostCapabilityObservation,
} from './jira';

export const jiraContext = {
  host: 'jira.example',
  accountId: 'acct_jira',
  siteId: 'site_01',
  projectId: 'project_200',
};

export const jiraObservation: SanitizedProviderObservation = {
  provider: 'jira',
  context: jiraContext,
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
  },
  revision: { token: 'jira-rev-1', contentDigest: 'sha256:jira-content' },
  capabilityEvidenceDigest: 'sha256:jira-capability',
};

export const jiraCapability: JiraHostCapabilityObservation = {
  provider: 'jira',
  context: jiraContext,
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
  evidenceDigest: 'sha256:jira-capability',
};

jiraObservation.fields.hostCapability = jiraCapability;

describe('Jira Cloud identity and normalization', () => {
  it('parses current key and cloud browse references', () => {
    expect(parseJiraIssueReference('NEW-42')).toEqual({
      key: 'NEW-42',
      alias: 'NEW-42',
    });
    expect(
      parseJiraIssueReference('https://JIRA.example/browse/NEW-42'),
    ).toMatchObject({
      host: 'jira.example',
      key: 'NEW-42',
    });
    expect(
      parseJiraIssueReference('http://jira.example/browse/NEW-42'),
    ).toBeNull();
  });

  it('normalizes by immutable issue ID across key and project moves', () => {
    expect(normalizeJiraIssueObservation(jiraObservation)).toMatchObject({
      provider: 'jira',
      stableId: 'jira:site_01:10042',
      aliases: ['NEW-42', 'OLD-42'],
      extensions: {
        issueId: '10042',
        projectId: 'project_200',
        historicalProjectIds: ['project_100'],
        issueType: 'Task',
      },
    });
  });

  it('suppresses a signaled inbound field in full and rejects identity drift', () => {
    const signaled = normalizeJiraIssueObservation({
      ...jiraObservation,
      fields: {
        ...jiraObservation.fields,
        title: 'token=ghp_123456789012345678901234567890123456',
      },
    });
    expect(signaled.title).toBe('[SUPPRESSED:SENSITIVE-CONTENT]');
    expect(signaled.extensions.suppressedFields).toEqual(['title']);
    expect(() =>
      normalizeJiraIssueObservation({
        ...jiraObservation,
        identity: { ...jiraObservation.identity, stableId: '99999' },
      }),
    ).toThrow('stable identity');
  });
});

describe('Jira semantic read and metadata intents', () => {
  it('plans a provider-neutral issue lookup bound to immutable identity', () => {
    const action = planJiraRead({
      context: jiraContext,
      hostCapability: jiraCapability,
      stableId: 'jira:site_01:10042',
      issueId: '10042',
      currentKey: 'NEW-42',
      stepId: 'jira-refresh',
    });
    expect(action).toMatchObject({
      provider: 'jira',
      operation: 'read',
      intent: {
        kind: 'issue',
        issueId: '10042',
        capabilityEvidenceDigest: jiraCapability.evidenceDigest,
      },
    });
    expect(JSON.stringify(action)).not.toMatch(
      /command|executable|arguments|catalog/i,
    );
  });

  it('plans normalized create/edit metadata and transition discovery', () => {
    expect(
      planJiraMetadataRead({
        context: jiraContext,
        hostCapability: jiraCapability,
        purpose: 'create',
      }).intent.resultContract,
    ).toMatchObject({ normalizedOnly: true, fields: ['fields', 'issueTypes'] });
    expect(
      planJiraMetadataRead({
        context: jiraContext,
        hostCapability: jiraCapability,
        purpose: 'transition',
        issueId: '10042',
      }).intent.resultContract,
    ).toMatchObject({ fields: ['transitions'] });
  });

  it('fails closed on context ambiguity and bounds discussion reads', () => {
    expect(() =>
      planJiraRead({
        context: { ...jiraContext, projectId: undefined },
        hostCapability: jiraCapability,
        stableId: 'jira:site_01:10042',
        issueId: '10042',
        currentKey: 'NEW-42',
        stepId: 'jira-refresh',
      }),
    ).toThrow('pinned');
    expect(
      planJiraDiscussionRead({
        context: jiraContext,
        hostCapability: jiraCapability,
        stableId: 'jira:site_01:10042',
        cursor: null,
        limit: 25,
      }).intent.resultContract,
    ).toMatchObject({ maxItems: 25, persistable: false });
    expect(() =>
      planJiraDiscussionRead({
        context: jiraContext,
        hostCapability: jiraCapability,
        stableId: 'jira:site_01:10042',
        cursor: null,
        limit: 101,
      }),
    ).toThrow('bounds');
  });
});

describe('Jira semantic mutation intents', () => {
  const metadata = {
    evidenceDigest: 'sha256:jira-metadata',
    writableFields: [
      'title',
      'description',
      'priority',
      'status',
      'annotation',
    ] as const,
    transitions: ['Done'],
  };

  function mutationInput(
    operation: 'create' | 'update' | 'transition' | 'annotate',
  ) {
    const projection =
      operation === 'transition'
        ? { status: 'Done' }
        : operation === 'annotate'
          ? { annotation: 'Completed locally' }
          : { title: 'Published title' };
    const outboundSafety = assessOutboundProjectionSafety(projection, {
      assessedAt: '2026-09-05T12:00:00.000Z',
    });
    return {
      operation,
      context: jiraContext,
      hostCapability: jiraCapability,
      normalizedMetadata: {
        ...metadata,
        writableFields: [...metadata.writableFields],
      },
      bindingId: 'binding_jira_42',
      ...(operation === 'create'
        ? {
            provenance: {
              bindingId: 'binding_jira_42',
              origin: 'local:item-42',
            },
          }
        : { stableId: 'jira:site_01:10042' }),
      fieldMask: Object.keys(projection),
      projection,
      outboundSafety,
    };
  }

  it('binds projection, safety, metadata, preview, approval, and readback evidence', () => {
    const input = mutationInput('update');
    const preview = previewJiraMutation(input);
    const action = planJiraMutation({
      ...input,
      approvedPreviewDigest: preview.previewDigest,
    });
    expect(action.intent).toMatchObject({
      projection: { title: 'Published title' },
      postconditions: { title: 'Published title' },
      metadataEvidenceDigest: metadata.evidenceDigest,
      previewDigest: preview.previewDigest,
      approvalDigest: preview.previewDigest,
      readbackContract: { pinned: true, fields: ['title'] },
    });
  });

  it('plans create, transition, and annotation without native invocation shapes', () => {
    for (const operation of ['create', 'transition', 'annotate'] as const) {
      const input = mutationInput(operation);
      const preview = previewJiraMutation(input);
      const action = planJiraMutation({
        ...input,
        approvedPreviewDigest: preview.previewDigest,
      });
      expect(action.operation).toBe(operation);
      expect(JSON.stringify(action)).not.toMatch(
        /command|executable|arguments|catalog/i,
      );
    }
  });

  it('fails closed on unavailable transitions, metadata drift, and stale approval', () => {
    const transition = mutationInput('transition');
    expect(() =>
      previewJiraMutation({
        ...transition,
        normalizedMetadata: {
          ...transition.normalizedMetadata,
          transitions: [],
        },
      }),
    ).toThrow('transition');
    const update = mutationInput('update');
    expect(() =>
      previewJiraMutation({
        ...update,
        normalizedMetadata: {
          ...update.normalizedMetadata,
          writableFields: [],
        },
      }),
    ).toThrow('metadata');
    expect(() =>
      planJiraMutation({ ...update, approvedPreviewDigest: 'sha256:stale' }),
    ).toThrow('approval');
  });
});

describe('Jira read and metadata observations', () => {
  const readAction = () =>
    planJiraRead({
      context: jiraContext,
      hostCapability: jiraCapability,
      stableId: 'jira:site_01:10042',
      issueId: '10042',
      currentKey: 'OLD-42',
      stepId: 'jira-refresh',
    });

  it('validates exact-context sanitized issue evidence and detects a moved key', () => {
    const action = readAction();
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: jiraCapability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation: jiraObservation,
      }),
    ).toMatchObject({ classification: 'moved', preservePriorEvidence: false });
    expect(jiraAdapter.validateObservation(action, jiraObservation)).toEqual({
      valid: true,
      reasons: [],
    });
  });

  it('fails closed on authorization, context mismatch, partial response, and temporary failure', () => {
    const action = readAction();
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: {
          ...jiraCapability,
          availability: 'authorization-required',
        },
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation: jiraObservation,
      }).classification,
    ).toBe('inaccessible');
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: jiraCapability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...jiraObservation,
          fields: { ...jiraObservation.fields, title: undefined },
        },
      }).classification,
    ).toBe('partial');
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: jiraCapability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'temporary-failure',
      }).classification,
    ).toBe('temporarily-unavailable');
  });

  it('validates normalized metadata and bounded non-persistent discussion pages', () => {
    const metadataAction = planJiraMetadataRead({
      context: jiraContext,
      hostCapability: jiraCapability,
      purpose: 'transition',
      issueId: '10042',
    });
    expect(
      validateJiraMetadataObservation({
        action: metadataAction,
        hostCapability: jiraCapability,
        observation: {
          provider: 'jira',
          context: jiraContext,
          capabilityEvidenceDigest: jiraCapability.evidenceDigest,
          purpose: 'transition',
          availability: 'available',
          metadataEvidenceDigest: 'sha256:jira-metadata',
          writableFields: ['status'],
          transitions: ['Done'],
        },
      }),
    ).toEqual({ valid: true, reasons: [] });
    const discussionAction = planJiraDiscussionRead({
      context: jiraContext,
      hostCapability: jiraCapability,
      stableId: 'jira:site_01:10042',
      cursor: null,
      limit: 2,
    });
    expect(
      validateJiraDiscussionReadObservation({
        action: discussionAction,
        hostCapability: jiraCapability,
        observation: {
          provider: 'jira',
          context: jiraContext,
          stableId: 'jira:site_01:10042',
          availability: 'available',
          capabilityEvidenceDigest: jiraCapability.evidenceDigest,
          requestedCursor: null,
          nextCursor: null,
          items: [
            {
              id: 'comment-1',
              body: 'Useful context',
              observedAt: '2026-09-05T12:00:00.000Z',
            },
          ],
        },
      }),
    ).toMatchObject({ classification: 'page', persistable: false });
  });
});

describe('Jira mutation observations', () => {
  const metadata = {
    evidenceDigest: 'sha256:jira-metadata',
    writableFields: [
      'title',
      'description',
      'priority',
      'status',
      'annotation',
    ] as const,
    transitions: ['Done'],
  };

  function action(operation: 'create' | 'update' | 'transition' | 'annotate') {
    const projection =
      operation === 'transition'
        ? { status: 'Done' }
        : operation === 'annotate'
          ? { annotation: 'Completed locally' }
          : { title: 'Published title' };
    const input = {
      operation,
      context: jiraContext,
      hostCapability: jiraCapability,
      normalizedMetadata: {
        ...metadata,
        writableFields: [...metadata.writableFields],
      },
      bindingId: 'binding_jira_42',
      ...(operation === 'create'
        ? {
            provenance: {
              bindingId: 'binding_jira_42',
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

  function readback(
    mutation: ReturnType<typeof action>,
    patch: Record<string, unknown> = {},
  ) {
    const projection = mutation.intent.projection as Record<string, unknown>;
    return {
      ...jiraObservation,
      fields: {
        ...jiraObservation.fields,
        ...(projection.title === undefined ? {} : { title: projection.title }),
        ...(projection.description === undefined
          ? {}
          : { descriptionText: projection.description }),
        ...(projection.priority === undefined
          ? {}
          : { priority: projection.priority }),
        ...(projection.status === undefined
          ? {}
          : { status: projection.status }),
        ...(projection.annotation === undefined
          ? {}
          : { annotations: [projection.annotation] }),
        mutationEvidence: mutation.intent.executionEvidence,
        ...(mutation.operation === 'create'
          ? { createProvenance: mutation.intent.provenance }
          : {}),
        ...patch,
      },
    } as SanitizedProviderObservation;
  }

  function verify(
    mutation: ReturnType<typeof action>,
    observation: SanitizedProviderObservation | null,
    outcome: 'accepted' | 'rejected' | 'unknown' = 'accepted',
  ) {
    return verifyJiraMutationObservation({
      action: mutation,
      attempt: {
        count: 1,
        outcome,
        capabilityEvidenceDigest: jiraCapability.evidenceDigest,
        metadataEvidenceDigest: metadata.evidenceDigest,
      },
      hostCapability: jiraCapability,
      normalizedMetadata: {
        ...metadata,
        writableFields: [...metadata.writableFields],
      },
      readback: observation,
    });
  }

  it('verifies create, update, transition, and comment through pinned readback', () => {
    for (const operation of [
      'create',
      'update',
      'transition',
      'annotate',
    ] as const) {
      const mutation = action(operation);
      expect(verify(mutation, readback(mutation))).toMatchObject({
        classification: 'verified',
        retryAllowed: false,
      });
      expect(
        jiraAdapter.validateObservation(mutation, readback(mutation)),
      ).toEqual({
        valid: true,
        reasons: [],
      });
    }
  });

  it('classifies silently dropped fields as partial and unknown attempts as uncertain', () => {
    const mutation = action('update');
    expect(
      verify(mutation, readback(mutation, { title: 'Old title' }))
        .classification,
    ).toBe('partial');
    expect(verify(mutation, null, 'unknown')).toMatchObject({
      classification: 'uncertain',
      retryAllowed: false,
    });
    expect(verify(mutation, null, 'rejected').classification).toBe('rejected');
  });

  it('rejects metadata drift, mismatched identity, and forged action evidence', () => {
    const mutation = action('update');
    expect(
      verifyJiraMutationObservation({
        action: mutation,
        attempt: {
          count: 1,
          outcome: 'accepted',
          capabilityEvidenceDigest: jiraCapability.evidenceDigest,
          metadataEvidenceDigest: 'sha256:stale',
        },
        hostCapability: jiraCapability,
        normalizedMetadata: {
          ...metadata,
          writableFields: [...metadata.writableFields],
        },
        readback: readback(mutation),
      }).classification,
    ).toBe('uncertain');
    expect(
      verify(mutation, {
        ...readback(mutation),
        identity: { stableId: '10043', aliases: ['NEW-43'] },
        fields: {
          ...readback(mutation).fields,
          issueId: '10043',
          key: 'NEW-43',
        },
      }).classification,
    ).toBe('uncertain');
    const forged = {
      ...mutation,
      intent: { ...mutation.intent, projection: { title: 'forged' } },
    };
    expect(verify(forged, readback(mutation)).classification).toBe('uncertain');
  });
});

describe('Jira duplicate-search intents', () => {
  it('plans bounded provenance and historical-key search in exact site/project context', () => {
    const action = planJiraDuplicateSearch({
      context: jiraContext,
      hostCapability: jiraCapability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42', 'LEGACY-7'],
      maxResults: 10,
    });
    expect(action).toMatchObject({
      provider: 'jira',
      operation: 'search-duplicates',
      intent: {
        query: {
          provenanceToken: 'origin:local:item-42',
          historicalKeys: ['OLD-42', 'LEGACY-7'],
          siteId: 'site_01',
          projectId: 'project_200',
        },
        resultContract: { maxResults: 10, requireStableIssueId: true },
      },
    });
    expect(JSON.stringify(action)).not.toMatch(
      /command|executable|arguments|catalog/i,
    );
  });

  it('fails closed when semantic search is unavailable or bounds are invalid', () => {
    const input = {
      context: jiraContext,
      hostCapability: jiraCapability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42'],
      maxResults: 10,
    };
    expect(() =>
      planJiraDuplicateSearch({
        ...input,
        hostCapability: { ...jiraCapability, operations: ['read'] },
      }),
    ).toThrow('capability');
    expect(() =>
      planJiraDuplicateSearch({ ...input, maxResults: 101 }),
    ).toThrow('bounds');
    expect(() =>
      planJiraDuplicateSearch({
        ...input,
        historicalKeys: ['OLD-42', 'OLD-42'],
      }),
    ).toThrow('bounds');
  });
});

describe('Jira duplicate-search observations', () => {
  const action = () =>
    planJiraDuplicateSearch({
      context: jiraContext,
      hostCapability: jiraCapability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_jira_create',
      historicalKeys: ['OLD-42'],
      maxResults: 2,
    });

  function observation(
    searchAction: ReturnType<typeof action>,
    results: Array<{
      issueId: string;
      stableId: string;
      keys: string[];
      context: typeof jiraContext;
      matchedBy: 'provenance' | 'reserved-binding' | 'historical-key';
      matchedProvenanceToken?: string;
      matchedReservedBindingId?: string;
      matchedHistoricalKey?: string;
      stableIdentityVerified: boolean;
      contextVerified: boolean;
    }>,
  ) {
    return {
      provider: 'jira' as const,
      context: jiraContext,
      availability: 'available' as const,
      capabilityEvidenceDigest: jiraCapability.evidenceDigest,
      queryDigest: String(searchAction.intent.queryDigest),
      observedAt: '2026-09-05T12:00:00.000Z',
      results,
    };
  }

  const candidate = {
    issueId: '10042',
    stableId: 'jira:site_01:10042',
    keys: ['NEW-42', 'OLD-42'],
    context: jiraContext,
    matchedBy: 'provenance' as const,
    matchedProvenanceToken: 'origin:local:item-42',
    stableIdentityVerified: true,
    contextVerified: true,
  };

  it('accepts exactly one stable issue-ID/context match from provenance or a planned key', () => {
    const searchAction = action();
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: observation(searchAction, [candidate]),
      }),
    ).toEqual({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'jira:site_01:10042',
      reasons: [],
    });
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: observation(searchAction, [
          {
            ...candidate,
            matchedBy: 'historical-key',
            matchedProvenanceToken: undefined,
            matchedHistoricalKey: 'OLD-42',
          },
        ]),
      }).classification,
    ).toBe('one-verified-match');
  });

  it('returns no-match, bounded ambiguity, unavailable, and lagging explicitly', () => {
    const searchAction = action();
    const base = observation(searchAction, []);
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: base,
      }),
    ).toMatchObject({ accepted: true, classification: 'no-match' });
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: observation(searchAction, [
          candidate,
          { ...candidate, issueId: '10043', stableId: 'jira:site_01:10043' },
        ]),
      }).classification,
    ).toBe('ambiguous');
    for (const availability of ['unavailable', 'lagging'] as const) {
      expect(
        validateJiraDuplicateSearchObservation({
          action: searchAction,
          hostCapability: jiraCapability,
          observation: { ...base, availability },
        }).classification,
      ).toBe(availability);
    }
  });

  it('rejects mismatched context, query, capability, and unverified identity', () => {
    const searchAction = action();
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: {
          ...observation(searchAction, [candidate]),
          queryDigest: 'sha256:wrong',
        },
      }).classification,
    ).toBe('invalid');
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: observation(searchAction, [
          { ...candidate, stableIdentityVerified: false },
        ]),
      }).classification,
    ).toBe('invalid');
    expect(
      validateJiraDuplicateSearchObservation({
        action: searchAction,
        hostCapability: jiraCapability,
        observation: {
          ...observation(searchAction, []),
          context: { ...jiraContext, projectId: 'other' },
        },
      }).classification,
    ).toBe('invalid');
  });

  it('rejects a forged incomplete search action even for an empty result', () => {
    const searchAction = action();
    const forged = {
      ...searchAction,
      intent: {
        ...searchAction.intent,
        query: { provenanceToken: 'origin:local:item-42' },
      },
    };
    expect(
      validateJiraDuplicateSearchObservation({
        action: forged,
        hostCapability: jiraCapability,
        observation: observation(searchAction, []),
      }),
    ).toMatchObject({ accepted: false, classification: 'invalid' });
    expect(
      jiraAdapter.validateObservation(searchAction, jiraObservation),
    ).toEqual({
      valid: false,
      reasons: ['typed-validator-required:search-duplicates'],
    });
  });
});
