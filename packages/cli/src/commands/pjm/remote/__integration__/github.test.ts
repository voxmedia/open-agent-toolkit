import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import {
  semanticDigest,
  type SanitizedProviderObservation,
} from '@commands/pjm/remote/provider';
import {
  classifyGitHubReadObservation,
  githubAdapter,
  planGitHubMutation,
  previewGitHubMutation,
  validateDuplicateSearchObservation,
  validateDiscussionReadObservation,
  verifyGitHubMutationObservation,
  type GitHubHostCapabilityObservation,
  type GitHubMutationField,
} from '@commands/pjm/remote/providers/github';
import {
  assessGitHubPublicationSafety,
  observeGitHubRepositoryVisibility,
} from '@commands/pjm/remote/providers/github-publication-safety';
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
    'create',
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

class GitHubStoreSpy {
  readonly snapshots = new Map<string, unknown>();
  readonly journal: unknown[] = [];
  snapshotWrites = 0;
  journalWrites = 0;

  writeSnapshot(stableId: string, value: unknown) {
    this.snapshotWrites += 1;
    this.snapshots.set(stableId, structuredClone(value));
  }

  appendJournal(value: unknown) {
    this.journalWrites += 1;
    this.journal.push(structuredClone(value));
  }
}

function safeMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
  projection: Record<string, string>,
) {
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const publicationSafety = assessGitHubPublicationSafety({
    visibilityObservation: observeGitHubRepositoryVisibility({
      context,
      visibility: 'public',
      capabilityEvidenceDigest: capability.evidenceDigest,
      observedAt: '2026-09-02T12:00:00.000Z',
    }),
    projection,
    outboundSafety,
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const base = {
    operation,
    context,
    bindingId: 'binding_ready',
    stableId:
      operation === 'create'
        ? undefined
        : 'github:github.example:issue_node_42',
    provenance:
      operation === 'create'
        ? { bindingId: 'binding_ready', origin: 'local-project:item-42' }
        : undefined,
    fieldMask: Object.keys(projection) as GitHubMutationField[],
    descriptionMode: 'replace' as const,
    projection,
    outboundSafety,
    hostCapability: capability,
    publicationSafety,
  };
  const preview = previewGitHubMutation(base);
  return planGitHubMutation({
    ...base,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function mutationReadback(
  action: ReturnType<typeof safeMutation>,
  fields: Record<string, unknown> = issue.fields,
): SanitizedProviderObservation {
  return {
    ...issue,
    context,
    fields: {
      ...fields,
      hostCapability: capability,
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
    },
  };
}

function transferEvidence() {
  const content = {
    provider: 'github' as const,
    stableId: 'github:github.example:issue_node_42',
    fromRepositoryId: 'repo_123',
    toRepositoryId: 'repo_456',
    capabilityEvidenceDigest: capability.evidenceDigest,
    observedAt: '2026-09-02T12:01:00.000Z',
  };
  return { ...content, evidenceDigest: semanticDigest(content) };
}

function persistAfterPublicValidation(
  store: GitHubStoreSpy,
  action: ReturnType<typeof safeMutation>,
  readback: SanitizedProviderObservation,
) {
  const validation = githubAdapter.validateObservation(action, readback);
  if (!validation.valid) {
    return { persisted: false, validation, verification: [] };
  }
  const normalized = githubAdapter.normalize(readback);
  const verification = githubAdapter.verify(action, normalized);
  if (
    verification.length === 0 ||
    verification.some((field) => field.status !== 'verified')
  ) {
    return { persisted: false, validation, verification };
  }
  store.appendJournal({
    operation: action.operation,
    actionDigest: action.intent.actionDigest,
  });
  store.writeSnapshot(normalized.stableId, normalized);
  return { persisted: true, validation, verification };
}

class GitHubLifecycleFixture {
  readonly store = new GitHubStoreSpy();
  private readonly readAction = githubAdapter.plan('read', {
    context,
    currentAlias: 'acme/widgets#42',
    stableNodeId: 'issue_node_42',
    stableId: 'github:github.example:issue_node_42',
    capabilityEvidenceDigest: capability.evidenceDigest,
    stepId: 'integration-read-step',
  });

  intake() {
    const result = classifyGitHubReadObservation({
      action: this.readAction,
      hostCapability: capability,
      observedAt: '2026-09-02T12:00:00.000Z',
      outcome: 'found',
      observation: issue,
    });
    if (result.issue)
      this.store.writeSnapshot(result.issue.stableId, result.issue);
    return result;
  }

  refresh() {
    const moved: SanitizedProviderObservation = {
      ...issue,
      context: { ...context, repositoryId: 'repo_456', owner: 'platform' },
      identity: {
        ...issue.identity,
        aliases: [...issue.identity.aliases, 'acme/widgets#42'],
      },
      fields: {
        ...issue.fields,
        historicalRepositoryIds: ['repo_123'],
        owner: 'platform',
        number: 84,
        url: 'https://github.example/platform/widgets/issues/84',
        transferEvidence: transferEvidence(),
      },
    };
    const result = classifyGitHubReadObservation({
      action: this.readAction,
      hostCapability: capability,
      observedAt: '2026-09-02T12:01:00.000Z',
      outcome: 'found',
      observation: moved,
    });
    if (result.issue) {
      this.store.writeSnapshot(result.issue.stableId, result.issue);
      this.store.appendJournal({
        stableId: result.issue.stableId,
        fromAlias: 'acme/widgets#42',
        toAlias: 'platform/widgets#84',
      });
    }
    return {
      ...result,
      storedSnapshot: result.issue
        ? this.store.snapshots.get(result.issue.stableId)
        : null,
      transferJournal: this.store.journal,
    };
  }

  async publish() {
    const projection = { title: 'Published title' };
    const githubAction = safeMutation('update', projection);
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
      projection: githubAction.intent.projection as typeof projection,
      previewDigest: String(githubAction.intent.previewDigest),
      approvalDigest: String(githubAction.intent.approvalDigest),
      capabilityEvidenceDigest: capability.evidenceDigest,
    });
    const verification = verifyGitHubMutationObservation({
      action: githubAction,
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      hostCapability: capability,
      readback: mutationReadback(githubAction),
    });
    return {
      state:
        operation.state === 'verified' &&
        verification.classification === 'verified'
          ? 'verified'
          : 'uncertain',
      semanticOperation: operation.action?.semanticOperation,
      persistedIntent: operation.action?.intent,
      receipt: { observationDigest: operation.observationDigest },
      githubEvidence: githubAction.intent.executionEvidence,
    };
  }

  reconcile() {
    const action = safeMutation('update', { title: 'Published title' });
    const result = verifyGitHubMutationObservation({
      action,
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      hostCapability: capability,
      readback: mutationReadback(action),
    });
    return {
      classification: result.classification,
      readbackVerified: result.classification === 'verified',
    };
  }

  duplicateSearch() {
    const action = githubAdapter.plan('search-duplicates', {
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
        queryDigest: String(action.intent.queryDigest),
        results: [
          {
            stableId: 'github:github.example:issue_node_42',
            aliases: ['acme/widgets#42'],
            context,
            matchedBy: 'provenance',
            matchedProvenanceToken: 'origin:local-project:item-42',
            stableIdentityVerified: true,
            contextVerified: true,
            historicalRepositoryIds: [],
          },
        ],
      },
    });
  }

  discussionRead() {
    const writesBefore = {
      snapshot: this.store.snapshotWrites,
      journal: this.store.journalWrites,
    };
    const result = validateDiscussionReadObservation({
      action: githubAdapter.plan('read-discussion', {
        context,
        hostCapability: capability,
        stableId: 'github:github.example:issue_node_42',
        evidenceKind: 'comments',
        cursor: null,
        limit: 10,
      }),
      hostCapability: capability,
      observation: {
        provider: 'github',
        context,
        stableId: 'github:github.example:issue_node_42',
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
      bindingSnapshotUnchanged:
        this.store.snapshotWrites === writesBefore.snapshot,
      journalUnchanged: this.store.journalWrites === writesBefore.journal,
    };
  }

  staleDeletion() {
    const writesBefore = {
      snapshot: this.store.snapshotWrites,
      journal: this.store.journalWrites,
    };
    const content = {
      provider: 'github' as const,
      stableId: this.readAction.intent.stableId as string,
      context,
      capabilityEvidenceDigest: capability.evidenceDigest,
      actionDigest: this.readAction.intent.actionDigest as string,
      stepId: this.readAction.intent.stepId as string,
      observedAt: '2026-09-02T11:00:00.000Z',
    };
    const result = classifyGitHubReadObservation({
      action: this.readAction,
      hostCapability: capability,
      observedAt: '2026-09-02T12:00:00.000Z',
      outcome: 'not-found',
      deletionEvidence: {
        ...content,
        evidenceDigest: semanticDigest(content),
      },
    });
    return {
      ...result,
      snapshotUnchanged: this.store.snapshotWrites === writesBefore.snapshot,
      journalUnchanged: this.store.journalWrites === writesBefore.journal,
    };
  }

  closeout() {
    const action = safeMutation('transition', { status: 'closed' });
    const ready = verifyGitHubMutationObservation({
      action,
      attempt: {
        count: 1,
        outcome: 'accepted',
        capabilityEvidenceDigest: capability.evidenceDigest,
      },
      hostCapability: capability,
      readback: mutationReadback(action, {
        ...issue.fields,
        state: 'closed',
      }),
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
      issue: {
        stableId: 'github:github.example:issue_node_42',
        aliases: expect.arrayContaining([
          'acme/widgets#42',
          'platform/widgets#84',
        ]),
      },
      storedSnapshot: {
        stableId: 'github:github.example:issue_node_42',
      },
      transferJournal: [
        {
          stableId: 'github:github.example:issue_node_42',
          fromAlias: 'acme/widgets#42',
          toAlias: 'platform/widgets#84',
        },
      ],
    });
    expect(await fixture.publish()).toMatchObject({
      state: 'verified',
      semanticOperation: 'update',
      persistedIntent: { fields: { title: 'Published title' } },
      receipt: { observationDigest: 'sha256:github-observation' },
      githubEvidence: {
        publicationSafetyResultDigest: expect.stringMatching(/^sha256:/),
        visibilityEvidenceDigest: expect.stringMatching(/^sha256:/),
      },
    });
    expect(await fixture.reconcile()).toEqual({
      classification: 'verified',
      readbackVerified: true,
    });
    expect(fixture.duplicateSearch()).toMatchObject({
      accepted: true,
      classification: 'one-verified-match',
      stableId: 'github:github.example:issue_node_42',
    });
    expect(fixture.discussionRead()).toMatchObject({
      classification: 'page',
      persistable: false,
      bindingSnapshotUnchanged: true,
      journalUnchanged: true,
    });
    expect(fixture.staleDeletion()).toMatchObject({
      classification: 'inaccessible',
      preservePriorEvidence: true,
      snapshotUnchanged: true,
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

  it('materializes every mutation class only after exact GitHub evidence verifies', () => {
    const store = new GitHubStoreSpy();
    const cases = [
      ['create', { title: 'Published title' }, {}],
      ['update', { title: 'Published title' }, {}],
      ['transition', { status: 'closed' }, { state: 'closed' }],
      [
        'annotate',
        { annotation: 'Completed locally' },
        { annotations: ['Completed locally'] },
      ],
    ] as const;
    for (const [operation, projection, readbackPatch] of cases) {
      const action = safeMutation(operation, projection);
      const readback = mutationReadback(action, {
        ...issue.fields,
        ...readbackPatch,
      });
      expect(
        persistAfterPublicValidation(store, action, readback),
      ).toMatchObject({ persisted: true });

      const altered = {
        ...readback,
        fields: {
          ...readback.fields,
          mutationEvidence: {
            ...(readback.fields.mutationEvidence as Record<string, unknown>),
            capabilityEvidenceDigest: 'sha256:wrong-capability',
          },
        },
      };
      expect(
        persistAfterPublicValidation(store, action, altered),
      ).toMatchObject({
        persisted: false,
      });
    }
    expect(store.snapshotWrites).toBe(4);
    expect(store.journalWrites).toBe(4);
  });
});
