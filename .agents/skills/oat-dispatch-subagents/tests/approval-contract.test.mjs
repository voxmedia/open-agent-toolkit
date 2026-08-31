import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const skillPath = new URL('../SKILL.md', import.meta.url);
const schemaPath = new URL('../references/record-schema.md', import.meta.url);

const [skill, schema] = await Promise.all([
  readFile(skillPath, 'utf8'),
  readFile(schemaPath, 'utf8'),
]);
const contract = `${skill}\n${schema}`;

test('prepare observes the live catalog and returns a complete record without launching', () => {
  assert.match(contract, /operation:\s*prepare/i);
  assert.match(
    contract,
    /prepare[\s\S]{0,900}live catalog[\s\S]{0,900}(?:must not|does not|without)\s+launch/i,
  );
  assert.match(
    schema,
    /prepared_record_version:[\s\S]{0,500}dispatch_state:\s*prepared[\s\S]{0,2200}catalog_observation:/i,
  );
});

test('prepared records use the complete approval-bound state machine', () => {
  for (const state of [
    'prepared',
    'approved',
    'accepted',
    'completed',
    'not-accepted',
    'stale',
  ]) {
    assert.match(schema, new RegExp(`\\b${state}\\b`, 'i'));
  }
  assert.match(schema, /prepared\s*(?:→|->)\s*approved/i);
  assert.match(schema, /approved\s*(?:→|->)\s*accepted/i);
  assert.match(schema, /accepted\s*(?:→|->)\s*completed/i);
  assert.match(schema, /approved\s*(?:→|->)\s*not-accepted/i);
  assert.match(schema, /(?:prepared|approved)\s*(?:→|->)\s*stale/i);
});

test('preparation computes every wave floor before pinning one run target', () => {
  assert.match(skill, /classify all planned and conditional waves before/i);
  assert.match(skill, /run[- ]wide maximum (?:model[- ]class )?floor/i);
  assert.match(skill, /one exact target[\s\S]{0,320}all\s+prepared waves/i);
  assert.match(
    schema,
    /waves:[\s\S]{0,500}task_class:[\s\S]{0,240}model_class_floor:[\s\S]{0,700}run_maximum_floor:[\s\S]{0,500}pinned_target:/i,
  );
});

test('approval fingerprint canonically binds every selection and execution axis', () => {
  assert.match(schema, /approval_fingerprint:\s*sha256:/i);
  assert.match(
    schema,
    /canonical JSON[\s\S]{0,500}(?:UTF-8|UTF8)[\s\S]{0,500}SHA-256/i,
  );

  for (const axis of [
    'provider',
    'dispatch_context',
    'selected_route',
    'role_selector',
    'model_selector',
    'model_selector_granularity',
    'effort_selector',
    'reasoning_mode_selector',
    'service_tier_selector',
    'authority',
    'deadline_seconds',
    'retry_limit',
    'concurrency',
    'lane_cap',
    'catalog_observation',
  ]) {
    assert.match(
      schema,
      new RegExp(`approval_axes:[\\s\\S]{0,2200}\\b${axis}\\b`, 'i'),
      `approval_axes must bind ${axis}`,
    );
  }
});

test('execute fails closed on approval-axis or relevant catalog drift', () => {
  assert.match(contract, /operation:\s*execute/i);
  for (const drift of [
    'model',
    'effort',
    'provider',
    'route',
    'role',
    'service tier',
    'authority',
    'deadline',
    'concurrency',
    'lane cap',
    'catalog',
  ]) {
    assert.match(
      contract,
      new RegExp(`${drift}[\\s\\S]{0,180}(?:drift|changed|change)`, 'i'),
      `execute must describe refusal after ${drift} drift`,
    );
  }
  assert.match(
    contract,
    /(?:drift|changed)[\s\S]{0,500}(?:refuse|must not launch|return for reapproval|stale)/i,
  );
});

test('launch acceptance is terminal and never enables replacement', () => {
  assert.match(
    contract,
    /accepted[\s\S]{0,500}(?:terminal|no replacement)[\s\S]{0,500}(?:alternate route|replacement|substitution)/i,
  );
  assert.match(
    schema,
    /accepted[\s\S]{0,700}completed[\s\S]{0,700}(?:must not|never)[\s\S]{0,300}(?:replacement|alternate route|substitution)/i,
  );
});

test('legacy callers retain exactly the existing one-step selection-and-launch path', () => {
  assert.match(contract, /one-step[\s\S]{0,220}selection-and-launch/i);
  assert.match(contract, /operation[\s\S]{0,160}omitted[\s\S]{0,220}dispatch/i);
  assert.match(
    schema,
    /legacy[\s\S]{0,500}(?:select|selection)[\s\S]{0,240}launch[\s\S]{0,240}(?:immediately|same operation)/i,
  );
  assert.match(
    schema,
    /legacy[\s\S]{0,700}(?:must not|required to)[\s\S]{0,240}(?:fabricate|approval_fingerprint|prepared record)/i,
  );
});
