#!/usr/bin/env node

import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashFile } from './lib/canonical-json.mjs';
import { validatePacket } from './validate-packet.mjs';

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

export function renderPacketDocument(manifest, ledger) {
  const evidenceById = new Map(
    ledger.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const keyClaims = ledger.synthesis.keyClaimIds
    .map((id) => claimsById.get(id))
    .filter(Boolean);
  const contradictions = ledger.claims.filter(
    (claim) =>
      claim.status === 'contested' || (claim.challenges ?? []).length > 0,
  );
  const failedStages = manifest.stages.filter(
    (stage) => stage.status !== 'complete',
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

export async function renderPacket(packetDirectory) {
  const packetRoot = resolve(packetDirectory);
  const validation = await validatePacket(packetRoot, {
    removePublishedOnFailure: true,
  });
  if (!validation.valid || !validation.publishable) {
    throw new Error(
      `Packet validation failed: ${validation.errors.map((error) => error.code).join(', ')}`,
    );
  }
  const [manifest, ledger] = await Promise.all([
    readFile(join(packetRoot, 'manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(packetRoot, 'claims.json'), 'utf8').then(JSON.parse),
  ]);
  const document = renderPacketDocument(manifest, ledger);
  const target = join(packetRoot, 'packet.md');
  const temporary = join(packetRoot, `.packet.md.${process.pid}.tmp`);
  try {
    await writeFile(temporary, document, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    await rm(target, { force: true });
    throw error;
  }

  return {
    directory: packetRoot,
    status: manifest.run.status,
    requestedProfile: validation.requestedProfile,
    achievedProfile: validation.achievedProfile,
    claimCounts: claimCounts(ledger),
    gapCount: manifest.gaps.length,
    failedOrOmittedPasses: [
      ...manifest.stages
        .filter((stage) => stage.status !== 'complete')
        .map((stage) => stage.mode),
      ...manifest.gaps
        .filter((gap) => /PASS_(?:FAILED|OMITTED)/.test(gap.code))
        .map((gap) => gap.code),
    ],
    digest: await hashFile(target),
  };
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
