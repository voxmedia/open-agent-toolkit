import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import { normalizeJiraIssueObservation, parseJiraIssueReference } from './jira';

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
