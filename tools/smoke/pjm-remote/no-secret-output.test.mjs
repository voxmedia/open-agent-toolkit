import assert from 'node:assert/strict';
import test from 'node:test';

test('fixture-owned remote output surfaces contain no synthetic sensitive value', () => {
  const sensitiveValue = 'api key fixture-smoke-sensitive-value';
  const fixtureOwnedSurfaces = {
    normalizedProjection: { description: '[SUPPRESSED:SENSITIVE-CONTENT]' },
    snapshot: {
      description: '[SUPPRESSED:SENSITIVE-CONTENT]',
      incomplete: true,
    },
    journal: { resultDigest: 'sha256:journal' },
    receipt: { classification: 'blocked' },
    preview: { verdict: 'blocked', field: 'description' },
    logs: ['remote publication blocked'],
    stdout: '',
    stderr: 'sensitive-content: description',
    diagnostics: [{ code: 'sensitive-content', field: 'description' }],
  };

  assert.equal(
    JSON.stringify(fixtureOwnedSurfaces).includes(sensitiveValue),
    false,
  );
});
