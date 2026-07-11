import { describe, expect, it } from 'vitest';

import {
  buildDispatchReport,
  type DispatchReportInput,
  type DispatchReportResolution,
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
    const inheritResolution = resolution({
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
    });

    const report = buildDispatchReport(
      input({
        action: 'review',
        role: 'reviewer',
        resolution: inheritResolution,
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
      }),
    );

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
