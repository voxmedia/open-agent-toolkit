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
const { parseDispatchRecordInput } =
  await import('../../../packages/cli/dist/commands/project/dispatch/record.js');

const roots = [];

function completeClaudeMatrix() {
  return {
    economy: {
      candidates: [
        'haiku',
        { harness: 'claude', model: 'claude-sonnet-5', effort: 'medium' },
      ],
    },
    balanced: {
      candidates: [
        { harness: 'claude', model: 'claude-sonnet-5', effort: 'high' },
      ],
    },
    high: {
      candidates: [
        { harness: 'claude', model: 'claude-opus-5-5', effort: 'medium' },
        { harness: 'claude', model: 'claude-opus-5-5', effort: 'high' },
      ],
    },
    frontier: {
      candidates: [
        { harness: 'claude', model: 'claude-opus-5-5', effort: 'xhigh' },
        { harness: 'claude', model: 'claude-opus-5-5', effort: 'max' },
        { harness: 'claude', model: 'claude-fable-5-1', effort: 'high' },
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

function recordBase(role) {
  return {
    request_id: `p03-t01-${role}`,
    caller: 'oat-project-implement',
    scope: 'p03-t01',
    objective: 'Verify Claude effort dispatch invariants',
    action: role === 'oat-reviewer' ? 'review' : 'implementation',
    role_class: role === 'oat-reviewer' ? 'review' : 'implementation',
    dispatch_context: 'smoke-control',
    catalog_snapshot: {
      id: 'p03-static-control',
      source: 'generated-definition',
      observed_at: '2026-09-20T00:00:00.000Z',
    },
    authority: 'phase-files',
    reasoning_mode_selector: null,
    service_tier_selector: null,
    deadline_seconds: 600,
    retry_limit: 0,
    launch_status: 'accepted',
    child_outcome: 'completed',
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
  };
}

function productionRecord({ role, resolution, definition, payload }) {
  return parseDispatchRecordInput({
    claudeLaunch: { resolution, definition, payload },
    recordBase: recordBase(role),
    event: {
      kind: 'canonical-role-resolution',
      requestId: `p03-t01-${role}`,
      source: 'canonical-role-resolver',
      evidence: {
        status: 'resolved',
        dependency: 'workflows',
        canonicalRole: role,
        tier: 'project',
        validation: 'direct-canonical',
        canonicalPath: `<repo>/agents/${role}.md`,
        selectedPath: `<repo>/agents/${role}.md`,
        roleVersion: 'fixture',
        contentDigest: `sha256:${'a'.repeat(64)}`,
        candidateMisses: [],
      },
    },
  }).record;
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
    'claude-opus-5-5',
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
  for (const [role, resolution, expectedVariant] of [
    [
      'oat-phase-implementer',
      implementer.payload,
      'oat-phase-implementer-claude-claude-opus-5-5-high',
    ],
    [
      'oat-reviewer',
      reviewer.payload,
      'oat-reviewer-claude-claude-opus-5-5-high',
    ],
  ]) {
    const definition = definitionFor(role, 'claude-opus-5-5', 'high');
    const record = productionRecord({
      role,
      resolution,
      definition: definition.content,
      payload: { variant: expectedVariant },
    });
    assert.deepEqual(configuredInvocationForObservation(record), {
      role: [role, expectedVariant],
      model: 'claude-opus-5-5',
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
    'claude-opus-5-5',
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
    'claude-opus-5-5',
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
    'oat-phase-implementer-claude-claude-opus-5-5-medium',
  );
  assert.equal(
    high.payload.providers.claude.dispatchArgs.variant,
    'oat-phase-implementer-claude-claude-opus-5-5-high',
  );
  assert.notEqual(
    medium.payload.providers.claude.dispatchArgs.variant,
    high.payload.providers.claude.dispatchArgs.variant,
  );

  const highDefinition = definitionFor(
    'oat-phase-implementer',
    'claude-opus-5-5',
    'high',
  );
  assert.throws(
    () =>
      productionRecord({
        role: 'oat-phase-implementer',
        resolution: high.payload,
        definition: '',
        payload: { variant: highDefinition.roleName },
      }),
    /absent|no YAML frontmatter/u,
  );
  assert.throws(
    () =>
      productionRecord({
        role: 'oat-phase-implementer',
        resolution: high.payload,
        definition: highDefinition.content,
        payload: { variant: highDefinition.roleName, model: 'sonnet' },
      }),
    /conflicts/u,
  );

  // Frozen pre-fix reproduction: an effort-blind producer reused the medium
  // native variant for a high selection on the same model.
  const effortBlind = structuredClone(high.payload);
  effortBlind.providers.claude.dispatchArgs.variant =
    'oat-phase-implementer-claude-claude-opus-5-5-medium';
  assert.throws(
    () =>
      productionRecord({
        role: 'oat-phase-implementer',
        resolution: effortBlind,
        definition: definitionFor(
          'oat-phase-implementer',
          'claude-opus-5-5',
          'medium',
        ).content,
        payload: {
          variant: 'oat-phase-implementer-claude-claude-opus-5-5-medium',
        },
      }),
    /resolver variant .* does not match selected target/u,
  );
});

test('versioned capabilities fail closed while model-only and inherit paths remain unpinned', () => {
  const supported = resolveDispatch(
    config('high', {
      high: {
        candidates: [
          {
            harness: 'claude',
            model: 'claude-sonnet-5',
            effort: 'xhigh',
          },
        ],
      },
    }),
    [
      '--provider',
      'claude',
      '--role',
      'implementer',
      '--candidate-model',
      'claude-sonnet-5',
      '--candidate-effort',
      'xhigh',
    ],
  );
  assert.equal(supported.status, 0, supported.stderr);
  assert.equal(
    supported.payload.providers.claude.target.capabilityEvidence.generation,
    'sonnet-5',
  );
  assert.equal(
    supported.payload.providers.claude.target.capabilityEvidence.exactModel,
    true,
  );
  const supportedDefinition = definitionFor(
    'oat-phase-implementer',
    'claude-sonnet-5',
    'xhigh',
  );
  const supportedRecord = productionRecord({
    role: 'oat-phase-implementer',
    resolution: supported.payload,
    definition: supportedDefinition.content,
    payload: { variant: supportedDefinition.roleName },
  });
  assert.equal(supportedRecord.effort_selector, 'xhigh');

  const unsupported = resolveDispatch(
    config('high', {
      high: {
        candidates: [
          {
            harness: 'claude',
            model: 'claude-sonnet-4-6',
            effort: 'xhigh',
          },
        ],
      },
    }),
    [
      '--provider',
      'claude',
      '--role',
      'implementer',
      '--candidate-model',
      'claude-sonnet-4-6',
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
    'claude-opus-5-5',
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
  const resolution = resolveDispatch(config(), [
    '--provider',
    'claude',
    '--role',
    'reviewer',
  ]);
  assert.equal(resolution.status, 0, resolution.stderr);
  const configured = configuredInvocationForObservation(
    productionRecord({
      role: 'oat-reviewer',
      resolution: resolution.payload,
      definition: definitionFor('oat-reviewer', 'claude-opus-5-5', 'high')
        .content,
      payload: { variant: 'oat-reviewer-claude-claude-opus-5-5-high' },
    }),
  );
  assert.equal(
    compareObservedRuntimeMetadata(metadata, configured),
    'mismatching',
  );
  assert.equal(configured.role[1], 'oat-reviewer-claude-claude-opus-5-5-high');
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
