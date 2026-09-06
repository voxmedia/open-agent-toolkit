import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('real remote safety surfaces contain no synthetic sensitive value', () => {
  const sensitiveValue = 'api key fixture-smoke-sensitive-value';
  const script = String.raw`
    import { assessOutboundProjectionSafety } from './packages/cli/src/commands/pjm/remote/outbound-projection-safety.ts';
    import { sanitizeRemoteSnapshot } from './packages/cli/src/commands/pjm/remote/snapshot.ts';
    const sensitiveValue = process.env.OAT_SMOKE_FIXTURE_VALUE;
    if (!sensitiveValue) throw new Error('missing synthetic fixture value');
    const now = '2026-09-05T12:00:00.000Z';
    const safety = assessOutboundProjectionSafety(
      { description: sensitiveValue },
      { assessedAt: now },
    );
    const snapshot = sanitizeRemoteSnapshot({
      snapshotId: 'snap_smoke_001',
      bindingId: 'bnd_smoke_001',
      provider: 'linear',
      observedAt: now,
      observedBy: {
        provider: 'linear',
        surfaceKind: 'connector',
        context: { workspaceId: 'workspace-1' },
        evidenceDigest: 'sha256:fixture-capability',
        semanticCapabilities: ['read'],
      },
      identity: {
        stableId: 'fixture-1',
        context: { workspaceId: 'workspace-1' },
        aliases: [],
      },
      revision: {
        strength: 'hash-only',
        token: null,
        updatedAt: now,
        contentHash: 'sha256:fixture-content',
      },
      issue: {
        title: 'Fixture title',
        description: sensitiveValue,
        priority: null,
        status: 'open',
      },
      lifecycle: 'active',
    });
    process.stdout.write(JSON.stringify({ safety, snapshot }));
  `;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, OAT_SMOKE_FIXTURE_VALUE: sensitiveValue },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes(sensitiveValue), false);
  const surfaces = JSON.parse(result.stdout);
  assert.equal(surfaces.safety.verdict, 'blocked');
  assert.equal(
    surfaces.snapshot.issue.description,
    '[SUPPRESSED:SENSITIVE-CONTENT]',
  );
});
