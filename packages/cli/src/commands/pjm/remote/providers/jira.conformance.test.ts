import {
  insertJiraAdfManagedContent,
  replaceJiraAdfManagedContent,
  verifyJiraAdfReplacement,
} from '@commands/pjm/remote/jira-adf';
import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  ProviderAdapter,
  SanitizedProviderObservation,
} from '@commands/pjm/remote/provider';
import { evaluateProviderConformance } from '@commands/pjm/remote/provider-conformance';
import { describe, expect, it } from 'vitest';

import {
  classifyJiraReadObservation,
  jiraAdapter,
  planJiraMutation,
  planJiraRead,
  previewJiraMutation,
  type JiraHostCapabilityObservation,
} from './jira';

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
  observedAt: '2026-09-05T12:00:00.000Z',
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
    title: 'Jira conformance issue',
    descriptionText: 'Provider-neutral fixture',
    descriptionAdf: { type: 'doc', version: 1, content: [] },
    status: 'In Progress',
    statusId: '3',
    priority: 'High',
    priorityId: '2',
    issueType: 'Task',
    lifecycle: 'active',
    customSummary: 'not-allowlisted',
    hostCapability: capability,
  },
  revision: { token: 'jira-rev-1', contentDigest: 'sha256:jira-content' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

function mutation(operation: 'update' | 'transition') {
  const projection =
    operation === 'transition'
      ? { status: 'Done' }
      : { title: 'Updated title' };
  const input = {
    operation,
    context,
    hostCapability: capability,
    normalizedMetadata: {
      evidenceDigest: 'sha256:jira-metadata',
      writableFields: ['title', 'status'] as Array<'title' | 'status'>,
      transitions: ['Done'],
    },
    bindingId: 'binding_jira_42',
    stableId: 'jira:site_01:10042',
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

const conformanceAdapter: ProviderAdapter = {
  ...jiraAdapter,
  plan(operation) {
    if (operation !== 'update') {
      throw new Error('The Jira conformance fixture supports update only.');
    }
    return mutation('update');
  },
  validateObservation(action, candidate) {
    return jiraAdapter.validateObservation(action, {
      ...candidate,
      fields: {
        ...candidate.fields,
        title: (action.intent.projection as Record<string, unknown>).title,
        mutationEvidence: action.intent.executionEvidence,
      },
    });
  },
};

describe('Jira provider conformance', () => {
  it('passes the immutable generic harness through the production Jira adapter paths', () => {
    expect(
      evaluateProviderConformance({
        adapter: conformanceAdapter,
        observation,
        expected: {
          stableId: 'jira:site_01:10042',
          aliases: ['NEW-42', 'OLD-42'],
          verificationFields: ['title'],
        },
      }),
    ).toEqual([]);
  });

  it('preserves stable issue identity, changed keys, safe priority, and allowlisted extensions', () => {
    const issue = jiraAdapter.normalize(observation);
    expect(issue).toMatchObject({
      stableId: 'jira:site_01:10042',
      aliases: ['NEW-42', 'OLD-42'],
      priority: 'High',
      extensions: {
        projectId: 'project_200',
        historicalProjectIds: ['project_100'],
        issueType: 'Task',
      },
    });
    expect(issue.extensions).not.toHaveProperty('customSummary');
  });

  it('structurally preserves remote ADF around one managed node', () => {
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
      'binding_jira_42',
      'first',
    );
    const after = replaceJiraAdfManagedContent(
      inserted,
      'binding_jira_42',
      'second',
    );
    expect(
      verifyJiraAdfReplacement(inserted, after, 'binding_jira_42', 'second'),
    ).toBe(true);
    expect(after.content[0]).toEqual(before.content[0]);
  });

  it('requires live semantic transition capability and normalized transition metadata', () => {
    expect(() =>
      previewJiraMutation({
        operation: 'transition',
        context,
        hostCapability: { ...capability, operations: ['read'] },
        normalizedMetadata: {
          evidenceDigest: 'sha256:jira-metadata',
          writableFields: ['status'],
          transitions: ['Done'],
        },
        bindingId: 'binding_jira_42',
        stableId: 'jira:site_01:10042',
        fieldMask: ['status'],
        projection: { status: 'Done' },
        outboundSafety: assessOutboundProjectionSafety(
          { status: 'Done' },
          { assessedAt: '2026-09-05T12:00:00.000Z' },
        ),
      }),
    ).toThrow('capability');
  });

  it('accepts only sanitized exact-context mutation observations', () => {
    const action = mutation('update');
    const readback: SanitizedProviderObservation = {
      ...observation,
      fields: {
        ...observation.fields,
        title: 'Updated title',
        mutationEvidence: action.intent.executionEvidence,
      },
    };
    expect(jiraAdapter.validateObservation(action, readback)).toEqual({
      valid: true,
      reasons: [],
    });
    expect(
      jiraAdapter.validateObservation(action, {
        ...readback,
        context: { ...context, projectId: 'project_other' },
      }).valid,
    ).toBe(false);
  });

  it('marks weak revisions while retaining a normalized current observation', () => {
    const action = planJiraRead({
      context,
      hostCapability: capability,
      stableId: 'jira:site_01:10042',
      issueId: '10042',
      currentKey: 'NEW-42',
      stepId: 'conformance-read',
    });
    expect(
      classifyJiraReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-05T12:01:00.000Z',
        outcome: 'found',
        observation: {
          ...observation,
          revision: { contentDigest: 'sha256:weak-revision' },
        },
      }),
    ).toMatchObject({
      classification: 'current',
      reasons: ['revision-evidence-weak'],
    });
  });

  it('keeps semantic actions free of provider execution mappings', () => {
    const serialized = JSON.stringify([
      mutation('update'),
      mutation('transition'),
    ]);
    expect(serialized).not.toMatch(
      /command|executable|arguments|catalog|query language/i,
    );
  });
});
