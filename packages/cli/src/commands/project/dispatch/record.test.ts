import { readFile } from 'node:fs/promises';

import { materializeClaudeAgent } from '@providers/claude/codec/materialize';
import {
  MAIN_SESSION_TRANSCRIPT,
  SIDECHAIN_TRANSCRIPT,
} from '@providers/identity/claude-runtime-observation.fixtures';
import {
  DEPTH_1_ROLLOUT,
  DEPTH_2_ROLLOUT,
  ROOT_ROLLOUT,
} from '@providers/identity/codex-runtime-observation.fixtures';
import type { GenericDispatchRecord } from '@providers/identity/generic-dispatch-record';
import { describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCommand } from './index';
import {
  parseDispatchRecordInput,
  recordProjectDispatch,
  redactDispatchMessage,
} from './record';

function genericRecord(
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

function canonicalEvent(requestId = 'dispatch-native-1') {
  return {
    kind: 'canonical-role-resolution' as const,
    requestId,
    source: 'canonical-role-resolver' as const,
    evidence: {
      status: 'resolved' as const,
      dependency: 'workflows',
      canonicalRole: 'oat-phase-implementer',
      tier: 'user' as const,
      validation: 'direct-canonical' as const,
      canonicalPath: '<user>/agents/oat-phase-implementer.md',
      selectedPath: '<user>/agents/oat-phase-implementer.md',
      roleVersion: '1.2.3',
      contentDigest: `sha256:${'a'.repeat(64)}`,
      candidateMisses: [],
    },
  };
}

function managedClaudeRecordBase(action: 'implementation' | 'review') {
  return {
    request_id: `managed-claude-${action}`,
    caller: 'oat-project-implement',
    scope: 'p03-review-fix',
    objective: 'Validate the managed Claude launch boundary',
    action,
    role_class: action === 'review' ? 'review' : 'implementation',
    dispatch_context: 'phase-dispatch',
    catalog_snapshot: {
      id: 'claude-generated-role-catalog',
      source: 'project-sync',
      observed_at: '2026-09-21T00:00:00.000Z',
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

function managedClaudeResolution(
  role: 'implementer' | 'reviewer',
  effort: 'medium' | 'high' = 'high',
) {
  const baseRole =
    role === 'reviewer' ? 'oat-reviewer' : 'oat-phase-implementer';
  const variant = `${baseRole}-claude-claude-sonnet-5-${effort}`;
  const target = {
    harness: 'claude',
    model: 'claude-sonnet-5',
    effort,
    capabilityEvidence: {
      source: 'explicit-model-id',
      modelReference: 'claude-sonnet-5',
      exactModel: true,
      generation: 'sonnet-5',
      capabilitiesSource: 'dispatch-target-model',
      supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    },
    crossHarness: false,
  };
  return {
    status: 'resolved',
    provider: 'claude',
    policyMode: 'managed',
    policy: 'high',
    providers: {
      claude: {
        value: 'claude-sonnet-5',
        mode: 'enforced',
        mechanism: 'pinned-variant',
        dispatchArgs: { variant },
        modelAxis: 'selected:claude-sonnet-5',
        effortAxis: `selected:${effort}`,
        target,
        selection: { role, policyMode: 'managed', policy: 'high', target },
      },
    },
  };
}

function managedClaudeDefinition(
  name: 'oat-phase-implementer' | 'oat-reviewer',
  effort: 'medium' | 'high' = 'high',
) {
  return materializeClaudeAgent({
    agent: {
      name,
      description: 'Managed Claude boundary fixture.',
      body: '\n## Role\n\nExecute the bounded task.\n',
    },
    target: { model: 'claude-sonnet-5', effort, owner: 'project-config' },
  }).content;
}

function managedClaudeInput(
  role: 'implementer' | 'reviewer' = 'implementer',
  effort: 'medium' | 'high' = 'high',
) {
  const action = role === 'reviewer' ? 'review' : 'implementation';
  const baseRole =
    role === 'reviewer' ? 'oat-reviewer' : 'oat-phase-implementer';
  return {
    claudeLaunch: {
      resolution: managedClaudeResolution(role, effort),
      definition: managedClaudeDefinition(baseRole, effort),
      payload: { variant: `${baseRole}-claude-claude-sonnet-5-${effort}` },
    },
    recordBase: managedClaudeRecordBase(action),
    event: canonicalEvent(`managed-claude-${action}`),
  };
}

const target = {
  provider: 'codex',
  modelSelector: 'gpt-5.6-sol',
  effortSelector: 'high',
  reasoningModeSelector: null,
  serviceTierSelector: 'priority',
  selectedRoute: 'native',
};

function fallbackInput(fallbackRequestId: string) {
  return {
    record: genericRecord({
      request_id: fallbackRequestId,
      launch_status: 'blocked-before-start' as const,
      child_outcome: 'not-started',
      role_selector: 'generalPurpose',
      selection_reason: 'pre-start-rejection' as const,
    }),
    event: {
      kind: 'fallback-link' as const,
      requestId: fallbackRequestId,
      source: 'provider-wrapper' as const,
      evidence: {
        status: 'fallback-dispatch' as const,
        triggerRequestId: 'dispatch-native-1',
        fallbackRequestId,
        trigger: 'pre-start-rejection' as const,
        fallbackReason: 'Native role rejected before start',
        kind: 'canonical-instruction-fresh-child' as const,
        approximation: true as const,
        preservedTarget: target,
        rejection: {
          source: 'provider-wrapper' as const,
          code: 'native-role-unavailable',
          rejectedAt: '2026-09-02T00:00:01.000Z',
          provesNoChildStarted: true as const,
        },
        roleInstructions: canonicalEvent().evidence,
      },
    },
  };
}

/**
 * Run `oat project dispatch record --event-file - --json` on `input` and return
 * the exact JSON the command prints. Redaction is asserted on this output: the
 * command writes nothing, so what it prints is all a caller can ever see.
 */
async function validatedOutput(input: unknown): Promise<string> {
  const json = vi.fn();
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    const command = createProjectDispatchCommand({
      buildCommandContext: () => ({
        scope: 'all',
        dryRun: false,
        verbose: false,
        json: true,
        cwd: process.cwd(),
        home: process.cwd(),
        interactive: false,
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          success: vi.fn(),
          json,
        },
      }),
      resolveProjectRoot: async () => process.cwd(),
      readFile: async () => {
        throw new Error('event file should not be read');
      },
      readStdin: async () => JSON.stringify(input),
    });
    await command.parseAsync(['record', '--event-file', '-'], {
      from: 'user',
    });
    expect(process.exitCode).toBe(0);
    const payload = json.mock.calls.at(-1)?.[0] as { status?: string };
    expect(payload.status).toBe('validated-only');
    return JSON.stringify(payload);
  } finally {
    process.exitCode = previousExitCode;
  }
}

describe('managed Claude launch production boundary', () => {
  it.each([
    ['implementer', 'medium'],
    ['reviewer', 'high'],
  ] as const)(
    'derives the %s configured invocation at %s effort',
    (role, effort) => {
      const parsed = parseDispatchRecordInput(managedClaudeInput(role, effort));
      const baseRole =
        role === 'reviewer' ? 'oat-reviewer' : 'oat-phase-implementer';
      const variant = `${baseRole}-claude-claude-sonnet-5-${effort}`;
      expect(parsed.record).toMatchObject({
        provider: 'claude',
        role_name: baseRole,
        role_selector: variant,
        model_selector: 'claude-sonnet-5',
        effort_selector: effort,
        payload: { variant },
        candidates_considered: [variant],
      });
      expect(parsed.record.configured_invocation_evidence).toEqual([
        {
          source: 'accepted-claude-launch-envelope',
          schemaVersion: 1,
          variant,
          model: 'claude-sonnet-5',
          capabilitySource: 'explicit-model-id',
          capabilityModelReference: 'claude-sonnet-5',
          capabilityExactModel: true,
          capabilityGeneration: 'sonnet-5',
          capabilityPossibleGenerations: null,
          capabilityDeclarationSource: 'dispatch-target-model',
          capabilitySupportedEfforts: 'low,medium,high,xhigh,max',
          effort,
        },
      ]);
    },
  );

  it('rejects absent, conflicting, and stale same-model effort controls', () => {
    const absent = managedClaudeInput();
    absent.claudeLaunch.payload = {} as never;
    expect(() => parseDispatchRecordInput(absent)).toThrow(/variant/i);

    const conflictingModel = managedClaudeInput();
    conflictingModel.claudeLaunch.payload = {
      variant: 'oat-phase-implementer-claude-claude-sonnet-5-high',
      model: 'opus',
    };
    expect(() => parseDispatchRecordInput(conflictingModel)).toThrow(
      /per-call Claude model .* conflicts/i,
    );

    const staleEffort = managedClaudeInput('implementer', 'high');
    staleEffort.claudeLaunch.resolution.providers.claude.dispatchArgs.variant =
      'oat-phase-implementer-claude-claude-sonnet-5-medium';
    expect(() => parseDispatchRecordInput(staleEffort)).toThrow(
      /resolver variant .* does not match selected target/i,
    );

    const mutatedEvidence = managedClaudeInput();
    mutatedEvidence.claudeLaunch.resolution.providers.claude.target =
      structuredClone(
        mutatedEvidence.claudeLaunch.resolution.providers.claude.target,
      );
    mutatedEvidence.claudeLaunch.resolution.providers.claude.target.capabilityEvidence.supportedEfforts.push(
      'xhigh',
    );
    expect(() => parseDispatchRecordInput(mutatedEvidence)).toThrow(
      /target and selection target disagree.*capability evidence/i,
    );

    const forgedEvidence = managedClaudeInput();
    forgedEvidence.claudeLaunch.resolution.providers.claude.target.capabilityEvidence.supportedEfforts.push(
      'xhigh',
    );
    expect(() => parseDispatchRecordInput(forgedEvidence)).toThrow(
      /provided Claude capability evidence does not match/i,
    );

    const missingDefinition = managedClaudeInput();
    missingDefinition.claudeLaunch.definition = managedClaudeDefinition(
      'oat-phase-implementer',
      'medium',
    );
    expect(() => parseDispatchRecordInput(missingDefinition)).toThrow(
      /definition .* absent|not the matching OAT-managed role/i,
    );

    const copiedEffort = managedClaudeInput();
    (copiedEffort.recordBase as Record<string, unknown>).effort_selector =
      'medium';
    expect(() => parseDispatchRecordInput(copiedEffort)).toThrow(
      /recordBase must omit derived field effort_selector/i,
    );
  });
});

describe('managed Claude single-run violation reporting', () => {
  function everyViolationInput() {
    const input = managedClaudeInput('implementer');
    const {
      caller: _caller,
      deadline_seconds: _deadline,
      ...base
    } = managedClaudeRecordBase('review');
    return {
      ...input,
      recordBase: {
        ...base,
        request_id: 'managed-claude-implementation',
        scope: '/Users/alice/work/p03',
        provider: 'claude',
        effort_selector: 'high',
        configured_invocation_evidence: [],
      },
      event: {
        ...canonicalEvent('managed-claude-implementation'),
        evidence: {
          ...canonicalEvent().evidence,
          canonicalPath: '<repo>/agents/oat-phase-implementer.md',
          contentDigest: 'sha256:not-a-digest',
        },
      },
    };
  }

  it('reports every violation across all stages in one error', () => {
    let caught: unknown;
    try {
      parseDispatchRecordInput(everyViolationInput());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    const lines = (caught as Error).message.split('\n');
    expect(lines[0]).toBe('Managed Claude dispatch input has 9 violations:');
    expect(lines.slice(1)).toEqual([
      'recordBase provider: Managed Claude dispatch recordBase must omit derived field provider.',
      'recordBase effort_selector: Managed Claude dispatch recordBase must omit derived field effort_selector.',
      'recordBase configured_invocation_evidence: Managed Claude dispatch recordBase must omit derived field configured_invocation_evidence.',
      'recordBase action: Managed Claude resolver role implementer conflicts with record action review.',
      'recordBase caller: Required',
      'recordBase deadline_seconds: Required',
      'recordBase scope: A dispatch record must not carry an absolute filesystem path at scope.',
      'event evidence.canonicalPath: expected <loaded|user|project>/agents/<name>.md',
      'event evidence.contentDigest: expected sha256:<64 lowercase hex>',
    ]);
  });

  it('reports launch, base, and event violations together, including a request mismatch', () => {
    const input = managedClaudeInput('reviewer');
    input.claudeLaunch.payload = {
      variant: 'oat-reviewer-claude-claude-sonnet-5-medium',
    };
    (input.recordBase as Record<string, unknown>).role_selector = 'x';
    input.event = canonicalEvent('some-other-request');
    expect(() => parseDispatchRecordInput(input)).toThrow(
      [
        'Managed Claude dispatch input has 3 violations:',
        'claudeLaunch payload.variant: Claude launch variant oat-reviewer-claude-claude-sonnet-5-medium does not match resolver-selected variant oat-reviewer-claude-claude-sonnet-5-high.',
        'recordBase role_selector: Managed Claude dispatch recordBase must omit derived field role_selector.',
        'event requestId: OAT event request ID must match the generic record.',
      ].join('\n'),
    );
  });

  it('still returns validated-only for a valid managed input', async () => {
    const result = await recordProjectDispatch({
      input: managedClaudeInput('reviewer'),
    });
    expect(result.status).toBe('validated-only');
    expect(result.record.oat.canonicalRole).toMatchObject({
      status: 'resolved',
    });
  });

  const SECRET = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  async function commandError(input: unknown): Promise<string> {
    const json = vi.fn();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const command = createProjectDispatchCommand({
        buildCommandContext: () => ({
          scope: 'all',
          dryRun: false,
          verbose: false,
          json: true,
          cwd: process.cwd(),
          home: process.cwd(),
          interactive: false,
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            json,
          },
        }),
        resolveProjectRoot: async () => process.cwd(),
        readFile: async () => {
          throw new Error('event file should not be read');
        },
        readStdin: async () => JSON.stringify(input),
      });
      await command.parseAsync(['record', '--event-file', '-'], {
        from: 'user',
      });
      expect(process.exitCode).toBe(1);
      const payload = json.mock.calls.at(-1)?.[0] as {
        status?: string;
        message?: string;
      };
      expect(payload.status).toBe('error');
      return String(payload.message);
    } finally {
      process.exitCode = previousExitCode;
    }
  }

  it('never echoes a secret from a rejected enum field', async () => {
    const input = managedClaudeInput('implementer');
    (input.recordBase as Record<string, unknown>).launch_status = SECRET;
    (input.event.evidence as Record<string, unknown>).tier = SECRET;

    // The report scrubs each violation itself; the command boundary remains
    // the backstop for every other message.
    expect(() => parseDispatchRecordInput(input)).toThrow(
      /launch_status: Invalid enum value/,
    );
    expect(() => parseDispatchRecordInput(input)).not.toThrow(SECRET);

    const message = await commandError(input);
    expect(message).toContain('recordBase launch_status:');
    expect(message).toContain('event evidence.tier:');
    expect(message).toContain('<redacted-secret>');
    expect(message).not.toContain(SECRET);
    expect(message).not.toMatch(/ghp_/);
  });

  it('never echoes a secret through the action/role or variant messages', async () => {
    const input = managedClaudeInput('implementer');
    (input.recordBase as Record<string, unknown>).action = SECRET;
    input.claudeLaunch.payload = { variant: SECRET };

    const message = await commandError(input);
    expect(message).toContain('recordBase action:');
    expect(message).toContain('claudeLaunch payload.variant:');
    expect(message).not.toMatch(/ghp_/);
    // Scrubbing a value keeps the sentence's own closing period.
    expect(message).toContain(
      'conflicts with record action <redacted-secret>.',
    );
  });

  it('keeps every report line when a rejected value holds an unterminated private key', async () => {
    const input = managedClaudeInput('implementer');
    const base = input.recordBase as Record<string, unknown>;
    base.launch_status = '-----BEGIN PRIVATE KEY-----';
    base.caller = 5;
    (input.event.evidence as Record<string, unknown>).tier =
      'npm_abcdefghijklmnopqrstuvwxyz0123456789';

    const message = await commandError(input);
    const lines = message.split('\n');
    const count = Number(/has (\d+) violations?:/.exec(lines[0] ?? '')?.[1]);
    const violationLines = lines
      .slice(1)
      .filter((line) => !line.startsWith('Skipped until'));
    expect(count).toBeGreaterThanOrEqual(5);
    expect(violationLines).toHaveLength(count);
    for (const line of violationLines) {
      expect(line).toMatch(/^(claudeLaunch|recordBase|event) \S+: /);
    }
    expect(message).toContain('recordBase caller:');
    expect(message).toContain('event evidence.tier:');
    expect(message).not.toMatch(/PRIVATE KEY|npm_/);
  });

  it('reports runtime-observation event errors in the same run as recordBase errors', async () => {
    const input = managedClaudeInput('implementer') as Record<string, unknown>;
    (input.recordBase as Record<string, unknown>).caller = 7;
    input.event = {
      kind: 'runtime-observation',
      requestId: 'managed-claude-implementation',
      observation: {
        status: 'reported',
        provider: 'codex',
        model: 'claude-sonnet-5',
        observedAt: 'not-a-date',
      },
    };

    const message = await commandError(input);
    expect(message).toMatch(/^Managed Claude dispatch input has 4 violations:/);
    expect(message).toContain('recordBase caller:');
    expect(message).toContain('event source:');
    expect(message).toContain('event observation.observedAt: Invalid datetime');
    expect(message).toContain(
      'event observation.provider: A runtime observation must name the same provider as its dispatch record.',
    );
  });

  it('reports metadata-form observation errors in the same run as recordBase errors', async () => {
    const input = managedClaudeInput('implementer') as Record<string, unknown>;
    (input.recordBase as Record<string, unknown>).caller = 7;
    input.event = {
      kind: 'runtime-observation',
      requestId: 'managed-claude-implementation',
      source: 'runtime-observer',
      extra: true,
      metadata: { provider: 'claude', observedAt: 'not-a-date', entries: [] },
    };

    const message = await commandError(input);
    expect(message).toContain('recordBase caller:');
    expect(message).toContain('event metadata.observedAt: Invalid datetime');
    expect(message).toContain('event <root>: Unrecognized key(s)');
    expect(message).not.toContain('event observation');
  });

  it('still validates a well-formed finished observation without source or match', async () => {
    const input = managedClaudeInput('implementer') as Record<string, unknown>;
    input.event = {
      kind: 'runtime-observation',
      requestId: 'managed-claude-implementation',
      source: 'runtime-observer',
      observation: {
        status: 'reported',
        provider: 'claude',
        model: 'claude-sonnet-5',
        observedAt: '2026-09-27T00:00:00.000Z',
      },
    };
    const result = await recordProjectDispatch({ input });
    expect(result.status).toBe('validated-only');
    expect(result.runtimeIdentity.match).toBe('matching');
  });

  it('never prints an absolute path in the single-run report', async () => {
    const input = everyViolationInput();
    input.claudeLaunch.payload = { variant: '/Users/alice/secret/variant' };
    const json = vi.fn();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const command = createProjectDispatchCommand({
        buildCommandContext: () => ({
          scope: 'all',
          dryRun: false,
          verbose: false,
          json: true,
          cwd: process.cwd(),
          home: '/Users/alice',
          interactive: false,
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            json,
          },
        }),
        resolveProjectRoot: async () => process.cwd(),
        readFile: async () => {
          throw new Error('event file should not be read');
        },
        readStdin: async () => JSON.stringify(input),
      });
      await command.parseAsync(['record', '--event-file', '-'], {
        from: 'user',
      });

      const payload = json.mock.calls.at(-1)?.[0] as {
        status?: string;
        message?: string;
      };
      expect(Object.keys(payload).sort()).toEqual(['message', 'status']);
      expect(payload.status).toBe('error');
      expect(payload.message).toMatch(
        /^Managed Claude dispatch input has \d+ violations:/,
      );
      expect(payload.message).toContain('claudeLaunch payload.variant:');
      expect(payload.message).not.toContain('/Users/alice');
      expect(payload.message).not.toContain(process.cwd());
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});

describe('recordProjectDispatch', () => {
  it('validates one record and event and writes nothing', async () => {
    const result = await recordProjectDispatch({
      input: { record: genericRecord(), event: canonicalEvent() },
    });
    expect(Object.keys(result).sort()).toEqual([
      'record',
      'runtimeIdentity',
      'status',
    ]);
    expect(result.status).toBe('validated-only');
    expect(result.record.oat.canonicalRole).toMatchObject({
      status: 'resolved',
    });
  });

  it('refuses a fallback link, whose trigger record it has no journal to read', async () => {
    await expect(
      recordProjectDispatch({ input: fallbackInput('dispatch-fallback-1') }),
    ).rejects.toThrow(/Fallback requires the rejected trigger record/);
  });

  it('rejects request traversal and sensitive stdin-shaped input', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord({ request_id: '../escape' }),
        event: canonicalEvent('../escape'),
      }),
    ).toThrow(/request_id/i);
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...canonicalEvent(),
          prompt: 'do not persist me',
        },
      }),
    ).toThrow(/sensitive dispatch content/i);
  });

  it.each([
    'apiKey',
    'api_key',
    'password',
    'systemPrompt',
    'transcriptBody',
    'accessToken',
    'clientSecret',
    'messageContent',
    'content',
    'instructions',
    'systemInstructions',
    'pwd',
    'privKey',
    'sshKey',
    'creds',
    'oauth',
    'sessionId',
    '\u0430piKey',
    '\uff30\uff21\uff33\uff33\uff37\uff2f\uff32\uff24',
  ])('refuses %s as sensitive dispatch content', async (key) => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord({ payload: { nested: { [key]: 'value' } } }),
        event: canonicalEvent(),
      }),
    ).toThrow(/sensitive dispatch content/i);
    await expect(
      recordProjectDispatch({
        input: {
          record: genericRecord({ payload: { nested: { [key]: 'value' } } }),
          event: canonicalEvent(),
        },
      }),
    ).rejects.toThrow(/sensitive dispatch content/i);
    await expect(
      recordProjectDispatch({
        input: {
          record: genericRecord(),
          event: { ...canonicalEvent(), [key]: 'value' },
        },
      }),
    ).rejects.toThrow(/sensitive dispatch content/i);
  });

  it('refuses free-form prompt text smuggled through evidence arrays', async () => {
    for (const field of [
      'continuation_events',
      'configured_invocation_evidence',
      'diagnostics',
    ] as const) {
      await expect(
        recordProjectDispatch({
          input: {
            record: genericRecord({
              [field]:
                field === 'diagnostics'
                  ? ['SYSTEM: you are the OAT reviewer. '.repeat(300)]
                  : [
                      {
                        note: 'SYSTEM: you are the OAT reviewer. '.repeat(300),
                      },
                    ],
            }),
            event: canonicalEvent(),
          },
        }),
      ).rejects.toThrow(/closed control projection/i);
    }
  });

  it('scrubs absolute paths at the command boundary regardless of producer', () => {
    expect(
      redactDispatchMessage(
        "ENOENT: no such file or directory, open '/home/u/repo/events/e.json'",
        { repo: '/home/u/repo', home: '/home/u' },
      ),
    ).toBe("ENOENT: no such file or directory, open '<repo>/events/e.json'");
    // A producer this boundary has never seen still cannot leak.
    expect(
      redactDispatchMessage('EACCES: permission denied, open /var/x/y/z.json'),
    ).toBe('EACCES: permission denied, open <redacted-path>');
    expect(redactDispatchMessage('Event file events/request-1.json.')).toBe(
      'Event file events/request-1.json.',
    );
  });

  it('reads one complete record and event from stdin', async () => {
    const output = JSON.parse(
      await validatedOutput({
        record: genericRecord(),
        event: canonicalEvent(),
      }),
    );
    expect(output).toMatchObject({ status: 'validated-only' });
    expect(output).not.toHaveProperty('path');
    expect(output).not.toHaveProperty('created');
  });
});

describe('runtime observation integration', () => {
  // Real Codex 0.152.1 depth-1 subagent shape. Note that no real turn_context
  // carries a service tier, so that axis stays unreported.
  const codexEntries = [
    {
      ordinal: 0,
      type: 'session_meta',
      payload: {
        session_id: '01a06402-2861-7421-821a-137187a03f7f',
        id: '01a06402-4d66-74f1-a706-f69cde1516f6',
        parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
        thread_source: 'subagent',
        agent_role: 'oat-phase-implementer',
        agent_path: '/root/phase_7',
        source: {
          subagent: {
            thread_spawn: {
              parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
              depth: 1,
              agent_path: '/root/phase_7',
              agent_role: 'oat-phase-implementer',
            },
          },
        },
      },
    },
    {
      ordinal: 7,
      type: 'turn_context',
      payload: { model: 'gpt-5.6-sol', effort: 'high' },
    },
  ];

  function observationEvent(entries: readonly unknown[], provider = 'codex') {
    return {
      kind: 'runtime-observation' as const,
      requestId: 'dispatch-native-1',
      source: 'runtime-observer' as const,
      metadata: {
        provider,
        observedAt: '2026-09-02T12:00:00.000Z',
        entries,
      },
    };
  }

  async function record(
    entries: readonly unknown[],
    overrides: Partial<GenericDispatchRecord> = {},
    provider = 'codex',
  ) {
    const input = {
      record: genericRecord(overrides),
      event: observationEvent(entries, provider),
    };
    const result = await recordProjectDispatch({ input });
    return { input, result };
  }

  it('records a matching observation without touching configured evidence', async () => {
    const configured = genericRecord();
    const { result } = await record(codexEntries);

    expect(result.record.oat.runtimeObservation).toEqual({
      status: 'reported',
      provider: 'codex',
      childLineage: 'depth-1',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
      effort: 'high',
      source: 'codex-rollout-metadata',
      observedAt: '2026-09-02T12:00:00.000Z',
      match: 'matching',
      comparedAxes: ['role', 'model', 'effort'],
    });
    const { oat: _oat, ...generic } = result.record;
    expect(generic).toEqual(configured);
    expect(result.record.launch_status).toBe('accepted');
    expect(result.record.runtime_confirmation).toBe('not-reported');
  });

  it('records a mismatch as evidence without changing launch or controls', async () => {
    const { result } = await record([
      {
        ordinal: 0,
        type: 'session_meta',
        payload: {
          id: '01a06402-2861-7421-821a-137187a03f7f',
          thread_source: 'user',
          source: 'exec',
        },
      },
      {
        ordinal: 7,
        type: 'turn_context',
        payload: { model: 'gpt-5.6-terra' },
      },
    ]);

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      match: 'mismatching',
      model: 'gpt-5.6-terra',
    });
    // A post-acceptance mismatch is not a fallback trigger.
    expect(result.record.oat.fallback).toEqual({
      status: 'not-applicable',
      reason: 'No fallback recorded.',
    });
    expect(result.record.model_selector).toBe('gpt-5.6-sol');
    expect(result.record.launch_status).toBe('accepted');
    expect(result.record.child_outcome).toBe('completed');
  });

  it('records missing metadata and Cursor as not-reported', async () => {
    const missing = await record([]);
    expect(missing.result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });

    const cursor = await record(
      codexEntries,
      { provider: 'cursor', role_selector: 'generalPurpose' },
      'cursor',
    );
    expect(cursor.result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });
    expect(JSON.stringify(cursor.result.record.oat)).not.toContain(
      'gpt-5.6-sol',
    );
  });

  it('reports configured and observed evidence as separate result fields', async () => {
    const { result } = await record(codexEntries);
    expect(result.runtimeIdentity).toEqual({
      configured: {
        roleName: 'oat-phase-implementer',
        roleSelector: 'oat-phase-implementer-gpt-5-6-sol-high',
        model: 'gpt-5.6-sol',
        effort: 'high',
        serviceTier: 'priority',
      },
      observed: {
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        childLineage: 'depth-1',
        role: 'oat-phase-implementer',
        model: 'gpt-5.6-sol',
        effort: 'high',
        serviceTier: null,
      },
      match: 'matching',
      comparedAxes: ['role', 'model', 'effort'],
      reason: null,
      status: 'reported',
    });

    const absent = await record([]);
    expect(absent.result.runtimeIdentity).toMatchObject({
      observed: null,
      match: null,
      comparedAxes: [],
      status: 'not-reported',
    });
    expect(absent.result.runtimeIdentity.configured.model).toBe('gpt-5.6-sol');
  });

  it('refuses an ambiguous or malformed observation event', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...observationEvent(codexEntries),
          observation: { status: 'not-reported' },
        },
      }),
    ).toThrow(/observation or metadata/i);
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...observationEvent(codexEntries),
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: codexEntries,
            transcript: 'the whole conversation',
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    ['codex', 'ROOT_ROLLOUT', ROOT_ROLLOUT],
    ['codex', 'DEPTH_1_ROLLOUT', DEPTH_1_ROLLOUT],
    ['codex', 'DEPTH_2_ROLLOUT', DEPTH_2_ROLLOUT],
    ['claude', 'MAIN_SESSION_TRANSCRIPT', MAIN_SESSION_TRANSCRIPT],
    ['claude', 'SIDECHAIN_TRANSCRIPT', SIDECHAIN_TRANSCRIPT],
  ])(
    'drives the real %s fixture %s through the validation boundary',
    async (provider, _name, entries) => {
      // The captured shapes must survive the boundary they cross in
      // production. Testing the parsers alone let a projection that the
      // sensitive-content boundary refuses ship twice.
      const result = await recordProjectDispatch({
        input: {
          record: genericRecord({ provider }),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            metadata: {
              provider,
              observedAt: '2026-09-02T12:00:00.000Z',
              entries,
            },
          },
        },
      });
      expect(result.status).toBe('validated-only');
      expect(result.record.oat.runtimeObservation).toMatchObject({
        status: 'reported',
      });
    },
  );

  it('degrades an over-bound envelope instead of losing the record', async () => {
    const result = await recordProjectDispatch({
      input: {
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: Array.from({ length: 20_000 }, () => ({
              type: 'event_msg',
            })),
          },
        },
      },
    });
    // The observation layer is optional; a size violation on it must never
    // fail validation of the mandatory record.
    expect(result.status).toBe('validated-only');
    expect(result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });
  });

  it('refuses a reported observation for a provider with no capability', async () => {
    await expect(
      recordProjectDispatch({
        input: {
          record: genericRecord({
            provider: 'cursor',
            role_selector: 'generalPurpose',
          }),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            observation: {
              status: 'reported',
              provider: 'cursor',
              model: 'cursor-composer-2',
              source: 'cursor-transcript-metadata',
              observedAt: '2026-09-02T12:00:00.000Z',
              match: 'matching',
            },
          },
        },
      }),
    ).rejects.toThrow(/capabilit/i);
  });

  it('declines a session that names a different request, on the live path', async () => {
    // The declared-correlation guard has to run where records are actually
    // written; a guard reachable only from a helper the CLI never calls is
    // a test passing on dead code.
    const { result } = await record([
      {
        ordinal: 0,
        type: 'session_meta',
        payload: {
          id: '01a06402-4d66-74f1-a706-f69cde1516f6',
          parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
          thread_source: 'subagent',
          request_id: 'dispatch-some-other-request',
          agent_role: 'oat-phase-implementer',
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
                depth: 1,
              },
            },
          },
        },
      },
      {
        ordinal: 7,
        type: 'turn_context',
        payload: { model: 'gpt-5.6-sol', effort: 'high' },
      },
    ]);
    expect(result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });
    expect(result.runtimeIdentity.reason).toMatch(/correlat/i);
  });

  it('names why an observation degraded', async () => {
    const overBound = await record(
      Array.from({ length: 20_000 }, () => ({ type: 'event_msg' })),
    );
    expect(overBound.result.runtimeIdentity).toMatchObject({
      status: 'not-reported',
      reason: expect.stringMatching(/too large|bound/i),
    });

    const cursor = await record(
      [{ ordinal: 0, type: 'session_meta', payload: { id: 'x' } }],
      { provider: 'cursor', role_selector: 'generalPurpose' },
      'cursor',
    );
    expect(cursor.result.runtimeIdentity.reason).toMatch(
      /no runtime observation channel/i,
    );
  });

  it('declines an envelope naming a different provider, in production', async () => {
    // Drives parseDispatchRecordInput itself. Claude entries that do produce
    // facts, against a codex record: if the mismatch branch were neutralized
    // the projection would succeed and this would report.
    const parsed = parseDispatchRecordInput({
      record: genericRecord({ provider: 'codex' }),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        metadata: {
          provider: 'claude',
          observedAt: '2026-09-02T12:00:00.000Z',
          entries: SIDECHAIN_TRANSCRIPT,
        },
      },
    });
    expect(parsed.event).toMatchObject({
      observation: { status: 'not-reported' },
    });
    expect(parsed.observationReason).toMatch(/names provider claude/i);

    // Guard against a vacuous pass: the same entries under a matching record
    // must report, so the assertion above can only come from the branch.
    expect(
      parseDispatchRecordInput({
        record: genericRecord({
          provider: 'claude',
          model_selector: 'claude-opus-5',
        }),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'claude',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: SIDECHAIN_TRANSCRIPT,
          },
        },
      }).event,
    ).toMatchObject({ observation: { status: 'reported' } });
  });

  it('never emits an unredacted path in a degradation reason', async () => {
    const json = vi.fn();
    const secret = '/Users/someone/secret/key.pem';
    const previousExitCode = process.exitCode;
    try {
      const command = createProjectDispatchCommand({
        buildCommandContext: () => ({
          scope: 'all',
          dryRun: false,
          verbose: false,
          json: true,
          cwd: process.cwd(),
          home: '/Users/someone',
          interactive: false,
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            json,
          },
        }),
        resolveProjectRoot: async () => process.cwd(),
        readFile: async () => '',
        readStdin: async () =>
          JSON.stringify({
            record: genericRecord(),
            event: {
              kind: 'runtime-observation',
              requestId: 'dispatch-native-1',
              source: 'runtime-observer',
              metadata: {
                provider: secret,
                observedAt: '2026-09-02T12:00:00.000Z',
                entries: [],
              },
            },
          }),
      });
      await command.parseAsync(['record', '--event-file', '-'], {
        from: 'user',
      });
      // The reason is the first new call site since the redaction boundary's
      // docstring promised it could not be bypassed.
      const emitted = JSON.stringify(json.mock.calls);
      expect(emitted).not.toContain(secret);
      expect(emitted).not.toContain('/Users/someone');
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it('rejects an absolute path in every identity or control field', () => {
    // A path is never a legitimate caller, scope, selector or route. Rewriting
    // one in place would corrupt the identifier, so these fail closed.
    for (const [field, value] of [
      ['caller', '/Users/tstang/secret/caller'],
      ['scope', '/Users/tstang/private/scope'],
      ['role_selector', '/Users/tstang/role'],
      ['model_selector', '/Users/tstang/model'],
      ['selected_route', '/Users/tstang/route'],
      ['authority', '/secret'],
      ['guidance_reference', 'file:///Users/tstang/guide.md'],
    ] as const) {
      expect(
        () =>
          parseDispatchRecordInput({
            record: genericRecord({ [field]: value }),
            event: canonicalEvent(),
          }),
        field,
      ).toThrow(/absolute filesystem path/i);
    }
  });

  it('redacts absolute paths out of the validate-only output', async () => {
    const secrets = {
      objective: '/Users/tstang/.ssh/id_rsa',
      payload: '/Users/tstang/private/payload',
      evidence: '/Users/tstang/evidence',
      diagnostic: '/Users/tstang/diag',
      continuation: 'C:\\Users\\tstang\\cont',
      escalate: '\\\\srv\\share\\escalate',
      expected: 'file:///Users/tstang/expected',
      verification: '/secret',
    };
    const input = {
      record: genericRecord({
        objective: `read ${secrets.objective} then continue`,
        payload: { note: secrets.payload },
        configured_invocation_evidence: [secrets.evidence],
        diagnostics: [secrets.diagnostic],
        continuation_events: [{ at: secrets.continuation }],
        escalate_when: [secrets.escalate],
        expected_output: secrets.expected,
        verification_evidence: `run ${secrets.verification}`,
      }),
      event: canonicalEvent(),
    };

    // Assert on the exact JSON the command prints, not on an in-memory value.
    const output = await validatedOutput(input);
    for (const [name, secret] of Object.entries(secrets)) {
      expect(output, name).not.toContain(JSON.stringify(secret).slice(1, -1));
    }
    expect(output).toContain('<redacted-path>');
    // Redaction, not deletion: the surrounding prose survives.
    expect(JSON.parse(output).record.objective).toBe(
      'read <redacted-path> then continue',
    );
    expect(output).not.toContain('/Users/');
  });

  it('redacts assignment-form paths out of the validate-only output', async () => {
    const secrets = {
      objective: 'cwd=/Users/alice/private',
      diagnostic: 'source=file:///etc/passwd',
      evidence: '--path=/Users/alice/x',
      payload: 'drive=C:\\Users\\alice\\x',
      continuation: 'paths=/etc/a,/etc/b',
    };
    const output = await validatedOutput({
      record: genericRecord({
        objective: `run with ${secrets.objective} now`,
        diagnostics: [secrets.diagnostic],
        configured_invocation_evidence: [secrets.evidence],
        payload: { note: secrets.payload },
        continuation_events: [{ at: secrets.continuation }],
      }),
      event: canonicalEvent(),
    });

    for (const probe of [
      '/Users/alice/private',
      'file:///etc/passwd',
      '/Users/alice/x',
      'C:\\Users\\alice',
      '/etc/a',
      '/etc/b',
    ]) {
      expect(output, probe).not.toContain(JSON.stringify(probe).slice(1, -1));
    }
    expect(output).toContain('<redacted-path>');
  });

  it('refuses an oversized-after-redaction record', async () => {
    // `<redacted-path>` is far longer than `/a`, so sanitizing inflates the
    // record. The size checks ran before redaction, so the redacted result is
    // measured again.
    const command = '/a '.repeat(3400).trim();
    const input = {
      record: genericRecord(),
      event: {
        kind: 'canonical-role-resolution' as const,
        requestId: 'dispatch-native-1',
        source: 'canonical-role-resolver' as const,
        evidence: {
          status: 'missing' as const,
          dependency: 'workflows',
          canonicalRole: 'oat-phase-implementer',
          candidateMisses: [],
          recovery: [{ command }, { command }, { command }],
        },
      },
    };
    // The input itself is comfortably legal; only redaction pushes it over.
    expect(new TextEncoder().encode(JSON.stringify(input)).length).toBeLessThan(
      64 * 1024,
    );

    await expect(recordProjectDispatch({ input })).rejects.toThrow(
      /byte|limit/i,
    );
  });

  it('refuses a record that only exceeds the limit in its serialized form', async () => {
    // The limit is measured on pretty-printed JSON plus a newline. Validating
    // compact bytes let a record validated at 65,536 measure 65,874.
    // Sized to stay inside every per-field bound (430 values, ~15 KiB each)
    // so only the compact-vs-published difference can trip the ceiling.
    const entry = (prefix: string, i: number) =>
      `${prefix}${String(i).padStart(3, '0')}-${'x'.repeat(28)}`;
    const list = (prefix: string) =>
      Array.from({ length: 380 }, (_, i) => entry(prefix, i));
    const oversized = genericRecord({
      diagnostics: list('d'),
      configured_invocation_evidence: list('e'),
      continuation_events: list('c'),
      payload: Object.fromEntries(
        Array.from({ length: 380 }, (_, i) => [`k${i}`, entry('p', i)]),
      ),
    });
    const compact = new TextEncoder().encode(JSON.stringify(oversized)).length;
    // Comfortably legal compact; only the published form exceeds the ceiling.
    expect(compact).toBeLessThan(64 * 1024);

    await expect(
      recordProjectDispatch({
        input: { record: oversized, event: canonicalEvent() },
      }),
    ).rejects.toThrow(/byte|limit/i);
  });

  it('refuses an identity-field path through the recorder', async () => {
    await expect(
      recordProjectDispatch({
        input: {
          record: genericRecord({ caller: '/Users/alice/secret' }),
          event: canonicalEvent(),
        },
      }),
    ).rejects.toThrow(/absolute filesystem path/i);
  });

  it('rejects a colon-prefixed path in an identity field', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord({ caller: 'cwd:/Users/alice/private' }),
        event: canonicalEvent(),
      }),
    ).toThrow(/absolute filesystem path/i);
  });

  it('leaves a colon-prefixed path in prose, matching the stated limit', async () => {
    // Best-effort redaction: this survives, and the suite says so rather than
    // implying a guarantee the sanitizer does not provide.
    const { result } = await record(codexEntries, {
      objective: 'inspect cwd:/Users/alice/private now',
    });
    expect(result.record.objective).toBe(
      'inspect cwd:/Users/alice/private now',
    );
  });

  it('redacts a path in nested event evidence out of the validate-only output', async () => {
    const output = await validatedOutput({
      record: genericRecord(),
      event: {
        ...canonicalEvent(),
        evidence: {
          ...canonicalEvent().evidence,
          dependency: '/Users/tstang/dependency',
        },
      },
    });
    expect(output).not.toContain('/Users/tstang/dependency');
    expect(output).toContain('<redacted-path>');
  });

  it('keeps the parser source through the command layer', async () => {
    // Provenance is not idempotent under re-parsing: a resolved observation
    // looks caller-supplied. This pins that the command layer parses once.
    const json = vi.fn();
    const previousExitCode = process.exitCode;
    try {
      const command = createProjectDispatchCommand({
        buildCommandContext: () => ({
          scope: 'all',
          dryRun: false,
          verbose: false,
          json: true,
          cwd: process.cwd(),
          home: process.cwd(),
          interactive: false,
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            json,
          },
        }),
        resolveProjectRoot: async () => process.cwd(),
        readFile: async () => '',
        readStdin: async () =>
          JSON.stringify({
            record: genericRecord(),
            event: {
              kind: 'runtime-observation',
              requestId: 'dispatch-native-1',
              source: 'runtime-observer',
              metadata: {
                provider: 'codex',
                observedAt: '2026-09-02T12:00:00.000Z',
                entries: codexEntries,
              },
            },
          }),
      });
      await command.parseAsync(['record', '--event-file', '-'], {
        from: 'user',
      });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeIdentity: expect.objectContaining({ status: 'reported' }),
          record: expect.objectContaining({
            oat: expect.objectContaining({
              runtimeObservation: expect.objectContaining({
                source: 'codex-rollout-metadata',
              }),
            }),
          }),
        }),
      );
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it('never lets a caller borrow a parser source string', async () => {
    const result = await recordProjectDispatch({
      input: {
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          observation: {
            status: 'reported',
            provider: 'codex',
            model: 'gpt-5.6-sol',
            source: 'codex-rollout-metadata',
            observedAt: '2026-09-02T12:00:00.000Z',
            match: 'matching',
          },
        },
      },
    });
    // Source states provenance, so it is derived from the path that produced
    // the evidence rather than accepted from the caller.
    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      source: 'caller-asserted',
    });
  });

  it('accepts a raw captured rollout and stores none of its content', async () => {
    // Real rollouts carry `session_id` (which classifies as sensitive),
    // `base_instructions`, and conversation entries. The allowlist projection
    // is the guarantee: they are dropped before anything is asserted or
    // emitted, so a caller never has to hand-roll a stripper.
    const { input, result } = await record([
      {
        ordinal: 0,
        type: 'session_meta',
        payload: {
          session_id: '01a06402-2861-7421-821a-137187a03f7f',
          id: '01a06402-4d66-74f1-a706-f69cde1516f6',
          parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
          thread_source: 'subagent',
          agent_role: 'oat-phase-implementer',
          agent_path: '/root/phase_7',
          base_instructions: 'SECRET-SYSTEM-PROMPT',
          cwd: '/Users/someone/secret-workspace',
          git: { repository_url: 'git@example.com:private/repo.git' },
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
                depth: 1,
                agent_path: '/root/phase_7',
                agent_role: 'oat-phase-implementer',
              },
            },
          },
        },
      },
      {
        ordinal: 3,
        type: 'response_item',
        payload: { content: 'SECRET-USER-MESSAGE' },
      },
      {
        ordinal: 7,
        type: 'turn_context',
        payload: {
          model: 'gpt-5.6-sol',
          effort: 'high',
          cwd: '/Users/someone/secret-workspace',
        },
      },
    ]);

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      childLineage: 'depth-1',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
    });
    const output = await validatedOutput(input);
    for (const secret of [
      'SECRET-SYSTEM-PROMPT',
      'SECRET-USER-MESSAGE',
      '/Users/someone/secret-workspace',
      'git@example.com',
      'base_instructions',
      'session_id',
      'entries',
    ]) {
      expect(output, secret).not.toContain(secret);
    }
  });

  it('drops a Claude result answer instead of merely ignoring it', async () => {
    const input = {
      record: genericRecord({
        provider: 'claude',
        model_selector: 'claude-opus-5',
        role_selector: 'oat-phase-implementer',
        service_tier_selector: 'standard',
      }),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        metadata: {
          provider: 'claude',
          observedAt: '2026-09-02T12:00:00.000Z',
          entries: [
            {
              type: 'system',
              subtype: 'init',
              session_id: 'sess-claude-1',
              model: 'claude-opus-5',
              service_tier: 'standard',
              agent: 'oat-phase-implementer',
            },
            {
              type: 'result',
              subtype: 'success',
              result: 'SECRET-ASSISTANT-ANSWER in full prose form.',
              modelUsage: { 'claude-opus-5': { serviceTier: 'standard' } },
            },
          ],
        },
      },
    };
    const result = await recordProjectDispatch({ input });

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      provider: 'claude',
      model: 'claude-opus-5',
    });
    expect(JSON.stringify(result.record)).not.toContain(
      'SECRET-ASSISTANT-ANSWER',
    );
    expect(await validatedOutput(input)).not.toContain(
      'SECRET-ASSISTANT-ANSWER',
    );
  });

  it('recomputes a caller-asserted match instead of trusting it', () => {
    // A caller cannot declare agreement it does not have: match is derived at
    // the durable-write boundary from the observation's own axes.
    const parsed = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: {
          status: 'reported',
          provider: 'codex',
          model: 'wrong-model',
          source: 'attacker',
          observedAt: '2026-09-02T12:00:00.000Z',
          match: 'matching',
        },
      },
    });
    expect(parsed.event).toMatchObject({
      observation: { match: 'mismatching', model: 'wrong-model' },
    });

    const agreeing = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: {
          status: 'reported',
          provider: 'codex',
          model: 'gpt-5.6-sol',
          source: 'codex-rollout-metadata',
          observedAt: '2026-09-02T12:00:00.000Z',
          match: 'mismatching',
        },
      },
    });
    expect(agreeing.event).toMatchObject({
      observation: { match: 'matching' },
    });
  });

  it('refuses an observation claiming a provider the record does not name', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          observation: {
            status: 'reported',
            provider: 'claude',
            source: 'attacker',
            observedAt: '2026-09-02T12:00:00.000Z',
            match: 'matching',
          },
        },
      }),
    ).toThrow(/provider/i);
  });

  it('refuses observation values that are not provider identifiers', () => {
    for (const model of [
      'a model chosen by the child',
      '/Users/someone/secret',
      'C:/Users/someone/secret',
      'https://evil.example/x',
    ]) {
      expect(
        () =>
          parseDispatchRecordInput({
            record: genericRecord(),
            event: {
              kind: 'runtime-observation',
              requestId: 'dispatch-native-1',
              source: 'runtime-observer',
              observation: {
                status: 'reported',
                provider: 'codex',
                model,
                source: 'codex-rollout-metadata',
                observedAt: '2026-09-02T12:00:00.000Z',
                match: 'matching',
              },
            },
          }),
        model,
      ).toThrow();
    }
  });

  it('keeps a finished observation event working unchanged', () => {
    const parsed = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: { status: 'not-reported' },
      },
    });
    expect(parsed.event).toMatchObject({
      kind: 'runtime-observation',
      observation: { status: 'not-reported' },
    });
  });

  it('launches no provider: the recorder graph cannot start a process', async () => {
    const modules = [
      './record.ts',
      './index.ts',
      '../../../providers/identity/runtime-observation.ts',
      '../../../providers/identity/codex-runtime-observation.ts',
      '../../../providers/identity/claude-runtime-observation.ts',
      '../../../providers/identity/oat-dispatch-record.ts',
      '../../../providers/identity/generic-dispatch-record.ts',
    ];
    const launchers =
      /child_process|node:net|node:http|\bspawn\s*\(|\bexecFile|\bexecSync\s*\(|\bfetch\s*\(/u;
    for (const specifier of modules) {
      const source = await readFile(
        new URL(specifier, import.meta.url),
        'utf8',
      );
      expect(
        launchers.test(source),
        `${specifier} must not be able to launch a provider`,
      ).toBe(false);
    }
  });
});
