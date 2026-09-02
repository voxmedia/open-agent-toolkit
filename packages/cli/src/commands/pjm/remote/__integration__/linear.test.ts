import { describe, expect, it } from 'vitest';

import {
  classifyLinearReadObservation,
  normalizeLinearIssueObservation,
  planLinearDuplicateSearch,
  planLinearRead,
  type LinearHostCapabilityObservation,
} from '../providers/linear';
import {
  FakeLifecycleStore,
  GenericHostExecutor,
  LifecycleHarness,
} from './lifecycle-harness';

const context = {
  host: 'linear.example',
  accountId: 'acct_linear',
  workspaceId: 'workspace_01',
  teamId: 'team_alpha',
};

const capability: LinearHostCapabilityObservation = {
  provider: 'linear',
  context,
  availability: 'available',
  accountId: 'acct_linear',
  workspaceId: 'workspace_01',
  teamId: 'team_alpha',
  operations: [
    'read',
    'create',
    'update',
    'transition',
    'annotate',
    'search-duplicates',
  ],
  observableFields: [
    'stable-identity',
    'title',
    'state',
    'revision',
    'team-context',
  ],
  evidenceDigest: 'sha256:linear-capability',
};

const observation = {
  provider: 'linear' as const,
  context,
  identity: {
    stableId: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    aliases: ['ALPHA-42'],
  },
  fields: {
    uuid: '8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    identifier: 'ALPHA-42',
    historicalIdentifiers: [],
    workspaceId: 'workspace_01',
    teamId: 'team_alpha',
    historicalTeamIds: [],
    title: 'Linear planning issue',
    description: 'Provider-neutral fixture',
    state: 'started',
    priority: 'high',
    archived: false,
  },
  revision: { token: 'linear-rev-1', contentDigest: 'sha256:linear-content' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

const publishInput = {
  operationId: 'op_linear_publish',
  bindingId: 'binding_linear_42',
  provider: 'linear' as const,
  context: {
    host: context.host,
    workspaceId: context.workspaceId,
    teamId: context.teamId,
  },
  projection: { title: 'Published title' },
  previewDigest: 'sha256:approved-preview',
  approvalDigest: 'sha256:approved-preview',
  capabilityEvidenceDigest: capability.evidenceDigest,
};

describe('Linear remote lifecycle integration', () => {
  it('intakes and refreshes through durable UUID and sanitized observations', () => {
    const intaken = normalizeLinearIssueObservation(observation);
    const action = planLinearRead({
      context,
      hostCapability: capability,
      stableId: intaken.stableId,
      uuid: observation.fields.uuid,
      currentIdentifier: observation.fields.identifier,
      stepId: 'linear-refresh',
    });
    expect(
      classifyLinearReadObservation({
        action,
        hostCapability: capability,
        observedAt: '2026-09-02T12:01:00.000Z',
        outcome: 'found',
        observation,
      }),
    ).toMatchObject({ classification: 'current', issue: intaken });
  });

  it('publishes and reconciles through the generic host with pinned readback', async () => {
    const harness = new LifecycleHarness();
    const result = await harness.publish(publishInput);
    expect(result).toMatchObject({
      state: 'verified',
      capabilityEvidenceDigest: capability.evidenceDigest,
      materializationSteps: [
        'metadata',
        'state',
        'snapshot',
        'baseline',
        'association',
      ],
    });
    expect(result.action).toMatchObject({
      provider: 'linear',
      semanticOperation: 'update',
      context: {
        host: context.host,
        workspaceId: context.workspaceId,
        teamId: context.teamId,
      },
    });
    expect(JSON.stringify(result.action)).not.toMatch(
      /graphql|mcp|toolName|executable|command/i,
    );
  });

  it('requires context equivalence before any pre-attempt fallback', () => {
    expect(() =>
      planLinearRead({
        context,
        hostCapability: {
          ...capability,
          context: { ...context, teamId: 'team_other' },
          teamId: 'team_other',
        },
        stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        uuid: observation.fields.uuid,
        currentIdentifier: observation.fields.identifier,
        stepId: 'linear-fallback',
      }),
    ).toThrow('capability');
  });

  it('leaves dropped readback and unknown host outcomes uncertain without retry', async () => {
    const mismatchExecutor = new GenericHostExecutor();
    const mismatchHarness = new LifecycleHarness({
      executor: mismatchExecutor,
      readback: async () => ({ title: 'Silently unchanged' }),
    });
    const mismatch = await mismatchHarness.publish(publishInput);
    expect(mismatch.state).toBe('uncertain');
    expect((await mismatchHarness.publish(publishInput)).state).toBe(
      'uncertain',
    );
    expect(mismatchExecutor.calls).toBe(1);

    const unknownExecutor = new GenericHostExecutor({
      classification: 'unknown',
      observationDigest: 'sha256:unknown',
    });
    const unknown = await new LifecycleHarness({
      executor: unknownExecutor,
    }).publish({ ...publishInput, operationId: 'op_linear_unknown' });
    expect(unknown.state).toBe('uncertain');
    expect(unknownExecutor.calls).toBe(1);
  });

  it('resumes external-action continuation and keeps closeout outcomes independent', async () => {
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    const interrupted = new LifecycleHarness({ store, executor });
    await expect(
      interrupted.publish({ ...publishInput, crashAt: 'after-observation' }),
    ).rejects.toThrow('crash:after-observation');
    const resumed = await new LifecycleHarness({ store, executor }).publish(
      publishInput,
    );
    expect(resumed.state).toBe('verified');
    expect(executor.calls).toBe(1);

    const archivedAction = planLinearRead({
      context,
      hostCapability: capability,
      stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
      uuid: observation.fields.uuid,
      currentIdentifier: observation.fields.identifier,
      stepId: 'linear-closeout-refresh',
    });
    const archived = classifyLinearReadObservation({
      action: archivedAction,
      hostCapability: capability,
      observedAt: '2026-09-02T12:02:00.000Z',
      outcome: 'found',
      observation: {
        ...observation,
        fields: { ...observation.fields, archived: true },
      },
    });
    expect(archived.classification).toBe('archived');
    expect(resumed.state).toBe('verified');
  });

  it('prepares duplicate recovery from exact provenance, aliases, and context', () => {
    const action = planLinearDuplicateSearch({
      context,
      hostCapability: capability,
      provenanceToken: 'origin:local:item-42',
      reservedBindingId: 'binding_linear_42',
      historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
      maxResults: 10,
    });
    expect(action).toMatchObject({
      operation: 'search-duplicates',
      intent: {
        resultContract: {
          requireStableUuid: true,
          requireExactContext: true,
        },
      },
    });
  });
});
