import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyJiraReadObservation,
  jiraAdapter,
  normalizeJiraIssueObservation,
  parseJiraIssueReference,
  planJiraDiscussionRead,
  planJiraMetadataRead,
  planJiraMutation,
  planJiraRead,
  previewJiraMutation,
  validateJiraDiscussionReadObservation,
  validateJiraMetadataObservation,
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
