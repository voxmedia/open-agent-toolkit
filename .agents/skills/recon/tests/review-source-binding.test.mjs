import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { afterEach, test } from 'node:test';

import { createReviewBrief } from '../scripts/create-review-brief.mjs';
import {
  briefSourcesBind,
  reviewBriefBindsClaim,
} from '../scripts/lib/review-binding.mjs';
import { validatePacket } from '../scripts/validate-packet.mjs';
import { createTwoSourcePacket } from './fixtures/two-source-packet.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function twoSourcePacket(options) {
  const packet = await createTwoSourcePacket(options);
  tempRoots.push(packet.tempRoot);
  return packet;
}

function briefMismatches(validation) {
  return validation.errors.filter(
    (error) => error.code === 'REVIEW_BRIEF_MISMATCH',
  );
}

test('a production verification brief spanning two sources binds every claim', async () => {
  // Structured issues are not part of this rule; the source-binding check is
  // isolated from them so the brief is the only variable.
  const packet = await twoSourcePacket({ semanticIssues: [] });
  assert.deepEqual(
    packet.briefs.verify.sources.map((source) => source.id),
    ['source-1', 'source-2'],
  );
  for (const claim of packet.priorLedger.claims) {
    assert.equal(
      reviewBriefBindsClaim(
        packet.briefs.verify,
        'semantic',
        claim,
        packet.priorLedger,
        packet.manifest,
      ),
      true,
      claim.id,
    );
  }
  const validation = await validatePacket(packet.packetRoot);
  assert.deepEqual(
    briefMismatches(validation),
    [],
    JSON.stringify(validation, null, 2),
  );
});

function singleSourceInputs() {
  const source = {
    id: 'source-1',
    kind: 'file',
    available: true,
    authority: 'contract-enforced',
    observedAt: '2026-08-31T00:00:00.000Z',
    validationState: 'pinned',
    path: '/fixture/source.txt',
    contentHash: `sha256:${'a'.repeat(64)}`,
    // Outside the review projection allowlist: never copied into a brief.
    capturedBy: 'worker-lane-gather',
  };
  const ledger = {
    runId: 'run-binding',
    evidence: [
      {
        id: 'evidence-1',
        sourceId: 'source-1',
        locator: {
          kind: 'file',
          path: '/fixture/source.txt',
          lineStart: 1,
          lineEnd: 1,
        },
        displayExcerpt: 'alpha evidence',
      },
    ],
    claims: [
      {
        id: 'claim-1',
        statement: 'The fixture records alpha.',
        evidence: [{ evidenceId: 'evidence-1', relation: 'supports' }],
      },
    ],
  };
  const manifest = {
    run: { id: 'run-binding' },
    request: { questions: [], includedScope: [], excludedScope: [] },
    sources: [source],
  };
  const brief = createReviewBrief({
    id: 'brief-verify',
    mode: 'verify',
    createdAt: '2026-08-31T00:03:00.000Z',
    manifest,
    ledger,
  });
  return { brief, ledger, manifest };
}

test('a single-source brief binds through the projection allowlist, not the raw manifest source', () => {
  const { brief, ledger, manifest } = singleSourceInputs();
  assert.equal(Object.hasOwn(brief.sources[0], 'capturedBy'), false);
  assert.equal(briefSourcesBind(brief, manifest), true);
  assert.equal(
    reviewBriefBindsClaim(
      brief,
      'semantic',
      ledger.claims[0],
      ledger,
      manifest,
    ),
    true,
  );
});

test('a brief that copies a full manifest source descriptor does not bind', () => {
  const { brief, ledger, manifest } = singleSourceInputs();
  const unblinded = structuredClone(brief);
  unblinded.sources = structuredClone(manifest.sources);
  assert.equal(
    reviewBriefBindsClaim(
      unblinded,
      'semantic',
      ledger.claims[0],
      ledger,
      manifest,
    ),
    false,
  );
});

test('brief sources must equal the projected union of the brief claims', () => {
  const { brief, ledger, manifest } = singleSourceInputs();
  const extraSource = {
    ...structuredClone(manifest.sources[0]),
    id: 'source-uncited',
  };
  const widenedManifest = {
    ...manifest,
    sources: [...manifest.sources, extraSource],
  };
  const widened = structuredClone(brief);
  widened.sources.push({
    ...structuredClone(widened.sources[0]),
    id: 'source-uncited',
  });
  assert.equal(briefSourcesBind(widened, widenedManifest), false);
  assert.equal(
    reviewBriefBindsClaim(
      widened,
      'semantic',
      ledger.claims[0],
      ledger,
      widenedManifest,
    ),
    false,
  );
});
