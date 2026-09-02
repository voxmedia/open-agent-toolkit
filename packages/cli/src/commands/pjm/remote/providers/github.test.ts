import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import { describe, expect, it } from 'vitest';

import {
  classifyGitHubReadObservation,
  githubAdapter,
  normalizeGitHubIssueObservation,
  parseGitHubIssueReference,
  validateGitHubHostCapability,
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
});

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
  operations: ['read', 'create', 'update'],
  observableFields: ['stable-identity', 'title', 'state', 'revision'],
  evidenceDigest: 'sha256:bounded-capability',
};
