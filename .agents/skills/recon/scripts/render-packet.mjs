#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { hashFile } from './lib/canonical-json.mjs';
import { isDirectExecution } from './lib/cli-entry.mjs';
import {
  affirmingDispositionByReviewKind,
  classifyUnresolvedIssue,
  requiredReviewKindsForProfile,
  unresolvedIssuesBlockClaim,
} from './lib/contracts.mjs';
import { reviewBriefEntries } from './lib/review-binding.mjs';
import {
  assertSafeExistingPath,
  assertSafeOutputPath,
  assertUnchangedRoot,
} from './lib/safe-path.mjs';
import { assertValidatedRun } from './lib/validated-run.mjs';
import { compileValidatedRun } from './validate-packet.mjs';

function escapeInline(value) {
  return String(value)
    .replace(/([\\`*_[\]<>])/g, '\\$1')
    .replace(/\r?\n/g, ' ');
}

function formatLocator(locator) {
  if (locator.kind === 'repository') {
    return `${locator.path}:${locator.lineStart}-${locator.lineEnd}@${locator.revision}`;
  }
  if (locator.kind === 'file') {
    const range = locator.lineStart
      ? `:${locator.lineStart}${locator.lineEnd && locator.lineEnd !== locator.lineStart ? `-${locator.lineEnd}` : ''}`
      : '';
    return `${locator.path}${range}`;
  }
  if (locator.kind === 'url') {
    return `${locator.url}${locator.fragment ? `#${locator.fragment}` : ''}`;
  }
  if (locator.kind === 'command-output') {
    return `${locator.artifactPath}:${locator.lineStart}-${locator.lineEnd}`;
  }
  if (locator.kind === 'connected-resource') {
    return `${locator.system}:${locator.resourceId}${locator.fieldOrSection ? `#${locator.fieldOrSection}` : ''}${locator.resourceVersion ? `@${locator.resourceVersion}` : ''}`;
  }
  return 'unknown locator';
}

function bulletLines(values, empty = 'None.') {
  return values.length > 0
    ? values.map((value) => `- ${value}`)
    : [`- ${empty}`];
}

const targetAxisLabels = [
  ['provider', 'provider'],
  ['route', 'route'],
  ['role', 'role'],
  ['model', 'model'],
  ['effort', 'effort'],
  ['reasoningMode', 'reasoning mode'],
  ['serviceTier', 'service tier'],
];

function formatIntendedTarget(target) {
  return targetAxisLabels
    .map(([field, label]) => {
      const value =
        target[field] === null
          ? 'unsupported / not independently requested'
          : target[field];
      return `${label}=${escapeInline(value)}`;
    })
    .join('; ');
}

function intendedRoutingLines(routing) {
  return routing.waves.map((wave) => {
    return `- **${escapeInline(wave.waveId)}** — mode=${escapeInline(wave.mode)}; class/floor=${escapeInline(wave.taskClass)}/${escapeInline(wave.classFloor)}; lanes=${wave.lanes.length}; conditional=${wave.conditional ? 'yes' : 'no'}; ${formatIntendedTarget(wave.target)}; rationale=${escapeInline(wave.selectionReason)}`;
  });
}

function conditionalOutcomeLines(manifest, routing) {
  const outcomesById = new Map(
    (manifest.conditionOutcomes ?? []).map((outcome) => [
      outcome.conditionId,
      outcome,
    ]),
  );
  return routing.conditions.map((condition) => {
    const outcome = outcomesById.get(condition.conditionId);
    const evidence = outcome.evidence
      .map((reference) => escapeInline(reference.path))
      .join(', ');
    return `- **${escapeInline(condition.conditionId)}** — ${escapeInline(condition.predicate)} → ${escapeInline(condition.destinationWaveId)}: **${escapeInline(outcome.disposition)}** — ${escapeInline(outcome.reason)}; predecessor evidence: ${evidence || 'none'}`;
  });
}

function intendedRoutingSection(manifest, routing) {
  return [
    '',
    '## Intended Routing',
    '',
    `- **Manifest routing version:** ${routing.sourceSchemaVersion}`,
    `- **Approved authority:** ${escapeInline(routing.authority)}`,
    `- **Approved limits:** ${routing.waves.length} waves; ${routing.waves.reduce((count, wave) => count + wave.lanes.length, 0)} lanes; concurrency ${routing.maxConcurrency}; deadline ${routing.deadlineSeconds}s; pre-acceptance admission retries per lane ${routing.retryLimit}`,
    '- **Evidence boundary:** These are normalized approved intended targets and root-recorded condition dispositions. They are not launcher receipts or observations of native runtime identity, usage, cost, or conclusion correctness.',
    '',
    '### Waves',
    '',
    ...intendedRoutingLines(routing),
    '',
    '### Conditional Outcomes',
    '',
    ...bulletLines(
      conditionalOutcomeLines(manifest, routing),
      'None declared.',
    ),
  ];
}

const assuranceReviewKinds = Object.keys(affirmingDispositionByReviewKind);

// The claim IDs a review was briefed on: the entries of the immutable brief
// its exact reference resolves to, read the way the validator reads them.
function briefedClaimIds(review, artifacts) {
  const brief = artifacts.find(
    ({ reference, value }) =>
      value.kind === 'recon.review-brief' &&
      reference.path === review.brief?.path &&
      reference.digest === review.brief?.digest,
  )?.value;
  return new Set(
    reviewBriefEntries(brief, review.reviewKind).map((entry) => entry.id),
  );
}

// Every incorporated assurance review, core or thorough, whose brief listed
// `claimId` but which gave it no disposition. Such a claim is listed as not
// reviewed. A claim outside a review's brief was never that review's to
// dispose of, so it is not an omission.
function omittedReviews(claimId, reviews) {
  return reviews
    .filter(
      ({ value, briefed }) =>
        briefed.has(claimId) &&
        !(value.dispositions ?? []).some((item) => item.claimId === claimId),
    )
    .map(({ value }) => value);
}

// Every incorporated review of a kind the achieved profile requires whose
// brief did not list `claimId`, so it gave the claim no disposition. Such a
// claim cannot be verified, and the reason is the missing review, not an
// omission by the reviewer.
function unbriefedRequiredReviews(claimId, reviews, requiredKinds) {
  return reviews
    .filter(
      ({ value, briefed }) =>
        requiredKinds.includes(value.reviewKind) &&
        !briefed.has(claimId) &&
        !(value.dispositions ?? []).some((item) => item.claimId === claimId),
    )
    .map(({ value }) => value);
}

function issueText(entry) {
  return typeof entry === 'string' ? entry : (entry?.text ?? '');
}

// Every claim an incorporated review kept below `verified` (an unresolved
// issue that applies to it, a coverage finding that names it, a
// non-affirming disposition, an assurance review that left a briefed claim
// without a disposition, or a review the achieved profile requires whose
// brief left the claim out), with the review's own words. Key-claim status
// alone would let a `complete` packet hide a downgraded non-key claim.
function reviewDowngradeLines(validatedRun) {
  const { ledger, artifacts, assuranceReviewIds, achievedProfile } =
    validatedRun;
  const requiredKinds = requiredReviewKindsForProfile(achievedProfile);
  const assurance = new Set(assuranceReviewIds);
  const reviews = artifacts
    .map(({ value }) => value)
    .filter(
      (value) =>
        value.kind === 'recon.review-result' && assurance.has(value.id),
    );
  // Claim-bearing assurance reviews in table order, each with its brief
  // membership.
  const briefedReviews = reviews
    .filter((review) => assuranceReviewKinds.includes(review.reviewKind))
    .map((value) => ({ value, briefed: briefedClaimIds(value, artifacts) }))
    .sort(
      (left, right) =>
        assuranceReviewKinds.indexOf(left.value.reviewKind) -
        assuranceReviewKinds.indexOf(right.value.reviewKind),
    );
  const lines = [];
  for (const claim of ledger.claims) {
    if (claim.status === 'verified') continue;
    const reasons = [];
    for (const review of reviews) {
      const disposition = (review.dispositions ?? []).find(
        (item) => item.claimId === claim.id,
      );
      if (!disposition) continue;
      if (
        disposition.disposition !==
        affirmingDispositionByReviewKind[review.reviewKind]
      ) {
        reasons.push(`${review.reviewKind} review: ${disposition.disposition}`);
      }
      if (unresolvedIssuesBlockClaim(review, claim.id)) {
        for (const entry of review.unresolvedIssues) {
          const classification = classifyUnresolvedIssue(entry);
          if (
            classification.scope === 'claims' &&
            !classification.claimIds.includes(claim.id)
          ) {
            continue;
          }
          const scope =
            classification.scope === 'claims' ? 'issue' : 'global issue';
          reasons.push(`${review.reviewKind} ${scope}: ${issueText(entry)}`);
        }
      }
    }
    for (const review of omittedReviews(claim.id, briefedReviews)) {
      reasons.push(
        `${review.reviewKind} review: not reviewed (no disposition)`,
      );
    }
    for (const review of unbriefedRequiredReviews(
      claim.id,
      briefedReviews,
      requiredKinds,
    )) {
      reasons.push(
        `${review.reviewKind} review: outside its brief (no disposition)`,
      );
    }
    for (const review of reviews) {
      for (const finding of review.coverageFindings ?? []) {
        if (!finding.claimIds.includes(claim.id)) continue;
        reasons.push(
          `${finding.material ? 'material ' : ''}coverage finding ${finding.code}: ${finding.message}`,
        );
      }
    }
    if (reasons.length === 0) continue;
    lines.push(
      `**${escapeInline(claim.id)}** (${escapeInline(claim.status)}): ${escapeInline(claim.statement)} — ${reasons.map(escapeInline).join('; ')}`,
    );
  }
  return lines;
}

export function renderPacketDocument(validatedRun) {
  const { manifest, ledger, routing } = assertValidatedRun(validatedRun);
  const evidenceById = new Map(
    ledger.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const keyClaims = ledger.synthesis.keyClaimIds
    .map((id) => claimsById.get(id))
    .filter(Boolean);
  const contradictions = ledger.claims.filter(
    (claim) =>
      claim.status === 'contested' ||
      claim.status === 'unsupported' ||
      (claim.challenges ?? []).length > 0,
  );
  const omittedGaps = manifest.gaps.filter((gap) =>
    /PASS_(?:FAILED|OMITTED)/.test(gap.code),
  );
  const lines = [
    '# Recon Evidence Packet',
    '',
    `- **Status:** ${escapeInline(manifest.run.status)}`,
    `- **Requested profile:** ${escapeInline(manifest.run.requestedProfile)}`,
    `- **Achieved profile:** ${escapeInline(manifest.run.achievedProfile ?? 'none')}`,
    `- **Run:** ${escapeInline(manifest.run.id)}`,
    `- **Topic:** ${escapeInline(manifest.run.topic)}`,
    '',
    '## Synthesis',
    '',
    ledger.synthesis.answer,
    '',
    ...bulletLines(
      ledger.synthesis.caveats.map((item) => `Caveat: ${escapeInline(item)}`),
    ),
    '',
    '## Key Claims',
    '',
  ];

  for (const claim of keyClaims) {
    lines.push(`### ${escapeInline(claim.id)}`, '');
    lines.push(`- **State:** **${escapeInline(claim.status)}**`);
    lines.push(`- **Claim:** ${escapeInline(claim.statement)}`);
    const links = claim.evidence
      .map((link) => ({ link, evidence: evidenceById.get(link.evidenceId) }))
      .filter(({ evidence }) => evidence);
    if (links.length === 0) {
      lines.push('- **Evidence:** None.');
    } else {
      lines.push('- **Evidence:**');
      for (const { link, evidence } of links) {
        lines.push(
          `  - ${escapeInline(link.relation)} — ${escapeInline(evidence.displayExcerpt)} (${escapeInline(formatLocator(evidence.locator))}; ${escapeInline(evidence.locatorValidation.status)})`,
        );
      }
    }
    for (const qualification of claim.qualifications) {
      lines.push(`- **Qualification:** ${escapeInline(qualification)}`);
    }
    lines.push('');
  }

  lines.push('## Contradictions and Qualifications', '');
  lines.push(
    ...bulletLines(
      contradictions.map(
        (claim) =>
          `**${escapeInline(claim.id)}** (${escapeInline(claim.status)}): ${escapeInline(claim.statement)}${claim.qualifications.length ? ` — ${escapeInline(claim.qualifications.join('; '))}` : ''}`,
      ),
    ),
    '',
    '## Review Downgrades',
    '',
    ...bulletLines(reviewDowngradeLines(validatedRun)),
    '',
    '## Unresolved Questions',
    '',
    ...bulletLines(
      ledger.unresolvedQuestions.map(
        (question) =>
          `**${escapeInline(question.id)}:** ${escapeInline(question.question ?? question.text ?? '')}`,
      ),
    ),
    '',
    '## Coverage Gaps',
    '',
    ...bulletLines(
      manifest.gaps.map(
        (gap) => `**${escapeInline(gap.code)}:** ${escapeInline(gap.message)}`,
      ),
    ),
    '',
    '## Failed or Omitted Passes',
    '',
    ...bulletLines(
      omittedGaps.map(
        (gap) => `**${escapeInline(gap.code)}:** ${escapeInline(gap.message)}`,
      ),
    ),
    ...intendedRoutingSection(manifest, routing),
    '',
    '## Provenance',
    '',
    '- Machine-readable manifest: [`manifest.json`](manifest.json)',
    '- Canonical claim ledger: [`claims.json`](claims.json)',
    '- Compact review artifacts: [`reviews/`](reviews/)',
    '- Exact locators are scoped to the source identities and observations in `manifest.json`.',
    '',
  );
  return lines.join('\n');
}

function claimCounts(ledger) {
  return Object.fromEntries(
    [...ledger.claims]
      .sort((a, b) => a.status.localeCompare(b.status))
      .reduce((counts, claim) => {
        counts.set(claim.status, (counts.get(claim.status) ?? 0) + 1);
        return counts;
      }, new Map()),
  );
}

async function hashOpenFile(file) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  while (true) {
    const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    hash.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return `sha256:${hash.digest('hex')}`;
}

async function assertFileIdentity(path, identity) {
  const current = await lstat(path);
  if (
    current.isSymbolicLink() ||
    !current.isFile() ||
    current.dev !== identity.device ||
    current.ino !== identity.inode
  ) {
    throw Object.assign(
      new Error('Rendered packet file identity changed before publication'),
      { code: 'PACKET_FILE_IDENTITY_CHANGED' },
    );
  }
}

function packetRootIdentity(run) {
  return run.filesystemIdentities.find(
    (identity) => identity.path === run.packetRoot,
  );
}

async function assertCanonicalPacketBytes(run) {
  const rootIdentity = packetRootIdentity(run);
  for (const retained of run.canonicalByteDigests) {
    const path = join(run.packetRoot, retained.path);
    try {
      await assertUnchangedRoot(rootIdentity);
      await assertSafeExistingPath(run.packetRoot, path);
      if ((await hashFile(path)) !== retained.digest) {
        throw new Error(`Canonical packet bytes changed: ${retained.path}`);
      }
    } catch (cause) {
      if (
        cause?.code === 'ROOT_IDENTITY_CHANGED' ||
        cause?.code === 'SYMLINK_ESCAPE'
      ) {
        throw cause;
      }
      throw Object.assign(
        new Error(`Canonical packet bytes changed: ${retained.path}`, {
          cause,
        }),
        { code: 'PACKET_CANONICAL_BYTES_CHANGED' },
      );
    }
  }
  await assertUnchangedRoot(rootIdentity);
}

async function withdrawPacket(run, target, originalError) {
  try {
    await assertUnchangedRoot(packetRootIdentity(run));
  } catch (identityError) {
    if (
      originalError?.code === 'ROOT_IDENTITY_CHANGED' ||
      originalError?.code === 'SYMLINK_ESCAPE'
    ) {
      throw originalError;
    }
    throw identityError;
  }
  await rm(target, { force: true });
}

async function removeTemporaryIfRootUnchanged(run, temporary) {
  try {
    await assertUnchangedRoot(packetRootIdentity(run));
  } catch {
    return;
  }
  await rm(temporary, { force: true });
}

export async function renderPacket(packetDirectory) {
  const packetRoot = resolve(packetDirectory);
  const validation = await compileValidatedRun(packetRoot);
  if (!validation.valid || !validation.publishable) {
    const diagnosticCodes = validation.errors.map((error) => error.code);
    throw Object.assign(
      new Error(`Packet validation failed: ${diagnosticCodes.join(', ')}`),
      {
        code: diagnosticCodes.includes('PACKET_NOT_PUBLISHABLE')
          ? 'PACKET_NOT_PUBLISHABLE'
          : 'PACKET_VALIDATION_FAILED',
      },
    );
  }
  return renderValidatedPacket(validation.validatedRun);
}

export async function renderValidatedPacket(
  validatedRun,
  { promote = rename, afterPromotionChecks = () => {} } = {},
) {
  const run = assertValidatedRun(validatedRun);
  const { manifest, ledger, packetRoot } = run;
  if (manifest.run.status !== 'complete' && manifest.run.status !== 'partial') {
    throw Object.assign(
      new Error(
        `Cannot render non-publishable run status: ${manifest.run.status}`,
      ),
      { code: 'PACKET_NOT_PUBLISHABLE' },
    );
  }
  const target = join(packetRoot, 'packet.md');
  const temporary = join(packetRoot, `.packet.md.${randomUUID()}.tmp`);
  let temporaryFile;
  try {
    const document = renderPacketDocument(run);
    await Promise.all(
      run.filesystemIdentities.map((identity) => assertUnchangedRoot(identity)),
    );
    await assertSafeOutputPath(packetRoot, temporary);
    await assertSafeOutputPath(packetRoot, target);
    temporaryFile = await open(temporary, 'wx+', 0o600);
    const temporaryStat = await temporaryFile.stat();
    const temporaryIdentity = {
      device: temporaryStat.dev,
      inode: temporaryStat.ino,
    };
    await temporaryFile.writeFile(document, 'utf8');
    await temporaryFile.sync();
    const digest = await hashOpenFile(temporaryFile);
    await assertFileIdentity(temporary, temporaryIdentity);
    await Promise.all(
      run.filesystemIdentities.map((identity) => assertUnchangedRoot(identity)),
    );
    const result = {
      directory: packetRoot,
      status: manifest.run.status,
      requestedProfile: manifest.run.requestedProfile,
      achievedProfile: run.achievedProfile,
      claimCounts: claimCounts(ledger),
      gapCount: manifest.gaps.length,
      failedOrOmittedPasses: manifest.gaps
        .filter((gap) => /PASS_(?:FAILED|OMITTED)/.test(gap.code))
        .map((gap) => ({ code: gap.code, message: gap.message })),
      digest,
    };
    await assertCanonicalPacketBytes(run);
    await promote(temporary, target);
    await assertFileIdentity(target, temporaryIdentity);
    const [promotedDigest, retainedDigest] = await Promise.all([
      hashFile(target),
      hashOpenFile(temporaryFile),
    ]);
    if (promotedDigest !== digest || retainedDigest !== digest) {
      throw Object.assign(
        new Error('Promoted packet digest differs from rendered bytes'),
        { code: 'PACKET_DIGEST_MISMATCH' },
      );
    }
    await Promise.all(
      run.filesystemIdentities.map((identity) => assertUnchangedRoot(identity)),
    );
    await afterPromotionChecks();
    await assertCanonicalPacketBytes(run);
    return result;
  } catch (error) {
    try {
      await withdrawPacket(run, target, error);
    } catch (withdrawalError) {
      if (
        withdrawalError === error ||
        withdrawalError?.code === 'ROOT_IDENTITY_CHANGED' ||
        withdrawalError?.code === 'SYMLINK_ESCAPE'
      ) {
        throw withdrawalError;
      }
      throw new Error(
        `Packet rendering failed (${error instanceof Error ? error.message : error}) and the consumer entry point could not be withdrawn`,
        { cause: withdrawalError },
      );
    }
    throw error;
  } finally {
    await temporaryFile?.close();
    await removeTemporaryIfRootUnchanged(run, temporary);
  }
}

async function main(argv) {
  const [packetDirectory] = argv;
  if (!packetDirectory)
    throw new Error('Usage: render-packet.mjs <packet-directory>');
  const result = await renderPacket(packetDirectory);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (isDirectExecution(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
