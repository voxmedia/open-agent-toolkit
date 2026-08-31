import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const skillPath = new URL('../SKILL.md', import.meta.url);
const schemaPath = new URL('../references/record-schema.md', import.meta.url);

const [skill, schema] = await Promise.all([
  readFile(skillPath, 'utf8'),
  readFile(schemaPath, 'utf8'),
]);
const contract = `${skill}\n${schema}`;

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function extractApprovalProjection() {
  const match = schema.match(
    /^### Canonical Approval Projection v1\n[\s\S]*?```json\n([\s\S]*?)\n```/m,
  );
  assert.ok(match, 'record schema must contain the executable v1 projection');
  return JSON.parse(match[1]);
}

function approvalBoundSection(content, heading, nextHeading) {
  const start = content.indexOf(heading);
  assert.notEqual(start, -1, `missing ${heading}`);
  const end = content.indexOf(nextHeading, start + heading.length);
  return content.slice(start, end === -1 ? undefined : end);
}

function hasPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, segment)
    ) {
      return false;
    }
    current = current[segment];
  }
  return true;
}

function assertExactKeys(actual, expected, label) {
  assert.deepEqual(
    Object.keys(actual).sort(),
    Object.keys(expected).sort(),
    `${label} must use the immutable v1 keys`,
  );
}

test('prepare observes the live catalog and returns a complete record without launching', () => {
  assert.match(contract, /operation:\s*prepare/i);
  assert.match(
    contract,
    /prepare[\s\S]{0,900}live catalog[\s\S]{0,900}(?:must not|does not|without)\s+launch/i,
  );
  const projection = extractApprovalProjection();
  assert.equal(projection.prepared_record_version, 1);
  assert.ok(projection.catalog_observation);
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
  const projection = extractApprovalProjection();
  assert.ok(projection.execution.waves.length > 1);
  assert.ok(
    projection.execution.waves.every(
      (wave) => wave.task_class && wave.model_class_floor,
    ),
  );
  assert.equal(projection.execution.run_maximum_floor, 'hard-reasoning');
  assert.ok(projection.execution.pinned_target);
});

test('approval fingerprint canonically binds every selection and execution axis', () => {
  assert.match(schema, /approval_fingerprint:\s*sha256:/i);
  assert.match(
    schema,
    /canonical JSON[\s\S]{0,500}(?:UTF-8|UTF8)[\s\S]{0,500}SHA-256/i,
  );

  const projection = extractApprovalProjection();
  for (const path of [
    ['selection', 'provider'],
    ['selection', 'dispatch_context'],
    ['selection', 'selected_route'],
    ['selection', 'role_selector'],
    ['selection', 'model_selector'],
    ['selection', 'model_selector_granularity'],
    ['selection', 'effort_selector'],
    ['selection', 'reasoning_mode_selector'],
    ['selection', 'service_tier_selector'],
    ['execution', 'waves', 0, 'authority'],
    ['execution', 'waves', 0, 'deadline_seconds'],
    ['execution', 'waves', 0, 'retry_limit'],
    ['execution', 'waves', 0, 'concurrency'],
    ['execution', 'waves', 0, 'lane_cap'],
    ['catalog_observation'],
  ]) {
    assert.ok(
      hasPath(projection, path),
      `approval projection must bind ${path.join('.')}`,
    );
  }
});

test('canonical projection fingerprints every ordered nested wave and lane control', () => {
  const projection = extractApprovalProjection();
  const baseline = fingerprint(projection);
  const mutations = [
    ['wave order', (value) => value.execution.waves.reverse()],
  ];

  for (
    let waveIndex = 0;
    waveIndex < projection.execution.waves.length;
    waveIndex += 1
  ) {
    const waveMutations = [
      ['wave identity', (wave) => (wave.wave_id += '-changed')],
      ['conditionality', (wave) => (wave.conditional = !wave.conditional)],
      ['task class', (wave) => (wave.task_class += '-changed')],
      ['model floor', (wave) => (wave.model_class_floor += '-changed')],
      ['concurrency', (wave) => (wave.concurrency += 1)],
      ['lane cap', (wave) => (wave.lane_cap += 1)],
      ['wave scope', (wave) => (wave.scope += '-changed')],
      ['lane identity', (wave) => (wave.lanes[0].lane_id += '-changed')],
      ['lane scope', (wave) => (wave.lanes[0].scope += '-changed')],
      ['authority', (wave) => (wave.authority += '-changed')],
      [
        'authorization scope',
        (wave) => (wave.authorization_scope += '-changed'),
      ],
      ['writable roots', (wave) => wave.writable_roots.push('/tmp/extra')],
      ['deadline', (wave) => (wave.deadline_seconds += 1)],
      ['retry limit', (wave) => (wave.retry_limit += 1)],
      ['fallback', (wave) => (wave.fallback.mode += '-changed')],
      ['dispatch mode', (wave) => (wave.dispatch_mode += '-changed')],
      [
        'context controls',
        (wave) => (wave.context_fork_controls.fork_turns += '-changed'),
      ],
      [
        'payload digest',
        (wave) => (wave.payload_digest = `sha256:${'f'.repeat(64)}`),
      ],
    ];
    for (const [name, mutateWave] of waveMutations) {
      mutations.push([
        `${name} in wave ${waveIndex}`,
        (value) => mutateWave(value.execution.waves[waveIndex]),
      ]);
    }
  }

  for (const [name, mutate] of mutations) {
    const changed = structuredClone(projection);
    mutate(changed);
    assert.notEqual(
      fingerprint(changed),
      baseline,
      `${name} drift must change the approval fingerprint`,
    );
  }

  for (const wave of projection.execution.waves) {
    assertExactKeys(wave, projection.execution.waves[0], 'wave');
    for (const lane of wave.lanes) {
      assertExactKeys(lane, projection.execution.waves[0].lanes[0], 'lane');
    }
  }

  const missing = structuredClone(projection.execution.waves[0]);
  delete missing.conditional;
  assert.throws(() =>
    assertExactKeys(missing, projection.execution.waves[0], 'wave'),
  );

  const extra = structuredClone(projection.execution.waves[0]);
  extra.legacy_axis = true;
  assert.throws(() =>
    assertExactKeys(extra, projection.execution.waves[0], 'wave'),
  );
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

test('approval-bound acceptance forbids the generic linked fresh-launch recovery exception', () => {
  const skillSection = approvalBoundSection(
    skill,
    '## Approval-Bound Preparation and Execution',
    '## Full-Information Selection',
  );
  const schemaSection = approvalBoundSection(
    schema,
    '## Approval-Bound Prepared Record',
    '## Legacy Record',
  );

  for (const [name, section] of [
    ['skill', skillSection],
    ['schema', schemaSection],
  ]) {
    assert.match(
      section,
      /only continuation through the (?:already )?accepted handle/i,
      `${name} must allow only the accepted handle`,
    );
    assert.match(
      section,
      /linked fresh same-target launch[\s\S]{0,180}(?:forbidden|must not|never)/i,
      `${name} must forbid a linked fresh same-target launch`,
    );
    assert.match(
      section,
      /regardless of[\s\S]{0,180}generic[\s\S]{0,180}recovery/i,
      `${name} must override the generic recovery exception`,
    );
    assert.doesNotMatch(
      section,
      /(?:allow(?:s|ed)?|permit(?:s|ted)?|use|follow)\s+(?:only\s+)?(?:the\s+)?(?:existing\s+)?(?:continuation\s+and\s+)?(?:caller-authorized\s+)?(?:linked\s+)?(?:fresh same-target launch|same-target recovery rules?)/i,
      `${name} must not re-enable fresh-launch recovery`,
    );
  }
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
