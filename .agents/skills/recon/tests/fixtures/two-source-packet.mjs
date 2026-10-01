// Synthetic two-source standard packet produced by recon's own helpers.
//
// Provenance: synthetic. The shape mirrors the live recon 1.1.5 run behind
// GitHub issue #333 (one verification brief spanning several sources, a
// semantic reviewer that is uncertain about one claim and scopes its issue to
// it, and a coverage reviewer that marks every statement `covered` while
// reporting a material question omission). Briefs come from the production
// `createReviewBrief`, and the revision-two ledger and reconciliation result
// come from the production `reconcileLedger`; nothing here hand-builds a
// projection the validator later checks.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createReviewBrief } from '../../scripts/create-review-brief.mjs';
import {
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';
import { reconcileLedger } from '../../scripts/reconcile-ledger.mjs';
import { createPacketFixture } from './packet-fixture.mjs';

export const twoSourceClaimIds = Object.freeze({
  // Affirmed by every reviewer and cites only source-1.
  firstSource: 'claim-alpha',
  // Affirmed by every reviewer and cites only source-2.
  secondSource: 'claim-gamma',
  // Cites both sources; the semantic reviewer is uncertain about it.
  uncertain: 'claim-delta',
  // Covered statement named by a material question-coverage finding.
  coverageGap: 'claim-epsilon',
});

export const twoSourceSemanticIssue = Object.freeze({
  text: 'Delta evidence may describe a different release than alpha evidence.',
  claimIds: Object.freeze([twoSourceClaimIds.uncertain]),
});

export const twoSourceCoverageFinding = Object.freeze({
  id: 'coverage-question-omission',
  gapId: 'gap-question-omission',
  code: 'QUESTION_SCOPE_OMISSION',
  message: 'The packet does not answer which release introduced epsilon.',
  material: true,
  claimIds: Object.freeze([twoSourceClaimIds.coverageGap]),
});

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function fileEvidence(id, sourceId, path, line, excerpt, provenance) {
  return {
    id,
    sourceId,
    locator: { kind: 'file', path, lineStart: line, lineEnd: line },
    displayExcerpt: excerpt,
    observedAt: '2026-08-31T00:00:00.000Z',
    contentHash: hashCanonicalJson(excerpt),
    locatorValidation: {
      status: 'exact',
      validatedAt: '2026-08-31T00:01:00.000Z',
    },
    provenance,
  };
}

/**
 * Builds the two-source packet on disk and returns its parts.
 *
 * `semanticIssues` defaults to the one claim-scoped issue. Callers that
 * isolate a different rule may replace it. `withCoverageFinding: false` drops
 * the material coverage finding (and its gap), so the run may publish as
 * `complete`. `mutateBrief` receives each production brief (`verify`,
 * `adversary`, `coverage`) before it is written, for adversarial probes.
 * `omitDispositions` lists `{ reviewKind, claimId }` pairs a review leaves
 * without a disposition. The reconciler's omission gaps are recorded in the
 * manifest as the controller records them, unless `recordOmissionGaps` is
 * false; the run status is `partial` whenever a material gap is recorded.
 */
export async function createTwoSourcePacket({
  semanticIssues = [structuredClone(twoSourceSemanticIssue)],
  withCoverageFinding = true,
  mutateBrief,
  omitDispositions = [],
  recordOmissionGaps = true,
} = {}) {
  const packet = await createPacketFixture({
    profile: 'standard',
    status: 'complete',
  });
  const { packetRoot, manifest } = packet;
  const dossierRef = structuredClone(
    manifest.artifacts.find(
      (reference) => reference.path === 'raw/dossiers/gather.json',
    ),
  );

  const secondPath = join(packet.sourceRoot, 'second.txt');
  await writeFile(
    secondPath,
    'gamma evidence\ndelta evidence\nepsilon evidence\n',
    'utf8',
  );
  const firstSource = manifest.sources[0];
  const secondSource = {
    ...structuredClone(firstSource),
    id: 'source-2',
    path: secondPath,
    contentHash: await hashFile(secondPath),
  };
  manifest.sources = [firstSource, secondSource];
  manifest.request.includedScope = ['source-1', 'source-2'];
  manifest.request.questions = [
    'What evidence exists?',
    'Which release introduced epsilon?',
  ];

  const evidence = [
    fileEvidence(
      'evidence-alpha',
      'source-1',
      packet.sourcePath,
      1,
      'alpha evidence',
      dossierRef,
    ),
    fileEvidence(
      'evidence-gamma',
      'source-2',
      secondPath,
      1,
      'gamma evidence',
      dossierRef,
    ),
    fileEvidence(
      'evidence-delta',
      'source-2',
      secondPath,
      2,
      'delta evidence',
      dossierRef,
    ),
    fileEvidence(
      'evidence-epsilon',
      'source-2',
      secondPath,
      3,
      'epsilon evidence',
      dossierRef,
    ),
  ];
  const claim = (id, statement, links) => ({
    id,
    statement,
    status: 'supported',
    evidence: links.map((evidenceId) => ({ evidenceId, relation: 'supports' })),
    qualifications: [],
    reviewIds: [],
    derivedFrom: [structuredClone(dossierRef)],
    challenges: [],
  });
  const claims = [
    claim(twoSourceClaimIds.firstSource, 'The first source records alpha.', [
      'evidence-alpha',
    ]),
    claim(twoSourceClaimIds.secondSource, 'The second source records gamma.', [
      'evidence-gamma',
    ]),
    claim(
      twoSourceClaimIds.uncertain,
      'Alpha and delta describe the same release.',
      ['evidence-alpha', 'evidence-delta'],
    ),
    claim(twoSourceClaimIds.coverageGap, 'The second source records epsilon.', [
      'evidence-epsilon',
    ]),
  ];
  const priorLedger = {
    kind: 'recon.claim-ledger',
    schemaVersion: 1,
    runId: manifest.run.id,
    revision: 1,
    inputArtifacts: [structuredClone(dossierRef)],
    synthesis: {
      answer: 'Both sources record evidence; one release link is unconfirmed.',
      keyClaimIds: [
        twoSourceClaimIds.firstSource,
        twoSourceClaimIds.secondSource,
      ],
      caveats: ['The epsilon release question remains open.'],
      unresolvedQuestionIds: ['question-1'],
    },
    evidence,
    claims,
    unresolvedQuestions: [
      { id: 'question-1', question: 'Which release introduced epsilon?' },
    ],
    transitions: claims.map((item) => ({
      claimId: item.id,
      from: 'provisional',
      to: 'supported',
    })),
  };
  const priorPath = join(packetRoot, 'raw', 'drafts', 'claims-v1.json');
  await writeJson(priorPath, priorLedger);
  const priorReference = {
    path: 'raw/drafts/claims-v1.json',
    digest: await hashFile(priorPath),
  };

  const briefs = {};
  const briefRefs = {};
  for (const mode of ['verify', 'adversary', 'coverage']) {
    briefs[mode] = createReviewBrief({
      id: `brief-${mode}`,
      mode,
      createdAt: '2026-08-31T00:03:00.000Z',
      manifest,
      ledger: priorLedger,
    });
    if (mutateBrief) {
      await mutateBrief({
        mode,
        brief: briefs[mode],
        manifest,
        sourceRoot: packet.sourceRoot,
      });
    }
    const path = join(packetRoot, 'reviews', 'briefs', `${mode}.json`);
    await writeJson(path, briefs[mode]);
    briefRefs[mode] = {
      path: `reviews/briefs/${mode}.json`,
      digest: await hashFile(path),
    };
  }

  const claimIds = claims.map((item) => item.id);
  const review = (reviewKind, briefMode, dispositionFor, extra = {}) => ({
    kind: 'recon.review-result',
    schemaVersion: 1,
    id: `review-${reviewKind}`,
    runId: manifest.run.id,
    reviewKind,
    reviewerLane: `lane-${reviewKind}`,
    status: 'complete',
    brief: { ...briefRefs[briefMode] },
    permittedInputs: [{ ...briefRefs[briefMode] }],
    excludedInputs: ['prior_reasoning'],
    dispositions: claimIds
      .filter(
        (claimId) =>
          !omitDispositions.some(
            (omitted) =>
              omitted.reviewKind === reviewKind && omitted.claimId === claimId,
          ),
      )
      .map((claimId) => ({
        claimId,
        disposition: dispositionFor(claimId),
      })),
    newEvidence: [],
    evidenceAssociations: [],
    coverageFindings: [],
    unresolvedIssues: [],
    ...extra,
  });
  const reviews = {
    semantic: review(
      'semantic',
      'verify',
      (claimId) =>
        claimId === twoSourceClaimIds.uncertain ? 'uncertain' : 'affirmed',
      { unresolvedIssues: structuredClone(semanticIssues) },
    ),
    adversarial: review('adversarial', 'adversary', () => 'unchallenged'),
    coverage: review('coverage', 'coverage', () => 'covered', {
      coverageFindings: withCoverageFinding
        ? [structuredClone(twoSourceCoverageFinding)]
        : [],
    }),
  };
  const reviewResults = [];
  for (const [kind, value] of Object.entries(reviews)) {
    const path = join(packetRoot, 'reviews', `${kind}.json`);
    await writeJson(path, value);
    reviewResults.push({
      ...value,
      artifactReference: {
        path: `reviews/${kind}.json`,
        digest: await hashFile(path),
      },
    });
  }

  const {
    ledger,
    reconciliation,
    gaps: omissionGaps,
  } = reconcileLedger({
    priorLedger,
    reviewResults,
    priorReference,
    runId: manifest.run.id,
    manifest,
  });
  await writeJson(join(packetRoot, 'raw/drafts/claims-v2.json'), ledger);
  await writeJson(
    join(packetRoot, 'reviews/reconciliation.json'),
    reconciliation,
  );
  await writeJson(packet.claimsPath, ledger);

  if (withCoverageFinding) {
    manifest.gaps.push({
      id: twoSourceCoverageFinding.gapId,
      code: twoSourceCoverageFinding.code,
      message: twoSourceCoverageFinding.message,
      material: true,
      sourceIds: [],
      claimIds: [...twoSourceCoverageFinding.claimIds],
      coverageFindingIds: [twoSourceCoverageFinding.id],
    });
  }
  if (recordOmissionGaps) manifest.gaps.push(...omissionGaps);
  manifest.run.status = manifest.gaps.some((gap) => gap.material === true)
    ? 'partial'
    : 'complete';
  for (const reference of manifest.artifacts) {
    reference.digest = await hashFile(join(packetRoot, reference.path));
  }
  await writeJson(packet.manifestPath, manifest);

  return {
    ...packet,
    manifest,
    ledger,
    omissionGaps,
    priorLedger,
    reconciliation,
    briefs,
    reviews,
    secondPath,
    readJson,
    async rewriteArtifact(relative, value) {
      const path = join(packetRoot, relative);
      await writeJson(path, value);
      const reference = manifest.artifacts.find(
        (item) => item.path === relative,
      );
      reference.digest = await hashFile(path);
      await writeJson(packet.manifestPath, manifest);
      return { ...reference };
    },
  };
}
