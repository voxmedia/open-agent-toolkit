import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  ProviderAdapter,
  SanitizedProviderObservation,
  SemanticAction,
} from '@commands/pjm/remote/provider';
import {
  evaluateProviderConformance,
  type ProviderConformanceFixture,
} from '@commands/pjm/remote/provider-conformance';
import { describe, expect, it } from 'vitest';

import {
  linearAdapter,
  planLinearMutation,
  previewLinearMutation,
  type LinearHostCapabilityObservation,
} from './linear';

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
  operations: ['read', 'create', 'update', 'transition', 'annotate'],
  observableFields: [
    'stable-identity',
    'title',
    'state',
    'priority',
    'revision',
    'team-context',
  ],
  evidenceDigest: 'sha256:linear-capability',
};

const observation: SanitizedProviderObservation = {
  provider: 'linear',
  context,
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
    title: 'Conformance issue',
    description: 'Provider-neutral fixture',
    state: 'started',
    priority: 'high',
    archived: false,
    estimate: 5,
    hostCapability: capability,
  },
  revision: { token: 'linear-rev-1', contentDigest: 'sha256:linear-content' },
  capabilityEvidenceDigest: capability.evidenceDigest,
};

function safeUpdate(title = 'Conformance issue'): SemanticAction {
  const projection = { title };
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const input = {
    operation: 'update' as const,
    context,
    hostCapability: capability,
    bindingId: 'binding_linear_42',
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    fieldMask: ['title'],
    projection,
    outboundSafety,
  };
  const preview = previewLinearMutation(input);
  return planLinearMutation({
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  });
}

function mutationObservation(
  action: SemanticAction,
  patch: Partial<SanitizedProviderObservation> = {},
): SanitizedProviderObservation {
  return {
    ...observation,
    ...patch,
    fields: {
      ...observation.fields,
      mutationEvidence: action.intent.executionEvidence,
      ...patch.fields,
    },
  };
}

const adapter: ProviderAdapter = {
  ...linearAdapter,
  plan(operation, input) {
    if (operation === 'update') {
      return safeUpdate(
        String(
          (input.fields as Record<string, unknown> | undefined)?.title ??
            observation.fields.title,
        ),
      );
    }
    return linearAdapter.plan(operation, input);
  },
  validateObservation(action, candidate) {
    return linearAdapter.validateObservation(
      action,
      mutationObservation(action, candidate),
    );
  },
};

const fixture: ProviderConformanceFixture = {
  adapter,
  observation,
  expected: {
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    aliases: ['ALPHA-42', 'OLD-19'],
    verificationFields: ['title'],
  },
};

describe('Linear provider conformance', () => {
  it('passes the immutable shared normalization and semantic-action harness', () => {
    expect(evaluateProviderConformance(fixture)).toEqual([]);
  });

  it('preserves priority, moved-team aliases, and allowlisted extensions', () => {
    const issue = linearAdapter.normalize({
      ...observation,
      fields: {
        ...observation.fields,
        identifier: 'BETA-42',
        historicalIdentifiers: ['ALPHA-42', 'OLD-19'],
        teamId: 'team_beta',
        historicalTeamIds: ['team_alpha'],
      },
      context: { ...context, teamId: 'team_beta' },
    });
    expect(issue).toMatchObject({
      aliases: ['BETA-42', 'ALPHA-42', 'OLD-19'],
      priority: 'high',
      extensions: {
        teamId: 'team_beta',
        historicalTeamIds: ['team_alpha'],
        estimate: 5,
      },
    });
  });

  it('fails closed when a transition capability is unavailable', () => {
    expect(() =>
      previewLinearMutation({
        operation: 'transition',
        context,
        hostCapability: { ...capability, operations: ['read'] },
        bindingId: 'binding_linear_42',
        stableId: fixture.expected.stableId,
        fieldMask: ['status'],
        projection: { status: 'completed' },
        outboundSafety: assessOutboundProjectionSafety(
          { status: 'completed' },
          { assessedAt: '2026-09-02T12:00:00.000Z' },
        ),
      }),
    ).toThrow('capability');
  });

  it('validates only exact-context sanitized semantic observations', () => {
    const action = safeUpdate();
    expect(
      linearAdapter.validateObservation(action, mutationObservation(action)),
    ).toEqual({ valid: true, reasons: [] });
    expect(
      linearAdapter.validateObservation(
        action,
        mutationObservation(action, {
          context: { ...context, workspaceId: 'workspace_other' },
        }),
      ),
    ).toEqual({ valid: false, reasons: ['observation-context-mismatch'] });
    expect(JSON.stringify(action)).not.toMatch(/graphql|mcp|command|toolName/i);
  });
});
