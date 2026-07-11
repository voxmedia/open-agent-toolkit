#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const TIERS = ['economy', 'balanced', 'high', 'frontier'];
const STATUSES = ['pending', 'valid', 'unknown-value', 'unvalidated'];
const SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';
const SAFE_CREDENTIAL_VALUES = new Set([
  '<redacted>',
  'present',
  'absent',
  'unset',
]);

export const AUTHORITATIVE_CONFIGURED_CANDIDATES = Object.freeze([
  'gpt-5.6-luna-high',
  'gpt-5.6-terra-xhigh',
  'gpt-5.6-sol-high',
  'gpt-5.6-sol-max',
]);

export const CANONICAL_PROMPT_TEMPLATE = [
  'Validate whether a Cursor subagent Task can be launched with a specific model.',
  `Use the Task tool once with model "<candidate>" and ask the subagent to reply exactly: ${SENTINEL}.`,
  'After the subagent returns, print only its exact reply.',
].join('\n');

export const CANONICAL_COMMAND_SHAPE = Object.freeze([
  'cursor-agent',
  '[--api-key <redacted>]',
  '-p',
  '<canonical-prompt>',
  '--output-format=text',
  '--force',
]);

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

function sameArray(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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

function assertNoCredentialLeak(value, path = 'evidence') {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\bBearer\s+([^\s,;]+)/gi)) {
      if (!SAFE_CREDENTIAL_VALUES.has(match[1].toLowerCase())) {
        fail(`${path} contains a non-redacted Bearer credential`);
      }
    }
    for (const match of value.matchAll(
      /\b(?:(?:[a-z0-9_]*?(?:api[_-]?key|token|secret|password))|api key)\b\s*[:=]\s*([^\s,;]+)/gi,
    )) {
      const captured = match[1].replace(/^['"]|['"]$/g, '').toLowerCase();
      if (!SAFE_CREDENTIAL_VALUES.has(captured)) {
        fail(`${path} contains a non-redacted credential assignment`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoCredentialLeak(entry, `${path}[${index}]`),
    );
    return;
  }
  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertNoCredentialLeak(entry, `${path}.${key}`);
    }
  }
}

function canonicalPrompt(candidate) {
  return CANONICAL_PROMPT_TEMPLATE.replace('<candidate>', candidate);
}

function canonicalArgv(candidate, includeApiKey) {
  const prompt = canonicalPrompt(candidate);
  return [
    'cursor-agent',
    ...(includeApiKey ? ['--api-key', '<redacted>'] : []),
    '-p',
    prompt,
    '--output-format=text',
    '--force',
  ];
}

function unique(values) {
  return [...new Set(values)];
}

function extractModelSlugs(value) {
  const matches = value.match(/\b[a-z][a-z0-9]*(?:[-.][a-z0-9]+)+\b/gi) ?? [];
  return unique(
    matches
      .map((match) => match.replace(/[),.;:]+$/g, ''))
      .filter((match) => /\d/.test(match)),
  );
}

function parseAllowedSubagentModels(output) {
  const sections = [];
  const patterns = [
    /\ballowed\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bsupported\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bvalid\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bone\s+of\s*:?\s*([^\n]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of output.matchAll(pattern)) {
      if (match[1]) {
        sections.push(match[1]);
      }
    }
  }
  return unique(sections.flatMap(extractModelSlugs));
}

function deriveOutcome(record) {
  const stdout = record.probe.stdout;
  const stderr = record.probe.stderr;
  const hasSuccessfulSentinel =
    record.probe.directExitStatus === 0 &&
    stdout.split(/\r?\n/).some((line) => line.trim() === SENTINEL);
  if (hasSuccessfulSentinel) {
    return { status: 'valid', outcomeBasis: 'task-sentinel' };
  }

  const allowedValues = parseAllowedSubagentModels(`${stdout}\n${stderr}`);
  if (allowedValues.length > 0) {
    return allowedValues.includes(record.candidate)
      ? { status: 'valid', outcomeBasis: 'subagent-allow-list-included' }
      : {
          status: 'unknown-value',
          outcomeBasis: 'subagent-allow-list-excluded',
        };
  }
  return {
    status: 'unvalidated',
    outcomeBasis: 'no-definitive-task-evidence',
  };
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
        fail(
          `recommendation cursor tier ${tier} contains a non-string candidate`,
        );
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
    fail(
      'recommendation SHA-256 does not match the checked recommendation file',
    );
  }
  if (metadata.sentinel !== SENTINEL) {
    fail(`metadata sentinel must equal ${SENTINEL}`);
  }
  if (metadata.canonicalPromptTemplate !== CANONICAL_PROMPT_TEMPLATE) {
    fail(
      'canonicalPromptTemplate does not match the production Task probe prompt',
    );
  }
  if (!sameArray(metadata.canonicalCommandShape, CANONICAL_COMMAND_SHAPE)) {
    fail('canonicalCommandShape does not match the production Task probe argv');
  }
  if (
    !Array.isArray(metadata.captureRules) ||
    metadata.captureRules.length === 0
  ) {
    fail('captureRules must be a non-empty array');
  }
  if (!sameArray(metadata.outcomeVocabulary, STATUSES)) {
    fail(`outcomeVocabulary must exactly equal ${STATUSES.join(', ')}`);
  }
  if (metadata.catalogRole !== 'diagnostic-only') {
    fail('catalogRole must be diagnostic-only');
  }
}

function validateConfiguredSubset(
  configured,
  expectedByCandidate,
  authoritative,
) {
  if (
    !Array.isArray(configured) ||
    new Set(configured).size !== configured.length
  ) {
    fail('configured subset candidates must be a unique array');
  }
  if (!sameArray(configured, authoritative)) {
    fail('configured subset does not match the approved project contract');
  }
  for (const candidate of configured) {
    if (!expectedByCandidate.has(candidate)) {
      fail(`configured subset candidate is not recommended: ${candidate}`);
    }
  }
}

function validateFinalRecord(record) {
  const { candidate, probe, environment } = record;
  if (!isObject(probe) || probe.executed !== true) {
    fail(`${candidate}: complete probe capture requires executed=true`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(probe.utcDate ?? '')) {
    fail(`${candidate}: complete probe capture requires a UTC date`);
  }
  requireString(probe.prompt, `${candidate}: probe.prompt`);
  if (probe.prompt !== canonicalPrompt(candidate)) {
    fail(
      `${candidate}: probe.prompt does not match the canonical candidate prompt`,
    );
  }
  if (typeof probe.stdout !== 'string' || typeof probe.stderr !== 'string') {
    fail(
      `${candidate}: complete probe capture requires stdout and stderr strings`,
    );
  }
  if (
    probe.directExitStatus !== null &&
    (!Number.isInteger(probe.directExitStatus) || probe.directExitStatus < 0)
  ) {
    fail(
      `${candidate}: directExitStatus must be a non-negative integer or null`,
    );
  }
  if (
    probe.directExitStatus === null &&
    typeof probe.terminationSignal !== 'string'
  ) {
    fail(`${candidate}: a null directExitStatus requires a terminationSignal`);
  }
  if (!Number.isFinite(probe.durationMs) || probe.durationMs < 0) {
    fail(`${candidate}: complete probe capture requires durationMs`);
  }
  if (!isObject(environment)) {
    fail(
      `${candidate}: complete probe capture requires sanitized environment context`,
    );
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
  if (environment.selectedBinary !== 'cursor-agent') {
    fail(`${candidate}: selectedBinary must be cursor-agent`);
  }
  if (!['present', 'absent'].includes(environment.cursorApiKey)) {
    fail(`${candidate}: environment.cursorApiKey must be present or absent`);
  }
  if (!['present', 'absent', 'unset'].includes(environment.credentialStore)) {
    fail(
      `${candidate}: environment.credentialStore must be present, absent, or unset`,
    );
  }
  const expectedArgv = canonicalArgv(
    candidate,
    environment.cursorApiKey === 'present',
  );
  if (!sameArray(probe.commandArgvSanitized, expectedArgv)) {
    fail(
      `${candidate}: commandArgvSanitized does not match the canonical argv`,
    );
  }

  const derived = deriveOutcome(record);
  if (
    record.status !== derived.status ||
    record.outcomeBasis !== derived.outcomeBasis
  ) {
    fail(
      `${candidate}: claimed ${record.status}/${record.outcomeBasis} does not match derived ${derived.status}/${derived.outcomeBasis}`,
    );
  }
  if (
    record.status !== 'valid' &&
    !/^\d{4}-\d{2}-\d{2}$/.test(record.recheckDate ?? '')
  ) {
    fail(`${candidate}: non-valid outcome requires a concrete recheckDate`);
  }
}

function validateDisposition(
  disposition,
  metadata,
  recommendation,
  recommendationSha256,
  expected,
  configured,
  recordsByCandidate,
  allowPending,
) {
  if (!isObject(disposition) || disposition.schemaVersion !== 1) {
    fail('recommendation disposition schemaVersion must equal 1');
  }
  if (!['retained', 'changed'].includes(disposition.assetDisposition)) {
    fail('recommendation disposition must be retained or changed');
  }
  for (const key of [
    'sourceRecommendationVersion',
    'sourceRecommendationSha256',
    'resultRecommendationVersion',
    'resultRecommendationSha256',
  ]) {
    requireString(disposition[key], `recommendation disposition ${key}`);
  }
  if (
    disposition.resultRecommendationVersion !== recommendation.version ||
    disposition.resultRecommendationSha256 !== recommendationSha256 ||
    metadata.recommendationVersion !==
      disposition.resultRecommendationVersion ||
    metadata.recommendationSha256 !== disposition.resultRecommendationSha256
  ) {
    fail(
      'recommendation disposition result version/hash does not match evidence',
    );
  }
  requireString(disposition.rationale, 'recommendation disposition rationale');

  if (disposition.assetDisposition === 'retained') {
    if (
      disposition.sourceRecommendationVersion !== recommendation.version ||
      disposition.sourceRecommendationSha256 !== recommendationSha256
    ) {
      fail(
        'retained recommendation disposition must preserve source version/hash',
      );
    }
  } else if (
    disposition.sourceRecommendationVersion === recommendation.version &&
    disposition.sourceRecommendationSha256 === recommendationSha256
  ) {
    fail('changed recommendation disposition must identify a different source');
  }

  const decisions = disposition.candidateDecisions;
  if (!Array.isArray(decisions)) {
    fail('recommendation disposition must contain candidateDecisions[]');
  }
  const decisionsByCandidate = new Map();
  for (const decision of decisions) {
    if (!isObject(decision) || typeof decision.candidate !== 'string') {
      fail('every recommendation disposition decision requires a candidate');
    }
    if (decisionsByCandidate.has(decision.candidate)) {
      fail(`duplicate recommendation disposition for ${decision.candidate}`);
    }
    decisionsByCandidate.set(decision.candidate, decision);
  }
  let changedCount = 0;
  for (const expectedEntry of expected) {
    const record = recordsByCandidate.get(expectedEntry.candidate);
    const decision = decisionsByCandidate.get(expectedEntry.candidate);
    if (!decision) {
      fail(`missing recommendation disposition for ${expectedEntry.candidate}`);
    }
    if (
      decision.tier !== expectedEntry.tier ||
      decision.configured !== configured.includes(expectedEntry.candidate) ||
      decision.outcome !== record.status ||
      decision.recheckDate !== record.recheckDate
    ) {
      fail(
        `${expectedEntry.candidate}: recommendation disposition disagrees with evidence`,
      );
    }
    if (record.status === 'pending') {
      if (!allowPending || decision.decision !== 'pending') {
        fail(
          `${expectedEntry.candidate}: pending evidence requires pending disposition`,
        );
      }
    } else if (!['retained', 'changed'].includes(decision.decision)) {
      fail(
        `${expectedEntry.candidate}: final disposition must be retained or changed`,
      );
    }
    if (decision.decision === 'changed') {
      changedCount += 1;
      if (record.status === 'unvalidated') {
        fail(
          `${expectedEntry.candidate}: unvalidated evidence cannot change recommendation`,
        );
      }
    }
    if (
      disposition.assetDisposition === 'retained' &&
      decision.decision === 'changed'
    ) {
      fail(
        `${expectedEntry.candidate}: retained asset cannot contain changed decision`,
      );
    }
  }
  for (const candidate of decisionsByCandidate.keys()) {
    if (!recordsByCandidate.has(candidate)) {
      fail(`extra recommendation disposition for ${candidate}`);
    }
  }
  if (disposition.assetDisposition === 'changed' && changedCount === 0) {
    fail(
      'changed recommendation disposition requires at least one changed candidate',
    );
  }
}

export function validateEvidenceDocument(
  markdown,
  recommendation,
  {
    allowPending = false,
    recommendationSha256,
    authoritativeConfiguredCandidates = AUTHORITATIVE_CONFIGURED_CANDIDATES,
  } = {},
) {
  const metadataBlocks = extractBlocks(markdown, 'METADATA');
  if (metadataBlocks.length !== 1) {
    fail(`expected exactly one metadata block; found ${metadataBlocks.length}`);
  }
  const metadata = metadataBlocks[0];
  validateMetadata(metadata, recommendation, recommendationSha256);

  const expected = deriveCursorCandidates(recommendation);
  const expectedByCandidate = new Map(
    expected.map((entry) => [entry.candidate, entry]),
  );
  const configuredBlocks = extractBlocks(markdown, 'CONFIGURED_SUBSET');
  if (configuredBlocks.length !== 1) {
    fail(
      `expected exactly one configured-subset block; found ${configuredBlocks.length}`,
    );
  }
  const configured = configuredBlocks[0]?.candidates;
  validateConfiguredSubset(
    configured,
    expectedByCandidate,
    authoritativeConfiguredCandidates,
  );

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
      fail(
        `${record.candidate}: configured flag disagrees with configured subset`,
      );
    }
    if (!STATUSES.includes(record.status)) {
      fail(`${record.candidate}: invalid status ${record.status}`);
    }
    if (record.status === 'pending') {
      if (!allowPending) {
        fail(`${record.candidate}: pending evidence is not allowed`);
      }
      if (
        record.probe?.executed !== false ||
        record.outcomeBasis !== 'pending'
      ) {
        fail(
          `${record.candidate}: pending record must be unexecuted with pending basis`,
        );
      }
    } else {
      validateFinalRecord(record);
    }
    outcomes[record.status] = (outcomes[record.status] ?? 0) + 1;
  }

  const dispositionBlocks = extractBlocks(
    markdown,
    'RECOMMENDATION_DISPOSITION',
  );
  if (dispositionBlocks.length !== 1) {
    fail(
      `expected exactly one recommendation disposition block; found ${dispositionBlocks.length}`,
    );
  }
  validateDisposition(
    dispositionBlocks[0],
    metadata,
    recommendation,
    recommendationSha256,
    expected,
    configured,
    recordsByCandidate,
    allowPending,
  );

  assertNoCredentialLeak(metadata, 'metadata');
  assertNoCredentialLeak(configuredBlocks[0], 'configuredSubset');
  records.forEach((record, index) =>
    assertNoCredentialLeak(record, `records[${index}]`),
  );
  assertNoCredentialLeak(dispositionBlocks[0], 'recommendationDisposition');

  return {
    candidateCount: expected.length,
    configuredCount: configured.length,
    outcomes,
    recommendationDisposition: dispositionBlocks[0].assetDisposition,
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

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(
      `Cursor evidence verification failed: ${error.message}\n`,
    );
    process.exitCode = 1;
  });
}
