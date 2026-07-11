import { describe, expect, it } from 'vitest';

import type { DispatchReportV1 } from './dispatch-report';
import {
  formatDispatchStamp,
  getProducerIdentitiesByScope,
  parseDispatchStamps,
} from './stamp';

function exactReport(): DispatchReportV1 {
  return {
    schemaVersion: 1,
    route: {
      scope: 'p03-t03',
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
      requestedCandidate: { model: 'gpt-5.6-sol', effort: 'high' },
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
    requestedControls: {
      model: {
        value: 'gpt-5.6-sol',
        mechanism: 'materialized-role',
        reason: 'Exact configured model.',
      },
      effort: {
        value: 'high',
        mechanism: 'materialized-role',
        reason: 'Exact configured effort.',
      },
    },
    configuredDefaults: {
      model: null,
      modelSource: null,
      effort: 'medium',
      effortSource: 'provider-config',
    },
    gateInvocation: null,
    runtimeIdentity: {
      producer: 'gpt-5.6-sol',
      model: 'gpt-5.6-sol',
      effort: 'high',
      provenance: 'observed',
      confidence: 'high',
    },
  };
}

describe('dispatch identity stamps', () => {
  it('formats and parses the p01-t03 dispatch stamp grammar', () => {
    const line = formatDispatchStamp({
      scope: 'p02-t04',
      action: 'implementation',
      role: 'implementer',
      producer: 'composer-2.5',
      provenance: 'declared',
      modelAxis: 'inherited',
      effortAxis: 'selected:xhigh',
      dispatchPolicy: 'high',
      dispatchCeiling: 'xhigh',
      target: 'oat-phase-implementer-xhigh',
    });

    expect(line).toBe(
      'Dispatch: scope=p02-t04 action=implementation role=implementer producer=composer-2.5 provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
    );
    expect(parseDispatchStamps(line)).toMatchObject([
      {
        scope: 'p02-t04',
        action: 'implementation',
        role: 'implementer',
        producer: 'composer-2.5',
        provenance: 'declared',
        modelAxis: 'inherited',
        effortAxis: 'selected:xhigh',
        dispatchPolicy: 'high',
        dispatchCeiling: 'xhigh',
        target: 'oat-phase-implementer-xhigh',
        legacy: false,
      },
    ]);
  });

  it('parses shipped legacy dispatch lines as unknown provenance', () => {
    const stamps = parseDispatchStamps(
      'Dispatch: p01 implementation used model_axis=inherited, effort_axis=selected:high, dispatch_policy=balanced, dispatch_ceiling=high, target=oat-phase-implementer-high',
    );

    expect(stamps).toMatchObject([
      {
        scope: 'p01',
        action: 'implementation',
        role: 'implementer',
        producer: 'unknown',
        provenance: 'unknown',
        modelAxis: 'inherited',
        effortAxis: 'selected:high',
        dispatchPolicy: 'balanced',
        dispatchCeiling: 'high',
        target: 'oat-phase-implementer-high',
        legacy: true,
      },
    ]);
  });

  it('formats materialized codex targets with explicit model and effort axes', () => {
    const line = formatDispatchStamp({
      scope: 'p02',
      action: 'implementation',
      role: 'implementer',
      producer: 'unknown',
      provenance: 'unknown',
      modelAxis: 'selected:gpt-5.6-sol',
      effortAxis: 'selected:xhigh',
      dispatchPolicy: 'high',
      dispatchCeiling: 'xhigh',
      target: 'oat-phase-implementer-gpt-5-6-sol-xhigh',
    });

    expect(parseDispatchStamps(line)).toMatchObject([
      {
        modelAxis: 'selected:gpt-5.6-sol',
        effortAxis: 'selected:xhigh',
        dispatchPolicy: 'high',
        dispatchCeiling: 'xhigh',
        target: 'oat-phase-implementer-gpt-5-6-sol-xhigh',
      },
    ]);
  });

  it('derives materialized Codex stamps in the existing field order and parser grammar', () => {
    const line = formatDispatchStamp(exactReport());

    expect(line).toBe(
      'Dispatch: scope=p03-t03 action=implementation role=implementer producer=gpt-5.6-sol provenance=observed model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high',
    );
    expect(parseDispatchStamps(line)).toMatchObject([
      {
        scope: 'p03-t03',
        action: 'implementation',
        role: 'implementer',
        producer: 'gpt-5.6-sol',
        provenance: 'observed',
        modelAxis: 'selected:gpt-5.6-sol',
        effortAxis: 'selected:high',
        legacy: false,
      },
    ]);
  });

  it('derives model-argument stamps without inventing an effort axis', () => {
    const base = exactReport();
    const report: DispatchReportV1 = {
      ...base,
      route: {
        scope: 'p03-review',
        action: 'review',
        role: 'reviewer',
        target: 'claude-opus-4-1',
      },
      selection: {
        ...base.selection,
        requestedCandidate: { model: 'claude-opus-4-1' },
        candidateTier: 'high',
        candidateIndex: 0,
        ceilingTarget: {
          harness: 'claude',
          model: 'claude-opus-4-1',
          crossHarness: false,
          routeIndex: 0,
          routeLength: 1,
        },
        selectedValue: 'claude-opus-4-1',
        exactSelectedTarget: {
          harness: 'claude',
          model: 'claude-opus-4-1',
          crossHarness: false,
          routeIndex: 0,
          routeLength: 1,
        },
      },
      requestedControls: {
        model: {
          value: 'claude-opus-4-1',
          mechanism: 'task-model-argument',
          reason: 'Exact Task model argument.',
        },
        effort: {
          value: null,
          mechanism: 'not-applicable',
          reason: 'No separate effort axis.',
        },
      },
      runtimeIdentity: {
        producer: 'claude-opus-4-1',
        model: 'claude-opus-4-1',
        effort: null,
        provenance: 'declared',
        confidence: 'high',
      },
    };

    const line = formatDispatchStamp(report);
    expect(line).toBe(
      'Dispatch: scope=p03-review action=review role=reviewer producer=claude-opus-4-1 provenance=declared model_axis=selected:claude-opus-4-1 effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-4-1 target=claude-opus-4-1',
    );
    expect(parseDispatchStamps(line)).toHaveLength(1);
  });

  it('derives inherited stamps without treating configured defaults as runtime identity', () => {
    const base = exactReport();
    const report: DispatchReportV1 = {
      ...base,
      route: {
        scope: 'p03-inherit',
        action: 'review',
        role: 'reviewer',
        target: 'unknown',
      },
      policy: {
        status: 'resolved',
        mode: 'inherit',
        name: null,
        source: 'project-state',
      },
      selection: {
        ...base.selection,
        requestedCandidate: null,
        candidateTier: null,
        candidateIndex: null,
        ceilingTier: null,
        ceilingTarget: null,
        selectedValue: null,
        exactSelectedTarget: null,
        selectionMode: 'inherit-default',
        selectionBranch: 'inherit',
        cellSource: null,
      },
      requestedControls: {
        model: {
          value: null,
          mechanism: 'host-inherited',
          reason: 'Host model selection.',
        },
        effort: {
          value: null,
          mechanism: 'provider-default',
          reason: 'Provider effort default.',
        },
      },
      runtimeIdentity: {
        producer: null,
        model: null,
        effort: null,
        provenance: 'unknown',
        confidence: 'not-reported',
      },
    };

    const line = formatDispatchStamp(report);
    expect(line).toBe(
      'Dispatch: scope=p03-inherit action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=provider-default dispatch_policy=inherit-host-defaults dispatch_ceiling=none target=unknown',
    );
    expect(parseDispatchStamps(line)).toMatchObject([
      {
        producer: 'unknown',
        provenance: 'unknown',
        modelAxis: 'inherited',
        effortAxis: 'provider-default',
      },
    ]);
  });

  it('keeps unknown runtime identity unknown for a configured materialized target', () => {
    const report: DispatchReportV1 = {
      ...exactReport(),
      runtimeIdentity: {
        producer: null,
        model: null,
        effort: null,
        provenance: 'unknown',
        confidence: 'not-reported',
      },
    };

    const line = formatDispatchStamp(report);
    expect(line).toContain('producer=unknown provenance=unknown');
    expect(line).toContain('model_axis=selected:gpt-5.6-sol');
    expect(line).not.toContain('producer=gpt-5.6-sol');
    expect(parseDispatchStamps(line)).toHaveLength(1);
  });

  it('returns producer identities grouped by phase scope', () => {
    const markdown = [
      '## Orchestration Runs',
      '#### Dispatch Notes',
      '- Dispatch: scope=p02 action=implementation role=implementer producer=composer-2.5 provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
      '- Dispatch: scope=p02 action=review role=reviewer producer=claude-sonnet-4 provenance=observed model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh',
      '- Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=provider-default dispatch_policy=inherit-host-defaults dispatch_ceiling=none target=oat-phase-implementer',
    ].join('\n');

    expect(getProducerIdentitiesByScope(markdown)).toEqual({
      p02: [
        {
          scope: 'p02',
          action: 'implementation',
          role: 'implementer',
          producer: 'composer-2.5',
          provenance: 'declared',
          target: 'oat-phase-implementer-xhigh',
        },
        {
          scope: 'p02',
          action: 'review',
          role: 'reviewer',
          producer: 'claude-sonnet-4',
          provenance: 'observed',
          target: 'oat-reviewer-xhigh',
        },
      ],
      p03: [
        {
          scope: 'p03',
          action: 'implementation',
          role: 'implementer',
          producer: 'unknown',
          provenance: 'unknown',
          target: 'oat-phase-implementer',
        },
      ],
    });
  });

  it('skips malformed dispatch lines with warnings and never throws', () => {
    const warnings: string[] = [];

    expect(() =>
      parseDispatchStamps('Dispatch: scope=p02 action=not-real', {
        onWarning: (warning) => warnings.push(warning),
      }),
    ).not.toThrow();

    expect(
      parseDispatchStamps('Dispatch: scope=p02 action=not-real', {
        onWarning: (warning) => warnings.push(warning),
      }),
    ).toEqual([]);
    expect(warnings.join('\n')).toContain('line 1');
  });

  it.each([
    ['implementation', 'fix'],
    ['implementation', 'reviewer'],
    ['fix', 'implementer'],
    ['fix', 'reviewer'],
    ['review', 'implementer'],
    ['review', 'fix'],
  ] as const)(
    'warns and rejects incompatible modern action/role pair %s/%s',
    (action, role) => {
      const warnings: string[] = [];
      const line = `Dispatch: scope=p02 action=${action} role=${role} producer=gpt-5.5 provenance=declared model_axis=selected:gpt-5.5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-5-high`;

      expect(
        parseDispatchStamps(line, {
          onWarning: (warning) => warnings.push(warning),
        }),
      ).toEqual([]);
      expect(warnings).toEqual([
        expect.stringContaining(
          `incompatible action/role pair ${action}/${role}`,
        ),
      ]);
      expect(getProducerIdentitiesByScope(line)).toEqual({});
    },
  );

  it('normalizes invalid provenance fields to unknown without dropping the producer', () => {
    expect(
      parseDispatchStamps(
        'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.5-high provenance=not-real model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
      ),
    ).toMatchObject([
      {
        producer: 'gpt-5.5-high',
        provenance: 'unknown',
        legacy: false,
      },
    ]);
  });
});
