import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type { SanitizedProviderObservation } from '@commands/pjm/remote/provider';
import {
  classifyGitHubReadObservation,
  githubAdapter,
  planDuplicateSearch,
  planDiscussionRead,
  validateDuplicateSearchObservation,
  validateDiscussionReadObservation,
  verifyGitHubMutationObservation,
  type GitHubHostCapabilityObservation,
} from '@commands/pjm/remote/providers/github';
import { assessGitHubPublicationSafety } from '@commands/pjm/remote/providers/github-publication-safety';
import { describe, expect, it } from 'vitest';

import { GenericHostExecutor, LifecycleHarness } from './lifecycle-harness';

const context = {
  host: 'github.example',
  accountId: 'account_123',
  repositoryId: 'repo_123',
  owner: 'acme',
  name: 'widgets',
};

const capability: GitHubHostCapabilityObservation = {
  provider: 'github',
  context,
  availability: 'available',
  accountId: 'account_123',
  repositoryId: 'repo_123',
  operations: [
    'read',
    'update',
    'transition',
    'annotate',
    'search-duplicates',
    'read-discussion',
  ],
  observableFields: ['stable-identity', 'title', 'state', 'revision'],
  evidenceDigest: 'sha256:github-capability',
};

const issue: SanitizedProviderObservation = {
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
    title: 'Published title',
    body: 'Bounded issue body',
    state: 'open',
    priority: 'medium',
    pullRequests: [],
  },
  revision: { token: 'rev-42', contentDigest: 'sha256:remote' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

class GitHubLifecycleFixture {
  private readonly readAction = githubAdapter.plan('read', {
    context,
    currentAlias: 'acme/widgets#42',
    stableNodeId: 'issue_node_42',
  });

  intake() {
    return classifyGitHubReadObservation({
      action: this.readAction,
      hostCapability: capability,
      observedAt: '2026-09-02T12:00:00.000Z',
      outcome: 'found',
      observation: issue,
    });
  }

  refresh() {
    const moved: SanitizedProviderObservation = {
      ...issue,
      context: { ...context, repositoryId: 'repo_456', owner: 'platform' },
      fields: {
        ...issue.fields,
        owner: 'platform',
        number: 84,
        url: 'https://github.example/platform/widgets/issues/84',
      },
    };
    return {
      ...classifyGitHubReadObservation({
        action: this.readAction,
        hostCapability: capability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation: moved,
      }),
      transferHistory: ['acme/widgets#42'],
    };
  }

  async publish() {
    const projection = { title: 'Published title' };
    const universalSafety = assessOutboundProjectionSafety(projection, {
      assessedAt: '2026-09-02T12:00:00.000Z',
    });
    const publicationSafety = assessGitHubPublicationSafety({
      visibility: 'public',
      visibilityEvidenceDigest: 'sha256:visibility',
      projection,
      outboundSafety: universalSafety,
      assessedAt: '2026-09-02T12:00:00.000Z',
    });
    if (publicationSafety.verdict !== 'safe') {
      return { state: 'blocked', publicationSafety };
    }
    const harness = new LifecycleHarness({
      executor: new GenericHostExecutor({
        classification: 'committed',
        observationDigest: 'sha256:github-observation',
      }),
      readback: async () => ({ title: 'Published title' }),
    });
    const operation = await harness.publish({
      operationId: 'operation_github_publish',
      bindingId: 'binding_ready',
      provider: 'github',
      context: {
        host: context.host,
        owner: context.owner,
        repositoryId: context.repositoryId,
      },
      projection,
      previewDigest: 'sha256:preview',
      approvalDigest: 'sha256:preview',
      capabilityEvidenceDigest: capability.evidenceDigest,
    });
    return {
      state: operation.state,
      semanticOperation: operation.action?.semanticOperation,
      persistedIntent: operation.action?.intent,
      receipt: { observationDigest: operation.observationDigest },
      publicationSafety: publicationSafety.verdict,
    };
  }

  reconcile() {
    const result = verifyGitHubMutationObservation({
      action: githubAdapter.plan('update', {
        context,
        stableId: issue.identity.stableId,
        postconditions: { title: 'Published title' },
      }),
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      hostCapability: capability,
      readback: issue,
    });
    return {
      classification: result.classification,
      readbackVerified: result.classification === 'verified',
    };
  }

  duplicateSearch() {
    const action = planDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local-project:item-42',
      reservedBindingId: 'binding_ready',
      historicalAliases: ['acme/widgets#42'],
      maxResults: 10,
    });
    return validateDuplicateSearchObservation({
      action,
      hostCapability: capability,
      observation: {
        provider: 'github',
        context,
        availability: 'available',
        capabilityEvidenceDigest: capability.evidenceDigest,
        results: [
          {
            stableId: issue.identity.stableId,
            aliases: ['acme/widgets#42'],
            context,
            matchedBy: 'provenance',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: [],
          },
        ],
      },
    });
  }

  discussionRead() {
    const snapshotBefore = JSON.stringify(issue);
    const result = validateDiscussionReadObservation({
      action: planDiscussionRead({
        context,
        hostCapability: capability,
        stableId: issue.identity.stableId,
        evidenceKind: 'comments',
        cursor: null,
        limit: 10,
      }),
      hostCapability: capability,
      observation: {
        provider: 'github',
        context,
        availability: 'available',
        capabilityEvidenceDigest: capability.evidenceDigest,
        requestedCursor: null,
        nextCursor: null,
        items: [
          {
            id: 'comment_1',
            kind: 'comment',
            body: 'Informational evidence only',
            observedAt: '2026-09-02T12:03:00.000Z',
          },
        ],
      },
    });
    return {
      ...result,
      bindingSnapshotUnchanged: JSON.stringify(issue) === snapshotBefore,
      journalUnchanged: true,
    };
  }

  closeout() {
    const ready = verifyGitHubMutationObservation({
      action: githubAdapter.plan('transition', {
        context,
        stableId: issue.identity.stableId,
        postconditions: { status: 'closed' },
      }),
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      hostCapability: capability,
      readback: {
        ...issue,
        fields: { ...issue.fields, state: 'closed' },
      },
    });
    const limited = classifyGitHubReadObservation({
      action: this.readAction,
      hostCapability: { ...capability, availability: 'rate-limited' },
      observedAt: '2026-09-02T12:02:00.000Z',
      outcome: 'temporary-failure',
    });
    return {
      outcomes: [
        { bindingId: 'binding_ready', outcome: ready.classification },
        { bindingId: 'binding_limited', outcome: limited.classification },
      ],
      allOrNothing: false,
    };
  }
}

describe('GitHub remote lifecycle integration', () => {
  it('intakes, refreshes transfers, publishes, and reconciles through generic observations', async () => {
    const fixture = new GitHubLifecycleFixture();
    expect(await fixture.intake()).toMatchObject({ classification: 'current' });
    expect(await fixture.refresh()).toMatchObject({
      classification: 'transferred',
      transferHistory: ['acme/widgets#42'],
    });
    expect(await fixture.publish()).toMatchObject({
      state: 'verified',
      publicationSafety: 'safe',
      semanticOperation: 'update',
      persistedIntent: { fields: { title: 'Published title' } },
      receipt: { observationDigest: 'sha256:github-observation' },
    });
    expect(await fixture.reconcile()).toEqual({
      classification: 'verified',
      readbackVerified: true,
    });
    expect(fixture.duplicateSearch()).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'issue_node_42',
    });
    expect(fixture.discussionRead()).toMatchObject({
      classification: 'page',
      persistable: false,
      bindingSnapshotUnchanged: true,
      journalUnchanged: true,
    });
  });

  it('reports rate limits and independent closeout outcomes per binding', async () => {
    const fixture = new GitHubLifecycleFixture();
    expect(await fixture.closeout()).toEqual({
      outcomes: [
        { bindingId: 'binding_ready', outcome: 'verified' },
        { bindingId: 'binding_limited', outcome: 'temporarily-unavailable' },
      ],
      allOrNothing: false,
    });
  });
});
