import { describe, expect, it } from 'vitest';

import {
  renderRemoteCommand,
  type RemoteCommandEnvelope,
  type RemoteCommandStatus,
} from './output';

const statuses: RemoteCommandStatus[] = [
  'ok',
  'pending',
  'needs-review',
  'partial',
  'uncertain',
  'blocked',
  'rejected',
  'failed',
];

function envelope(status: RemoteCommandStatus): RemoteCommandEnvelope {
  return {
    schemaVersion: 1,
    status,
    operation: 'publish',
    projectRoot: '/repo',
    persisted: status !== 'failed',
    results: [
      {
        bindingId: 'bnd_binding_001',
        provider: 'linear',
        target: 'ENG-1',
        status,
        freshness: '2026-08-31T12:00:00.000Z',
        authority: 'user-approved',
        diagnosticCode: status === 'ok' ? null : `remote-${status}`,
      },
    ],
    externalAction: null,
    recovery:
      status === 'ok'
        ? []
        : [
            {
              code: 'next-step',
              instruction: 'Follow the persisted recovery instruction.',
            },
          ],
  };
}

describe('remote command output', () => {
  it.each(statuses)(
    'keeps human and JSON status/exit parity for %s',
    (status) => {
      const value = envelope(status);
      const human = renderRemoteCommand(value, { json: false });
      const json = renderRemoteCommand(value, { json: true });
      const expectedExit = status === 'ok' ? 0 : status === 'failed' ? 2 : 1;
      expect(human.exitCode).toBe(expectedExit);
      expect(json.exitCode).toBe(expectedExit);
      expect(JSON.parse(json.stdout).status).toBe(status);
      expect(`${human.stdout}${human.stderr}`).toContain(`publish: ${status}`);
      expect(human.stderr === '').toBe(status !== 'failed');
    },
  );

  it('retains pending external action as a durable structured handoff', () => {
    const value = envelope('pending');
    value.externalAction = {
      schemaVersion: 1,
      operationId: 'op-1',
      stepId: 'step-1',
      actionDigest: 'sha256:action',
      provider: 'linear',
      semanticOperation: 'read',
      context: { workspaceId: 'workspace-1' },
      intent: {},
      expectedObservation: { fields: ['title'], requireIdentity: true },
      outboundSafety: null,
    };
    expect(renderRemoteCommand(value, { json: true })).toMatchObject({
      exitCode: 1,
      stderr: '',
    });
    expect(renderRemoteCommand(value, { json: false }).stdout).toContain(
      'durable handoff',
    );
  });

  it('renders the same bounded persisted approval preview in JSON and human output', () => {
    const value = envelope('needs-review');
    value.approvalPreview = {
      operationId: 'op_preview_001',
      digest: 'sha256:preview',
      operationClass: 'update-fields',
      fieldMask: ['title', 'description'],
      renderedFields: {
        title: { kind: 'value', value: 'Safe title' },
        description: {
          kind: 'hash',
          digest: 'sha256:description',
          bytes: 42,
        },
      },
      authority: 'user-approved',
      revision: {
        digest: 'sha256:revision',
        evidenceDigest: 'sha256:revision-evidence',
        source: 'remote',
        strength: 'token',
        updatedAt: '2026-08-31T11:59:00.000Z',
        observedAt: '2026-08-31T12:00:00.000Z',
      },
    };

    const json = JSON.parse(
      renderRemoteCommand(value, { json: true }).stdout,
    ) as RemoteCommandEnvelope;
    expect(json.approvalPreview).toEqual(value.approvalPreview);

    const human = renderRemoteCommand(value, { json: false }).stdout;
    expect(human).toContain(
      'preview op_preview_001: update-fields; fields=title,description; authority=user-approved',
    );
    expect(human).toContain(
      'revision=sha256:revision; revision-evidence=sha256:revision-evidence',
    );
    expect(human).toContain(
      'revision-source=remote; strength=token; updated=2026-08-31T11:59:00.000Z; observed=2026-08-31T12:00:00.000Z',
    );
    expect(human).toContain('preview field title: value="Safe title"');
    expect(human).toContain(
      'preview field description: hash=sha256:description; bytes=42',
    );
  });

  it('renders bounded non-persistent discussion evidence without changing status parity', () => {
    const value = envelope('ok');
    value.discussionEvidence = {
      status: 'available',
      bindingId: 'bnd_binding_001',
      observedAt: '2026-08-31T12:00:00.000Z',
      items: [
        {
          id: 'comment-1',
          body: '[suppressed sensitive field]',
          createdAt: '2026-08-31T11:59:00.000Z',
          incomplete: true,
        },
      ],
      pagesRead: 1,
      truncated: false,
      persisted: false,
    };

    const json = JSON.parse(
      renderRemoteCommand(value, { json: true }).stdout,
    ) as RemoteCommandEnvelope;
    expect(json.discussionEvidence).toEqual(value.discussionEvidence);
    expect(renderRemoteCommand(value, { json: false })).toMatchObject({
      exitCode: 0,
      stderr: '',
    });
    expect(renderRemoteCommand(value, { json: false }).stdout).toContain(
      'discussion evidence: available; items=1; pages=1; truncated=false; persisted=false',
    );
  });

  it('rejects success without persistence and actions outside pending handoff', () => {
    expect(() =>
      renderRemoteCommand(
        { ...envelope('ok'), persisted: false },
        { json: false },
      ),
    ).toThrow(/durably persisted/);
    const value = envelope('blocked');
    value.externalAction = {
      schemaVersion: 1,
      operationId: 'op-1',
      stepId: 'step-1',
      actionDigest: 'sha256:action',
      provider: 'linear',
      semanticOperation: 'read',
      context: { workspaceId: 'workspace-1' },
      intent: {},
      expectedObservation: { fields: ['title'], requireIdentity: true },
      outboundSafety: null,
    };
    expect(() => renderRemoteCommand(value, { json: false })).toThrow(
      /persisted pending handoff/,
    );
  });
});
