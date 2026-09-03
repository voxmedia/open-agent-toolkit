#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashFile } from './lib/canonical-json.mjs';
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

export function renderPacketDocument(validatedRun) {
  const { manifest, ledger, topology } = assertValidatedRun(validatedRun);
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
  const failedStages = topology.stages
    .map(({ stage }) => stage)
    .filter((stage) => stage.status !== 'complete');
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
    ...bulletLines([
      ...failedStages.map(
        (stage) =>
          `**${escapeInline(stage.mode)}:** ${escapeInline(stage.status)}${stage.message ? ` — ${escapeInline(stage.message)}` : ''}`,
      ),
      ...omittedGaps.map(
        (gap) => `**${escapeInline(gap.code)}:** ${escapeInline(gap.message)}`,
      ),
    ]),
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
      failedOrOmittedPasses: [
        ...run.topology.stages
          .map(({ stage }) => stage)
          .filter((stage) => stage.status !== 'complete')
          .map((stage) => stage.mode),
        ...manifest.gaps
          .filter((gap) => /PASS_(?:FAILED|OMITTED)/.test(gap.code))
          .map((gap) => gap.code),
      ],
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
