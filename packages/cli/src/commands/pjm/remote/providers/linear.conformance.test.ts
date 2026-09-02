import { assessOutboundProjectionSafety } from '@commands/pjm/remote/outbound-projection-safety';
import type {
  SanitizedProviderObservation,
  SemanticAction,
} from '@commands/pjm/remote/provider';
import { evaluateProviderConformance } from '@commands/pjm/remote/provider-conformance';
import { describe, expect, it } from 'vitest';

import {
  linearAdapter,
  previewLinearMutation,
  verifyLinearMutationObservation,
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

function safeMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
): SemanticAction {
  const projection =
    operation === 'transition'
      ? { status: 'completed' }
      : operation === 'annotate'
        ? { annotation: 'Completed locally' }
        : { title: 'Conformance issue' };
  const outboundSafety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-09-02T12:00:00.000Z',
  });
  const input = {
    operation,
    context,
    hostCapability: capability,
    bindingId: 'binding_linear_42',
    ...(operation === 'create'
      ? {
          provenance: {
            bindingId: 'binding_linear_42',
            origin: 'local:item-42',
          },
        }
      : {
          stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
        }),
    fieldMask: Object.keys(projection),
    projection,
    outboundSafety,
  };
  const preview = previewLinearMutation(input);
  return linearAdapter.plan(operation, {
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
      hostCapability: capability,
      ...((action.intent.projection as Record<string, unknown>).title ===
      undefined
        ? {}
        : {
            title: (action.intent.projection as Record<string, unknown>).title,
          }),
      ...((action.intent.projection as Record<string, unknown>).status ===
      undefined
        ? {}
        : {
            state: (action.intent.projection as Record<string, unknown>).status,
          }),
      ...((action.intent.projection as Record<string, unknown>).annotation ===
      undefined
        ? {}
        : {
            annotations: [
              (action.intent.projection as Record<string, unknown>).annotation,
            ],
          }),
      mutationEvidence: action.intent.executionEvidence,
      ...(action.operation === 'create'
        ? { createProvenance: action.intent.provenance }
        : {}),
      ...patch.fields,
    },
  };
}

const fixture = {
  adapter: linearAdapter,
  observation,
  expected: {
    stableId: 'linear:workspace_01:8dc8f820-8de1-4f2b-8c3d-7be80378bffa',
    aliases: ['ALPHA-42', 'OLD-19'],
    verificationFields: ['title'],
  },
};

describe('Linear provider conformance', () => {
  it('fails closed when the immutable generic harness omits mandatory mutation evidence', () => {
    expect(() => evaluateProviderConformance(fixture)).toThrow(
      'complete mutation input',
    );
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
    const action = safeMutation('update');
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

  it.each(['create', 'update', 'transition', 'annotate'] as const)(
    'plans, publicly validates, and verifies real %s adapter actions',
    (operation) => {
      const action = safeMutation(operation);
      const readback = mutationObservation(action);
      expect(linearAdapter.validateObservation(action, readback)).toEqual({
        valid: true,
        reasons: [],
      });
      expect(
        verifyLinearMutationObservation({
          action,
          attempt: {
            count: 1,
            outcome: 'accepted',
            capabilityEvidenceDigest: capability.evidenceDigest,
          },
          hostCapability: capability,
          readback,
        }).classification,
      ).toBe('verified');
      expect(
        linearAdapter.verify(action, linearAdapter.normalize(readback)),
      ).toEqual(
        linearAdapter.verificationFields(action).map((field) => ({
          field,
          status: 'verified',
        })),
      );
    },
  );

  it('rejects action integrity and UUID/context/evidence drift on the public path', () => {
    const action = safeMutation('update');
    for (const changed of [
      {
        action: {
          ...action,
          intent: { ...action.intent, actionDigest: 'sha256:changed' },
        },
        observation: mutationObservation(action),
      },
      {
        action,
        observation: mutationObservation(action, {
          identity: {
            stableId: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
            aliases: [],
          },
          fields: {
            uuid: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
          },
        }),
      },
      {
        action,
        observation: mutationObservation(action, {
          context: { ...context, teamId: 'team_other' },
        }),
      },
      {
        action,
        observation: {
          ...mutationObservation(action),
          capabilityEvidenceDigest: 'sha256:other',
        },
      },
    ]) {
      expect(
        linearAdapter.validateObservation(changed.action, changed.observation)
          .valid,
      ).toBe(false);
    }
  });
});
