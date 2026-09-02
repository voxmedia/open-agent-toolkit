import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  normalizeLinearIssueObservation,
  parseLinearIssueReference,
  planLinearDiscussionRead,
  planLinearRead,
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
  operations: ['read', 'read-discussion'],
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
