import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  normalizeJiraIssueObservation,
  parseJiraIssueReference,
  planJiraDiscussionRead,
  planJiraMetadataRead,
  planJiraRead,
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
