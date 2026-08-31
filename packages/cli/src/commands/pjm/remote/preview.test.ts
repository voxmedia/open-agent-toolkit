import { describe, expect, it } from 'vitest';

import { assessOutboundProjectionSafety } from './outbound-projection-safety';
import {
  buildBindingPreview,
  validatePreviewApproval,
  type BuildBindingPreviewInput,
} from './preview';

const timestamp = '2026-08-31T12:00:00.000Z';
const projection = {
  title: 'Local title',
  description: 'A long local description that should be hashed in output.',
  priority: 'high',
  sourceRevision: 'sha256:local',
};
const baseInput: BuildBindingPreviewInput = {
  binding: {
    bindingId: 'bnd_binding_123',
    provider: 'github',
    purposes: ['planning'],
  },
  target: {
    stableId: 'issue-node-123',
    context: { host: 'github.com', owner: 'voxmedia', repositoryId: 'repo-1' },
  },
  baseline: { baselineId: 'base_baseline_123', digest: 'sha256:baseline' },
  revision: {
    strength: 'token',
    token: 'W/"123"',
    updatedAt: timestamp,
    contentHash: 'sha256:remote',
  },
  capability: {
    surfaceKind: 'connector',
    evidenceDigest: 'sha256:capability',
    semanticCapabilities: ['read', 'update'],
    context: { host: 'github.com', owner: 'voxmedia', repositoryId: 'repo-1' },
  },
  policy: {
    description: 'managed-section',
    authority: { 'update-fields': 'user-approved' },
  },
  projection,
  outboundSafety: assessOutboundProjectionSafety(projection, {
    assessedAt: timestamp,
  }),
  operationClass: 'update-fields',
  fieldMask: ['description', 'title'],
  createdAt: timestamp,
};

describe('binding previews and approvals', () => {
  it('builds a deterministic canonical digest independent of object key order', () => {
    const first = buildBindingPreview(baseInput);
    const reordered = buildBindingPreview({
      ...baseInput,
      policy: {
        authority: { 'update-fields': 'user-approved' },
        description: 'managed-section',
      },
      fieldMask: ['title', 'description'],
    });

    expect(first.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(reordered.digest).toBe(first.digest);
    expect(first.fieldMask).toEqual(['title', 'description']);
    expect(first.componentDigests).toEqual({
      target: expect.stringMatching(/^sha256:/),
      baseline: expect.stringMatching(/^sha256:/),
      revision: expect.stringMatching(/^sha256:/),
      capability: expect.stringMatching(/^sha256:/),
      policy: expect.stringMatching(/^sha256:/),
      projection: expect.stringMatching(/^sha256:/),
      outboundSafety: expect.stringMatching(/^sha256:/),
    });
    expect(first.componentDigests.projection).toBe(
      baseInput.outboundSafety.projectionDigest,
    );
    expect(first.componentDigests.outboundSafety).toBe(
      baseInput.outboundSafety.resultDigest,
    );
  });

  it('binds approval digests to a specific generated preview instance', () => {
    const original = buildBindingPreview(baseInput);
    const regenerated = buildBindingPreview({
      ...baseInput,
      createdAt: '2026-08-31T12:01:00.000Z',
    });

    expect(regenerated.renderedFields).toEqual(original.renderedFields);
    expect(regenerated.componentDigests).toEqual(original.componentDigests);
    expect(regenerated.digest).not.toBe(original.digest);
    expect(
      validatePreviewApproval(
        regenerated,
        {
          previewDigest: original.digest,
          operationClass: 'update-fields',
          approvedAt: '2026-08-31T12:01:00.000Z',
          actor: 'user-123',
          source: 'interactive-confirmation',
        },
        { now: '2026-08-31T12:02:00.000Z', maxAgeMs: 10 * 60_000 },
      ),
    ).toEqual({ valid: false, reason: 'digest-mismatch' });
  });

  it.each([
    [
      'binding',
      { binding: { ...baseInput.binding, bindingId: 'bnd_changed_123' } },
    ],
    ['target', { target: { ...baseInput.target, stableId: 'issue-node-456' } }],
    [
      'baseline',
      { baseline: { ...baseInput.baseline, digest: 'sha256:changed' } },
    ],
    ['revision', { revision: { ...baseInput.revision, token: 'W/"456"' } }],
    [
      'capabilities',
      {
        capability: {
          ...baseInput.capability,
          evidenceDigest: 'sha256:changed',
        },
      },
    ],
    [
      'policy',
      {
        policy: {
          ...baseInput.policy,
          authority: { 'update-fields': 'read-only' },
        },
      },
    ],
    [
      'projection',
      { projection: { ...baseInput.projection, title: 'Changed title' } },
    ],
    ['field mask', { fieldMask: ['title'] }],
  ] as const)('invalidates approval when %s changes', (_name, change) => {
    const original = buildBindingPreview(baseInput);
    const changedInput = {
      ...baseInput,
      ...change,
    } as BuildBindingPreviewInput;
    changedInput.outboundSafety = assessOutboundProjectionSafety(
      changedInput.projection,
      { assessedAt: timestamp },
    );
    const changed = buildBindingPreview(changedInput);
    const approval = {
      previewDigest: original.digest,
      operationClass: 'update-fields' as const,
      approvedAt: timestamp,
      actor: 'user-123',
      source: 'interactive-confirmation',
    };

    expect(changed.digest).not.toBe(original.digest);
    expect(
      validatePreviewApproval(changed, approval, {
        now: '2026-08-31T12:05:00.000Z',
        maxAgeMs: 10 * 60_000,
      }),
    ).toEqual({ valid: false, reason: 'digest-mismatch' });
  });

  it('blocks signaled projection fields before preview construction', () => {
    const unsafeProjection = {
      ...baseInput.projection,
      title: '[api key] preview-private-tail',
      description: 'password body-private-tail',
    };
    expect(() =>
      buildBindingPreview({
        ...baseInput,
        projection: unsafeProjection,
        outboundSafety: assessOutboundProjectionSafety(unsafeProjection, {
          assessedAt: timestamp,
        }),
      }),
    ).toThrow(/blocks execution/);
  });

  it.each([
    ['bracketed key', '[password] preview-private-tail'],
    ['multi-segment underscore key', 'api_key preview-private-tail'],
    ['multi-segment hyphen key', 'access-token preview-private-tail'],
    ['multi-segment spaced key', 'access token preview-private-tail'],
    ['punctuation-bounded key', '.authorization preview-private-tail'],
  ])('blocks %s from outbound preview fields', (_fixture, title) => {
    const unsafeProjection = { ...baseInput.projection, title };
    expect(() =>
      buildBindingPreview({
        ...baseInput,
        projection: unsafeProjection,
        outboundSafety: assessOutboundProjectionSafety(unsafeProjection, {
          assessedAt: timestamp,
        }),
      }),
    ).toThrow(/blocks execution/);
  });

  it.each([
    ['compassword=value', 'compassword=value'],
    ['api_keychain=value', 'api_keychain=value'],
    ['access_tokenizer=value', 'access_tokenizer=value'],
    ['authorization_code=value', 'authorization_code=value'],
  ])(
    'renders ordinary identifier substring %s unchanged',
    (_fixture, title) => {
      const safeProjection = { ...baseInput.projection, title };
      const preview = buildBindingPreview({
        ...baseInput,
        projection: safeProjection,
        outboundSafety: assessOutboundProjectionSafety(safeProjection, {
          assessedAt: timestamp,
        }),
      });

      expect(preview.renderedFields.title).toEqual({
        kind: 'value',
        value: title,
      });
    },
  );

  it('accepts only fresh, matching, non-secret approval evidence', () => {
    const preview = buildBindingPreview(baseInput);
    const approval = {
      previewDigest: preview.digest,
      operationClass: 'update-fields' as const,
      approvedAt: timestamp,
      actor: 'user-123',
      source: 'interactive-confirmation',
    };
    expect(
      validatePreviewApproval(preview, approval, {
        now: '2026-08-31T12:05:00.000Z',
        maxAgeMs: 10 * 60_000,
      }),
    ).toEqual({ valid: true, reason: null });
    expect(
      validatePreviewApproval(
        preview,
        { ...approval, approvedAt: '2026-08-31T11:59:59.999Z' },
        { now: '2026-08-31T12:05:00.000Z', maxAgeMs: 10 * 60_000 },
      ),
    ).toEqual({ valid: false, reason: 'approval-before-preview' });
    expect(
      validatePreviewApproval(
        preview,
        { ...approval, operationClass: 'annotate' },
        {
          now: '2026-08-31T12:05:00.000Z',
          maxAgeMs: 10 * 60_000,
        },
      ),
    ).toEqual({ valid: false, reason: 'operation-mismatch' });
    expect(
      validatePreviewApproval(preview, approval, {
        now: '2026-08-31T13:00:00.000Z',
        maxAgeMs: 10 * 60_000,
      }),
    ).toEqual({ valid: false, reason: 'expired' });
    expect(
      validatePreviewApproval(
        preview,
        { ...approval, approvedAt: '2026-08-31T12:06:00.000Z' },
        { now: '2026-08-31T12:05:00.000Z', maxAgeMs: 10 * 60_000 },
      ),
    ).toEqual({ valid: false, reason: 'future-approval' });
    expect(
      validatePreviewApproval(
        preview,
        { ...approval, actor: 'token=super-secret' },
        { now: '2026-08-31T12:05:00.000Z', maxAgeMs: 10 * 60_000 },
      ),
    ).toEqual({ valid: false, reason: 'unsafe-evidence' });
  });

  it.each([
    ['bracketed source', 'source', '[api-key] approval-private-tail'],
    ['bracketed actor', 'actor', '[authorization] approval-private-tail'],
    ['spaced source', 'source', 'access token approval-private-tail'],
    ['underscored actor', 'actor', 'api_key approval-private-tail'],
  ] as const)(
    'rejects %s as unsafe approval evidence',
    (_fixture, field, value) => {
      const preview = buildBindingPreview(baseInput);
      const approval = {
        previewDigest: preview.digest,
        operationClass: 'update-fields' as const,
        approvedAt: timestamp,
        actor: 'user-123',
        source: 'interactive-confirmation',
        [field]: value,
      };

      expect(
        validatePreviewApproval(preview, approval, {
          now: '2026-08-31T12:05:00.000Z',
          maxAgeMs: 10 * 60_000,
        }),
      ).toEqual({ valid: false, reason: 'unsafe-evidence' });
    },
  );

  it.each([
    ['actor', 'compassword=value'],
    ['source', 'api_keychain=value'],
    ['actor', 'access_tokenizer=value'],
    ['source', 'authorization_code=value'],
  ] as const)(
    'accepts ordinary identifier substrings in approval %s',
    (field, value) => {
      const preview = buildBindingPreview(baseInput);
      const approval = {
        previewDigest: preview.digest,
        operationClass: 'update-fields' as const,
        approvedAt: timestamp,
        actor: 'user-123',
        source: 'interactive-confirmation',
        [field]: value,
      };

      expect(
        validatePreviewApproval(preview, approval, {
          now: '2026-08-31T12:05:00.000Z',
          maxAgeMs: 10 * 60_000,
        }),
      ).toEqual({ valid: true, reason: null });
    },
  );
});
