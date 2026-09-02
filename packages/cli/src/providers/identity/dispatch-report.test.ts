import { describe, expect, it } from 'vitest';

import { parseCodexRuntimeObservation } from './codex-runtime-observation';
import {
  buildDispatchReport,
  formatDispatchReport,
  serializeDispatchReport,
  toDispatchStampRecord,
  type DispatchReportInput,
  type DispatchReportResolution,
  type DispatchReportV1,
} from './dispatch-report';
import { formatDispatchStamp } from './stamp';

/** Minimal generic dispatch fields for a persisted-record shape assertion. */
const genericDispatchFields = {
  request_id: 'dispatch-native-1',
  provider: 'codex',
  model_selector: 'gpt-5.6-sol',
  effort_selector: 'high',
};

function resolution(
  overrides: Partial<DispatchReportResolution> = {},
): DispatchReportResolution {
  return {
    status: 'resolved',
    provider: 'codex',
    value: 'high',
    policyMode: 'managed',
    policy: 'high',
    source: 'invocation',
    providers: {
      codex: {
        dispatchArgs: {
          variant: 'oat-phase-implementer-gpt-5-6-sol-high',
        },
        selection: {
          role: 'implementer',
          requestedCandidate: {
            model: 'gpt-5.6-sol',
            effort: 'high',
          },
          candidateTier: 'high',
          candidateIndex: 1,
          ceilingTier: 'high',
          ceilingTarget: {
            harness: 'codex',
            model: 'gpt-5.6-sol',
            effort: 'high',
            crossHarness: false,
            routeIndex: 0,
            routeLength: 1,
          },
          selectedValue: 'high',
          selectionMode: 'candidate',
          selectionBranch: 'candidate-requested',
          target: {
            harness: 'codex',
            model: 'gpt-5.6-sol',
            effort: 'high',
            crossHarness: false,
            routeIndex: 0,
            routeLength: 1,
          },
          cellSource: 'repo-config',
        },
      },
    },
    ...overrides,
  };
}

function input(
  overrides: Partial<DispatchReportInput> = {},
): DispatchReportInput {
  return {
    scope: 'p03-t01',
    action: 'implementation',
    role: 'implementer',
    resolution: resolution(),
    requestedControls: {
      model: {
        value: 'gpt-5.6-sol',
        mechanism: 'materialized-role',
        reason: 'Exact managed candidate selected by the resolver.',
      },
      effort: {
        value: 'high',
        mechanism: 'materialized-role',
        reason: 'Exact managed candidate selected by the resolver.',
      },
    },
    configuredDefaults: {
      model: null,
      modelSource: null,
      effort: 'medium',
      effortSource: 'provider-config',
    },
    ...overrides,
  };
}

function inheritInput(): DispatchReportInput {
  return input({
    action: 'review',
    role: 'reviewer',
    resolution: resolution({
      value: null,
      policyMode: 'inherit',
      policy: null,
      source: 'project-state',
      providers: {
        codex: {
          dispatchArgs: null,
          selection: {
            role: 'reviewer',
            requestedCandidate: null,
            candidateTier: null,
            candidateIndex: null,
            ceilingTier: null,
            ceilingTarget: null,
            selectedValue: null,
            selectionMode: 'inherit-default',
            selectionBranch: 'inherit',
            target: null,
            cellSource: null,
          },
        },
      },
    }),
    requestedControls: {
      model: {
        value: null,
        mechanism: 'host-inherited',
        reason: 'The host owns model selection.',
      },
      effort: {
        value: null,
        mechanism: 'provider-default',
        reason: 'The provider default applies.',
      },
    },
  });
}

function blockedInput(): DispatchReportInput {
  return input({
    resolution: resolution({
      status: 'blocked',
      value: null,
      policyMode: 'managed',
      policy: 'high',
      source: 'project-state',
      providers: {
        codex: {
          dispatchArgs: null,
          selection: {
            role: 'implementer',
            requestedCandidate: {
              model: 'gpt-5.6-sol',
              effort: 'high',
            },
            candidateTier: 'high',
            candidateIndex: 1,
            ceilingTier: 'high',
            ceilingTarget: null,
            selectedValue: null,
            selectionMode: 'unresolved',
            selectionBranch: 'candidate-requested',
            target: null,
            cellSource: 'repo-config',
          },
        },
      },
    }),
  });
}

describe('buildDispatchReport', () => {
  it('copies a managed exact selection without reconstructing its branch, target, or candidate index', () => {
    const report = buildDispatchReport(input());

    expect(report).toEqual({
      schemaVersion: 1,
      route: {
        scope: 'p03-t01',
        action: 'implementation',
        role: 'implementer',
        target: 'oat-phase-implementer-gpt-5-6-sol-high',
      },
      policy: {
        status: 'resolved',
        mode: 'managed',
        name: 'high',
        source: 'invocation',
      },
      selection: {
        requestedCandidate: {
          model: 'gpt-5.6-sol',
          effort: 'high',
        },
        preferredValue: null,
        candidateTier: 'high',
        candidateIndex: 1,
        ceilingTier: 'high',
        ceilingTarget: {
          harness: 'codex',
          model: 'gpt-5.6-sol',
          effort: 'high',
          crossHarness: false,
          routeIndex: 0,
          routeLength: 1,
        },
        selectedValue: 'high',
        exactSelectedTarget: {
          harness: 'codex',
          model: 'gpt-5.6-sol',
          effort: 'high',
          crossHarness: false,
          routeIndex: 0,
          routeLength: 1,
        },
        selectionMode: 'candidate',
        selectionBranch: 'candidate-requested',
        cellSource: 'repo-config',
      },
      classification: {
        taskClass: null,
        preferredEffort: null,
        source: 'not-reported',
      },
      notices: [],
      requestedControls: input().requestedControls,
      configuredDefaults: input().configuredDefaults,
      gateInvocation: null,
      runtimeIdentity: {
        producer: null,
        model: null,
        effort: null,
        provenance: 'unknown',
        confidence: 'not-reported',
      },
    });
  });

  it('preserves inherit/default as distinct from managed uncapped', () => {
    const report = buildDispatchReport(inheritInput());

    expect(report.policy).toEqual({
      status: 'resolved',
      mode: 'inherit',
      name: null,
      source: 'project-state',
    });
    expect(report.route.target).toBe('unknown');
    expect(report.selection).toMatchObject({
      candidateIndex: null,
      exactSelectedTarget: null,
      selectionMode: 'inherit-default',
      selectionBranch: 'inherit',
      cellSource: null,
    });
  });

  it('copies caller classification, legacy preferred selection, and ordered notices', () => {
    const report = buildDispatchReport(
      input({
        resolution: resolution({
          providers: {
            codex: {
              ...resolution().providers['codex']!,
              selection: {
                ...resolution().providers['codex']!.selection,
                preferredValue: 'medium',
              },
            },
          },
        }),
        classification: {
          taskClass: 'default-implementation',
          preferredEffort: 'medium',
          source: 'caller',
        },
        notices: [
          {
            code: 'managed-capped-classification-missing',
            level: 'warning',
            message: 'Second notice.',
          },
          {
            code: 'managed-capped-selection-skipped',
            level: 'warning',
            message: 'First notice.',
          },
        ],
      }),
    );

    expect(report.selection.preferredValue).toBe('medium');
    expect(report.classification).toEqual({
      taskClass: 'default-implementation',
      preferredEffort: 'medium',
      source: 'caller',
    });
    expect(report.notices.map(({ code }) => code)).toEqual([
      'managed-capped-classification-missing',
      'managed-capped-selection-skipped',
    ]);
  });

  it('keeps unresolved policy explicit and deterministic', () => {
    const unresolved = resolution({
      status: 'unresolved',
      value: null,
      policyMode: null,
      policy: null,
      source: null,
      providers: {
        codex: {
          dispatchArgs: null,
          selection: {
            role: 'implementer',
            requestedCandidate: null,
            candidateTier: null,
            candidateIndex: null,
            ceilingTier: null,
            ceilingTarget: null,
            selectedValue: null,
            selectionMode: 'unresolved',
            selectionBranch: 'unresolved',
            target: null,
            cellSource: null,
          },
        },
      },
    });

    const report = buildDispatchReport(input({ resolution: unresolved }));

    expect(report.policy).toEqual({
      status: 'unresolved',
      mode: null,
      name: null,
      source: null,
    });
    expect(report.selection.selectionBranch).toBe('unresolved');
    expect(report.runtimeIdentity.confidence).toBe('not-reported');
  });

  it('keeps policy, selected cell, immutable gate invocation, and runtime provenance distinct', () => {
    const gateInvocation = {
      runId: 'gate-run-42',
      targetId: 'independent-reviewer',
      runtime: 'claude',
      model: 'provider-default',
      reasoningEffort: 'unknown',
      source: 'exec-target-config' as const,
    };

    const report = buildDispatchReport(
      input({
        gateInvocation,
        runtimeIdentity: {
          producer: 'claude-opus-4.1',
          model: 'claude-opus-4.1',
          effort: null,
          provenance: 'observed',
          confidence: 'high',
        },
      }),
    );

    gateInvocation.model = 'self-reported-overwrite';

    expect(report.policy.source).toBe('invocation');
    expect(report.selection.cellSource).toBe('repo-config');
    expect(report.gateInvocation).toEqual({
      runId: 'gate-run-42',
      targetId: 'independent-reviewer',
      runtime: 'claude',
      model: 'provider-default',
      reasoningEffort: 'unknown',
      source: 'exec-target-config',
    });
    expect(Object.isFrozen(report.gateInvocation)).toBe(true);
    expect(report.runtimeIdentity).toEqual({
      producer: 'claude-opus-4.1',
      model: 'claude-opus-4.1',
      effort: null,
      provenance: 'observed',
      confidence: 'high',
    });
  });

  it.each([
    ['implementation', 'fix'],
    ['implementation', 'reviewer'],
    ['fix', 'implementer'],
    ['fix', 'reviewer'],
    ['review', 'implementer'],
    ['review', 'fix'],
  ] as const)('rejects the invalid action/role pair %s/%s', (action, role) => {
    expect(() => buildDispatchReport(input({ action, role }))).toThrow(
      `Invalid dispatch report action/role pair: ${action}/${role}`,
    );
  });
});

describe('dispatch report rendering', () => {
  it('serializes the V1 report with stable key order', () => {
    const report = buildDispatchReport(
      input({
        gateInvocation: {
          runId: 'gate-run-ordering',
          targetId: 'independent-reviewer',
          runtime: 'claude',
          model: 'opus',
          reasoningEffort: 'provider-default',
          source: 'exec-target-config',
        },
      }),
    );
    const reverseTarget = (
      target: NonNullable<DispatchReportV1['selection']['ceilingTarget']>,
    ) => ({
      routeLength: target.routeLength,
      routeIndex: target.routeIndex,
      crossHarness: target.crossHarness,
      effort: target.effort,
      model: target.model,
      harness: target.harness,
    });
    const reordered = {
      runtimeIdentity: {
        confidence: report.runtimeIdentity.confidence,
        provenance: report.runtimeIdentity.provenance,
        effort: report.runtimeIdentity.effort,
        model: report.runtimeIdentity.model,
        producer: report.runtimeIdentity.producer,
      },
      gateInvocation: {
        source: report.gateInvocation!.source,
        reasoningEffort: report.gateInvocation!.reasoningEffort,
        model: report.gateInvocation!.model,
        runtime: report.gateInvocation!.runtime,
        targetId: report.gateInvocation!.targetId,
        runId: report.gateInvocation!.runId,
      },
      configuredDefaults: {
        effortSource: report.configuredDefaults.effortSource,
        effort: report.configuredDefaults.effort,
        modelSource: report.configuredDefaults.modelSource,
        model: report.configuredDefaults.model,
      },
      requestedControls: {
        effort: {
          reason: report.requestedControls.effort.reason,
          mechanism: report.requestedControls.effort.mechanism,
          value: report.requestedControls.effort.value,
        },
        model: {
          reason: report.requestedControls.model.reason,
          mechanism: report.requestedControls.model.mechanism,
          value: report.requestedControls.model.value,
        },
      },
      selection: {
        cellSource: report.selection.cellSource,
        selectionBranch: report.selection.selectionBranch,
        selectionMode: report.selection.selectionMode,
        exactSelectedTarget: reverseTarget(
          report.selection.exactSelectedTarget!,
        ),
        selectedValue: report.selection.selectedValue,
        ceilingTarget: reverseTarget(report.selection.ceilingTarget!),
        ceilingTier: report.selection.ceilingTier,
        candidateIndex: report.selection.candidateIndex,
        candidateTier: report.selection.candidateTier,
        preferredValue: report.selection.preferredValue,
        requestedCandidate: {
          effort: report.selection.requestedCandidate!.effort,
          model: report.selection.requestedCandidate!.model,
        },
      },
      notices: report.notices.map((notice) => ({
        message: notice.message,
        level: notice.level,
        code: notice.code,
      })),
      classification: {
        source: report.classification.source,
        preferredEffort: report.classification.preferredEffort,
        taskClass: report.classification.taskClass,
      },
      policy: {
        source: report.policy.source,
        name: report.policy.name,
        mode: report.policy.mode,
        status: report.policy.status,
      },
      route: {
        target: report.route.target,
        role: report.route.role,
        action: report.route.action,
        scope: report.route.scope,
      },
      schemaVersion: report.schemaVersion,
    } satisfies DispatchReportV1;

    const serialized = serializeDispatchReport(reordered);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    const route = parsed['route'] as Record<string, unknown>;
    const policy = parsed['policy'] as Record<string, unknown>;
    const selection = parsed['selection'] as Record<string, unknown>;
    const requestedCandidate = selection['requestedCandidate'] as Record<
      string,
      unknown
    >;
    const ceilingTarget = selection['ceilingTarget'] as Record<string, unknown>;
    const exactSelectedTarget = selection['exactSelectedTarget'] as Record<
      string,
      unknown
    >;
    const requestedControls = parsed['requestedControls'] as Record<
      string,
      Record<string, unknown>
    >;
    const configuredDefaults = parsed['configuredDefaults'] as Record<
      string,
      unknown
    >;
    const gateInvocation = parsed['gateInvocation'] as Record<string, unknown>;
    const runtimeIdentity = parsed['runtimeIdentity'] as Record<
      string,
      unknown
    >;

    expect(serialized).toBe(serializeDispatchReport(report));
    expect(Object.keys(parsed)).toEqual([
      'schemaVersion',
      'route',
      'policy',
      'selection',
      'classification',
      'notices',
      'requestedControls',
      'configuredDefaults',
      'gateInvocation',
      'runtimeIdentity',
    ]);
    expect(Object.keys(route)).toEqual(['scope', 'action', 'role', 'target']);
    expect(Object.keys(policy)).toEqual(['status', 'mode', 'name', 'source']);
    expect(Object.keys(selection)).toEqual([
      'requestedCandidate',
      'preferredValue',
      'candidateTier',
      'candidateIndex',
      'ceilingTier',
      'ceilingTarget',
      'selectedValue',
      'exactSelectedTarget',
      'selectionMode',
      'selectionBranch',
      'cellSource',
    ]);
    expect(
      Object.keys(parsed['classification'] as Record<string, unknown>),
    ).toEqual(['taskClass', 'preferredEffort', 'source']);
    expect(parsed['notices']).toEqual([]);
    expect(Object.keys(requestedCandidate)).toEqual(['model', 'effort']);
    for (const target of [ceilingTarget, exactSelectedTarget]) {
      expect(Object.keys(target)).toEqual([
        'harness',
        'model',
        'effort',
        'crossHarness',
        'routeIndex',
        'routeLength',
      ]);
    }
    expect(Object.keys(requestedControls)).toEqual(['model', 'effort']);
    for (const control of [
      requestedControls['model']!,
      requestedControls['effort']!,
    ]) {
      expect(Object.keys(control)).toEqual(['value', 'mechanism', 'reason']);
    }
    expect(Object.keys(configuredDefaults)).toEqual([
      'model',
      'modelSource',
      'effort',
      'effortSource',
    ]);
    expect(Object.keys(gateInvocation)).toEqual([
      'runId',
      'targetId',
      'runtime',
      'model',
      'reasoningEffort',
      'source',
    ]);
    expect(Object.keys(runtimeIdentity)).toEqual([
      'producer',
      'model',
      'effort',
      'provenance',
      'confidence',
    ]);
  });

  it('formats an exact selection without treating configured defaults as runtime identity', () => {
    const report = buildDispatchReport(
      input({
        runtimeIdentity: {
          producer: 'gpt-5.6-sol',
          model: 'gpt-5.6-sol',
          effort: 'high',
          provenance: 'observed',
          confidence: 'high',
        },
      }),
    );

    expect(formatDispatchReport(report)).toMatchInlineSnapshot(`
      "Dispatch Report V1
      Route
        Scope: p03-t01
        Action / role: implementation / implementer
        Invocation target: oat-phase-implementer-gpt-5-6-sol-high
      Policy
        Status: resolved
        Mode / name: managed / high
        Source: invocation
      Selection
        Requested candidate: model=gpt-5.6-sol effort=high
        Legacy preferred value: none
        Candidate tier / index: high / 1
        Ceiling tier: high
        Ceiling target: harness=codex model=gpt-5.6-sol effort=high crossHarness=false routeIndex=0 routeLength=1
        Selected value: high
        Exact selected target: harness=codex model=gpt-5.6-sol effort=high crossHarness=false routeIndex=0 routeLength=1
        Mode / branch: candidate / candidate-requested
        Cell source: repo-config
      Classification
        Task class: none
        Preferred effort: none
        Source: not-reported
      Notices
        None
      Requested controls
        Model: gpt-5.6-sol (materialized-role) — Exact managed candidate selected by the resolver.
        Effort: high (materialized-role) — Exact managed candidate selected by the resolver.
      Configured defaults (not runtime observations)
        Model: none
        Model source: none
        Effort: medium
        Effort source: provider-config
      Gate invocation (configured, immutable)
        Not configured
      Runtime identity (observed/reported separately)
        Producer: gpt-5.6-sol
        Model: gpt-5.6-sol
        Effort: high
        Provenance: observed
        Confidence: high"
    `);
  });

  it('formats inherited dispatch without implying a selected or observed target', () => {
    expect(formatDispatchReport(buildDispatchReport(inheritInput())))
      .toMatchInlineSnapshot(`
        "Dispatch Report V1
        Route
          Scope: p03-t01
          Action / role: review / reviewer
          Invocation target: unknown
        Policy
          Status: resolved
          Mode / name: inherit / none
          Source: project-state
        Selection
          Requested candidate: none
          Legacy preferred value: none
          Candidate tier / index: none / none
          Ceiling tier: none
          Ceiling target: none
          Selected value: none
          Exact selected target: none
          Mode / branch: inherit-default / inherit
          Cell source: none
        Classification
          Task class: none
          Preferred effort: none
          Source: not-reported
        Notices
          None
        Requested controls
          Model: none (host-inherited) — The host owns model selection.
          Effort: none (provider-default) — The provider default applies.
        Configured defaults (not runtime observations)
          Model: none
          Model source: none
          Effort: medium
          Effort source: provider-config
        Gate invocation (configured, immutable)
          Not configured
        Runtime identity (observed/reported separately)
          Runtime identity was not reported.
          Producer: not reported
          Model: not reported
          Effort: not reported
          Provenance: unknown
          Confidence: not-reported"
      `);
  });

  it('formats blocked dispatch as policy state rather than runtime failure evidence', () => {
    expect(formatDispatchReport(buildDispatchReport(blockedInput())))
      .toMatchInlineSnapshot(`
        "Dispatch Report V1
        Route
          Scope: p03-t01
          Action / role: implementation / implementer
          Invocation target: unknown
        Policy
          Status: blocked
          Mode / name: managed / high
          Source: project-state
        Selection
          Requested candidate: model=gpt-5.6-sol effort=high
          Legacy preferred value: none
          Candidate tier / index: high / 1
          Ceiling tier: high
          Ceiling target: none
          Selected value: none
          Exact selected target: none
          Mode / branch: unresolved / candidate-requested
          Cell source: repo-config
        Classification
          Task class: none
          Preferred effort: none
          Source: not-reported
        Notices
          None
        Requested controls
          Model: gpt-5.6-sol (materialized-role) — Exact managed candidate selected by the resolver.
          Effort: high (materialized-role) — Exact managed candidate selected by the resolver.
        Configured defaults (not runtime observations)
          Model: none
          Model source: none
          Effort: medium
          Effort source: provider-config
        Gate invocation (configured, immutable)
          Not configured
        Runtime identity (observed/reported separately)
          Runtime identity was not reported.
          Producer: not reported
          Model: not reported
          Effort: not reported
          Provenance: unknown
          Confidence: not-reported"
      `);
  });

  it('uses accurate not-reported language when runtime identity is absent', () => {
    const output = formatDispatchReport(buildDispatchReport(input()));

    expect(output).toContain('Runtime identity was not reported.');
    expect(output).toContain('Producer: not reported');
    expect(output).not.toContain('Producer: gpt-5.6-sol');
    expect(output).not.toContain('Runtime model: medium');
  });

  it('formats classification and notices while preserving the compatibility stamp', () => {
    const report = buildDispatchReport(
      input({
        classification: {
          taskClass: 'hard-reasoning',
          preferredEffort: 'high',
          source: 'caller',
        },
        notices: [
          {
            code: 'managed-capped-selection-skipped',
            level: 'warning',
            message: 'Select an exact candidate.',
          },
        ],
      }),
    );

    expect(formatDispatchReport(report)).toContain(
      'Task class: hard-reasoning',
    );
    expect(formatDispatchReport(report)).toContain(
      '[warning] managed-capped-selection-skipped: Select an exact candidate.',
    );
    expect(formatDispatchStamp(report)).toBe(
      'Dispatch: scope=p03-t01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high',
    );
  });

  it('derives compatibility stamp records from the report without a second identity schema', () => {
    const report = buildDispatchReport(
      input({
        runtimeIdentity: {
          producer: 'gpt-5.6-sol',
          model: 'gpt-5.6-sol',
          effort: 'high',
          provenance: 'observed',
          confidence: 'high',
        },
      }),
    );

    expect(toDispatchStampRecord(report)).toEqual({
      scope: 'p03-t01',
      action: 'implementation',
      role: 'implementer',
      producer: 'gpt-5.6-sol',
      provenance: 'observed',
      modelAxis: 'selected:gpt-5.6-sol',
      effortAxis: 'selected:high',
      dispatchPolicy: 'high',
      dispatchCeiling: 'high',
      target: 'oat-phase-implementer-gpt-5-6-sol-high',
    });
  });

  it('keeps configured gate invocation separate when reviewer runtime identity is not independently observed', () => {
    const report = buildDispatchReport(
      input({
        action: 'review',
        role: 'reviewer',
        resolution: resolution({
          providers: {
            codex: {
              dispatchArgs: null,
              selection: {
                ...resolution().providers['codex']!.selection,
                role: 'reviewer',
                selectionMode: 'gate-invocation',
                selectionBranch: 'gate-configured-invocation',
                target: null,
              },
            },
          },
        }),
        gateInvocation: {
          runId: 'gate-run-independent',
          targetId: 'cursor-reviewer',
          runtime: 'cursor',
          model: 'composer-2.5',
          reasoningEffort: 'provider-default',
          source: 'exec-target-config',
        },
      }),
    );

    expect(report.gateInvocation).toEqual({
      runId: 'gate-run-independent',
      targetId: 'cursor-reviewer',
      runtime: 'cursor',
      model: 'composer-2.5',
      reasoningEffort: 'provider-default',
      source: 'exec-target-config',
    });
    expect(report.runtimeIdentity).toEqual({
      producer: null,
      model: null,
      effort: null,
      provenance: 'unknown',
      confidence: 'not-reported',
    });
  });

  it('keeps DispatchReportV1 byte-shape isolated from persisted OAT provenance', () => {
    const report = buildDispatchReport(input());
    const serialized = serializeDispatchReport(report);

    expect(
      Object.keys(JSON.parse(serialized) as Record<string, unknown>),
    ).toEqual([
      'schemaVersion',
      'route',
      'policy',
      'selection',
      'classification',
      'notices',
      'requestedControls',
      'configuredDefaults',
      'gateInvocation',
      'runtimeIdentity',
    ]);
    expect(serialized).not.toContain('"oat"');
    expect(formatDispatchStamp(report)).toBe(
      'Dispatch: scope=p03-t01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high',
    );
  });

  it('keeps the report and stamp identical when a runtime observation exists', () => {
    const report = buildDispatchReport(input());
    const persisted = {
      ...genericDispatchFields,
      oat: {
        schemaVersion: 1 as const,
        canonicalRole: null,
        preStartRejection: null,
        fallbackClaim: null,
        fallback: {
          status: 'not-applicable' as const,
          reason: 'No fallback recorded.',
        },
        runtimeObservation: parseCodexRuntimeObservation({
          entries: [
            {
              type: 'session_meta',
              payload: { id: 'sess-root', role: 'oat-phase-implementer' },
            },
            { type: 'turn_context', payload: { model: 'gpt-5.6-terra' } },
          ],
          observedAt: '2026-09-02T12:00:00.000Z',
          configured: { model: 'gpt-5.6-sol' },
        }),
      },
    };
    // The observation exists and disagrees; neither the V1 report nor the
    // stamp may move because of it.
    expect(persisted.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      match: 'mismatching',
    });
    const serialized = serializeDispatchReport(report);
    expect(serialized).toBe(
      serializeDispatchReport(buildDispatchReport(input())),
    );
    for (const observationOnly of [
      'childLineage',
      'not-comparable',
      'mismatching',
      'codex-rollout-metadata',
      'observedAt',
    ]) {
      expect(serialized).not.toContain(observationOnly);
      expect(formatDispatchReport(report)).not.toContain(observationOnly);
    }
    expect(formatDispatchStamp(report)).toBe(
      'Dispatch: scope=p03-t01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high',
    );
    expect(
      Object.keys(report.runtimeIdentity as Record<string, unknown>),
    ).toEqual(['producer', 'model', 'effort', 'provenance', 'confidence']);
  });
});
