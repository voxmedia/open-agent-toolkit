#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const TIERS = ['economy', 'balanced', 'high', 'frontier'];
const STATUSES = ['pending', 'valid', 'unknown-value', 'unvalidated'];
const SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
}

function extractBlocks(markdown, kind) {
  const pattern = new RegExp(
    `<!-- OAT_CURSOR_${kind}_START -->\\s*` +
      '```json\\s*([\\s\\S]*?)\\s*```\\s*' +
      `<!-- OAT_CURSOR_${kind}_END -->`,
    'g',
  );
  const blocks = [];
  for (const match of markdown.matchAll(pattern)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      fail(`invalid JSON in ${kind} block: ${error.message}`);
    }
  }
  return blocks;
}

export function deriveCursorCandidates(recommendation) {
  const cursor = recommendation?.providers?.cursor;
  if (!isObject(cursor)) {
    fail('recommendation is missing providers.cursor');
  }

  const seen = new Set();
  const candidates = [];
  for (const tier of TIERS) {
    const values = cursor[tier]?.candidates;
    if (values === undefined) {
      continue;
    }
    if (!Array.isArray(values)) {
      fail(`recommendation cursor tier ${tier} must contain candidates[]`);
    }
    for (const candidate of values) {
      if (typeof candidate !== 'string') {
        fail(`recommendation cursor tier ${tier} contains a non-string candidate`);
      }
      if (!candidate.startsWith('gpt-5.6-') || seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      candidates.push({ candidate, tier });
    }
  }
  return candidates;
}

function validateMetadata(metadata, recommendation, recommendationSha256) {
  if (!isObject(metadata) || metadata.schemaVersion !== 1) {
    fail('metadata schemaVersion must equal 1');
  }
  if (metadata.recommendationVersion !== recommendation.version) {
    fail(
      `recommendation version mismatch: evidence=${metadata.recommendationVersion} recommendation=${recommendation.version}`,
    );
  }
  if (metadata.recommendationSha256 !== recommendationSha256) {
    fail('recommendation SHA-256 does not match the checked recommendation file');
  }
  if (metadata.sentinel !== SENTINEL) {
    fail(`metadata sentinel must equal ${SENTINEL}`);
  }
  requireString(metadata.canonicalPromptTemplate, 'canonicalPromptTemplate');
  if (
    !Array.isArray(metadata.canonicalCommandShape) ||
    metadata.canonicalCommandShape.length === 0
  ) {
    fail('canonicalCommandShape must be a non-empty array');
  }
  if (!Array.isArray(metadata.captureRules) || metadata.captureRules.length === 0) {
    fail('captureRules must be a non-empty array');
  }
  if (
    !Array.isArray(metadata.outcomeVocabulary) ||
    STATUSES.some((status) => !metadata.outcomeVocabulary.includes(status))
  ) {
    fail(`outcomeVocabulary must include ${STATUSES.join(', ')}`);
  }
  if (metadata.catalogRole !== 'diagnostic-only') {
    fail('catalogRole must be diagnostic-only');
  }
}

function validateSanitizedCommand(argv, candidate) {
  if (!Array.isArray(argv) || argv.length === 0) {
    fail(`${candidate}: complete probe capture requires commandArgvSanitized`);
  }
  const apiKeyIndex = argv.indexOf('--api-key');
  if (apiKeyIndex >= 0 && argv[apiKeyIndex + 1] !== '<redacted>') {
    fail(`${candidate}: credential after --api-key must be redacted`);
  }
}

function validateFinalRecord(record) {
  const { candidate, probe, environment, status } = record;
  if (!isObject(probe) || probe.executed !== true) {
    fail(`${candidate}: complete probe capture requires executed=true`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(probe.utcDate ?? '')) {
    fail(`${candidate}: complete probe capture requires a UTC date`);
  }
  validateSanitizedCommand(probe.commandArgvSanitized, candidate);
  requireString(probe.prompt, `${candidate}: probe.prompt`);
  if (typeof probe.stdout !== 'string' || typeof probe.stderr !== 'string') {
    fail(`${candidate}: complete probe capture requires stdout and stderr strings`);
  }
  if (
    probe.directExitStatus !== null &&
    (!Number.isInteger(probe.directExitStatus) || probe.directExitStatus < 0)
  ) {
    fail(`${candidate}: directExitStatus must be a non-negative integer or null`);
  }
  if (probe.directExitStatus === null && typeof probe.terminationSignal !== 'string') {
    fail(`${candidate}: a null directExitStatus requires a terminationSignal`);
  }
  if (!Number.isFinite(probe.durationMs) || probe.durationMs < 0) {
    fail(`${candidate}: complete probe capture requires durationMs`);
  }
  if (!isObject(environment)) {
    fail(`${candidate}: complete probe capture requires sanitized environment context`);
  }
  for (const key of [
    'selectedBinary',
    'binaryPath',
    'clientVersion',
    'cursorApiKey',
    'credentialStore',
  ]) {
    requireString(environment[key], `${candidate}: environment.${key}`);
  }
  if (!['present', 'absent'].includes(environment.cursorApiKey)) {
    fail(`${candidate}: environment.cursorApiKey must be present or absent`);
  }

  const validBases = {
    valid: ['task-sentinel', 'subagent-allow-list-included'],
    'unknown-value': ['subagent-allow-list-excluded'],
    unvalidated: ['no-definitive-task-evidence'],
  };
  if (!validBases[status].includes(record.outcomeBasis)) {
    fail(`${candidate}: outcomeBasis does not match status ${status}`);
  }
  if (
    status !== 'valid' &&
    !/^\d{4}-\d{2}-\d{2}$/.test(record.recheckDate ?? '')
  ) {
    fail(`${candidate}: non-valid outcome requires a concrete recheckDate`);
  }
}

export function validateEvidenceDocument(
  markdown,
  recommendation,
  { allowPending = false, recommendationSha256 } = {},
) {
  const metadataBlocks = extractBlocks(markdown, 'METADATA');
  if (metadataBlocks.length !== 1) {
    fail(`expected exactly one metadata block; found ${metadataBlocks.length}`);
  }
  validateMetadata(metadataBlocks[0], recommendation, recommendationSha256);

  const configuredBlocks = extractBlocks(markdown, 'CONFIGURED_SUBSET');
  if (configuredBlocks.length !== 1) {
    fail(
      `expected exactly one configured-subset block; found ${configuredBlocks.length}`,
    );
  }
  const configured = configuredBlocks[0]?.candidates;
  if (!Array.isArray(configured) || new Set(configured).size !== configured.length) {
    fail('configured subset candidates must be a unique array');
  }

  const expected = deriveCursorCandidates(recommendation);
  const expectedByCandidate = new Map(
    expected.map((entry) => [entry.candidate, entry]),
  );
  for (const candidate of configured) {
    if (!expectedByCandidate.has(candidate)) {
      fail(`configured subset candidate is not recommended: ${candidate}`);
    }
  }

  const records = extractBlocks(markdown, 'EVIDENCE_RECORD');
  const recordsByCandidate = new Map();
  for (const record of records) {
    if (!isObject(record) || typeof record.candidate !== 'string') {
      fail('every evidence record must have a string candidate');
    }
    if (recordsByCandidate.has(record.candidate)) {
      fail(`duplicate evidence record for ${record.candidate}`);
    }
    recordsByCandidate.set(record.candidate, record);
  }
  for (const candidate of expectedByCandidate.keys()) {
    if (!recordsByCandidate.has(candidate)) {
      fail(`missing evidence record for ${candidate}`);
    }
  }
  for (const candidate of recordsByCandidate.keys()) {
    if (!expectedByCandidate.has(candidate)) {
      fail(`extra evidence record for ${candidate}`);
    }
  }

  const outcomes = {};
  for (const expectedEntry of expected) {
    const record = recordsByCandidate.get(expectedEntry.candidate);
    if (record.tier !== expectedEntry.tier) {
      fail(
        `${record.candidate}: tier mismatch; evidence=${record.tier} recommendation=${expectedEntry.tier}`,
      );
    }
    if (record.configured !== configured.includes(record.candidate)) {
      fail(`${record.candidate}: configured flag disagrees with configured subset`);
    }
    if (!STATUSES.includes(record.status)) {
      fail(`${record.candidate}: invalid status ${record.status}`);
    }
    if ((record.probe?.commandArgvSanitized?.length ?? 0) > 0) {
      validateSanitizedCommand(
        record.probe.commandArgvSanitized,
        record.candidate,
      );
    }
    if (record.status === 'pending') {
      if (!allowPending) {
        fail(`${record.candidate}: pending evidence is not allowed`);
      }
      if (record.probe?.executed !== false || record.outcomeBasis !== 'pending') {
        fail(`${record.candidate}: pending record must be unexecuted with pending basis`);
      }
    } else {
      validateFinalRecord(record);
    }
    outcomes[record.status] = (outcomes[record.status] ?? 0) + 1;
  }

  return {
    candidateCount: expected.length,
    configuredCount: configured.length,
    outcomes,
  };
}

function parseArgs(argv) {
  const options = { allowPending: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--allow-pending') {
      options.allowPending = true;
    } else if (arg === '--recommendation' || arg === '--evidence') {
      const value = argv[index + 1];
      if (!value) {
        fail(`${arg} requires a path`);
      }
      options[arg.slice(2)] = value;
      index += 1;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  if (!options.recommendation || !options.evidence) {
    fail('--recommendation and --evidence are required');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const recommendationText = await readFile(options.recommendation, 'utf8');
  const recommendation = JSON.parse(recommendationText);
  const evidence = await readFile(options.evidence, 'utf8');
  const recommendationSha256 = createHash('sha256')
    .update(recommendationText)
    .digest('hex');
  const result = validateEvidenceDocument(evidence, recommendation, {
    allowPending: options.allowPending,
    recommendationSha256,
  });
  process.stdout.write(`${JSON.stringify({ status: 'ok', ...result })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`Cursor evidence verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
