import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalizeJson, hashCanonicalJson } from './canonical-json';
import { commandResultDigest } from './command-result-digest';
import type { ReviewCommandEvidenceV1 } from './types';

const command: ReviewCommandEvidenceV1 = {
  id: 'command-1',
  command: 'pnpm test',
  cwd: '.',
  scopeRefs: [{ bucket: 'lane', bucketId: 'lane-1', pathIndexes: [0] }],
  provenance: {
    runner: 'host',
    invocationDigest: 'invocation',
    capturedAt: '2026-08-02T20:00:00.000Z',
  },
  result: { status: 'completed', exitCode: 0, outputDigest: 'output' },
};

describe('commandResultDigest', () => {
  it('hashes exactly scopeRefs, provenance, and result canonically', () => {
    const expectedRecord = {
      scopeRefs: command.scopeRefs,
      provenance: command.provenance,
      result: command.result,
    };
    expect(commandResultDigest(command)).toBe(
      hashCanonicalJson(expectedRecord),
    );
    expect(commandResultDigest(command)).toBe(
      createHash('sha256')
        .update(canonicalizeJson(expectedRecord))
        .digest('hex'),
    );
  });

  it('rejects result-only, output-only, and arbitrary digests', () => {
    const digest = commandResultDigest(command);
    expect(digest).not.toBe(hashCanonicalJson(command.result));
    expect(digest).not.toBe(
      hashCanonicalJson(
        command.result.status === 'completed'
          ? command.result.outputDigest
          : null,
      ),
    );
    expect(digest).not.toBe('wrong');
  });
});
