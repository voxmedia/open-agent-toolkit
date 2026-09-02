import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
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

import {
  githubAdapter,
  planGitHubMutation,
  previewGitHubMutation,
  type GitHubHostCapabilityObservation,
  type GitHubMutationField,
} from './github';
import {
  assessGitHubPublicationSafety,
  observeGitHubRepositoryVisibility,
} from './github-publication-safety';

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
      operations: ['read', 'create', 'update', 'transition', 'annotate'],
      observableFields: ['stable-identity', 'title', 'state', 'revision'],
      evidenceDigest: 'sha256:bounded-capability',
    },
  },
  revision: { token: 'rev-42', contentDigest: 'sha256:remote' },
  capabilityEvidenceDigest: 'sha256:bounded-capability',
};

const capability = observation.fields
  .hostCapability as GitHubHostCapabilityObservation;

function safeMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
  projection: Record<string, string>,
) {
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const base = {
    operation,
    context,
    bindingId: 'binding_42',
    stableId:
      operation === 'create'
        ? undefined
        : 'github:github.example:issue_node_42',
    provenance:
      operation === 'create'
        ? { bindingId: 'binding_42', origin: 'local-project:item-42' }
        : undefined,
    fieldMask: Object.keys(projection) as GitHubMutationField[],
    descriptionMode: 'replace' as const,
    projection,
    outboundSafety,
    hostCapability: capability,
    publicationSafety: assessGitHubPublicationSafety({
      visibilityObservation: observeGitHubRepositoryVisibility({
        context,
        visibility: 'public',
        capabilityEvidenceDigest: capability.evidenceDigest,
        observedAt: '2026-09-02T12:00:00.000Z',
      }),
      projection,
      outboundSafety,
      assessedAt: '2026-09-02T12:00:00.000Z',
    }),
  };
  const preview = previewGitHubMutation(base);
  return planGitHubMutation({
    ...base,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function mutationObservation(
  action: ReturnType<typeof safeMutation>,
  patch: Partial<SanitizedProviderObservation> = {},
): SanitizedProviderObservation {
  return {
    ...observation,
    ...patch,
    fields: {
      ...observation.fields,
      hostCapability: capability,
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
      ...patch.fields,
    },
  };
}

const adapter: ProviderAdapter = {
  ...githubAdapter,
  plan(operation, input) {
    if (operation === 'update') {
      return safeMutation('update', {
        title: String(
          (input.fields as Record<string, unknown> | undefined)?.title ??
            observation.fields.title,
        ),
      });
    }
    return githubAdapter.plan(operation, { ...input, context });
  },
  validateObservation(action, candidate) {
    return githubAdapter.validateObservation(
      action,
      mutationObservation(action as ReturnType<typeof safeMutation>, {
        ...candidate,
        fields: candidate.fields,
      }),
    );
  },
};

const fixture: ProviderConformanceFixture = {
  adapter,
  observation,
  expected: {
    stableId: 'github:github.example:issue_node_42',
    aliases: [
      'acme/widgets#42',
      'https://github.example/acme/widgets/issues/42',
    ],
    verificationFields: ['title'],
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

  it('plans annotations and transitions only through gated projections', () => {
    expect(
      safeMutation('annotate', { annotation: 'Completed locally' }),
    ).toMatchObject({
      provider: 'github',
      operation: 'annotate',
      context,
      intent: { fieldMask: ['annotation'] },
    });
    expect(safeMutation('transition', { status: 'closed' })).toMatchObject({
      provider: 'github',
      operation: 'transition',
      context,
      intent: { fieldMask: ['status'] },
    });
    expect(() => adapter.plan('transition', { status: 'closed' })).toThrow(
      'complete GitHub mutation input',
    );
  });

  it('retains bounded GitHub-native extensions without exposing a native invocation', () => {
    expect(adapter.normalize(observation).extensions).toEqual({
      databaseId: 4200,
      nodeId: 'issue_node_42',
      repositoryId: 'repo_123',
      historicalRepositoryIds: [],
      pullRequests: ['https://github.example/acme/widgets/pull/99'],
    });
    const read = adapter.plan('read', {
      stableId: 'github:github.example:issue_node_42',
      stableNodeId: 'issue_node_42',
      capabilityEvidenceDigest: capability.evidenceDigest,
      stepId: 'conformance-read-step',
    });
    expect(read).not.toHaveProperty('tool');
    expect(read).not.toHaveProperty('command');
  });

  it('validates and verifies the exact public mutation readback pair', () => {
    const action = safeMutation('update', { title: 'Conformance issue' });
    const exact = mutationObservation(action);
    expect(githubAdapter.validateObservation(action, exact)).toEqual({
      valid: true,
      reasons: [],
    });
    expect(
      githubAdapter.verify(action, githubAdapter.normalize(exact)),
    ).toEqual([{ field: 'title', status: 'verified' }]);
  });

  it.each([
    {
      name: 'wrong node',
      patch: {
        identity: { stableId: 'wrong_node', aliases: [] },
        fields: { nodeId: 'wrong_node' },
      },
    },
    {
      name: 'wrong repository',
      patch: { context: { ...context, repositoryId: 'repo_other' } },
    },
    {
      name: 'wrong capability',
      patch: { capabilityEvidenceDigest: 'sha256:other-capability' },
    },
    {
      name: 'wrong execution evidence',
      patch: {
        fields: {
          mutationEvidence: {
            capabilityEvidenceDigest: 'sha256:other-capability',
          },
        },
      },
    },
  ])('rejects public adapter readback with $name', ({ patch }) => {
    const action = safeMutation('update', { title: 'Conformance issue' });
    const mismatched = mutationObservation(action, patch);
    expect(githubAdapter.validateObservation(action, mismatched).valid).toBe(
      false,
    );
    expect(
      githubAdapter.verify(action, githubAdapter.normalize(mismatched)),
    ).toEqual([{ field: 'title', status: 'unavailable' }]);
  });

  it('rejects create readback with mismatched provenance through the public pair', () => {
    const action = safeMutation('create', { title: 'Conformance issue' });
    const mismatched = mutationObservation(action, {
      fields: {
        createProvenance: {
          bindingId: 'binding_other',
          origin: 'local-project:item-42',
        },
      },
    });
    expect(githubAdapter.validateObservation(action, mismatched).valid).toBe(
      false,
    );
    expect(
      githubAdapter.verify(action, githubAdapter.normalize(mismatched)),
    ).toEqual([{ field: 'title', status: 'unavailable' }]);
  });
});
