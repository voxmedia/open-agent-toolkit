import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  deriveStructuredProbe,
  parseStreamJson,
  projectPublicEvents,
  redactPrivateValue,
  validateStructuredCapture,
} from './capture-cursor-subagent-evidence.mjs';

const SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';
const sessionId = 'session-exact-private';
const requestId = 'request-exact-private';
const callId = 'tool-exact-private';

function taskEvent(subtype, model, result) {
  return {
    type: 'tool_call',
    subtype,
    call_id: callId,
    tool_call: {
      taskToolCall: {
        args: {
          model,
          prompt: 'private child prompt',
          description: 'private description',
          path: '/private/path',
        },
        ...(result === undefined ? {} : { result }),
      },
    },
    session_id: sessionId,
    account: { id: 'private-account' },
  };
}

function successEvents(model = 'gpt-5.6-sol-high') {
  return [
    {
      type: 'system',
      subtype: 'init',
      session_id: sessionId,
      cwd: '/private/path',
      apiKeySource: 'env',
      environment: { CURSOR_API_KEY: 'secret' },
    },
    {
      type: 'user',
      message: { content: [{ type: 'text', text: 'private parent prompt' }] },
      session_id: sessionId,
    },
    taskEvent('started', model),
    taskEvent('completed', model, {
      success: { content: SENTINEL, path: '/another/private/path' },
    }),
    {
      type: 'result',
      subtype: 'success',
      is_error: false,
      duration_ms: 24,
      result: SENTINEL,
      session_id: sessionId,
      request_id: requestId,
      teamId: 'private-team',
    },
  ];
}

function captureFixture(overrides = {}) {
  const positive = deriveStructuredProbe({
    candidate: 'gpt-5.6-sol-high',
    kind: 'positive-control',
    events: successEvents(),
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 24,
    timedOut: false,
  });
  const negativeEvents = [
    taskEvent('started', 'oat-deliberately-invalid-model'),
    taskEvent('completed', 'oat-deliberately-invalid-model', {
      error: {
        message: 'Invalid model. Allowed models: gpt-5.6-sol-high',
      },
    }),
    {
      type: 'result',
      subtype: 'success',
      is_error: false,
      duration_ms: 10,
      result: 'rejected',
      session_id: sessionId,
      request_id: requestId,
    },
  ];
  const negative = deriveStructuredProbe({
    candidate: 'oat-deliberately-invalid-model',
    kind: 'negative-control',
    events: negativeEvents,
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 10,
    timedOut: false,
  });
  return {
    schemaVersion: 2,
    sanitizerSchemaVersion: 1,
    capturedAt: '2026-07-11T12:00:00.000Z',
    recommendation: { version: 'test', sha256: 'abc' },
    environment: {
      selectedBinary: 'cursor-agent',
      clientVersion: '2026.07.09-test',
      cursorApiKey: 'present',
      credentialStore: 'unset',
    },
    controls: {
      status: 'passed',
      positive,
      negative,
    },
    candidates: [],
    ...overrides,
  };
}

test('parses NDJSON and rejects malformed stream lines', () => {
  assert.deepEqual(
    parseStreamJson('{"type":"system"}\n\n{"type":"result"}\n'),
    [{ type: 'system' }, { type: 'result' }],
  );
  assert.throws(
    () => parseStreamJson('{"type":"system"}\nnot-json\n'),
    /line 2/,
  );
});

test('correlates exact byte-preserved Task start/completion and terminal IDs', () => {
  const candidate = 'GPT-5.6-Sol-High:opaque/\u03b2';
  const probe = deriveStructuredProbe({
    candidate,
    kind: 'candidate',
    events: successEvents(candidate),
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 24,
    timedOut: false,
  });
  assert.equal(probe.requestedModel, candidate);
  assert.equal(probe.taskSelection, 'accepted');
  assert.equal(probe.childCompletion, 'completed');
  assert.equal(probe.runtimeIdentity, 'not-reported');
  assert.equal(probe.availabilityStatus, 'valid');
  assert.equal(probe.terminalEventObserved, true);
  assert.match(probe.correlation.sessionHash, /^sha256:/);
  assert.notEqual(probe.correlation.sessionHash, sessionId);
});

test('derives rejection, missing Task, failure, timeout, and malformed terminal states', () => {
  const rejected = deriveStructuredProbe({
    candidate: 'bad',
    kind: 'candidate',
    events: [
      taskEvent('started', 'bad'),
      taskEvent('completed', 'bad', { error: { message: 'invalid model' } }),
      { type: 'result', subtype: 'success', session_id: sessionId },
    ],
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 1,
    timedOut: false,
  });
  assert.equal(rejected.taskSelection, 'rejected');
  assert.equal(rejected.availabilityStatus, 'unknown-value');

  const missing = deriveStructuredProbe({
    candidate: 'missing',
    kind: 'candidate',
    events: [{ type: 'result', subtype: 'success', session_id: sessionId }],
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 1,
    timedOut: false,
  });
  assert.equal(missing.taskSelection, 'not-observed');
  assert.equal(missing.childCompletion, 'not-observed');

  const failed = deriveStructuredProbe({
    candidate: 'gpt-5.6-sol-high',
    kind: 'candidate',
    events: [
      taskEvent('started', 'gpt-5.6-sol-high'),
      taskEvent('completed', 'gpt-5.6-sol-high', {
        success: { content: 'wrong' },
      }),
      { type: 'result', subtype: 'success', session_id: sessionId },
    ],
    directExitStatus: 0,
    terminationSignal: null,
    durationMs: 1,
    timedOut: false,
  });
  assert.equal(failed.taskSelection, 'accepted');
  assert.equal(failed.childCompletion, 'failed');

  const timeout = deriveStructuredProbe({
    candidate: 'gpt-5.6-sol-high',
    kind: 'candidate',
    events: [taskEvent('started', 'gpt-5.6-sol-high')],
    directExitStatus: null,
    terminationSignal: 'SIGTERM',
    durationMs: 90_000,
    timedOut: true,
  });
  assert.equal(timeout.childCompletion, 'timed-out');
  assert.equal(timeout.terminalEventObserved, false);

  assert.throws(
    () =>
      deriveStructuredProbe({
        candidate: 'gpt-5.6-sol-high',
        kind: 'candidate',
        events: [...successEvents(), { type: 'result', subtype: 'success' }],
        directExitStatus: 0,
        terminationSignal: null,
        durationMs: 1,
        timedOut: false,
      }),
    /terminal result/,
  );
});

test('public projection is allowlisted and strips prose, paths, metadata, environment, credentials, and direct IDs', () => {
  const projection = projectPublicEvents(successEvents());
  const serialized = JSON.stringify(projection);
  for (const forbidden of [
    'private parent prompt',
    'private child prompt',
    'private description',
    '/private/path',
    '/another/private/path',
    'private-account',
    'private-team',
    'secret',
    sessionId,
    requestId,
    callId,
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(projection[2].toolName, 'Task');
  assert.equal(projection[2].requestedModel, 'gpt-5.6-sol-high');
  assert.deepEqual(Object.keys(projection[2]).sort(), [
    'correlationHash',
    'eventType',
    'requestedModel',
    'sessionHash',
    'subtype',
    'toolName',
  ]);
});

test('recursively redacts credentials from private raw events without removing exact IDs', () => {
  const value = redactPrivateValue({
    session_id: sessionId,
    request_id: requestId,
    Authorization: 'Bearer top-secret',
    nested: {
      CURSOR_API_KEY: 'top-secret',
      password: 'top-secret',
      safe: 'Bearer top-secret',
    },
  });
  assert.equal(value.session_id, sessionId);
  assert.equal(value.request_id, requestId);
  assert.equal(value.Authorization, '<redacted>');
  assert.equal(value.nested.CURSOR_API_KEY, '<redacted>');
  assert.equal(value.nested.password, '<redacted>');
  assert.equal(value.nested.safe, 'Bearer <redacted>');
});

test('validates positive and negative controls and rejects direct public identifiers', () => {
  assert.deepEqual(validateStructuredCapture(captureFixture()), {
    controls: 'passed',
    candidateCount: 0,
    outcomes: {},
  });
  const leaked = captureFixture();
  leaked.controls.positive.events[0].sessionId = sessionId;
  assert.throws(
    () => validateStructuredCapture(leaked),
    /allowlist|identifier/i,
  );
  const inconclusive = captureFixture({
    controls: {
      ...captureFixture().controls,
      status: 'passed',
      positive: {
        ...captureFixture().controls.positive,
        childCompletion: 'failed',
      },
    },
  });
  assert.throws(
    () => validateStructuredCapture(inconclusive),
    /positive control/,
  );
});
