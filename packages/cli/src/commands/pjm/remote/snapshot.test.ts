import { describe, expect, it } from 'vitest';

import {
  MAX_PROVIDER_EXTENSION_BYTES,
  MAX_REMOTE_DESCRIPTION_BYTES,
  MAX_SNAPSHOT_SUPPRESSION_EVIDENCE,
  WHOLE_FIELD_SUPPRESSION_MARKER,
} from './schema';
import { sanitizeRemoteSnapshot } from './snapshot';

const timestamp = '2026-08-31T12:00:00.000Z';
const context = {
  host: 'github.com',
  owner: 'voxmedia',
  repositoryId: 'repo-123',
};

function rawSnapshot() {
  return {
    snapshotId: 'snap_snapshot_123',
    bindingId: 'bnd_binding_123',
    provider: 'github' as const,
    observedAt: timestamp,
    observedBy: {
      provider: 'github' as const,
      surfaceKind: 'connector' as const,
      context,
      evidenceDigest: 'sha256:capability',
      semanticCapabilities: ['read'],
    },
    identity: {
      stableId: 'issue-node-123',
      context,
      aliases: [
        { kind: 'url' as const, value: 'https://github.com/a/b/issues/1' },
      ],
    },
    revision: {
      strength: 'token' as const,
      token: 'W/"123"',
      updatedAt: timestamp,
      contentHash: 'sha256:remote-content',
    },
    issue: {
      title: 'Remote issue',
      description: 'Ordinary non-secret description.',
      priority: 'high',
      status: 'open',
      labels: ['never-retain'],
    },
    lifecycle: 'active' as const,
    extensions: {
      estimate: 3,
      workflow: { name: 'Backlog' },
      unknown: 'drop me',
    },
    comments: [{ body: 'never retain comments' }],
    activity: [{ action: 'never retain activity' }],
    assignees: [{ login: 'never-retain' }],
    authHeaders: { authorization: 'Bearer top-secret' },
    rawPayload: { everything: 'never retain payloads' },
  };
}

describe('sanitizeRemoteSnapshot', () => {
  it('retains only core fields and adapter-allowlisted bounded extensions', () => {
    const result = sanitizeRemoteSnapshot(rawSnapshot(), {
      allowedExtensionKeys: ['estimate', 'workflow'],
    });

    expect(result.issue).toEqual({
      title: 'Remote issue',
      description: 'Ordinary non-secret description.',
      priority: 'high',
      status: 'open',
    });
    expect(result.extensions).toEqual({
      github: { estimate: 3, workflow: { name: 'Backlog' } },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /never retain|top-secret|rawPayload|comments|activity|assignees|authHeaders/,
    );
  });

  it('suppresses a signaled field in full and visibly marks incomplete content', () => {
    const input = rawSnapshot();
    input.issue.description = [
      'Authorization: Bearer abc.def.ghi',
      'Keep surrounding prose.',
    ].join('\n');

    const result = sanitizeRemoteSnapshot(input);

    expect(result.issue.description).toBe(WHOLE_FIELD_SUPPRESSION_MARKER);
    expect(JSON.stringify(result)).not.toMatch(
      /abc\.def\.ghi|Keep surrounding prose/,
    );
    expect(result.contentRedacted).toBe(true);
    expect(result.redactionCount).toBe(1);
    expect(result.redactions).toEqual([
      {
        field: { kind: 'core', name: 'description' },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      },
    ]);
  });

  it('consumes bounded upstream whole-field suppression evidence exactly once', () => {
    const input = rawSnapshot();
    input.issue.description = WHOLE_FIELD_SUPPRESSION_MARKER;
    const result = sanitizeRemoteSnapshot(input, {
      suppressedCoreFields: ['description'],
    });
    expect(result.redactions).toEqual([
      {
        field: { kind: 'core', name: 'description' },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      },
    ]);
    expect(() =>
      sanitizeRemoteSnapshot(input, {
        suppressedCoreFields: ['description', 'description'],
      }),
    ).toThrow(/unique/i);
  });

  it('suppresses all four core fields for bracketed and multi-segment signals', () => {
    const input = rawSnapshot();
    input.issue.title = '[api-key] title-private-tail';
    input.issue.description = 'access token description-private-tail';
    input.issue.priority = '<password> priority-private-tail';
    input.issue.status = '.authorization status-private-tail';

    const result = sanitizeRemoteSnapshot(input);
    const serialized = JSON.stringify(result);

    expect(result.issue).toEqual({
      title: WHOLE_FIELD_SUPPRESSION_MARKER,
      description: WHOLE_FIELD_SUPPRESSION_MARKER,
      priority: WHOLE_FIELD_SUPPRESSION_MARKER,
      status: WHOLE_FIELD_SUPPRESSION_MARKER,
    });
    expect(serialized).not.toMatch(
      /title-private-tail|description-private-tail|priority-private-tail|status-private-tail/,
    );
    expect(result).toMatchObject({
      contentRedacted: true,
      redactionCount: 4,
      redactions: [
        {
          field: { kind: 'core', name: 'title' },
          reason: 'sensitive-content',
          representation: 'whole-field-marker',
        },
        {
          field: { kind: 'core', name: 'description' },
          reason: 'sensitive-content',
          representation: 'whole-field-marker',
        },
        {
          field: { kind: 'core', name: 'priority' },
          reason: 'sensitive-content',
          representation: 'whole-field-marker',
        },
        {
          field: { kind: 'core', name: 'status' },
          reason: 'sensitive-content',
          representation: 'whole-field-marker',
        },
      ],
    });
  });

  it('does not treat credential-key substrings embedded in identifiers as signals', () => {
    const input = rawSnapshot();
    input.issue.title = 'compassword=value';
    input.issue.description = 'api_keychain=value';
    input.issue.priority = 'access_tokenizer=value';
    input.issue.status = 'authorization_code=value';

    const result = sanitizeRemoteSnapshot(input);

    expect(result.issue).toEqual({
      title: input.issue.title,
      description: input.issue.description,
      priority: input.issue.priority,
      status: input.issue.status,
    });
    expect(result.contentRedacted).toBe(false);
    expect(result.redactionCount).toBe(0);
  });

  it('suppresses an adapter-allowlisted extension with bounded field evidence', () => {
    const input = rawSnapshot();
    input.extensions.workflow = {
      note: '[access_token] extension-private-tail',
    };

    const result = sanitizeRemoteSnapshot(input, {
      allowedExtensionKeys: ['estimate', 'workflow'],
    });

    expect(result.extensions).toEqual({
      github: {
        estimate: 3,
        workflow: WHOLE_FIELD_SUPPRESSION_MARKER,
      },
    });
    expect(result.contentRedacted).toBe(true);
    expect(result.redactions).toContainEqual({
      field: { kind: 'extension', key: 'workflow' },
      reason: 'sensitive-content',
      representation: 'whole-field-marker',
    });
    expect(JSON.stringify(result)).not.toContain('extension-private-tail');
  });

  it('consumes a typed extension marker and evidence pair exactly once', () => {
    const input = rawSnapshot();
    input.extensions.workflow = WHOLE_FIELD_SUPPRESSION_MARKER;
    const result = sanitizeRemoteSnapshot(input, {
      allowedExtensionKeys: ['workflow'],
      suppressedFields: [{ kind: 'extension', key: 'workflow' }],
    });
    expect(result.extensions?.github?.workflow).toBe(
      WHOLE_FIELD_SUPPRESSION_MARKER,
    );
    expect(result.redactions).toEqual([
      {
        field: { kind: 'extension', key: 'workflow' },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      },
    ]);
    expect(() =>
      sanitizeRemoteSnapshot(input, {
        allowedExtensionKeys: ['workflow'],
        suppressedFields: [
          { kind: 'extension', key: 'workflow' },
          { kind: 'extension', key: 'workflow' },
        ],
      }),
    ).toThrow(/each field once/i);
    expect(() =>
      sanitizeRemoteSnapshot(input, {
        allowedExtensionKeys: [],
        suppressedFields: [{ kind: 'extension', key: 'workflow' }],
      }),
    ).toThrow(/adapter allowlist/i);
  });

  it('rejects arbitrary provider paths as extension allowlist keys', () => {
    expect(() =>
      sanitizeRemoteSnapshot(rawSnapshot(), {
        allowedExtensionKeys: ['provider.raw.path'],
      }),
    ).toThrow(/extension key/i);
  });

  it('supports the shared maximum when every core and extension field is signaled', () => {
    const input = rawSnapshot();
    input.issue.title = 'password title-private-tail';
    input.issue.description = 'api key description-private-tail';
    input.issue.priority = 'access token priority-private-tail';
    input.issue.status = 'authorization status-private-tail';
    const extensionCount = MAX_SNAPSHOT_SUPPRESSION_EVIDENCE - 4;
    const allowedExtensionKeys = Array.from(
      { length: extensionCount },
      (_, index) => `field_${index}`,
    );
    input.extensions = Object.fromEntries(
      allowedExtensionKeys.map((key) => [
        key,
        `password extension-private-tail-${key}`,
      ]),
    );

    const result = sanitizeRemoteSnapshot(input, { allowedExtensionKeys });

    expect(result.redactionCount).toBe(MAX_SNAPSHOT_SUPPRESSION_EVIDENCE);
    expect(result.redactions).toHaveLength(MAX_SNAPSHOT_SUPPRESSION_EVIDENCE);
    expect(Object.values(result.extensions?.github ?? {})).toEqual(
      Array(extensionCount).fill(WHOLE_FIELD_SUPPRESSION_MARKER),
    );
    expect(JSON.stringify(result)).not.toContain('private-tail');
    expect(() =>
      sanitizeRemoteSnapshot(input, {
        allowedExtensionKeys: [...allowedExtensionKeys, 'one_too_many'],
      }),
    ).toThrow(/extension key/i);
  });

  it('fails closed on oversized descriptions and provider extensions', () => {
    const description = rawSnapshot();
    description.issue.description = 'x'.repeat(
      MAX_REMOTE_DESCRIPTION_BYTES + 1,
    );
    expect(() => sanitizeRemoteSnapshot(description)).toThrow(
      /description.*byte limit/i,
    );

    const extension = rawSnapshot();
    extension.extensions.workflow = {
      text: 'x'.repeat(MAX_PROVIDER_EXTENSION_BYTES),
    };
    expect(() =>
      sanitizeRemoteSnapshot(extension, {
        allowedExtensionKeys: ['workflow'],
      }),
    ).toThrow(/extension.*byte limit/i);
  });
});
