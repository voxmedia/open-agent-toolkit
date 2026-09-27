import { describe, expect, it } from 'vitest';

import { materializeClaudeAgent } from './codec/materialize';
import {
  acceptClaudeLaunchEnvelope,
  collectClaudeLaunchViolations,
  collectClaudeRecordBaseViolations,
  ManagedClaudeDispatchValidationError,
} from './dispatch-envelope';

type Role = 'implementer' | 'reviewer';

function baseRoleFor(role: Role) {
  return role === 'reviewer' ? 'oat-reviewer' : 'oat-phase-implementer';
}

function resolution(role: Role = 'implementer', effort = 'high') {
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
        dispatchArgs: {
          variant: `${baseRoleFor(role)}-claude-claude-sonnet-5-${effort}`,
        },
        modelAxis: 'selected:claude-sonnet-5',
        effortAxis: `selected:${effort}`,
        target,
        selection: { role, policyMode: 'managed', policy: 'high', target },
      },
    },
  };
}

function definition(role: Role = 'implementer', effort = 'high') {
  return materializeClaudeAgent({
    agent: {
      name: baseRoleFor(role),
      description: 'Managed Claude envelope fixture.',
      body: '\n## Role\n\nExecute the bounded task.\n',
    },
    target: { model: 'claude-sonnet-5', effort, owner: 'project-config' },
  }).content;
}

function claudeLaunch(role: Role = 'implementer') {
  return {
    resolution: resolution(role),
    definition: definition(role),
    payload: { variant: `${baseRoleFor(role)}-claude-claude-sonnet-5-high` },
  };
}

function recordBase(action = 'implementation') {
  return {
    request_id: 'managed-claude-1',
    caller: 'oat-project-implement',
    scope: 'p03',
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

describe('collectClaudeLaunchViolations', () => {
  it.each(['implementer', 'reviewer'] as const)(
    'accepts a consistent %s launch',
    (role) => {
      expect(collectClaudeLaunchViolations(claudeLaunch(role))).toEqual({
        resolverRole: role,
        violations: [],
        skipped: [],
      });
    },
  );

  it('reports every independent launch inconsistency in one run', () => {
    const launch = claudeLaunch();
    launch.resolution.providers.claude.modelAxis = 'selected:claude-opus-5-5';
    launch.definition = definition('implementer', 'medium');
    launch.payload = {
      variant: 'oat-phase-implementer-claude-claude-sonnet-5-medium',
      model: 'opus',
    } as never;

    const { violations, skipped } = collectClaudeLaunchViolations(launch);
    expect(violations.map(({ stage, path }) => `${stage} ${path}`)).toEqual([
      'claudeLaunch payload.variant',
      'claudeLaunch definition',
      'claudeLaunch definition',
      'claudeLaunch definition',
      'claudeLaunch payload.model',
      'claudeLaunch resolution.providers.claude.modelAxis',
    ]);
    const messages = violations.map(({ message }) => message).join('\n');
    expect(messages).toMatch(/Claude launch variant .* does not match/);
    expect(messages).toMatch(/absent or is not the matching OAT-managed role/);
    expect(messages).toMatch(/definition name does not match/);
    expect(messages).toMatch(/definition effort does not match/);
    expect(messages).toMatch(/Per-call Claude model opus conflicts/);
    expect(messages).toMatch(/model axis disagrees/);
    expect(skipped).toEqual([]);
  });

  it('reports every schema issue and skips checks that need the failed parse', () => {
    const launch = claudeLaunch();
    const broken = {
      ...launch,
      resolution: { ...launch.resolution, providers: {} },
      payload: {},
    };
    const { resolverRole, violations, skipped } =
      collectClaudeLaunchViolations(broken);
    expect(resolverRole).toBeNull();
    expect(violations.map(({ stage, path }) => `${stage} ${path}`)).toEqual([
      'claudeLaunch resolution.providers.claude',
      'claudeLaunch payload.variant',
    ]);
    expect(skipped).toEqual([
      'claudeLaunch consistency checks (need a parsed resolution)',
    ]);
  });

  it('names the payload checks a failed payload parse skips', () => {
    const launch = claudeLaunch();
    const { violations, skipped } = collectClaudeLaunchViolations({
      ...launch,
      payload: { model: 'claude-opus-5-5' },
    });
    expect(violations.map(({ stage, path }) => `${stage} ${path}`)).toEqual([
      'claudeLaunch payload.variant',
    ]);
    expect(skipped).toEqual([
      'claudeLaunch payload variant and model checks (need a parsed payload)',
    ]);
  });

  it('rejects a non-object launch without inventing dependent findings', () => {
    expect(collectClaudeLaunchViolations('nope')).toEqual({
      resolverRole: null,
      violations: [
        {
          stage: 'claudeLaunch',
          path: '<root>',
          message:
            'Managed Claude claudeLaunch must be a JSON object with resolution, definition, and payload.',
        },
      ],
      skipped: ['claudeLaunch consistency checks (need a parsed resolution)'],
    });
  });

  it('keeps the first-error text of the throwing envelope boundary', () => {
    const launch = claudeLaunch();
    launch.payload = {
      variant: 'oat-phase-implementer-claude-claude-sonnet-5-medium',
    };
    launch.resolution.providers.claude.effortAxis = 'selected:low';
    expect(() =>
      acceptClaudeLaunchEnvelope({
        resolution: launch.resolution,
        definition: launch.definition,
        launch: launch.payload,
      }),
    ).toThrow(
      'Claude launch variant oat-phase-implementer-claude-claude-sonnet-5-medium does not match resolver-selected variant oat-phase-implementer-claude-claude-sonnet-5-high.',
    );
  });
});

describe('collectClaudeRecordBaseViolations', () => {
  it('accepts a complete base with every derived field omitted', () => {
    expect(
      collectClaudeRecordBaseViolations(recordBase(), 'implementer'),
    ).toEqual({ violations: [], skipped: [] });
  });

  it('reports derived, missing, mismatched, and path violations together', () => {
    const {
      caller: _caller,
      objective: _objective,
      ...base
    } = recordBase('review');
    const { violations } = collectClaudeRecordBaseViolations(
      {
        ...base,
        scope: '/Users/alice/work/p03',
        effort_selector: 'high',
        role_name: 'oat-phase-implementer',
        payload: { variant: 'x' },
      },
      'implementer',
    );
    expect(violations.map(({ stage, path }) => `${stage} ${path}`)).toEqual([
      'recordBase role_name',
      'recordBase effort_selector',
      'recordBase payload',
      'recordBase action',
      'recordBase caller',
      'recordBase objective',
      'recordBase scope',
    ]);
    const messages = violations.map(({ message }) => message);
    expect(messages[0]).toBe(
      'Managed Claude dispatch recordBase must omit derived field role_name.',
    );
    expect(messages[3]).toBe(
      'Managed Claude resolver role implementer conflicts with record action review.',
    );
    expect(messages[6]).toBe(
      'A dispatch record must not carry an absolute filesystem path at scope.',
    );
    expect(messages.join('\n')).not.toContain('/Users/alice');
  });

  it('skips the action check when the resolver role is unknown', () => {
    expect(
      collectClaudeRecordBaseViolations(recordBase('review'), null),
    ).toEqual({
      violations: [],
      skipped: ['recordBase action/role check (needs a parsed resolution)'],
    });
  });

  it('reports cross-field rules in the same run as a missing field', () => {
    const { caller: _caller, ...base } = recordBase();
    const { violations, skipped } = collectClaudeRecordBaseViolations(
      {
        ...base,
        launch_status: 'accepted',
        child_outcome: null,
        task_class: 'hard-reasoning',
      },
      'implementer',
    );
    expect(violations.map(({ stage, path }) => `${stage} ${path}`)).toEqual([
      'recordBase caller',
      'recordBase child_outcome',
      'recordBase model_class_floor',
    ]);
    expect(violations[1]?.message).toBe(
      'An accepted dispatch must report a child outcome.',
    );
    expect(violations[2]?.message).toMatch(
      /requires every task-class field; missing model_class_floor/,
    );
    expect(skipped).toEqual([]);
  });

  it('reports cross-field rules once the base parses', () => {
    const { violations } = collectClaudeRecordBaseViolations(
      { ...recordBase(), child_outcome: null },
      'implementer',
    );
    expect(violations).toEqual([
      {
        stage: 'recordBase',
        path: 'child_outcome',
        message: 'An accepted dispatch must report a child outcome.',
      },
    ]);
  });
});

describe('ManagedClaudeDispatchValidationError', () => {
  it('renders one stage path: message line per violation', () => {
    const error = new ManagedClaudeDispatchValidationError(
      [
        { stage: 'recordBase', path: 'caller', message: 'Required' },
        {
          stage: 'event',
          path: 'evidence.contentDigest',
          message: 'expected sha256:<64 lowercase hex>',
        },
      ],
      ['recordBase action/role check (needs a parsed resolution)'],
    );
    expect(error.message).toBe(
      [
        'Managed Claude dispatch input has 2 violations:',
        'recordBase caller: Required',
        'event evidence.contentDigest: expected sha256:<64 lowercase hex>',
        'Skipped until the above are fixed: recordBase action/role check (needs a parsed resolution).',
      ].join('\n'),
    );
    expect(error.violations).toHaveLength(2);
  });
});
