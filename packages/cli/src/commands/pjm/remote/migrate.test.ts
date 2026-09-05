import { describe, expect, it } from 'vitest';

import { migrateRemoteAssociations } from './migrate';

describe('local-only remote migration', () => {
  it('reports deterministic canonical association candidates in check mode', () => {
    const first = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: [
        'github:owner/repo#1',
        { type: 'linear', ref: 'LIN-1' },
      ],
    });
    const second = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: [
        'github:owner/repo#1',
        { type: 'linear', ref: 'LIN-1' },
      ],
    });
    expect(first).toEqual(second);
    expect(first.changed).toBe(true);
    expect(first.applied).toBe(false);
  });

  it('applies only an exact approved local preview', () => {
    const check = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: ['github:owner/repo#1'],
    });
    const applied = migrateRemoteAssociations({
      mode: 'apply',
      associatedIssues: ['github:owner/repo#1'],
      approvalDigest: check.previewDigest,
    });
    expect(applied.applied).toBe(true);
    expect(applied.associatedIssues).toEqual([
      { type: 'github', ref: 'owner/repo#1' },
    ]);
  });

  it('is idempotent after apply', () => {
    const canonical = [{ type: 'github', ref: 'owner/repo#1' }];
    const check = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: canonical,
    });
    expect(check.changed).toBe(false);
    expect(check.associatedIssues).toEqual(canonical);
  });

  it('never infers provider context, purpose, authority, or contacts a provider', () => {
    const result = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: ['opaque-reference'],
    });
    expect(result.associatedIssues).toEqual(['opaque-reference']);
    expect(JSON.stringify(result)).not.toMatch(
      /workspaceId|projectId|authority|purpose/,
    );
  });

  it('rejects apply without exact approval', () => {
    expect(() =>
      migrateRemoteAssociations({
        mode: 'apply',
        associatedIssues: ['github:owner/repo#1'],
        approvalDigest: 'sha256:stale',
      }),
    ).toThrow('approved migration preview');
  });
});
