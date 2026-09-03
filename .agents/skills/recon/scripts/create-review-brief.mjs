#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson, hashFile } from './lib/canonical-json.mjs';
import { issue, isObject } from './lib/contracts.mjs';
import { assertSafeOutputPath } from './lib/safe-path.mjs';

const commonKeys = [
  'kind',
  'schemaVersion',
  'id',
  'runId',
  'mode',
  'createdAt',
  'excludedInputs',
];
const allowedKeys = {
  verify: new Set([...commonKeys, 'claims', 'sources']),
  adversary: new Set([
    ...commonKeys,
    'scope',
    'questions',
    'provisionalStatements',
  ]),
  coverage: new Set([...commonKeys, 'scope', 'questions', 'claims']),
};
const forbiddenKeys = new Set([
  'derivedFrom',
  'provenance',
  'reviewIds',
  'synthesis',
  'compilerReasoning',
  'inputArtifacts',
  'priorReviews',
  'dossierPath',
]);

function selectedClaims(ledger, claimIds) {
  const selected = claimIds ? new Set(claimIds) : null;
  return ledger.claims.filter((claim) => !selected || selected.has(claim.id));
}

function verificationBrief(input) {
  const claims = selectedClaims(input.ledger, input.claimIds);
  const evidenceById = new Map(
    input.ledger.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const sourceIds = new Set();
  const projectedClaims = claims.map((claim) => ({
    id: claim.id,
    statement: claim.statement,
    evidence: claim.evidence.map((link) => {
      const evidence = evidenceById.get(link.evidenceId);
      if (!evidence) {
        throw new Error(
          `Claim ${claim.id} references missing evidence ${link.evidenceId}`,
        );
      }
      sourceIds.add(evidence.sourceId);
      return {
        id: evidence.id,
        sourceId: evidence.sourceId,
        displayExcerpt: evidence.displayExcerpt,
        locator: structuredClone(evidence.locator),
      };
    }),
  }));
  return {
    kind: 'recon.review-brief',
    schemaVersion: 1,
    id: input.id,
    runId: input.manifest.run.id,
    mode: 'verify',
    createdAt: input.createdAt,
    excludedInputs: [
      'worker_intermediates',
      'prior_reasoning',
      'consumer_summary',
      'artifact_lineage',
      'earlier_reviews',
    ],
    claims: projectedClaims,
    sources: input.manifest.sources
      .filter((source) => sourceIds.has(source.id))
      .map((source) => structuredClone(source)),
  };
}

function adversarialBrief(input) {
  return {
    kind: 'recon.review-brief',
    schemaVersion: 1,
    id: input.id,
    runId: input.manifest.run.id,
    mode: 'adversary',
    createdAt: input.createdAt,
    excludedInputs: [
      'worker_intermediates',
      'prior_reasoning',
      'consumer_summary',
      'artifact_lineage',
      'earlier_reviews',
      'verification_conclusions',
    ],
    scope: {
      included: structuredClone(input.manifest.request.includedScope ?? []),
      excluded: structuredClone(input.manifest.request.excludedScope ?? []),
    },
    questions: structuredClone(input.manifest.request.questions ?? []),
    provisionalStatements: selectedClaims(input.ledger, input.claimIds).map(
      (claim) => ({ id: claim.id, statement: claim.statement }),
    ),
  };
}

function coverageBrief(input) {
  return {
    kind: 'recon.review-brief',
    schemaVersion: 1,
    id: input.id,
    runId: input.manifest.run.id,
    mode: 'coverage',
    createdAt: input.createdAt,
    excludedInputs: [
      'worker_intermediates',
      'prior_reasoning',
      'consumer_summary',
      'artifact_lineage',
      'earlier_reviews',
      'verification_conclusions',
      'adversarial_conclusions',
    ],
    scope: {
      included: structuredClone(input.manifest.request.includedScope ?? []),
      excluded: structuredClone(input.manifest.request.excludedScope ?? []),
    },
    questions: structuredClone(input.manifest.request.questions ?? []),
    claims: selectedClaims(input.ledger, input.claimIds).map((claim) => ({
      id: claim.id,
      statement: claim.statement,
    })),
  };
}

export function createReviewBrief(input) {
  if (!['verify', 'adversary', 'coverage'].includes(input.mode)) {
    throw new Error(`Unsupported review brief mode: ${input.mode}`);
  }
  if (!input.id || !input.createdAt || !input.manifest || !input.ledger) {
    throw new Error(
      'Review brief requires id, createdAt, manifest, and ledger',
    );
  }
  const brief =
    input.mode === 'verify'
      ? verificationBrief(input)
      : input.mode === 'adversary'
        ? adversarialBrief(input)
        : coverageBrief(input);
  const result = validateReviewBrief(brief);
  if (!result.valid) {
    throw new Error(
      `Review brief violates selective blindness: ${result.errors[0].message}`,
    );
  }
  return brief;
}

function inspectForbidden(value, path, errors) {
  if (typeof value === 'string') {
    if (/raw[\\/]dossiers/i.test(value)) {
      errors.push(
        issue('BLINDNESS_VIOLATION', 'Raw dossier paths are forbidden', path),
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectForbidden(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) {
      errors.push(
        issue(
          'BLINDNESS_VIOLATION',
          `Forbidden field ${key}`,
          `${path}.${key}`,
        ),
      );
    }
    inspectForbidden(item, `${path}.${key}`, errors);
  }
}

export function validateReviewBrief(brief) {
  const errors = [];
  if (
    !isObject(brief) ||
    brief.kind !== 'recon.review-brief' ||
    brief.schemaVersion !== 1
  ) {
    errors.push(
      issue('INVALID_REVIEW_BRIEF', 'Expected recon.review-brief version 1'),
    );
    return { valid: false, errors };
  }
  const allowed = allowedKeys[brief.mode];
  if (!allowed) {
    errors.push(
      issue(
        'INVALID_REVIEW_MODE',
        'Review mode must be verify, adversary, or coverage',
        '$.mode',
      ),
    );
    return { valid: false, errors };
  }
  for (const key of Object.keys(brief)) {
    if (!allowed.has(key)) {
      errors.push(
        issue(
          'BLINDNESS_VIOLATION',
          `Unexpected top-level field ${key}`,
          `$.${key}`,
        ),
      );
    }
  }
  inspectForbidden(brief, '$', errors);
  if (brief.mode === 'verify') {
    if (!Array.isArray(brief.claims) || !Array.isArray(brief.sources)) {
      errors.push(
        issue(
          'INVALID_REVIEW_BRIEF',
          'Verification brief needs claims and sources',
        ),
      );
    }
    for (const [index, claim] of (brief.claims ?? []).entries()) {
      const keys = Object.keys(claim).sort();
      if (keys.join(',') !== 'evidence,id,statement') {
        errors.push(
          issue(
            'BLINDNESS_VIOLATION',
            'Verification claims have an invalid projection',
            `$.claims[${index}]`,
          ),
        );
      }
      for (const [evidenceIndex, evidence] of (
        claim.evidence ?? []
      ).entries()) {
        const evidenceKeys = Object.keys(evidence).sort();
        if (evidenceKeys.join(',') !== 'displayExcerpt,id,locator,sourceId') {
          errors.push(
            issue(
              'BLINDNESS_VIOLATION',
              'Verification evidence has an invalid projection',
              `$.claims[${index}].evidence[${evidenceIndex}]`,
            ),
          );
        }
      }
    }
  } else if (brief.mode === 'adversary') {
    if (
      !Array.isArray(brief.questions) ||
      !Array.isArray(brief.provisionalStatements) ||
      !isObject(brief.scope)
    ) {
      errors.push(
        issue(
          'INVALID_REVIEW_BRIEF',
          'Adversarial brief needs scope, questions, and provisional statements',
        ),
      );
    }
    for (const [index, statement] of (
      brief.provisionalStatements ?? []
    ).entries()) {
      if (
        !isObject(statement) ||
        Object.keys(statement).sort().join(',') !== 'id,statement'
      ) {
        errors.push(
          issue(
            'BLINDNESS_VIOLATION',
            'Adversarial statements have an invalid projection',
            `$.provisionalStatements[${index}]`,
          ),
        );
      }
    }
  } else if (brief.mode === 'coverage') {
    if (
      !Array.isArray(brief.questions) ||
      !Array.isArray(brief.claims) ||
      !isObject(brief.scope)
    ) {
      errors.push(
        issue(
          'INVALID_REVIEW_BRIEF',
          'Coverage brief needs scope, questions, and claims',
        ),
      );
    }
    for (const [index, claim] of (brief.claims ?? []).entries()) {
      if (Object.keys(claim).sort().join(',') !== 'id,statement') {
        errors.push(
          issue(
            'BLINDNESS_VIOLATION',
            'Coverage claims have an invalid projection',
            `$.claims[${index}]`,
          ),
        );
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function writeReviewBrief({ packetRoot, outputPath, brief }) {
  const root = resolve(packetRoot);
  const target = resolve(outputPath);
  await assertSafeOutputPath(root, target);
  const result = validateReviewBrief(brief);
  if (!result.valid) {
    throw new Error(
      `Review brief violates selective blindness: ${result.errors[0].message}`,
    );
  }
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, `${canonicalJson(brief)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      throw new Error(`Review brief already exists: ${target}`, {
        cause: error,
      });
    }
    throw error;
  }
  return { path: relative(root, target), digest: await hashFile(target) };
}

async function main(argv) {
  const options = Object.fromEntries(
    argv.reduce((pairs, value, index) => {
      if (value.startsWith('--')) pairs.push([value.slice(2), argv[index + 1]]);
      return pairs;
    }, []),
  );
  for (const key of [
    'mode',
    'id',
    'created-at',
    'manifest',
    'ledger',
    'output',
    'packet-root',
  ]) {
    if (!options[key]) throw new Error(`Missing --${key}`);
  }
  const [manifest, ledger] = await Promise.all([
    readFile(options.manifest, 'utf8').then(JSON.parse),
    readFile(options.ledger, 'utf8').then(JSON.parse),
  ]);
  const brief = createReviewBrief({
    mode: options.mode,
    id: options.id,
    createdAt: options['created-at'],
    manifest,
    ledger,
  });
  const reference = await writeReviewBrief({
    packetRoot: options['packet-root'],
    outputPath: options.output,
    brief,
  });
  process.stdout.write(`${JSON.stringify(reference, null, 2)}\n`);
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
