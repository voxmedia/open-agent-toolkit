import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  deriveCursorCandidates,
  validateEvidenceDocument,
} from './verify-cursor-subagent-evidence.mjs';

const recommendation = {
  version: '2026-07-10.test',
  providers: {
    cursor: {
      economy: { candidates: ['gpt-5.6-luna-low', 'gpt-5.6-luna-low'] },
      high: { candidates: ['gpt-5.6-sol-high', 'composer-2.5'] },
    },
  },
};

const metadata = {
  schemaVersion: 1,
  recommendationVersion: recommendation.version,
  recommendationSha256: 'fixture-sha',
  sentinel: 'OAT_CURSOR_SUBAGENT_MODEL_VALID',
  canonicalPromptTemplate:
    'Use the Task tool once with model "<candidate>" and print the sentinel.',
  canonicalCommandShape: [
    'cursor-agent',
    '[--api-key <redacted>]',
    '-p',
    '<canonical-prompt>',
    '--output-format=text',
    '--force',
  ],
  captureRules: ['Never persist credentials.'],
  outcomeVocabulary: ['pending', 'valid', 'unknown-value', 'unvalidated'],
  catalogRole: 'diagnostic-only',
};

function block(kind, value) {
  return [
    `<!-- OAT_CURSOR_${kind}_START -->`,
    '```json',
    JSON.stringify(value, null, 2),
    '```',
    `<!-- OAT_CURSOR_${kind}_END -->`,
  ].join('\n');
}

function pendingRecord(candidate, tier, configured = false) {
  return {
    candidate,
    tier,
    configured,
    status: 'pending',
    probe: {
      executed: false,
      utcDate: null,
      commandArgvSanitized: [],
      prompt: null,
      stdout: null,
      stderr: null,
      directExitStatus: null,
      terminationSignal: null,
      durationMs: null,
    },
    environment: {
      selectedBinary: null,
      binaryPath: null,
      clientVersion: null,
      cursorApiKey: 'not-recorded',
      credentialStore: 'not-recorded',
    },
    outcomeBasis: 'pending',
    catalogDiagnostic: null,
    recheckDate: null,
  };
}

function document(records = null, configured = ['gpt-5.6-sol-high']) {
  const actualRecords =
    records ?? [
      pendingRecord('gpt-5.6-luna-low', 'economy'),
      pendingRecord('gpt-5.6-sol-high', 'high', true),
    ];
  return [
    block('METADATA', metadata),
    block('CONFIGURED_SUBSET', { candidates: configured }),
    ...actualRecords.map((record) => block('EVIDENCE_RECORD', record)),
  ].join('\n\n');
}

test('derives distinct GPT-5.6 Cursor candidates in recommendation order', () => {
  assert.deepEqual(deriveCursorCandidates(recommendation), [
    { candidate: 'gpt-5.6-luna-low', tier: 'economy' },
    { candidate: 'gpt-5.6-sol-high', tier: 'high' },
  ]);
});

test('accepts one pending record per exact candidate with a configured subset', () => {
  assert.deepEqual(
    validateEvidenceDocument(document(), recommendation, {
      allowPending: true,
      recommendationSha256: 'fixture-sha',
    }),
    { candidateCount: 2, configuredCount: 1, outcomes: { pending: 2 } },
  );
});

test('rejects missing, duplicate, and extra candidate records', () => {
  const luna = pendingRecord('gpt-5.6-luna-low', 'economy');
  const sol = pendingRecord('gpt-5.6-sol-high', 'high', true);
  const extra = pendingRecord('gpt-5.6-terra-high', 'balanced');

  assert.throws(
    () =>
      validateEvidenceDocument(document([luna]), recommendation, {
        allowPending: true,
        recommendationSha256: 'fixture-sha',
      }),
    /missing evidence record.*gpt-5\.6-sol-high/,
  );
  assert.throws(
    () =>
      validateEvidenceDocument(document([luna, sol, sol]), recommendation, {
        allowPending: true,
        recommendationSha256: 'fixture-sha',
      }),
    /duplicate evidence record.*gpt-5\.6-sol-high/,
  );
  assert.throws(
    () =>
      validateEvidenceDocument(document([luna, sol, extra]), recommendation, {
        allowPending: true,
        recommendationSha256: 'fixture-sha',
      }),
    /extra evidence record.*gpt-5\.6-terra-high/,
  );
});

test('rejects incomplete final records and missing recheck dates', () => {
  const luna = pendingRecord('gpt-5.6-luna-low', 'economy');
  luna.status = 'unvalidated';
  luna.probe.executed = true;

  assert.throws(
    () =>
      validateEvidenceDocument(
        document([luna, pendingRecord('gpt-5.6-sol-high', 'high', true)]),
        recommendation,
        { allowPending: false, recommendationSha256: 'fixture-sha' },
      ),
    /complete probe capture|recheckDate/,
  );
});

test('rejects configured-subset drift and credentials in captures', () => {
  assert.throws(
    () =>
      validateEvidenceDocument(document(null, ['not-recommended']), recommendation, {
        allowPending: true,
        recommendationSha256: 'fixture-sha',
      }),
    /configured subset candidate is not recommended/,
  );

  const luna = pendingRecord('gpt-5.6-luna-low', 'economy');
  luna.probe.commandArgvSanitized = ['cursor-agent', '--api-key', 'secret-value'];
  assert.throws(
    () =>
      validateEvidenceDocument(
        document([luna, pendingRecord('gpt-5.6-sol-high', 'high', true)]),
        recommendation,
        { allowPending: true, recommendationSha256: 'fixture-sha' },
      ),
    /credential|redacted/,
  );
});
