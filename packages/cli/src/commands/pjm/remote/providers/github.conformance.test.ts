import type {
  ProviderAdapter,
  SanitizedProviderObservation,
} from '@commands/pjm/remote/provider';
import {
  evaluateProviderConformance,
  type ProviderConformanceFixture,
} from '@commands/pjm/remote/provider-conformance';
import { composePurposePolicies } from '@commands/pjm/remote/purpose-policy';
import { describe, expect, it } from 'vitest';

import { githubAdapter } from './github';

const context = {
  host: 'github.example',
  accountId: 'account_123',
  repositoryId: 'repo_123',
  owner: 'acme',
  name: 'widgets',
};

const observation: SanitizedProviderObservation = {
  provider: 'github',
  context,
  identity: {
    stableId: 'issue_node_42',
    aliases: ['https://github.example/acme/widgets/issues/42'],
  },
  fields: {
    databaseId: 4200,
    nodeId: 'issue_node_42',
    owner: 'acme',
    name: 'widgets',
    number: 42,
    url: 'https://github.example/acme/widgets/issues/42',
    title: 'Conformance issue',
    body: 'Provider-neutral fixture',
    state: 'open',
    priority: 'medium',
    pullRequests: ['https://github.example/acme/widgets/pull/99'],
    hostCapability: {
      provider: 'github',
      context,
      availability: 'available',
      accountId: 'account_123',
      repositoryId: 'repo_123',
      operations: ['read', 'update', 'transition', 'annotate'],
      observableFields: ['stable-identity', 'title', 'state', 'revision'],
      evidenceDigest: 'sha256:bounded-capability',
    },
  },
  revision: { token: 'rev-42', contentDigest: 'sha256:remote' },
  capabilityEvidenceDigest: 'sha256:bounded-capability',
};

const adapter: ProviderAdapter = {
  ...githubAdapter,
  plan(operation, input) {
    return githubAdapter.plan(operation, { ...input, context });
  },
};

const fixture: ProviderConformanceFixture = {
  adapter,
  observation,
  expected: {
    stableId: 'github:github.example:repo_123:issue_node_42',
    aliases: [
      'acme/widgets#42',
      'https://github.example/acme/widgets/issues/42',
    ],
    verificationFields: [],
  },
};

describe('GitHub provider conformance', () => {
  it('passes the immutable shared normalization and semantic-action harness', () => {
    expect(evaluateProviderConformance(fixture)).toEqual([]);
  });

  it('covers source, planning, and combined source/planning policy without duplicate issues', () => {
    const source = composePurposePolicies(['source']);
    const planning = composePurposePolicies(['planning']);
    const combined = composePurposePolicies(['source', 'planning']);
    expect(source.fields.title).toEqual(['inbound']);
    expect(planning.fields.title).toEqual(['inbound', 'outbound']);
    expect(combined.fields.title).toEqual(['inbound']);
    expect(
      new Set([
        adapter.normalize(observation).stableId,
        adapter.normalize(observation).stableId,
      ]),
    ).toHaveLength(1);
  });

  it('plans annotations and transitions as semantic actions only', () => {
    expect(
      adapter.plan('annotate', {
        stableId: observation.identity.stableId,
        annotation: 'Completed locally',
      }),
    ).toMatchObject({ provider: 'github', operation: 'annotate', context });
    expect(
      adapter.plan('transition', {
        stableId: observation.identity.stableId,
        status: 'closed',
      }),
    ).toMatchObject({ provider: 'github', operation: 'transition', context });
  });

  it('retains bounded GitHub-native extensions without exposing a native invocation', () => {
    expect(adapter.normalize(observation).extensions).toEqual({
      databaseId: 4200,
      nodeId: 'issue_node_42',
      pullRequests: ['https://github.example/acme/widgets/pull/99'],
    });
    expect(adapter.plan('read', {})).not.toHaveProperty('tool');
    expect(adapter.plan('read', {})).not.toHaveProperty('command');
  });
});
