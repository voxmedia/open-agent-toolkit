import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GenericDispatchRecord } from '@providers/identity/generic-dispatch-record';
import { describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCommand } from './index';
import {
  parseDispatchRunLine,
  projectDispatchRunLine,
  recordProjectDispatch,
  renderDispatchRunLine,
  type DispatchRunLineFields,
} from './record';

const STAMP =
  'Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high';

function genericRecord(
  overrides: Partial<GenericDispatchRecord> = {},
): GenericDispatchRecord {
  return {
    request_id: 'ac-p01-implementation',
    caller: 'oat-project-implement',
    scope: 'p01',
    objective: 'Implement phase p01',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'claude',
    dispatch_context: 'phase-dispatch',
    dispatch_policy: 'frontier',
    dispatch_ceiling: 'high',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'user-sync',
      observed_at: '2026-10-12T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-claude-claude-opus-5-5-high',
    model_selector: 'claude-opus-5-5',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: null,
    service_tier_selector: null,
    selection_source: 'policy-resolved',
    candidates_considered: [
      'oat-phase-implementer-claude-claude-opus-5-5-high',
    ],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 7200,
    retry_limit: 0,
    payload: { variant: 'oat-phase-implementer-claude-claude-opus-5-5-high' },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

function canonicalEvent(requestId = 'ac-p01-implementation') {
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

function preStartEvent(requestId: string) {
  return {
    kind: 'pre-start-rejection-attestation' as const,
    requestId,
    source: 'provider-wrapper' as const,
    expectedLaunchStatus: 'blocked-before-start' as const,
    rejection: {
      code: 'native-role-unavailable',
      rejectedAt: '2026-10-12T00:00:01.000Z',
      provesNoChildStarted: true as const,
    },
  };
}

async function project(
  record: GenericDispatchRecord,
  event: unknown = canonicalEvent(record.request_id),
  dispatchStamp: string | null = STAMP,
) {
  const result = await recordProjectDispatch({ input: { record, event } });
  return projectDispatchRunLine(result, { dispatchStamp });
}

describe('run-line projection (guard: run-line-terminality)', () => {
  it('renders a completed outcome as terminal history', async () => {
    const projection = await project(genericRecord());
    expect(projection.terminal).toBe(true);
    expect(projection.classification).toBe('completed');
    expect(projection.line).toBe(
      [
        'run/v1',
        'request=ac-p01-implementation',
        'scope=p01',
        'action=implementation',
        'role=oat-phase-implementer',
        'target=oat-phase-implementer-claude-claude-opus-5-5-high',
        'model=claude-opus-5-5',
        'effort=high',
        `stamp=${STAMP}`,
        'launch=accepted',
        'outcome=completed',
        'terminal=yes',
        'class=completed',
        'continuation=~',
        'observed=~',
        'match=~',
      ].join(' · '),
    );
  });

  it('classifies a running outcome as non-terminal', async () => {
    const projection = await project(
      genericRecord({ child_outcome: 'running' }),
    );
    expect(projection.terminal).toBe(false);
    expect(projection.classification).toBe('live');
    expect(projection.fields.terminal).toBe('no');
  });

  it('classifies a NEEDS_CONTEXT response with an open handle as non-terminal', async () => {
    const projection = await project(
      genericRecord({ child_outcome: 'NEEDS_CONTEXT' }),
    );
    expect(projection.terminal).toBe(false);
    expect(projection.classification).toBe('live');
  });

  it('classifies a terminal stop as terminal without converting it to success', async () => {
    for (const outcome of ['BLOCKED', 'INVALID_RUN_ABORT', 'failed']) {
      const projection = await project(
        genericRecord({ child_outcome: outcome }),
      );
      expect(projection.classification).toBe('terminal-stop');
      expect(projection.terminal).toBe(true);
    }
  });

  it('renders blocked-before-start as terminal with a null outcome', async () => {
    const projection = await project(
      genericRecord({
        request_id: 'ac-p01-blocked',
        launch_status: 'blocked-before-start',
        child_outcome: null,
        selection_reason: 'pre-start-rejection',
      }),
      preStartEvent('ac-p01-blocked'),
    );
    expect(projection.classification).toBe('blocked-before-start');
    expect(projection.terminal).toBe(true);
    expect(projection.fields.outcome).toBeNull();
    expect(projection.line).toContain(' · outcome=~ · ');
  });

  it('carries continuation references on a continuation line', async () => {
    const projection = await project(
      genericRecord({
        request_id: 'cont-ac-p01-fix-1',
        action: 'fix',
        child_outcome: 'DONE',
        continuation_events: [
          { request_id: 'ac-p01-implementation', kind: 'review-fix' },
        ],
      }),
      canonicalEvent('cont-ac-p01-fix-1'),
      null,
    );
    expect(projection.fields.continuation).toBe('ac-p01-implementation');
    expect(projection.fields.stamp).toBeNull();
    expect(projection.terminal).toBe(true);
  });

  it('never replaces the configured identity with an observed one', async () => {
    const projection = await project(genericRecord(), {
      kind: 'runtime-observation',
      requestId: 'ac-p01-implementation',
      source: 'runtime-observer',
      observation: {
        status: 'reported',
        provider: 'claude',
        observedAt: '2026-10-12T00:00:02.000Z',
        model: 'claude-sonnet-5',
        effort: 'high',
      },
    });
    expect(projection.fields.model).toBe('claude-opus-5-5');
    expect(projection.fields.observed).toBe('claude/claude-sonnet-5/high');
    expect(projection.fields.match).toBe('mismatching');
  });
});

describe('run-line grammar', () => {
  const fields: DispatchRunLineFields = {
    request: 'r-1',
    scope: 'p01',
    action: 'review',
    role: 'oat-reviewer',
    target: 'a · b\\c~d\ne',
    model: null,
    effort: '~',
    stamp: null,
    launch: 'accepted',
    outcome: 'completed',
    terminal: 'yes',
    class: 'completed',
    continuation: null,
    observed: null,
    match: null,
  };

  it('round-trips escaped delimiters, backslashes, tildes, newlines and nulls', () => {
    const line = renderDispatchRunLine(fields);
    expect(line).not.toContain('\n');
    expect(line).toContain('target=a \\· b\\\\c\\~d\\ne');
    expect(line).toContain('effort=\\~');
    expect(parseDispatchRunLine(line)).toEqual({ ok: true, fields });
    expect(parseDispatchRunLine(`- ${line}`)).toEqual({ ok: true, fields });
  });

  it('refuses a line with a missing or reordered field', () => {
    const line = renderDispatchRunLine(fields);
    expect(parseDispatchRunLine(line.replace(' · match=~', ''))).toMatchObject({
      ok: false,
    });
    expect(
      parseDispatchRunLine(line.replace('request=r-1', 'requestid=r-1')),
    ).toMatchObject({ ok: false });
    expect(parseDispatchRunLine('| r-1 | accepted |')).toMatchObject({
      ok: false,
    });
  });
});

async function runCommand(
  args: string[],
  input: unknown,
  mode: 'json' | 'text',
): Promise<{
  exitCode: number | undefined;
  json: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}> {
  const json = vi.fn();
  const info = vi.fn();
  const error = vi.fn();
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    const command = createProjectDispatchCommand({
      buildCommandContext: () => ({
        scope: 'all',
        dryRun: false,
        verbose: false,
        json: mode === 'json',
        cwd: process.cwd(),
        home: process.cwd(),
        interactive: false,
        logger: {
          debug: vi.fn(),
          info,
          warn: vi.fn(),
          error,
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
    await command.parseAsync(['record', '--event-file', '-', ...args], {
      from: 'user',
    });
    return { exitCode: process.exitCode, json, info, error };
  } finally {
    process.exitCode = previousExitCode;
  }
}

describe('project dispatch record --format line', () => {
  const input = {
    record: genericRecord(),
    event: canonicalEvent(),
  };

  it('prints exactly one run line from standard input and writes nothing', async () => {
    const { exitCode, info, json } = await runCommand(
      ['--format', 'line', '--dispatch-stamp', STAMP],
      input,
      'text',
    );
    expect(exitCode).toBe(0);
    expect(json).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
    const line = info.mock.calls[0]?.[0] as string;
    expect(line.startsWith('run/v1 · request=ac-p01-implementation')).toBe(
      true,
    );
    expect(parseDispatchRunLine(line)).toMatchObject({
      ok: true,
      fields: { stamp: STAMP, terminal: 'yes' },
    });
  });

  it('keeps the --json contract and adds the projection', async () => {
    const { exitCode, json } = await runCommand([], input, 'json');
    expect(exitCode).toBe(0);
    const payload = json.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(payload.status).toBe('validated-only');
    expect(Object.keys(payload).sort()).toEqual([
      'record',
      'runLine',
      'runtimeIdentity',
      'status',
    ]);
    expect(payload.runLine).toMatchObject({
      version: 1,
      terminal: true,
      classification: 'completed',
    });
  });

  it('refuses a stamp without the canonical prefix', async () => {
    const { exitCode, info, error } = await runCommand(
      [
        '--format',
        'line',
        '--dispatch-stamp',
        'scope=p01 action=implementation',
      ],
      input,
      'text',
    );
    expect(exitCode).toBe(1);
    expect(info).not.toHaveBeenCalled();
    expect(error.mock.calls[0]?.[0]).toMatch(/canonical "Dispatch: " prefix/);
  });

  it('refuses an unknown format', async () => {
    const { exitCode } = await runCommand(['--format', 'table'], input, 'text');
    expect(exitCode).toBe(1);
  });

  it('renders the published managed Claude example', async () => {
    const example = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          '..',
          '..',
          '.agents',
          'skills',
          'oat-dispatch-subagents',
          'references',
          'managed-claude-example.json',
        ),
        'utf8',
      ),
    ) as Record<string, unknown>;
    for (const key of ['implementer', 'reviewer']) {
      const { exitCode, info } = await runCommand(
        ['--format', 'line'],
        example[key],
        'text',
      );
      expect(exitCode).toBe(0);
      const parsed = parseDispatchRunLine(info.mock.calls[0]?.[0] as string);
      expect(parsed).toMatchObject({
        ok: true,
        fields: { launch: 'planned', outcome: null, terminal: 'no' },
      });
    }
  });
});
