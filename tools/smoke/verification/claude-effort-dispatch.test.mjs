import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const cliPath = join(repositoryRoot, 'packages/cli/dist/index.js');

const { materializeClaudeAgent } =
  await import('../../../packages/cli/dist/providers/claude/codec/materialize.js');
const { extractClaudeRuntimeMetadata } =
  await import('../../../packages/cli/dist/providers/identity/claude-runtime-observation.js');
const { SIDECHAIN_TRANSCRIPT } =
  await import('../../../packages/cli/dist/providers/identity/claude-runtime-observation.fixtures.js');
const { compareObservedRuntimeMetadata, configuredInvocationForObservation } =
  await import('../../../packages/cli/dist/providers/identity/oat-dispatch-record.js');
const { parseGenericDispatchRecord } =
  await import('../../../packages/cli/dist/providers/identity/generic-dispatch-record.js');

const roots = [];

function completeClaudeMatrix() {
  return {
    economy: {
      candidates: [
        'haiku',
        { harness: 'claude', model: 'sonnet', effort: 'medium' },
      ],
    },
    balanced: {
      candidates: [{ harness: 'claude', model: 'sonnet', effort: 'high' }],
    },
    high: {
      candidates: [
        { harness: 'claude', model: 'opus', effort: 'medium' },
        { harness: 'claude', model: 'opus', effort: 'high' },
      ],
    },
    frontier: {
      candidates: [
        { harness: 'claude', model: 'opus', effort: 'xhigh' },
        { harness: 'claude', model: 'opus', effort: 'max' },
        { harness: 'claude', model: 'fable', effort: 'high' },
      ],
    },
  };
}

function config(policy = 'high', matrix = completeClaudeMatrix()) {
  return {
    version: 1,
    workflow: {
      dispatchPolicy: { mode: 'managed', policy },
      dispatchCeiling: { providers: { claude: matrix } },
    },
  };
}

function resolverRoot(configuration) {
  const root = mkdtempSync(join(tmpdir(), 'oat-claude-effort-dispatch-'));
  roots.push(root);
  mkdirSync(join(root, '.oat'), { recursive: true });
  writeFileSync(
    join(root, '.oat', 'config.json'),
    `${JSON.stringify(configuration, null, 2)}\n`,
  );
  const initialized = spawnSync('git', ['init', '-q'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(initialized.status, 0, initialized.stderr);
  return root;
}

function resolveDispatch(configuration, args) {
  const cwd = resolverRoot(configuration);
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      'project',
      'dispatch-ceiling',
      'resolve',
      '--cwd',
      cwd,
      ...args,
      '--json',
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    assert.fail(
      `resolver did not return JSON (exit ${String(result.status)}): ${result.stdout}\n${result.stderr}`,
    );
  }
  return { ...result, payload };
}

function frontmatterValue(content, key) {
  const value = new RegExp(`^${key}: ([^\\n]+)$`, 'mu').exec(content)?.[1];
  assert.ok(value, `generated definition is missing ${key}`);
  return value;
}

function assertEffortLaunch({ resolution, definitions, payload }) {
  const provider = resolution.providers.claude;
  assert.equal(provider.mode, 'enforced');
  assert.equal(provider.mechanism, 'pinned-variant');
  assert.equal(
    provider.effortAxis,
    `selected:${provider.selection.target.effort}`,
  );
  const selectedVariant = provider.dispatchArgs?.variant;
  assert.ok(
    selectedVariant,
    'effort-pinned dispatch requires a native variant',
  );
  assert.equal(payload.variant, selectedVariant);

  const definition = definitions.get(selectedVariant);
  assert.ok(definition, `selected Claude variant ${selectedVariant} is absent`);
  assert.equal(
    frontmatterValue(definition, 'model'),
    provider.selection.target.model,
  );
  assert.equal(
    frontmatterValue(definition, 'effort'),
    provider.selection.target.effort,
  );
  if (payload.model !== undefined) {
    assert.equal(
      payload.model,
      provider.selection.target.model,
      'per-call model must agree with the generated Claude definition',
    );
  }
}

function agent(name) {
  return {
    name,
    description: `${name} contract fixture.`,
    tools: 'Read',
    body: '\n## Role\n\nExecute the bounded task.\n',
  };
}

function definitionFor(name, model, effort) {
  return materializeClaudeAgent({
    agent: agent(name),
    target: { model, effort, owner: 'project-config' },
  });
}

function genericRecord({ role, variant, model, effort }) {
  return parseGenericDispatchRecord({
    request_id: `p03-t01-${role}`,
    caller: 'oat-project-implement',
    scope: 'p03-t01',
    objective: 'Verify Claude effort dispatch invariants',
    action: role === 'oat-reviewer' ? 'review' : 'implementation',
    role_name: role,
    role_class: role === 'oat-reviewer' ? 'review' : 'implementation',
    provider: 'claude',
    dispatch_context: 'smoke-control',
    dispatch_policy: 'high',
    dispatch_ceiling: effort,
    catalog_snapshot: {
      id: 'p03-static-control',
      source: 'generated-definition',
      observed_at: '2026-09-20T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: variant,
    model_selector: model,
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: effort,
    reasoning_mode_selector: null,
    service_tier_selector: null,
    selection_source: 'policy-resolved',
    candidates_considered: [variant],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: { variant },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
  });
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

test('config to resolver to generated definition to launch payload to dispatch record stays exact for both roles', () => {
  const implementer = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'implementer',
    '--ceiling-tier',
    'high',
    '--candidate-model',
    'opus',
    '--candidate-effort',
    'high',
    '--task-class',
    'hard-reasoning',
    '--task-effort',
    'high',
    '--report-scope',
    'p03-t01',
    '--report-action',
    'implementation',
  ]);
  const reviewer = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'reviewer',
    '--report-scope',
    'p03-t01',
    '--report-action',
    'review',
  ]);

  assert.equal(
    implementer.status,
    0,
    `${implementer.stderr}\n${JSON.stringify(implementer.payload)}`,
  );
  assert.equal(
    reviewer.status,
    0,
    `${reviewer.stderr}\n${JSON.stringify(reviewer.payload)}`,
  );
  const definitions = new Map();
  for (const role of ['oat-phase-implementer', 'oat-reviewer']) {
    const definition = definitionFor(role, 'opus', 'high');
    definitions.set(definition.roleName, definition.content);
  }
  assertEffortLaunch({
    resolution: implementer.payload,
    definitions,
    payload: { variant: 'oat-phase-implementer-claude-opus-high' },
  });
  assertEffortLaunch({
    resolution: reviewer.payload,
    definitions,
    payload: { variant: 'oat-reviewer-claude-opus-high' },
  });

  for (const [role, resolution] of [
    ['oat-phase-implementer', implementer.payload],
    ['oat-reviewer', reviewer.payload],
  ]) {
    const selected = resolution.providers.claude;
    const record = genericRecord({
      role,
      variant: selected.dispatchArgs.variant,
      model: selected.selection.target.model,
      effort: selected.selection.target.effort,
    });
    assert.deepEqual(configuredInvocationForObservation(record), {
      role: [role, selected.dispatchArgs.variant],
      model: 'opus',
      effort: 'high',
      serviceTier: null,
    });
  }
});

test('same-model candidates resolve by effort and refuse absent or conflicting launch controls', () => {
  const medium = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'implementer',
    '--ceiling-tier',
    'high',
    '--candidate-model',
    'opus',
    '--candidate-effort',
    'medium',
    '--task-class',
    'default-implementation',
    '--task-effort',
    'medium',
    '--report-scope',
    'p03-t01-medium',
    '--report-action',
    'implementation',
  ]);
  const high = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'implementer',
    '--ceiling-tier',
    'high',
    '--candidate-model',
    'opus',
    '--candidate-effort',
    'high',
    '--task-class',
    'hard-reasoning',
    '--task-effort',
    'high',
    '--report-scope',
    'p03-t01-high',
    '--report-action',
    'implementation',
  ]);
  assert.equal(
    medium.status,
    0,
    `${medium.stderr}\n${JSON.stringify(medium.payload)}`,
  );
  assert.equal(
    high.status,
    0,
    `${high.stderr}\n${JSON.stringify(high.payload)}`,
  );
  assert.equal(
    medium.payload.providers.claude.dispatchArgs.variant,
    'oat-phase-implementer-claude-opus-medium',
  );
  assert.equal(
    high.payload.providers.claude.dispatchArgs.variant,
    'oat-phase-implementer-claude-opus-high',
  );
  assert.notEqual(
    medium.payload.providers.claude.dispatchArgs.variant,
    high.payload.providers.claude.dispatchArgs.variant,
  );

  const highDefinition = definitionFor('oat-phase-implementer', 'opus', 'high');
  assert.throws(
    () =>
      assertEffortLaunch({
        resolution: high.payload,
        definitions: new Map(),
        payload: { variant: highDefinition.roleName },
      }),
    /is absent/u,
  );
  assert.throws(
    () =>
      assertEffortLaunch({
        resolution: high.payload,
        definitions: new Map([
          [highDefinition.roleName, highDefinition.content],
        ]),
        payload: { variant: highDefinition.roleName, model: 'sonnet' },
      }),
    /must agree/u,
  );
});

test('invalid effort pairs fail closed while model-only and inherit paths remain unpinned', () => {
  const unsupported = resolveDispatch(
    config('high', {
      high: {
        candidates: [{ harness: 'claude', model: 'sonnet', effort: 'xhigh' }],
      },
    }),
    [
      '--provider',
      'claude',
      '--role',
      'implementer',
      '--candidate-model',
      'sonnet',
      '--candidate-effort',
      'xhigh',
    ],
  );
  assert.equal(unsupported.status, 1);
  assert.equal(unsupported.payload.status, 'error');
  assert.match(unsupported.payload.message, /does not support effort/u);

  const unknown = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'implementer',
    '--candidate-model',
    'opus',
    '--candidate-effort',
    'extreme',
  ]);
  assert.equal(unknown.status, 1);
  assert.equal(unknown.payload.status, 'error');
  assert.match(unknown.payload.message, /Unsupported Claude effort/u);

  const modelOnly = resolveDispatch(
    config('balanced', {
      balanced: { candidates: ['sonnet'] },
    }),
    [
      '--provider',
      'claude',
      '--role',
      'implementer',
      '--candidate-model',
      'sonnet',
    ],
  );
  assert.equal(modelOnly.status, 0, modelOnly.stderr);
  assert.deepEqual(modelOnly.payload.providers.claude.dispatchArgs, {
    model: 'sonnet',
  });
  assert.equal(modelOnly.payload.providers.claude.effortAxis, 'not-applicable');

  const inherited = resolveDispatch(
    { version: 1, workflow: { dispatchPolicy: { mode: 'inherit' } } },
    ['--provider', 'claude', '--role', 'implementer'],
  );
  assert.equal(inherited.status, 0, inherited.stderr);
  assert.equal(inherited.payload.providers.claude.dispatchArgs, null);
  assert.equal(
    inherited.payload.providers.claude.selection.selectionMode,
    'inherit-default',
  );
});

test('existing captured Claude transcript metadata stays observation-only', () => {
  const metadata = extractClaudeRuntimeMetadata(SIDECHAIN_TRANSCRIPT);
  assert.deepEqual(
    {
      role: metadata.role,
      model: metadata.model,
      effort: metadata.effort,
      serviceTier: metadata.serviceTier,
    },
    {
      role: 'general-purpose',
      model: 'claude-opus-5',
      effort: 'high',
      serviceTier: 'standard',
    },
  );
  const configured = configuredInvocationForObservation(
    genericRecord({
      role: 'oat-reviewer',
      variant: 'oat-reviewer-claude-opus-high',
      model: 'opus',
      effort: 'high',
    }),
  );
  assert.equal(
    compareObservedRuntimeMetadata(metadata, configured),
    'mismatching',
  );
  assert.equal(configured.role[1], 'oat-reviewer-claude-opus-high');
  assert.equal(
    readFileSync(
      join(
        repositoryRoot,
        'packages/cli/src/providers/identity/claude-runtime-observation.fixtures.ts',
      ),
      'utf8',
    ).includes('Captured Claude transcript metadata, sanitized.'),
    true,
  );
});
