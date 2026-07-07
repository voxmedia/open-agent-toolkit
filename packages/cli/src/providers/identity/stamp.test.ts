import { describe, expect, it } from 'vitest';

import {
  formatDispatchStamp,
  getProducerIdentitiesByScope,
  parseDispatchStamps,
} from './stamp';

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
