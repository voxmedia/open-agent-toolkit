#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';
const DEFAULT_TIMEOUT_MS = 90_000;
const NEGATIVE_CONTROL = 'oat-deliberately-invalid-task-model';
const TIERS = ['economy', 'balanced', 'high', 'frontier'];
const CREDENTIAL_KEY =
  /(?:authorization|cookie|credential|api[_-]?key|token|secret|password)/i;
const AUTHORIZATION_HEADER =
  /\b((?:proxy-)?authorization)\b["']?\s*[:=]\s*["']?([^\r\n,;'"`]+)/gi;
const COOKIE_HEADER =
  /\b((?:set-)?cookie)\b["']?\s*[:=]\s*["']?[^\r\n,'"]+/gi;
const LOCAL_PATH =
  /(?:^|[\s"'`=(])(?:\/(?:Users|home|private|tmp|var|etc|opt|Volumes)(?:\/|$)|[A-Za-z]:[\\/]|\\\\[^\\/\s]+[\\/])/;
const CREDENTIAL_ASSIGNMENT = new RegExp(
  String.raw`\b((?:[a-z0-9_.-]*(?:credential|api[_-]?key|token|secret|password)[a-z0-9_.-]*)|api key)\b["']?\s*[:=]\s*["']?[^\s,;}'"\x60]+`,
  'gi',
);

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hashIdentifier(value) {
  return typeof value === 'string' && value.length > 0
    ? `sha256:${createHash('sha256').update(value).digest('hex')}`
    : null;
}

function redactString(value) {
  return value
    .replace(AUTHORIZATION_HEADER, (_, header, rawValue) => {
      const [scheme, credential, ...rest] = rawValue.trim().split(/\s+/);
      return credential && rest.length === 0
        ? `${header}: ${scheme} <redacted>`
        : `${header}: <redacted>`;
    })
    .replace(COOKIE_HEADER, '$1: <redacted>')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer <redacted>')
    .replace(CREDENTIAL_ASSIGNMENT, '$1=<redacted>');
}

export function redactPrivateValue(value, key = '') {
  if (CREDENTIAL_KEY.test(key)) {
    return '<redacted>';
  }
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactPrivateValue(entry));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => [
        entryKey,
        redactPrivateValue(entry, entryKey),
      ]),
    );
  }
  return value;
}

export function parseStreamJson(stdout) {
  const events = [];
  const lines = stdout.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.length === 0) {
      continue;
    }
    try {
      const event = JSON.parse(line);
      if (!isObject(event)) {
        fail('event must be an object');
      }
      events.push(event);
    } catch (error) {
      fail(`invalid stream-JSON line ${index + 1}: ${error.message}`);
    }
  }
  return events;
}

function findTaskCall(event) {
  if (event?.type !== 'tool_call' || !isObject(event.tool_call)) {
    return null;
  }
  for (const [key, value] of Object.entries(event.tool_call)) {
    const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
    if (normalized === 'tasktoolcall' && isObject(value)) {
      const args = isObject(value.args)
        ? value.args
        : isObject(value.input)
          ? value.input
          : {};
      return {
        toolName: 'Task',
        args,
        result: value.result,
      };
    }
  }
  return null;
}

function containsSentinel(value) {
  if (typeof value === 'string') {
    return value.split(/\r?\n/).some((line) => line.trim() === SENTINEL);
  }
  if (Array.isArray(value)) {
    return value.some(containsSentinel);
  }
  if (isObject(value)) {
    return Object.values(value).some(containsSentinel);
  }
  return false;
}

function resultKind(result) {
  if (!isObject(result)) {
    return 'missing';
  }
  if ('error' in result || 'failure' in result || 'rejected' in result) {
    return 'error';
  }
  if ('success' in result) {
    return 'success';
  }
  return 'unknown';
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== undefined && entry !== null,
    ),
  );
}

export function projectPublicEvents(events) {
  return events.map((event) => {
    const task = findTaskCall(event);
    const taskResult = task ? resultKind(task.result) : undefined;
    return compact({
      eventType: typeof event.type === 'string' ? event.type : 'unknown',
      subtype: typeof event.subtype === 'string' ? event.subtype : undefined,
      toolName: task?.toolName,
      correlationHash: hashIdentifier(event.call_id),
      sessionHash: hashIdentifier(event.session_id),
      requestHash: hashIdentifier(event.request_id),
      requestedModel:
        typeof task?.args?.model === 'string' ? task.args.model : undefined,
      taskResult: taskResult === 'missing' ? undefined : taskResult,
      sentinelObserved:
        taskResult === 'success'
          ? containsSentinel(task.result.success)
          : undefined,
      terminalError:
        event.type === 'result' && typeof event.is_error === 'boolean'
          ? event.is_error
          : undefined,
    });
  });
}

function requireTerminalIntegrity(events) {
  const terminal = events.filter((event) => event.type === 'result');
  if (terminal.length > 1) {
    fail(
      `expected at most one terminal result event; found ${terminal.length}`,
    );
  }
  if (
    terminal.length === 1 &&
    (typeof terminal[0].subtype !== 'string' ||
      terminal[0].subtype.trim().length === 0 ||
      typeof terminal[0].session_id !== 'string' ||
      terminal[0].session_id.trim().length === 0 ||
      ('is_error' in terminal[0] &&
        typeof terminal[0].is_error !== 'boolean'))
  ) {
    fail('terminal result event is malformed');
  }
  return terminal[0] ?? null;
}

export function deriveStructuredProbe({
  candidate,
  kind,
  events,
  directExitStatus,
  terminationSignal,
  durationMs,
  timedOut,
  streamError = null,
}) {
  if (!Array.isArray(events)) {
    fail('events must be an array');
  }
  const terminal = requireTerminalIntegrity(events);
  const taskStarts = events
    .map((event) => ({ event, task: findTaskCall(event) }))
    .filter(({ event, task }) => event.subtype === 'started' && task);
  if (taskStarts.length > 1) {
    fail(`expected at most one Task start; found ${taskStarts.length}`);
  }

  const start = taskStarts[0] ?? null;
  if (
    start &&
    (typeof start.event.call_id !== 'string' ||
      start.event.call_id.trim().length === 0)
  ) {
    fail('Task start requires a non-empty call ID');
  }
  if (
    start &&
    (typeof start.event.session_id !== 'string' ||
      start.event.session_id.trim().length === 0)
  ) {
    fail('Task start requires a non-empty session ID');
  }
  const requestedModel = start?.task?.args?.model;
  if (start && typeof requestedModel !== 'string') {
    fail('Task start does not contain an exact string model argument');
  }
  if (
    start &&
    kind !== 'positive-control' &&
    typeof candidate === 'string' &&
    requestedModel !== candidate
  ) {
    fail(
      'Task start model argument does not byte-match the requested candidate',
    );
  }

  const taskCompletions = events
    .map((event) => ({ event, task: findTaskCall(event) }))
    .filter(({ event, task }) => event.subtype === 'completed' && task);
  if (taskCompletions.length > 0 && !start) {
    fail('Task completion has no correlated Task start');
  }
  for (const { event } of taskCompletions) {
    if (
      typeof event.call_id !== 'string' ||
      event.call_id.trim().length === 0
    ) {
      fail('Task completion requires a non-empty call ID');
    }
    if (
      typeof event.session_id !== 'string' ||
      event.session_id.trim().length === 0
    ) {
      fail('Task completion requires a non-empty session ID');
    }
    if (
      event.call_id !== start.event.call_id ||
      event.session_id !== start.event.session_id
    ) {
      fail('Task completion does not exactly correlate with Task start');
    }
  }
  const completions = taskCompletions;
  if (completions.length > 1) {
    fail(
      `expected at most one correlated Task completion; found ${completions.length}`,
    );
  }
  const completion = completions[0] ?? null;
  if (start && terminal && terminal.session_id !== start.event.session_id) {
    fail('terminal session ID does not exactly correlate with Task start');
  }
  if (
    completion &&
    typeof completion.task.args.model === 'string' &&
    completion.task.args.model !== requestedModel
  ) {
    fail('correlated Task completion model does not byte-match Task start');
  }

  let taskSelection = 'not-observed';
  let childCompletion = timedOut && start ? 'timed-out' : 'not-observed';
  let outcomeBasis = streamError
    ? 'malformed-stream'
    : terminal
      ? 'no-definitive-task-evidence'
      : 'missing-terminal-event';

  if (completion) {
    const kindOfResult = resultKind(completion.task.result);
    if (kindOfResult === 'error') {
      taskSelection = 'rejected';
      childCompletion = 'not-observed';
      outcomeBasis = 'structured-task-rejection';
    } else if (kindOfResult === 'success') {
      taskSelection = 'accepted';
      if (containsSentinel(completion.task.result.success)) {
        const compatibleTerminal =
          terminal?.subtype === 'success' &&
          terminal.is_error !== true &&
          directExitStatus === 0 &&
          terminationSignal === null &&
          !timedOut;
        childCompletion = compatibleTerminal ? 'completed' : 'failed';
        outcomeBasis = compatibleTerminal
          ? 'correlated-task-sentinel'
          : 'correlated-task-terminal-failure';
      } else {
        childCompletion = 'failed';
        outcomeBasis = 'correlated-task-without-sentinel';
      }
    }
  }

  const availabilityStatus =
    taskSelection === 'accepted' && childCompletion === 'completed'
      ? 'valid'
      : taskSelection === 'rejected'
        ? 'unknown-value'
        : 'unvalidated';
  const effectiveCandidate =
    kind === 'positive-control' && typeof requestedModel === 'string'
      ? requestedModel
      : candidate;

  return {
    kind,
    candidate: effectiveCandidate ?? null,
    requestedModel: requestedModel ?? null,
    availabilityStatus,
    taskSelection,
    childCompletion,
    runtimeIdentity: 'not-reported',
    outcomeBasis,
    terminalEventObserved: terminal !== null,
    terminalSubtype: terminal?.subtype ?? null,
    directExitStatus,
    terminationSignal,
    durationMs,
    streamStatus: streamError ? 'malformed' : 'valid',
    sanitizerSchemaVersion: 1,
    correlation: {
      sessionHash: hashIdentifier(
        terminal?.session_id ?? start?.event.session_id,
      ),
      requestHash: hashIdentifier(terminal?.request_id),
      toolCallHash: hashIdentifier(start?.event.call_id),
    },
    events: projectPublicEvents(events),
  };
}

const PROBE_KEYS = new Set([
  'kind',
  'candidate',
  'requestedModel',
  'availabilityStatus',
  'taskSelection',
  'childCompletion',
  'runtimeIdentity',
  'outcomeBasis',
  'terminalEventObserved',
  'terminalSubtype',
  'directExitStatus',
  'terminationSignal',
  'durationMs',
  'streamStatus',
  'sanitizerSchemaVersion',
  'correlation',
  'events',
  'tier',
]);
const EVENT_KEYS = new Set([
  'eventType',
  'subtype',
  'toolName',
  'correlationHash',
  'sessionHash',
  'requestHash',
  'requestedModel',
  'taskResult',
  'sentinelObserved',
  'terminalError',
]);
const EVENT_TYPES = new Set([
  'system',
  'user',
  'assistant',
  'tool_call',
  'result',
]);
const EVENT_SUBTYPES = new Set([
  'init',
  'started',
  'completed',
  'success',
  'error',
]);
const TOOL_NAMES = new Set(['Task']);
const TASK_RESULTS = new Set(['error', 'success', 'unknown']);
const OPAQUE_MODEL = /^[\p{L}\p{N}][\p{L}\p{N}._:+/@-]{0,127}$/u;

const CAPTURE_KEYS = new Set([
  'schemaVersion',
  'sanitizerSchemaVersion',
  'capturedAt',
  'recommendation',
  'environment',
  'controls',
  'candidates',
  'exploratoryCandidates',
]);
const RECOMMENDATION_KEYS = new Set(['version', 'sha256']);
const ENVIRONMENT_KEYS = new Set([
  'selectedBinary',
  'clientVersion',
  'cursorApiKey',
  'credentialStore',
]);
const CONTROLS_KEYS = new Set(['status', 'positive', 'negative']);
const CORRELATION_KEYS = new Set([
  'sessionHash',
  'requestHash',
  'toolCallHash',
]);

function requireExactKeys(value, allowed, required, label) {
  if (!isObject(value)) {
    fail(`${label} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail(`${label} violates the public allowlist: ${key}`);
    }
  }
  for (const key of required) {
    if (!(key in value)) {
      fail(`${label} is missing required field: ${key}`);
    }
  }
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validatePublicString(value, label) {
  if (typeof value !== 'string') {
    fail(`${label} must be a string`);
  }
  if (redactString(value) !== value) {
    fail(`${label} contains unsafe credential material`);
  }
  if (LOCAL_PATH.test(value)) {
    fail(`${label} contains an unsafe local path`);
  }
}

function validateStructuralValue(value, allowed, label) {
  validatePublicString(value, label);
  if (!allowed.has(value)) {
    fail(`${label} has an unsafe structural value`);
  }
}

function validateOpaqueModel(value, label) {
  validatePublicString(value, label);
  if (!OPAQUE_MODEL.test(value)) {
    fail(`${label} model value is unsafe`);
  }
}

function validatePublicValueSafety(value, label) {
  if (typeof value === 'string') {
    validatePublicString(value, label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validatePublicValueSafety(entry, `${label}[${index}]`),
    );
    return;
  }
  if (isObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      validatePublicValueSafety(entry, `${label}.${key}`);
    }
  }
}

function deriveProbeProjection(probe, label) {
  const starts = probe.events.filter(
    (event) =>
      event.eventType === 'tool_call' &&
      event.subtype === 'started' &&
      event.toolName === 'Task',
  );
  if (starts.length > 1) {
    fail(`${label} projection contains multiple Task starts`);
  }
  const start = starts[0] ?? null;
  if (start && (!start.correlationHash || !start.sessionHash)) {
    fail(`${label} Task start is missing exact correlation identifiers`);
  }
  const completions = probe.events.filter(
    (event) =>
      event.eventType === 'tool_call' &&
      event.subtype === 'completed' &&
      event.toolName === 'Task',
  );
  if (completions.length > 0 && !start) {
    fail(`${label} Task completion has no correlated Task start`);
  }
  for (const completion of completions) {
    if (!completion.correlationHash || !completion.sessionHash) {
      fail(`${label} Task completion is missing exact correlation identifiers`);
    }
    if (
      completion.correlationHash !== start.correlationHash ||
      completion.sessionHash !== start.sessionHash
    ) {
      fail(`${label} Task completion does not exactly correlate with Task start`);
    }
  }
  if (completions.length > 1) {
    fail(`${label} projection contains multiple correlated Task completions`);
  }
  const completion = completions[0] ?? null;
  const terminals = probe.events.filter(
    (event) => event.eventType === 'result',
  );
  if (terminals.length > 1) {
    fail(`${label} projection contains multiple terminal events`);
  }
  const terminal = terminals[0] ?? null;
  if (start && terminal?.sessionHash !== start.sessionHash) {
    fail(`${label} terminal session does not exactly correlate with Task start`);
  }

  let taskSelection = 'not-observed';
  let childCompletion =
    start && probe.directExitStatus === null && probe.terminationSignal
      ? 'timed-out'
      : 'not-observed';
  let outcomeBasis =
    probe.streamStatus === 'malformed'
      ? 'malformed-stream'
      : terminal
        ? 'no-definitive-task-evidence'
        : 'missing-terminal-event';
  if (completion?.taskResult === 'error') {
    taskSelection = 'rejected';
    childCompletion = 'not-observed';
    outcomeBasis = 'structured-task-rejection';
  } else if (completion?.taskResult === 'success') {
    taskSelection = 'accepted';
    if (completion.sentinelObserved === true) {
      const compatibleTerminal =
        terminal?.subtype === 'success' &&
        terminal.terminalError !== true &&
        probe.directExitStatus === 0 &&
        probe.terminationSignal === null;
      childCompletion = compatibleTerminal ? 'completed' : 'failed';
      outcomeBasis = compatibleTerminal
        ? 'correlated-task-sentinel'
        : 'correlated-task-terminal-failure';
    } else {
      childCompletion = 'failed';
      outcomeBasis = 'correlated-task-without-sentinel';
    }
  }
  const availabilityStatus =
    taskSelection === 'accepted' && childCompletion === 'completed'
      ? 'valid'
      : taskSelection === 'rejected'
        ? 'unknown-value'
        : 'unvalidated';

  return {
    requestedModel: start?.requestedModel ?? null,
    availabilityStatus,
    taskSelection,
    childCompletion,
    runtimeIdentity: 'not-reported',
    outcomeBasis,
    terminalEventObserved: terminal !== null,
    terminalSubtype: terminal?.subtype ?? null,
    correlation: {
      sessionHash: terminal?.sessionHash ?? start?.sessionHash ?? null,
      requestHash: terminal?.requestHash ?? null,
      toolCallHash: start?.correlationHash ?? null,
    },
  };
}

function validateProbeAllowlist(probe, label) {
  requireExactKeys(
    probe,
    PROBE_KEYS,
    [...PROBE_KEYS].filter((key) => key !== 'tier'),
    label,
  );
  if (!Array.isArray(probe.events)) {
    fail(`${label}.events must be an array`);
  }
  for (const [index, event] of probe.events.entries()) {
    if (!isObject(event)) {
      fail(`${label}.events[${index}] must be an object`);
    }
    for (const key of Object.keys(event)) {
      if (!EVENT_KEYS.has(key)) {
        fail(
          `${label}.events[${index}] violates the public projection allowlist: ${key}`,
        );
      }
    }
    for (const [key, value] of Object.entries(event)) {
      if (typeof value === 'string') {
        validatePublicString(value, `${label}.events[${index}].${key}`);
      }
      if (key.endsWith('Hash') && !/^sha256:[a-f0-9]{64}$/.test(value)) {
        fail(`${label}.events[${index}].${key} must be a non-reversible hash`);
      }
    }
    if ('eventType' in event) {
      validateStructuralValue(
        event.eventType,
        EVENT_TYPES,
        `${label}.events[${index}].eventType`,
      );
    }
    if ('subtype' in event) {
      validateStructuralValue(
        event.subtype,
        EVENT_SUBTYPES,
        `${label}.events[${index}].subtype`,
      );
    }
    if ('toolName' in event) {
      validateStructuralValue(
        event.toolName,
        TOOL_NAMES,
        `${label}.events[${index}].toolName`,
      );
    }
    if ('taskResult' in event) {
      validateStructuralValue(
        event.taskResult,
        TASK_RESULTS,
        `${label}.events[${index}].taskResult`,
      );
    }
    if ('requestedModel' in event) {
      validateOpaqueModel(
        event.requestedModel,
        `${label}.events[${index}].requestedModel`,
      );
    }
    if (
      'terminalError' in event &&
      typeof event.terminalError !== 'boolean'
    ) {
      fail(`${label}.events[${index}].terminalError must be a boolean`);
    }
  }
  if (probe.candidate !== null) {
    validateOpaqueModel(probe.candidate, `${label}.candidate`);
  }
  if (probe.requestedModel !== null) {
    validateOpaqueModel(probe.requestedModel, `${label}.requestedModel`);
  }
  if (probe.terminalSubtype !== null) {
    validateStructuralValue(
      probe.terminalSubtype,
      EVENT_SUBTYPES,
      `${label}.terminalSubtype`,
    );
  }
  requireExactKeys(
    probe.correlation,
    CORRELATION_KEYS,
    CORRELATION_KEYS,
    `${label}.correlation`,
  );
  for (const [key, value] of Object.entries(probe.correlation)) {
    if (value !== null && !/^sha256:[a-f0-9]{64}$/.test(value)) {
      fail(`${label}.correlation.${key} must be a non-reversible hash`);
    }
  }
  const derived = deriveProbeProjection(probe, label);
  for (const [key, value] of Object.entries(derived)) {
    if (!sameValue(probe[key], value)) {
      fail(
        `${label}.${key} does not match the value derived from the public projection`,
      );
    }
  }
}

function validateControlIdentity(probe, label, expectedModel) {
  if (typeof probe.candidate !== 'string' || probe.candidate.length === 0) {
    fail(`${label} candidate model must be a non-empty opaque string`);
  }
  if (probe.candidate !== expectedModel) {
    fail(`${label} candidate model does not byte-match the expected control`);
  }

  const start = probe.events.find(
    (event) =>
      event.eventType === 'tool_call' &&
      event.subtype === 'started' &&
      event.toolName === 'Task',
  );
  if (start?.requestedModel !== expectedModel) {
    fail(`${label} Task start model does not byte-match the expected control`);
  }

  const completion = probe.events.find(
    (event) =>
      event.eventType === 'tool_call' &&
      event.subtype === 'completed' &&
      event.toolName === 'Task',
  );
  if (
    completion &&
    'requestedModel' in completion &&
    completion.requestedModel !== expectedModel
  ) {
    fail(`${label} Task completion model does not byte-match its Task start`);
  }
}

function controlsPassed(controls) {
  return (
    controls.positive?.taskSelection === 'accepted' &&
    controls.positive?.childCompletion === 'completed' &&
    controls.positive?.availabilityStatus === 'valid' &&
    controls.negative?.taskSelection === 'rejected' &&
    controls.negative?.availabilityStatus === 'unknown-value'
  );
}

export function validateStructuredCapture(
  capture,
  { recommendation, recommendationSha256 } = {},
) {
  if (!isObject(capture) || capture.schemaVersion !== 2) {
    fail('structured capture schemaVersion must equal 2');
  }
  validatePublicValueSafety(capture, 'structured capture');
  requireExactKeys(
    capture,
    CAPTURE_KEYS,
    [...CAPTURE_KEYS].filter((key) => key !== 'exploratoryCandidates'),
    'structured capture',
  );
  if (capture.sanitizerSchemaVersion !== 1) {
    fail('structured capture sanitizerSchemaVersion must equal 1');
  }
  if (!Number.isFinite(Date.parse(capture.capturedAt))) {
    fail('structured capture capturedAt must be an ISO timestamp');
  }
  requireExactKeys(
    capture.recommendation,
    RECOMMENDATION_KEYS,
    RECOMMENDATION_KEYS,
    'structured capture recommendation',
  );
  if (
    !recommendation ||
    capture.recommendation.version !== recommendation.version
  ) {
    fail(
      'structured capture recommendation version does not match recommendation',
    );
  }
  if (
    !/^[a-f0-9]{64}$/.test(capture.recommendation.sha256) ||
    capture.recommendation.sha256 !== recommendationSha256
  ) {
    fail(
      'structured capture recommendation SHA-256 does not match recommendation',
    );
  }
  requireExactKeys(
    capture.environment,
    ENVIRONMENT_KEYS,
    ENVIRONMENT_KEYS,
    'structured capture environment',
  );
  if (capture.environment.selectedBinary !== 'cursor-agent') {
    fail('structured capture environment selectedBinary must be cursor-agent');
  }
  if (
    typeof capture.environment.clientVersion !== 'string' ||
    !/^[A-Za-z0-9._+-]+$/.test(capture.environment.clientVersion)
  ) {
    fail('structured capture environment clientVersion is unsafe');
  }
  if (!['present', 'absent'].includes(capture.environment.cursorApiKey)) {
    fail('structured capture environment cursorApiKey is unsafe');
  }
  if (
    !['present', 'absent', 'unset'].includes(
      capture.environment.credentialStore,
    )
  ) {
    fail('structured capture environment credentialStore is unsafe');
  }
  if (!isObject(capture.controls) || !Array.isArray(capture.candidates)) {
    fail('structured capture requires controls and candidates');
  }
  requireExactKeys(
    capture.controls,
    CONTROLS_KEYS,
    CONTROLS_KEYS,
    'structured capture controls',
  );
  validateProbeAllowlist(capture.controls.positive, 'positive control');
  validateProbeAllowlist(capture.controls.negative, 'negative control');
  capture.candidates.forEach((probe, index) =>
    validateProbeAllowlist(probe, `candidates[${index}]`),
  );
  if (capture.controls.status === 'passed') {
    validateControlIdentity(
      capture.controls.positive,
      'positive control',
      capture.controls.positive.candidate,
    );
    validateControlIdentity(
      capture.controls.negative,
      'negative control',
      NEGATIVE_CONTROL,
    );
  }

  const passed = controlsPassed(capture.controls);
  if (capture.controls.status === 'passed' && !passed) {
    fail('positive control or negative control does not support passed status');
  }
  if (capture.controls.status === 'inconclusive' && passed) {
    fail(
      'inconclusive controls status disagrees with derived control outcomes',
    );
  }
  if (!['passed', 'inconclusive'].includes(capture.controls.status)) {
    fail('controls status must be passed or inconclusive');
  }
  if (!passed && capture.candidates.length > 0) {
    fail('candidate probes must not execute after inconclusive controls');
  }

  const exploratoryCandidates = capture.exploratoryCandidates ?? [];
  if (
    !Array.isArray(exploratoryCandidates) ||
    new Set(exploratoryCandidates).size !== exploratoryCandidates.length ||
    exploratoryCandidates.some(
      (candidate) => {
        if (typeof candidate !== 'string') {
          return true;
        }
        validateOpaqueModel(candidate, 'exploratory candidate');
        return false;
      },
    )
  ) {
    fail('structured capture exploratoryCandidates must be unique strings');
  }
  if (passed) {
    const recommended = deriveCandidates(recommendation);
    const recommendedNames = new Set(
      recommended.map(({ candidate }) => candidate),
    );
    if (
      exploratoryCandidates.some((candidate) => recommendedNames.has(candidate))
    ) {
      fail(
        'structured capture exploratoryCandidates must not repeat recommendation candidates',
      );
    }
    const expected = [
      ...recommended,
      ...exploratoryCandidates.map((candidate) => ({
        candidate,
        tier: 'exploratory',
      })),
    ];
    const actual = capture.candidates.map(({ candidate, tier }) => ({
      candidate,
      tier,
    }));
    if (!sameValue(actual, expected)) {
      fail(
        'structured capture candidate inventory does not match recommendation plus explicit exploratory entries',
      );
    }
  }

  const outcomes = {};
  for (const probe of capture.candidates) {
    if (probe.kind !== 'candidate') {
      fail(
        'structured capture candidate inventory contains a non-candidate probe',
      );
    }
    if (probe.requestedModel !== probe.candidate) {
      fail(
        'structured capture candidate does not match its projected requested model',
      );
    }
    outcomes[probe.availabilityStatus] =
      (outcomes[probe.availabilityStatus] ?? 0) + 1;
  }
  return {
    controls: capture.controls.status,
    candidateCount: capture.candidates.length,
    outcomes,
  };
}

function deriveCandidates(recommendation) {
  const seen = new Set();
  const candidates = [];
  for (const tier of TIERS) {
    for (const candidate of recommendation?.providers?.cursor?.[tier]
      ?.candidates ?? []) {
      if (
        typeof candidate === 'string' &&
        candidate.startsWith('gpt-5.6-') &&
        !seen.has(candidate)
      ) {
        seen.add(candidate);
        candidates.push({ candidate, tier });
      }
    }
  }
  return candidates;
}

function positiveControlPrompt() {
  return [
    'Validate this Cursor Task harness. Do not use any tool except Task.',
    'Call Task exactly once. For its model argument, select one exact value directly exposed by the Task tool model parameter in this session; do not guess, rewrite, or normalize it.',
    `Ask the child to reply exactly: ${SENTINEL}`,
    'After the child returns, print only its exact reply.',
  ].join('\n');
}

function candidatePrompt(candidate) {
  return [
    'Validate this exact Cursor Task model argument. Do not use any tool except Task.',
    `Call Task exactly once with model ${JSON.stringify(candidate)}. Preserve that model argument byte-for-byte.`,
    `Ask the child to reply exactly: ${SENTINEL}`,
    'After the child returns, print only its exact reply.',
  ].join('\n');
}

async function runCursor(prompt, timeoutMs) {
  const started = process.hrtime.bigint();
  const child = spawn(
    'cursor-agent',
    ['-p', '--force', '--output-format=stream-json', prompt],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  let timedOut = false;
  let forceKillTimer;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 5_000);
  }, timeoutMs);
  const result = await new Promise((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise);
    child.once('close', (code, signal) =>
      resolvePromise({ directExitStatus: code, terminationSignal: signal }),
    );
  });
  clearTimeout(timer);
  clearTimeout(forceKillTimer);
  const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  let events = [];
  let streamError = null;
  try {
    events = parseStreamJson(stdout);
  } catch (error) {
    streamError = error.message;
  }
  return {
    ...result,
    durationMs: Math.round(durationMs),
    timedOut,
    stdout,
    stderr,
    events,
    streamError,
  };
}

function exactIdentifiers(events) {
  return {
    sessionIds: [
      ...new Set(events.map((event) => event.session_id).filter(Boolean)),
    ],
    requestIds: [
      ...new Set(events.map((event) => event.request_id).filter(Boolean)),
    ],
    toolCallIds: [
      ...new Set(events.map((event) => event.call_id).filter(Boolean)),
    ],
  };
}

async function runProbe({ candidate, kind, prompt, timeoutMs }) {
  const raw = await runCursor(prompt, timeoutMs);
  let publicProbe;
  try {
    publicProbe = deriveStructuredProbe({ candidate, kind, ...raw });
  } catch (error) {
    publicProbe = deriveStructuredProbe({
      candidate,
      kind,
      events: [],
      directExitStatus: raw.directExitStatus,
      terminationSignal: raw.terminationSignal,
      durationMs: raw.durationMs,
      timedOut: raw.timedOut,
      streamError: error.message,
    });
  }
  return {
    publicProbe,
    privateProbe: redactPrivateValue({
      kind,
      candidate,
      stdout: raw.stdout,
      stderr: raw.stderr,
      rawEvents: raw.events,
      streamError: raw.streamError,
      exactIdentifiers: exactIdentifiers(raw.events),
      directExitStatus: raw.directExitStatus,
      terminationSignal: raw.terminationSignal,
      durationMs: raw.durationMs,
    }),
  };
}

function parseArgs(argv) {
  const options = { timeoutMs: DEFAULT_TIMEOUT_MS, controlsOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--controls-only') {
      options.controlsOnly = true;
      continue;
    }
    if (
      [
        '--recommendation',
        '--exploratory-candidate',
        '--output',
        '--private-output',
        '--timeout-ms',
      ].includes(arg)
    ) {
      const value = argv[index + 1];
      if (!value) {
        fail(`${arg} requires a value`);
      }
      const key = arg
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = arg === '--timeout-ms' ? Number(value) : value;
      index += 1;
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }
  for (const key of ['recommendation', 'output', 'privateOutput']) {
    if (!options[key]) {
      fail(
        `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required`,
      );
    }
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    fail('--timeout-ms must be a positive integer');
  }
  const localRoot = `${resolve('.oat/projects/local')}${sep}`;
  if (!resolve(options.privateOutput).startsWith(localRoot)) {
    fail('--private-output must be under .oat/projects/local/');
  }
  return options;
}

async function clientVersion() {
  try {
    const { stdout } = await execFileAsync('cursor-agent', ['--version']);
    return stdout.trim() || 'not-reported';
  } catch {
    return 'unavailable';
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const recommendationText = await readFile(options.recommendation, 'utf8');
  const recommendation = JSON.parse(recommendationText);
  const recommendationSha256 = createHash('sha256')
    .update(recommendationText)
    .digest('hex');
  const privateRuns = [];

  const positive = await runProbe({
    candidate: null,
    kind: 'positive-control',
    prompt: positiveControlPrompt(),
    timeoutMs: options.timeoutMs,
  });
  privateRuns.push(positive.privateProbe);
  const negative = await runProbe({
    candidate: NEGATIVE_CONTROL,
    kind: 'negative-control',
    prompt: candidatePrompt(NEGATIVE_CONTROL),
    timeoutMs: options.timeoutMs,
  });
  privateRuns.push(negative.privateProbe);
  const controls = {
    status:
      positive.publicProbe.availabilityStatus === 'valid' &&
      negative.publicProbe.availabilityStatus === 'unknown-value'
        ? 'passed'
        : 'inconclusive',
    positive: positive.publicProbe,
    negative: negative.publicProbe,
  };

  const candidates = [];
  const exploratoryCandidates = [];
  if (controls.status === 'passed' && !options.controlsOnly) {
    const inventory = deriveCandidates(recommendation);
    if (
      options.exploratoryCandidate &&
      !inventory.some(
        ({ candidate }) => candidate === options.exploratoryCandidate,
      )
    ) {
      inventory.push({
        candidate: options.exploratoryCandidate,
        tier: 'exploratory',
      });
      exploratoryCandidates.push(options.exploratoryCandidate);
    }
    for (const entry of inventory) {
      const result = await runProbe({
        candidate: entry.candidate,
        kind: 'candidate',
        prompt: candidatePrompt(entry.candidate),
        timeoutMs: options.timeoutMs,
      });
      result.publicProbe.tier = entry.tier;
      result.privateProbe.tier = entry.tier;
      candidates.push(result.publicProbe);
      privateRuns.push(result.privateProbe);
    }
  }

  const capture = {
    schemaVersion: 2,
    sanitizerSchemaVersion: 1,
    capturedAt: new Date().toISOString(),
    recommendation: {
      version: recommendation.version,
      sha256: recommendationSha256,
    },
    environment: {
      selectedBinary: 'cursor-agent',
      clientVersion: await clientVersion(),
      cursorApiKey: process.env.CURSOR_API_KEY ? 'present' : 'absent',
      credentialStore:
        process.env.AGENT_CLI_CREDENTIAL_STORE === undefined
          ? 'unset'
          : process.env.AGENT_CLI_CREDENTIAL_STORE
            ? 'present'
            : 'absent',
    },
    controls,
    exploratoryCandidates,
    candidates,
  };
  validateStructuredCapture(capture, {
    recommendation,
    recommendationSha256,
  });

  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(capture, null, 2)}\n`);
  await mkdir(dirname(options.privateOutput), { recursive: true });
  await writeFile(
    options.privateOutput,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        capturedAt: capture.capturedAt,
        runs: privateRuns,
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      status: 'ok',
      controls: controls.status,
      candidateCount: candidates.length,
      output: options.output,
      privateOutput: options.privateOutput,
    })}\n`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(
      `Cursor structured capture failed: ${error.message}\n`,
    );
    process.exitCode = 1;
  });
}
