import { describe, expect, it } from 'vitest';

import {
  MAX_PROVIDER_EXTENSION_BYTES,
  MAX_REMOTE_DESCRIPTION_BYTES,
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
      transport: 'gh',
      context,
      capabilityDigest: 'sha256:capability',
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

  it('redacts credential-shaped values and visibly marks incomplete content', () => {
    const input = rawSnapshot();
    input.issue.description = [
      'Authorization: Bearer abc.def.ghi',
      'password=hunter2',
      'GitHub token: github_pat_1234567890abcdefghijklmnop',
      'Keep surrounding prose.',
    ].join('\n');

    const result = sanitizeRemoteSnapshot(input);

    expect(result.issue.description).not.toMatch(
      /abc\.def\.ghi|hunter2|github_pat_1234567890/,
    );
    expect(result.issue.description).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.description).toContain('Keep surrounding prose.');
    expect(result.contentRedacted).toBe(true);
    expect(result.redactionCount).toBe(1);
    expect(result.redactions).toEqual([
      { field: 'description', reason: 'credential' },
    ]);
  });

  it('redacts quoted credential assignments across every retained core field', () => {
    const input = rawSnapshot();
    input.issue.title = '{"api_key" : "json-api-secret"}';
    input.issue.description = "access_token: 'yaml-access-secret'";
    input.issue.priority = '\'password\' = "config-password-secret"';
    input.issue.status =
      '{"authorization":"Bearer authorization-header-secret"}';

    const result = sanitizeRemoteSnapshot(input);
    const serialized = JSON.stringify(result);

    expect(result.issue.title).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.description).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.priority).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.status).toContain('[REDACTED:CREDENTIAL]');
    expect(serialized).not.toMatch(
      /json-api-secret|yaml-access-secret|config-password-secret|authorization-header-secret/,
    );
    expect(result).toMatchObject({
      contentRedacted: true,
      redactionCount: 4,
      redactions: [
        { field: 'title', reason: 'credential' },
        { field: 'description', reason: 'credential' },
        { field: 'priority', reason: 'credential' },
        { field: 'status', reason: 'credential' },
      ],
    });
  });

  it('fully redacts multiline quoted assignments with escaped quotes across core fields', () => {
    const input = rawSnapshot();
    input.issue.title = `{"api_key": "title-prefix
escaped \\"title quote\\"
TITLE_SECRET_SUFFIX"}`;
    input.issue.description = `access_token: 'description-prefix
escaped ''description quote''
DESCRIPTION_SECRET_SUFFIX'`;
    input.issue.priority = `"password" = "priority-prefix
escaped ""priority quote""
PRIORITY_SECRET_SUFFIX"`;
    input.issue.status = `{"authorization": "Bearer status-prefix
escaped \\"status quote\\"
STATUS_SECRET_SUFFIX"}`;

    const result = sanitizeRemoteSnapshot(input);
    const serialized = JSON.stringify(result);

    expect(result.issue.title).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.description).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.priority).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.status).toContain('[REDACTED:CREDENTIAL]');
    expect(serialized).not.toMatch(
      /title-prefix|TITLE_SECRET_SUFFIX|description-prefix|DESCRIPTION_SECRET_SUFFIX|priority-prefix|PRIORITY_SECRET_SUFFIX|status-prefix|STATUS_SECRET_SUFFIX|escaped.*quote/i,
    );
    expect(result).toMatchObject({
      contentRedacted: true,
      redactionCount: 4,
      redactions: [
        { field: 'title', reason: 'credential' },
        { field: 'description', reason: 'credential' },
        { field: 'priority', reason: 'credential' },
        { field: 'status', reason: 'credential' },
      ],
    });
  });

  it('redacts punctuation-delimited assignments across retained core fields', () => {
    const input = rawSnapshot();
    input.issue.title = '(password=SECRET_TITLE_PAREN)';
    input.issue.description = '!api_key=SECRET_DESCRIPTION_BANG!';
    input.issue.priority = '<access_token=SECRET_PRIORITY_ANGLE>';
    input.issue.status = '.authorization=SECRET_STATUS_PERIOD';

    const result = sanitizeRemoteSnapshot(input);
    const serialized = JSON.stringify(result);

    expect(result.issue.title).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.description).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.priority).toContain('[REDACTED:CREDENTIAL]');
    expect(result.issue.status).toContain('[REDACTED:CREDENTIAL]');
    expect(serialized).not.toMatch(
      /SECRET_TITLE_PAREN|SECRET_DESCRIPTION_BANG|SECRET_PRIORITY_ANGLE|SECRET_STATUS_PERIOD/,
    );
    expect(result).toMatchObject({
      contentRedacted: true,
      redactionCount: 4,
      redactions: [
        { field: 'title', reason: 'credential' },
        { field: 'description', reason: 'credential' },
        { field: 'priority', reason: 'credential' },
        { field: 'status', reason: 'credential' },
      ],
    });
  });

  it('does not treat credential-key substrings embedded in identifiers as assignments', () => {
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

  it('drops allowlisted extensions containing credentials and marks the snapshot incomplete', () => {
    const input = rawSnapshot();
    input.extensions.workflow = {
      token: 'ghp_abcdefghijklmnopqrstuvwxyz123456',
    };

    const result = sanitizeRemoteSnapshot(input, {
      allowedExtensionKeys: ['estimate', 'workflow'],
    });

    expect(result.extensions).toEqual({ github: { estimate: 3 } });
    expect(result.contentRedacted).toBe(true);
    expect(JSON.stringify(result)).not.toContain('ghp_');
  });

  it('drops allowlisted extensions with punctuation-delimited assignments', () => {
    const input = rawSnapshot();
    input.extensions.workflow = {
      note: '(password=SECRET_EXTENSION_PAREN)',
    };

    const result = sanitizeRemoteSnapshot(input, {
      allowedExtensionKeys: ['estimate', 'workflow'],
    });

    expect(result.extensions).toEqual({ github: { estimate: 3 } });
    expect(result.contentRedacted).toBe(true);
    expect(JSON.stringify(result)).not.toContain('SECRET_EXTENSION_PAREN');
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
