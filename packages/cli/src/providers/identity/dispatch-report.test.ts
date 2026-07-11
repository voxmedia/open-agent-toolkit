import { describe, expect, it } from 'vitest';

import {
  buildDispatchReport,
  formatDispatchReport,
  serializeDispatchReport,
  type DispatchReportInput,
  type DispatchReportResolution,
  type DispatchReportV1,
} from './dispatch-report';

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
    const report = buildDispatchReport(input());
    const reordered = {
      runtimeIdentity: report.runtimeIdentity,
      gateInvocation: report.gateInvocation,
      configuredDefaults: report.configuredDefaults,
      requestedControls: report.requestedControls,
      selection: {
        cellSource: report.selection.cellSource,
        selectionBranch: report.selection.selectionBranch,
        selectionMode: report.selection.selectionMode,
        exactSelectedTarget: report.selection.exactSelectedTarget,
        selectedValue: report.selection.selectedValue,
        ceilingTarget: report.selection.ceilingTarget,
        ceilingTier: report.selection.ceilingTier,
        candidateIndex: report.selection.candidateIndex,
        candidateTier: report.selection.candidateTier,
        requestedCandidate: report.selection.requestedCandidate,
      },
      policy: report.policy,
      route: report.route,
      schemaVersion: report.schemaVersion,
    } satisfies DispatchReportV1;

    const serialized = serializeDispatchReport(reordered);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    const selection = parsed['selection'] as Record<string, unknown>;

    expect(serialized).toBe(serializeDispatchReport(report));
    expect(Object.keys(parsed)).toEqual([
      'schemaVersion',
      'route',
      'policy',
      'selection',
      'requestedControls',
      'configuredDefaults',
      'gateInvocation',
      'runtimeIdentity',
    ]);
    expect(Object.keys(selection)).toEqual([
      'requestedCandidate',
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
        Candidate tier / index: high / 1
        Ceiling tier: high
        Ceiling target: harness=codex model=gpt-5.6-sol effort=high crossHarness=false routeIndex=0 routeLength=1
        Selected value: high
        Exact selected target: harness=codex model=gpt-5.6-sol effort=high crossHarness=false routeIndex=0 routeLength=1
        Mode / branch: candidate / candidate-requested
        Cell source: repo-config
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
          Candidate tier / index: none / none
          Ceiling tier: none
          Ceiling target: none
          Selected value: none
          Exact selected target: none
          Mode / branch: inherit-default / inherit
          Cell source: none
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
          Candidate tier / index: high / 1
          Ceiling tier: high
          Ceiling target: none
          Selected value: none
          Exact selected target: none
          Mode / branch: unresolved / candidate-requested
          Cell source: repo-config
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
});
