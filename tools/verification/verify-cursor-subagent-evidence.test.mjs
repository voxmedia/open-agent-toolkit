import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveStructuredProbe } from './capture-cursor-subagent-evidence.mjs';
import {
  CANONICAL_COMMAND_SHAPE,
  CANONICAL_PROMPT_TEMPLATE,
  deriveCursorCandidates,
  validateEvidenceDocument,
  validateStructuredEvidenceDocument,
} from './verify-cursor-subagent-evidence.mjs';

const SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';
const recommendation = {
  version: '2026-07-10.test',
  providers: {
    cursor: {
      economy: { candidates: ['gpt-5.6-luna-low', 'gpt-5.6-luna-low'] },
      high: { candidates: ['gpt-5.6-sol-high', 'composer-2.5'] },
    },
  },
};
const recommendationSha256 = 'a'.repeat(64);
const authoritativeConfiguredCandidates = ['gpt-5.6-sol-high'];
const validationOptions = {
  recommendationSha256,
  authoritativeConfiguredCandidates,
};

const metadata = {
  schemaVersion: 1,
  recommendationVersion: recommendation.version,
  recommendationSha256,
  sentinel: SENTINEL,
  canonicalPromptTemplate: CANONICAL_PROMPT_TEMPLATE,
  canonicalCommandShape: [...CANONICAL_COMMAND_SHAPE],
  captureRules: ['Never persist credentials or tokens.'],
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

function prompt(candidate) {
  return CANONICAL_PROMPT_TEMPLATE.replace('<candidate>', candidate);
}

function argv(candidate, apiKey = 'absent') {
  return [
    'cursor-agent',
    ...(apiKey === 'present' ? ['--api-key', '<redacted>'] : []),
    '-p',
    prompt(candidate),
    '--output-format=text',
    '--force',
  ];
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
      cursorApiKey: 'absent',
      credentialStore: 'unset',
    },
    outcomeBasis: 'pending',
    catalogDiagnostic: null,
    recheckDate: null,
  };
}

function finalRecord(
  candidate,
  tier,
  configured = false,
  {
    apiKey = 'absent',
    directExitStatus = 0,
    outcomeBasis = 'no-definitive-task-evidence',
    status = 'unvalidated',
    stderr = '',
    stdout = 'Model unavailable.',
  } = {},
) {
  return {
    candidate,
    tier,
    configured,
    status,
    probe: {
      executed: true,
      utcDate: '2026-07-11',
      commandArgvSanitized: argv(candidate, apiKey),
      prompt: prompt(candidate),
      stdout,
      stderr,
      directExitStatus,
      terminationSignal: null,
      durationMs: 123,
    },
    environment: {
      selectedBinary: 'cursor-agent',
      binaryPath: '/usr/local/bin/cursor-agent',
      clientVersion: '2026.07.09-test',
      cursorApiKey: apiKey,
      credentialStore: 'unset',
    },
    outcomeBasis,
    catalogDiagnostic: 'Catalog not used; diagnostic-only.',
    recheckDate: status === 'valid' ? null : '2026-07-18',
  };
}

function disposition(records, overrides = {}) {
  return {
    schemaVersion: 1,
    assetDisposition: 'retained',
    sourceRecommendationVersion: recommendation.version,
    sourceRecommendationSha256: recommendationSha256,
    resultRecommendationVersion: recommendation.version,
    resultRecommendationSha256: recommendationSha256,
    rationale: 'No definitive evidence supports a recommendation change.',
    candidateDecisions: records.map((record) => ({
      candidate: record.candidate,
      tier: record.tier,
      configured: record.configured,
      outcome: record.status,
      decision: record.status === 'pending' ? 'pending' : 'retained',
      recheckDate: record.recheckDate,
    })),
    ...overrides,
  };
}

function document({
  configured = authoritativeConfiguredCandidates,
  dispositionValue,
  includeDisposition = true,
  metadataValue = metadata,
  records = [
    pendingRecord('gpt-5.6-luna-low', 'economy'),
    pendingRecord('gpt-5.6-sol-high', 'high', true),
  ],
} = {}) {
  return [
    block('METADATA', metadataValue),
    block('CONFIGURED_SUBSET', { candidates: configured }),
    ...records.map((record) => block('EVIDENCE_RECORD', record)),
    ...(includeDisposition
      ? [
          block(
            'RECOMMENDATION_DISPOSITION',
            dispositionValue ?? disposition(records),
          ),
        ]
      : []),
  ].join('\n\n');
}

function validate(markdown, options = {}) {
  return validateEvidenceDocument(markdown, recommendation, {
    ...validationOptions,
    ...options,
  });
}

test('derives distinct GPT-5.6 Cursor candidates in recommendation order', () => {
  assert.deepEqual(deriveCursorCandidates(recommendation), [
    { candidate: 'gpt-5.6-luna-low', tier: 'economy' },
    { candidate: 'gpt-5.6-sol-high', tier: 'high' },
  ]);
});

test('accepts exact pending records and a machine disposition', () => {
  assert.deepEqual(validate(document(), { allowPending: true }), {
    candidateCount: 2,
    configuredCount: 1,
    outcomes: { pending: 2 },
    recommendationDisposition: 'retained',
  });
});

test('accepts production-equivalent sentinel and allow-list outcomes', () => {
  const sentinel = finalRecord('gpt-5.6-luna-low', 'economy', false, {
    directExitStatus: 0,
    outcomeBasis: 'task-sentinel',
    status: 'valid',
    stdout: `${SENTINEL}\n`,
  });
  const allowed = finalRecord('gpt-5.6-sol-high', 'high', true, {
    directExitStatus: 1,
    outcomeBasis: 'subagent-allow-list-included',
    status: 'valid',
    stderr:
      'Invalid subagent model mystery. Allowed models: gpt-5.6-sol-high, composer-2.5',
    stdout: '',
  });
  assert.deepEqual(validate(document({ records: [sentinel, allowed] })), {
    candidateCount: 2,
    configuredCount: 1,
    outcomes: { valid: 2 },
    recommendationDisposition: 'retained',
  });

  const excluded = finalRecord('gpt-5.6-luna-low', 'economy', false, {
    directExitStatus: 1,
    outcomeBasis: 'subagent-allow-list-excluded',
    status: 'unknown-value',
    stderr:
      'Invalid subagent model. Allowed subagent models: gpt-5.6-sol-high, composer-2.5',
    stdout: '',
  });
  const unavailable = finalRecord('gpt-5.6-sol-high', 'high', true, {
    stdout: 'Model unavailable. Available equivalent: gpt-5.6-sol-high-fast.',
  });
  assert.equal(
    validate(document({ records: [excluded, unavailable] })).outcomes[
      'unknown-value'
    ],
    1,
  );
});

test('rejects non-canonical metadata prompt and command shape', () => {
  assert.throws(
    () =>
      validate(
        document({
          metadataValue: {
            ...metadata,
            canonicalPromptTemplate: 'not canonical',
          },
        }),
        { allowPending: true },
      ),
    /canonicalPromptTemplate/,
  );
  assert.throws(
    () =>
      validate(
        document({
          metadataValue: {
            ...metadata,
            canonicalCommandShape: ['not-cursor-agent'],
          },
        }),
        { allowPending: true },
      ),
    /canonicalCommandShape/,
  );
});

test('rejects non-canonical record prompt and argv including API-key variants', () => {
  const luna = finalRecord('gpt-5.6-luna-low', 'economy');
  const sol = finalRecord('gpt-5.6-sol-high', 'high', true);
  luna.probe.prompt = 'not canonical';
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /probe\.prompt/,
  );

  luna.probe.prompt = prompt(luna.candidate);
  luna.probe.commandArgvSanitized = ['not-cursor-agent'];
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /commandArgvSanitized/,
  );

  luna.environment.cursorApiKey = 'present';
  luna.probe.commandArgvSanitized = [
    'cursor-agent',
    '--api-key',
    'secret-value',
    '-p',
    prompt(luna.candidate),
    '--output-format=text',
    '--force',
  ];
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /commandArgvSanitized/,
  );
});

test('rejects claimed outcomes inconsistent with sentinel, exit, or allow-list', () => {
  const luna = finalRecord('gpt-5.6-luna-low', 'economy', false, {
    directExitStatus: 143,
    outcomeBasis: 'task-sentinel',
    status: 'valid',
    stdout: '',
  });
  const sol = finalRecord('gpt-5.6-sol-high', 'high', true);
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /does not match derived/,
  );

  luna.status = 'valid';
  luna.outcomeBasis = 'subagent-allow-list-included';
  luna.probe.directExitStatus = 1;
  luna.probe.stderr = 'Allowed models: gpt-5.6-sol-high, composer-2.5';
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /does not match derived/,
  );
});

test('rejects missing, duplicate, and extra candidate records', () => {
  const luna = pendingRecord('gpt-5.6-luna-low', 'economy');
  const sol = pendingRecord('gpt-5.6-sol-high', 'high', true);
  const extra = pendingRecord('gpt-5.6-terra-high', 'balanced');
  assert.throws(
    () => validate(document({ records: [luna] }), { allowPending: true }),
    /missing evidence record.*gpt-5\.6-sol-high/,
  );
  assert.throws(
    () =>
      validate(document({ records: [luna, sol, sol] }), { allowPending: true }),
    /duplicate evidence record.*gpt-5\.6-sol-high/,
  );
  assert.throws(
    () =>
      validate(document({ records: [luna, sol, extra] }), {
        allowPending: true,
      }),
    /extra evidence record.*gpt-5\.6-terra-high/,
  );
});

test('rejects incomplete final records and missing recheck dates', () => {
  const luna = finalRecord('gpt-5.6-luna-low', 'economy');
  const sol = finalRecord('gpt-5.6-sol-high', 'high', true);
  luna.probe.durationMs = null;
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /durationMs/,
  );
  luna.probe.durationMs = 123;
  luna.recheckDate = null;
  assert.throws(
    () => validate(document({ records: [luna, sol] })),
    /recheckDate/,
  );
});

test('rejects a different recommended configured subset', () => {
  const luna = pendingRecord('gpt-5.6-luna-low', 'economy', true);
  const sol = pendingRecord('gpt-5.6-sol-high', 'high', false);
  assert.throws(
    () =>
      validate(
        document({ configured: ['gpt-5.6-luna-low'], records: [luna, sol] }),
        { allowPending: true },
      ),
    /approved project contract/,
  );
});

test('rejects credential leakage in metadata and every captured string surface', () => {
  const mutations = [
    (luna) => {
      luna.probe.commandArgvSanitized.push('--token', 'FAKE_SECRET');
    },
    (luna) => {
      luna.probe.prompt += '\ntoken=FAKE_SECRET';
    },
    (luna) => {
      luna.probe.stdout = 'token=FAKE_SECRET';
    },
    (luna) => {
      luna.probe.stderr = 'Authorization: Bearer FAKE_SECRET';
    },
    (luna) => {
      luna.environment.credentialStore = 'FAKE_SECRET';
    },
    (luna) => {
      luna.catalogDiagnostic = 'api-key=FAKE_SECRET';
    },
    (luna) => {
      luna.catalogDiagnostic = 'CURSOR_API_KEY=FAKE_SECRET';
    },
  ];
  for (const mutate of mutations) {
    const luna = finalRecord('gpt-5.6-luna-low', 'economy');
    const sol = finalRecord('gpt-5.6-sol-high', 'high', true);
    mutate(luna);
    assert.throws(() => validate(document({ records: [luna, sol] })));
  }

  assert.throws(
    () =>
      validate(
        document({
          metadataValue: {
            ...metadata,
            captureRules: ['secret=FAKE_SECRET'],
          },
        }),
        { allowPending: true },
      ),
    /credential assignment/,
  );

  const records = [
    finalRecord('gpt-5.6-luna-low', 'economy'),
    finalRecord('gpt-5.6-sol-high', 'high', true),
  ];
  const value = disposition(records, { rationale: 'token=FAKE_SECRET' });
  assert.throws(
    () => validate(document({ dispositionValue: value, records })),
    /credential assignment/,
  );
});

test('requires complete and consistent machine recommendation disposition', () => {
  const records = [
    finalRecord('gpt-5.6-luna-low', 'economy'),
    finalRecord('gpt-5.6-sol-high', 'high', true),
  ];
  assert.throws(
    () => validate(document({ includeDisposition: false, records })),
    /exactly one recommendation disposition block/,
  );

  const missing = disposition(records);
  missing.candidateDecisions.pop();
  assert.throws(
    () => validate(document({ dispositionValue: missing, records })),
    /missing recommendation disposition/,
  );

  const altered = disposition(records);
  altered.candidateDecisions[0].outcome = 'valid';
  assert.throws(
    () => validate(document({ dispositionValue: altered, records })),
    /disagrees with evidence/,
  );

  const changedWithoutEvidence = disposition(records, {
    assetDisposition: 'changed',
    sourceRecommendationVersion: 'older',
    sourceRecommendationSha256: 'older-sha',
  });
  changedWithoutEvidence.candidateDecisions[0].decision = 'changed';
  assert.throws(
    () =>
      validate(document({ dispositionValue: changedWithoutEvidence, records })),
    /unvalidated evidence cannot change recommendation/,
  );

  const wrongHash = disposition(records, {
    resultRecommendationSha256: 'wrong-sha',
  });
  assert.throws(
    () => validate(document({ dispositionValue: wrongHash, records })),
    /result version\/hash/,
  );
});

test('validates and matches a structured capture evidence block', () => {
  const candidate = 'gpt-5.6-sol-high';
  const events = [
    {
      type: 'tool_call',
      subtype: 'started',
      call_id: 'private-call',
      tool_call: {
        taskToolCall: { args: { model: candidate, prompt: 'private' } },
      },
      session_id: 'private-session',
    },
    {
      type: 'tool_call',
      subtype: 'completed',
      call_id: 'private-call',
      tool_call: {
        taskToolCall: {
          args: { model: candidate, prompt: 'private' },
          result: { success: { content: SENTINEL } },
        },
      },
      session_id: 'private-session',
    },
    {
      type: 'result',
      subtype: 'success',
      is_error: false,
      duration_ms: 1,
      result: SENTINEL,
      session_id: 'private-session',
      request_id: 'private-request',
    },
  ];
  const probe = deriveStructuredProbe({
    candidate,
    kind: 'positive-control',
    events,
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 1,
    timedOut: false,
  });
  const capture = {
    schemaVersion: 2,
    sanitizerSchemaVersion: 1,
    capturedAt: '2026-07-11T12:00:00.000Z',
    recommendation: {
      version: recommendation.version,
      sha256: recommendationSha256,
    },
    environment: {
      selectedBinary: 'cursor-agent',
      clientVersion: 'test',
      cursorApiKey: 'present',
      credentialStore: 'unset',
    },
    controls: {
      status: 'inconclusive',
      positive: probe,
      negative: { ...probe, kind: 'negative-control', candidate: 'invalid' },
    },
    candidates: [],
  };
  const markdown = block('STRUCTURED_CAPTURE', capture);
  assert.deepEqual(
    validateStructuredEvidenceDocument(
      markdown,
      capture,
      recommendation,
      validationOptions,
    ),
    {
      controls: 'inconclusive',
      candidateCount: 0,
      outcomes: {},
    },
  );
  const changed = structuredClone(capture);
  changed.environment.clientVersion = 'different';
  assert.throws(
    () =>
      validateStructuredEvidenceDocument(
        markdown,
        changed,
        recommendation,
        validationOptions,
      ),
    /does not match/,
  );

  const wrongRecommendation = structuredClone(capture);
  wrongRecommendation.recommendation.sha256 = 'wrong';
  assert.throws(
    () =>
      validateStructuredEvidenceDocument(
        block('STRUCTURED_CAPTURE', wrongRecommendation),
        wrongRecommendation,
        recommendation,
        validationOptions,
      ),
    /recommendation.*sha/i,
  );
});
