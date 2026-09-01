import { describe, expect, it } from 'vitest';

import {
  resolveEffectiveRemotePolicy,
  validateProductionMutationAuthority,
} from './authority';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';
import { buildBindingPreview } from './preview';

describe('resolveEffectiveRemotePolicy', () => {
  it('defaults every operation and description to fail-closed built-ins', () => {
    const result = resolveEffectiveRemotePolicy({
      repository: { description: undefined, authority: {} },
    });

    expect(result.description).toBe('none');
    expect(new Set(Object.values(result.authority))).toEqual(
      new Set(['read-only']),
    );
    expect(result.authorityTrace.create).toMatchObject({
      builtIn: 'read-only',
      repository: { value: 'read-only', source: 'built-in' },
      provider: { value: null, source: 'inherit' },
      final: 'read-only',
    });
  });

  it('uses repository operation overrides before provider replacement', () => {
    const result = resolveEffectiveRemotePolicy({
      repository: {
        description: 'managed-section',
        authority: {
          default: 'user-authorized',
          operations: { annotate: 'read-only' },
        },
      },
      provider: {
        authority: { default: 'autonomous' },
      },
    });

    expect(result.authority.annotate).toBe('autonomous');
    expect(result.authorityTrace.annotate).toMatchObject({
      repository: { value: 'read-only', source: 'operation' },
      provider: { value: 'autonomous', source: 'default' },
    });
  });

  it('uses provider operation before provider default and records the trace', () => {
    const result = resolveEffectiveRemotePolicy({
      repository: {
        description: 'none',
        authority: { default: 'read-only' },
      },
      provider: {
        authority: {
          default: 'autonomous',
          operations: { annotate: 'user-authorized' },
        },
      },
    });
    expect(result.authority.annotate).toBe('user-authorized');
    expect(result.authorityTrace.annotate.provider).toEqual({
      value: 'user-authorized',
      source: 'operation',
    });
  });

  it('applies binding default and operation entries as independent tightening clamps', () => {
    const result = resolveEffectiveRemotePolicy({
      repository: {
        description: 'replace',
        authority: { default: 'autonomous' },
      },
      binding: {
        description: 'managed-section',
        authority: {
          default: 'user-authorized',
          operations: {
            annotate: 'read-only',
            transition: 'autonomous',
          },
        },
      },
    });

    expect(result.description).toBe('managed-section');
    expect(result.authority.annotate).toBe('read-only');
    expect(result.authority.transition).toBe('user-authorized');
    expect(result.authorityTrace.transition).toMatchObject({
      bindingDefault: 'user-authorized',
      bindingOperation: 'autonomous',
      final: 'user-authorized',
    });
  });

  it.each([
    [
      'repository default',
      { repository: { authority: { default: 'invalid' } } },
    ],
    [
      'repository operation',
      { repository: { authority: { operations: { annotate: 'invalid' } } } },
    ],
    ['provider default', { provider: { authority: { default: 'invalid' } } }],
    [
      'provider operation',
      { provider: { authority: { operations: { annotate: 'invalid' } } } },
    ],
    ['binding default', { binding: { authority: { default: 'invalid' } } }],
    [
      'binding operation',
      { binding: { authority: { operations: { annotate: 'invalid' } } } },
    ],
  ] as const)('fails closed for an invalid %s', (_name, override) => {
    const result = resolveEffectiveRemotePolicy({
      repository: {
        description: 'managed-section',
        authority: { default: 'autonomous' },
        ...override.repository,
      },
      ...('provider' in override ? { provider: override.provider } : {}),
      ...('binding' in override ? { binding: override.binding } : {}),
    });

    expect(result.authority.annotate).toBe('read-only');
    expect(result.findings).toEqual(
      expect.arrayContaining([expect.stringMatching(/invalid.*read-only/i)]),
    );
  });

  it('fails closed for invalid description values at every recognized layer', () => {
    expect(
      resolveEffectiveRemotePolicy({
        repository: { description: 'invalid', authority: {} },
      }).description,
    ).toBe('none');
    expect(
      resolveEffectiveRemotePolicy({
        repository: { description: 'replace', authority: {} },
        provider: { description: 'invalid' },
      }).description,
    ).toBe('none');
    expect(
      resolveEffectiveRemotePolicy({
        repository: { description: 'replace', authority: {} },
        binding: { description: 'invalid' },
      }).description,
    ).toBe('none');
  });

  it('caps destructive and identity operations at fresh approval', () => {
    const result = resolveEffectiveRemotePolicy({
      repository: {
        description: 'managed-section',
        authority: { default: 'autonomous' },
      },
    });

    for (const operation of [
      'delete',
      'relink',
      'detach',
      'recreate',
    ] as const) {
      expect(result.authority[operation]).toBe('user-approved');
      expect(result.authorityTrace[operation].hardFloor).toBe('user-approved');
    }
    expect(result.authority.annotate).toBe('autonomous');
  });

  it('caps update-fields only when the action replaces the complete description', () => {
    const ordinary = resolveEffectiveRemotePolicy({
      repository: {
        description: 'replace',
        authority: { default: 'autonomous' },
      },
    });
    const replacement = resolveEffectiveRemotePolicy({
      repository: {
        description: 'replace',
        authority: { default: 'autonomous' },
      },
      completeDescriptionReplacement: true,
    });

    expect(ordinary.authority['update-fields']).toBe('autonomous');
    expect(replacement.authority['update-fields']).toBe('user-approved');
    expect(replacement.hardFloors).toContain('replace-description');
  });
});

describe('validateProductionMutationAuthority', () => {
  const projection = { title: 'Title', description: null, priority: null };
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: '2026-08-31T12:00:00.000Z',
  });
  const preview = buildBindingPreview({
    binding: { bindingId: 'bnd-1', provider: 'linear', purposes: [] },
    target: { stableId: 'issue-1', context: { workspaceId: 'workspace-1' } },
    baseline: null,
    revision: {
      strength: 'hash-only',
      token: null,
      updatedAt: null,
      contentHash: 'sha256:revision',
    },
    capability: {
      surfaceKind: 'connector',
      evidenceDigest: 'sha256:capability',
      semanticCapabilities: ['update'],
      context: { workspaceId: 'workspace-1' },
    },
    policy: {},
    projection,
    outboundSafety: safety,
    operationClass: 'update-fields',
    fieldMask: ['title', 'description', 'priority'],
    createdAt: '2026-08-31T12:00:00.000Z',
  });
  const base = {
    preview,
    expected: {
      operationClass: 'update-fields' as const,
      targetId: 'bnd-1',
      workflowId: 'workflow-1',
      workflowRevision: 'rev-1',
    },
    now: '2026-08-31T12:01:00.000Z',
    approvalMaxAgeMs: 300_000,
  };
  const interactive = {
    schemaVersion: 1 as const,
    kind: 'interactive' as const,
    sourceId: 'host-session-1',
    invocationId: 'inv-1',
    issuedAt: '2026-08-31T12:00:00.000Z',
    expiresAt: '2026-08-31T12:05:00.000Z',
    instruction: {
      operationClass: 'update-fields' as const,
      targetId: 'bnd-1',
      evidenceDigest: 'sha256:exact-user-instruction',
    },
    approval: null,
  };

  it('enforces all four configured authority modes', () => {
    expect(() =>
      validateProductionMutationAuthority({
        ...base,
        effective: 'read-only',
        invocation: null,
      }),
    ).toThrow(/read-only/);
    expect(
      validateProductionMutationAuthority({
        ...base,
        effective: 'user-authorized',
        invocation: interactive,
      }).authority.sourceDigest,
    ).toMatch(/^sha256:/);
    expect(() =>
      validateProductionMutationAuthority({
        ...base,
        effective: 'user-approved',
        invocation: interactive,
      }),
    ).toThrow(/fresh approval/i);
    expect(
      validateProductionMutationAuthority({
        ...base,
        effective: 'user-approved',
        invocation: {
          ...interactive,
          approval: {
            previewDigest: preview.digest,
            operationClass: 'update-fields' as const,
            approvedAt: base.now,
            actor: 'operator-1',
            source: 'interactive-preview',
          },
        },
      }).approval?.actor,
    ).toBe('operator-1');
    expect(
      validateProductionMutationAuthority({
        ...base,
        effective: 'autonomous',
        invocation: {
          schemaVersion: 1,
          kind: 'workflow',
          sourceId: 'workflow-engine-1',
          invocationId: 'inv-1',
          issuedAt: '2026-08-31T12:00:00.000Z',
          expiresAt: '2026-08-31T12:05:00.000Z',
          operationClass: 'update-fields',
          targetId: 'bnd-1',
          workflowId: 'workflow-1',
          revision: 'rev-1',
        },
      }).authority.effective,
    ).toBe('autonomous');
    expect(() =>
      validateProductionMutationAuthority({
        ...base,
        effective: 'autonomous',
        invocation: {
          schemaVersion: 1,
          kind: 'workflow',
          sourceId: 'workflow-engine-1',
          invocationId: 'inv-1',
          issuedAt: '2026-08-31T12:00:00.000Z',
          expiresAt: '2026-08-31T12:05:00.000Z',
          operationClass: 'update-fields',
          targetId: 'bnd-1',
          workflowId: 'workflow-1',
          revision: 'drifted',
        },
      }),
    ).toThrow(/active-workflow/);
  });

  it('fails closed for absent, stale, or mismatched caller evidence', () => {
    for (const invocation of [
      null,
      { ...interactive, expiresAt: '2026-08-31T12:00:30.000Z' },
      {
        ...interactive,
        instruction: { ...interactive.instruction, targetId: 'bnd-other' },
      },
      {
        ...interactive,
        instruction: {
          ...interactive.instruction,
          operationClass: 'create' as const,
        },
      },
    ]) {
      expect(() =>
        validateProductionMutationAuthority({
          ...base,
          effective: 'user-authorized',
          invocation,
        }),
      ).toThrow(/invocation evidence|expired|authorize/i);
    }
  });

  it('rejects approval evidence for another preview', () => {
    expect(() =>
      validateProductionMutationAuthority({
        ...base,
        effective: 'user-approved',
        invocation: {
          ...interactive,
          approval: {
            previewDigest: 'sha256:other-preview',
            operationClass: 'update-fields',
            approvedAt: base.now,
            actor: 'operator-1',
            source: 'interactive-preview',
          },
        },
      }),
    ).toThrow(/fresh approval/i);
  });
});
