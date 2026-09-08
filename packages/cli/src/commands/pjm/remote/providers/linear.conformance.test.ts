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

function safeMutationInput(
  operation: 'create' | 'update' | 'transition' | 'annotate',
) {
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
  return {
    ...input,
    approvedPreviewDigest: preview.previewDigest,
  };
}

function safeMutation(
  operation: 'create' | 'update' | 'transition' | 'annotate',
): SemanticAction {
  return linearAdapter.plan(operation, safeMutationInput(operation));
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

  it('rejects every public mutation selector and input operation mismatch', () => {
    const operations = ['create', 'update', 'transition', 'annotate'] as const;
    for (const inputOperation of operations) {
      const input = safeMutationInput(inputOperation);
      for (const selector of operations) {
        if (selector === inputOperation) continue;
        expect(() => linearAdapter.plan(selector, input)).toThrow(
          'operation selector',
        );
      }
    }
  });

  it('binds public read validation and verification to the planned identity', () => {
    const action = linearAdapter.plan('read', {
      context,
      hostCapability: capability,
      stableId: fixture.expected.stableId,
      uuid: observation.fields.uuid,
      currentIdentifier: observation.fields.identifier,
      stepId: 'linear-public-read',
    });
    const unrelated = {
      ...observation,
      identity: {
        stableId: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        aliases: ['BETA-7'],
      },
      fields: {
        ...observation.fields,
        uuid: '9a8c5bc8-b2b5-4c75-9475-d112ca8f0150',
        identifier: 'BETA-7',
      },
    };
    expect(linearAdapter.validateObservation(action, unrelated)).toEqual({
      valid: false,
      reasons: ['observation-identity-mismatch'],
    });
    expect(linearAdapter.verificationFields(action)).toEqual([
      'stable-identity',
    ]);
    expect(
      linearAdapter.verify(action, linearAdapter.normalize(unrelated)),
    ).toEqual([{ field: 'stable-identity', status: 'mismatch' }]);
  });

  it.each([
    ['stale', 'sha256:stale'],
    ['missing', ''],
    ['misattributed', 'sha256:other-capability'],
  ] as const)(
    'fails closed for %s public read capability evidence',
    (_name, evidenceDigest) => {
      const action = linearAdapter.plan('read', {
        context,
        hostCapability: capability,
        stableId: fixture.expected.stableId,
        uuid: observation.fields.uuid,
        currentIdentifier: observation.fields.identifier,
        stepId: 'linear-capability-bound-read',
      });
      const readback = {
        ...observation,
        capabilityEvidenceDigest: evidenceDigest,
        fields: {
          ...observation.fields,
          hostCapability: { ...capability, evidenceDigest },
        },
      };
      const issue = linearAdapter.normalize(observation);
      issue.extensions.capabilityEvidenceDigest = evidenceDigest || undefined;

      expect(linearAdapter.validateObservation(action, readback).valid).toBe(
        false,
      );
      expect(linearAdapter.verify(action, issue)).toEqual([
        { field: 'stable-identity', status: 'unavailable' },
      ]);
    },
  );

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

  it('rejects forged, missing, and misattributed create provenance publicly', () => {
    const action = safeMutation('create');
    const readback = mutationObservation(action);
    for (const createProvenance of [
      undefined,
      { bindingId: action.intent.bindingId, origin: 'local:other' },
      { bindingId: 'binding_other', origin: 'local:item-42' },
    ]) {
      expect(
        linearAdapter.validateObservation(action, {
          ...readback,
          fields: { ...readback.fields, createProvenance },
        }),
      ).toEqual({
        valid: false,
        reasons: ['create-provenance-mismatch'],
      });
    }
  });

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
