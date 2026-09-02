import { describe, expect, it } from 'vitest';

import {
  assertNoSensitiveDispatchContent,
  isSensitiveDispatchKey,
  normalizeDispatchKey,
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from './generic-dispatch-record';

export function genericRecord(
  overrides: Partial<GenericDispatchRecord> = {},
): GenericDispatchRecord {
  return {
    request_id: 'dispatch-native-1',
    caller: 'oat-project-implement',
    scope: 'p06',
    objective: 'Implement dispatch provenance',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'codex',
    dispatch_context: 'root-native',
    dispatch_policy: 'high',
    dispatch_ceiling: 'high',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'tool-schema',
      observed_at: '2026-09-02T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-gpt-5-6-sol-high',
    model_selector: 'gpt-5.6-sol',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: null,
    service_tier_selector: 'priority',
    selection_source: 'policy-resolved',
    candidates_considered: ['oat-phase-implementer-gpt-5-6-sol-high'],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: { task: 'p06' },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

describe('parseGenericDispatchRecord', () => {
  it('preserves the neutral snake-case schema without OAT fields', () => {
    const record = genericRecord();
    expect(parseGenericDispatchRecord(record)).toEqual(record);
    expect(parseGenericDispatchRecord(record)).not.toHaveProperty('oat');
  });

  it('rejects unknown fields and sensitive content recursively', () => {
    expect(() =>
      parseGenericDispatchRecord({ ...genericRecord(), oat: {} }),
    ).toThrow(/unrecognized key/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { nested: { prompt: 'secret instructions' } },
      }),
    ).toThrow(/sensitive dispatch content/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        diagnostics: ['Authorization: Bearer secret-token'],
      }),
    ).toThrow(/sensitive dispatch content/i);
  });

  it('normalizes key spelling, case, and separators before classification', () => {
    expect(normalizeDispatchKey('API-Key')).toBe('apikey');
    expect(normalizeDispatchKey('system_prompt')).toBe('systemprompt');
    expect(normalizeDispatchKey('transcriptBody')).toBe('transcriptbody');
  });

  const sensitiveKeys = [
    'apiKey',
    'api_key',
    'API-KEY',
    'ApiKey',
    'password',
    'Passwd',
    'pass_phrase',
    'systemPrompt',
    'system_prompt',
    'promptText',
    'transcriptBody',
    'transcript_body',
    'credential',
    'userCredentials',
    'accessToken',
    'auth_token',
    'refreshToken',
    'clientSecret',
    'privateKey',
    'sessionKey',
    'cookie',
    'messages',
    'messageContent',
    'chatHistory',
    'conversationLog',
    'roleContent',
    'systemContent',
    'assistantContent',
    'instructionText',
    'content',
    'body',
    'text',
    'authorization',
    'auth',
    'key',
    'signature',
    'jwt',
  ] as const;

  const legitimateKeys = [
    'contentDigest',
    'expected_output',
    'authorization_scope',
    'roleInstructions',
    'role_selector',
    'role_class',
    'role_name',
    'roleVersion',
    'model_class_floor',
    'catalog_snapshot',
    'candidate_misses',
    'verification_evidence',
    'selected_route',
    'passthrough_route',
  ] as const;

  it.each(sensitiveKeys)('rejects the sensitive key %s recursively', (key) => {
    expect(isSensitiveDispatchKey(key)).toBe(true);
    expect(() =>
      assertNoSensitiveDispatchContent({ payload: { [key]: 'value' } }),
    ).toThrow(/sensitive dispatch content/i);
    expect(() =>
      assertNoSensitiveDispatchContent({ a: [{ b: { [key]: 'value' } }] }),
    ).toThrow(/sensitive dispatch content/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { nested: { [key]: 'value' } },
      }),
    ).toThrow(/sensitive dispatch content/i);
  });

  it.each(legitimateKeys)('keeps the legitimate key %s admissible', (key) => {
    expect(isSensitiveDispatchKey(key)).toBe(false);
  });

  it.each([
    'sk-abcdefghijklmnopqrstuvwxyz012345',
    'ghp_abcdefghijklmnopqrstuvwxyz0123',
    'xoxb-1234567890-abcdefghij',
    'AKIAIOSFODNN7EXAMPLE',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig',
  ])('rejects the credential-shaped value %s', (value) => {
    expect(() => assertNoSensitiveDispatchContent({ note: value })).toThrow(
      /sensitive dispatch content/i,
    );
  });

  it('keeps payload inside a closed bounded control projection', () => {
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { note: 'x'.repeat(513) },
      }),
    ).toThrow(/closed control projection/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { a: { b: { c: { d: 'too deep' } } } },
      }),
    ).toThrow(/closed control projection/i);
    expect(
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { sandbox: 'read-only', tools: ['Read'], network: false },
      }).payload,
    ).toEqual({ sandbox: 'read-only', tools: ['Read'], network: false });
  });

  it('correlates the canonical task-class fields as a complete set', () => {
    const classFields = {
      task_class: 'intelligent-recon' as const,
      model_class_floor: 'intelligent-recon',
      classification_source: 'caller' as const,
      classification_reason: 'Silent-miss risk in semantic interpretation.',
      floor_satisfaction: 'satisfied' as const,
    };
    expect(
      parseGenericDispatchRecord({ ...genericRecord(), ...classFields }),
    ).toMatchObject(classFields);
    expect(parseGenericDispatchRecord(genericRecord())).not.toHaveProperty(
      'task_class',
    );

    for (const omitted of Object.keys(classFields)) {
      const partial: Record<string, unknown> = {
        ...genericRecord(),
        ...classFields,
      };
      delete partial[omitted];
      expect(() => parseGenericDispatchRecord(partial)).toThrow(
        /class-constrained dispatch record requires every task-class field/i,
      );
    }

    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        ...classFields,
        model_class_floor: 'mechanical-recon',
      }),
    ).toThrow(/model_class_floor must equal the requested task_class/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        ...classFields,
        classification_source: 'inferred',
      }),
    ).toThrow(/classification_source/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        ...classFields,
        floor_satisfaction: 'unknown',
      }),
    ).toThrow(/floor_satisfaction/i);
  });

  it('requires stable contained request IDs and valid launch state', () => {
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        request_id: '../outside',
      }),
    ).toThrow(/request_id/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        launch_status: 'accepted',
        child_outcome: null,
      }),
    ).toThrow(/accepted dispatch/i);
  });
});
