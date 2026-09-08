import { describe, expect, it } from 'vitest';

import {
  formatPackEvidenceDetails,
  packEvidenceBlock,
} from './format-pack-inventory';
import type {
  PackEvidenceDiagnostic,
  ProviderReachabilityEvidence,
  ToolPackEvidence,
} from './pack-evidence';

function diagnostic(
  severity: PackEvidenceDiagnostic['severity'],
  code: PackEvidenceDiagnostic['code'],
): PackEvidenceDiagnostic {
  return {
    code,
    severity,
    pack: 'research',
    scope: 'user',
    provider: 'codex',
    contentKind: 'skill',
    affectedAssets: [],
    source: 'provider-registry',
    detail: `${code} detail`,
    recovery: [],
  };
}

function providerRow(): ProviderReachabilityEvidence {
  return {
    provider: 'codex',
    scope: 'user',
    contentKind: 'skill',
    assets: ['~/.agents/skills/analyze'],
    activation: {
      state: 'active',
      source: 'config-enabled',
      reason: 'Explicitly enabled in sync config',
    },
    capability: {
      support: 'supported',
      projectionModes: ['entry-sync'],
      reason: 'codex projects user skill content via entry-sync',
    },
    projection: { state: 'projected', mode: 'entry-sync' },
    materialization: {
      state: 'materialized',
      detail: '1 codex user skill operation(s) succeeded',
    },
    visibility: {
      state: 'restart-required',
      reason: 'codex needs a new session before the change is visible',
    },
    recovery: [],
  };
}

function evidence(
  diagnostics: PackEvidenceDiagnostic[],
  providers: ProviderReachabilityEvidence[] = [],
): ToolPackEvidence {
  return {
    schemaVersion: 1,
    pack: 'research',
    canonical: null,
    scopes: [],
    knownRealizedScopes: ['user'],
    unknownScopes: [],
    realizedPlacement: 'user',
    providers,
    diagnostics,
  };
}

describe('packEvidenceBlock severity filter', () => {
  it('keeps the block ok when every provider diagnostic is info severity', () => {
    // Guard note: this is the case the severity filter exists for. Replacing
    // the filter in `packEvidenceBlock` with the pre-change
    // `diagnostics.length > 0` test makes this expectation fail with
    // `expected 'partial' to be 'ok'`, which is how the guard is proven able
    // to fail.
    const block = packEvidenceBlock([
      evidence([
        diagnostic('info', 'provider-inactive'),
        diagnostic('info', 'restart-required'),
        diagnostic('info', 'visibility-unknown'),
      ]),
    ]);

    expect(block.status).toBe('ok');
    expect(block.diagnostics).toHaveLength(3);
  });

  it('turns the block partial for a warning diagnostic', () => {
    const block = packEvidenceBlock([
      evidence([
        diagnostic('info', 'provider-inactive'),
        diagnostic('warning', 'provider-materialization-missing'),
      ]),
    ]);

    expect(block.status).toBe('partial');
  });

  it('turns the block partial for an error diagnostic', () => {
    const block = packEvidenceBlock([
      evidence([diagnostic('error', 'provider-materialization-failed')]),
    ]);

    expect(block.status).toBe('partial');
  });

  it('keeps the block ok with no diagnostics at all', () => {
    expect(packEvidenceBlock([evidence([])]).status).toBe('ok');
  });
});

describe('formatPackEvidenceDetails provider line', () => {
  it('names the provider and its reachability in human output', () => {
    const lines = formatPackEvidenceDetails(evidence([], [providerRow()]));

    expect(lines).toContain(
      '  codex [user skill]: active; capability=supported; projection=projected; materialization=materialized (1 codex user skill operation(s) succeeded); visibility=restart-required',
    );
  });

  it('distinguishes an inactive provider from a read-only non-claim', () => {
    // Both render `materialization=not-applicable`; only the detail says
    // which situation the reader is looking at.
    const inactive = formatPackEvidenceDetails(
      evidence(
        [],
        [
          {
            ...providerRow(),
            provider: 'cursor',
            activation: {
              state: 'inactive',
              source: 'config-disabled',
              reason: 'Explicitly disabled in sync config',
            },
            projection: { state: 'not-applicable', mode: null },
            materialization: {
              state: 'not-applicable',
              detail: 'cursor is inactive for user scope',
            },
            visibility: {
              state: 'not-applicable',
              reason: 'cursor is inactive for user scope',
            },
          },
        ],
      ),
    );
    const notObserved = formatPackEvidenceDetails(
      evidence(
        [],
        [
          {
            ...providerRow(),
            projection: { state: 'not-applicable', mode: 'entry-sync' },
            materialization: {
              state: 'not-applicable',
              detail: 'No sync was observed for codex user skill content',
            },
          },
        ],
      ),
    );

    expect(
      inactive.some((line) => line.includes('is inactive for user scope')),
    ).toBe(true);
    expect(
      notObserved.some((line) => line.includes('No sync was observed')),
    ).toBe(true);
    expect(inactive[1]).not.toEqual(notObserved[1]);
  });

  it('names the provider on a provider-attributed diagnostic', () => {
    const lines = formatPackEvidenceDetails(
      evidence([diagnostic('warning', 'provider-materialization-missing')]),
    );

    expect(
      lines.some((line) =>
        line.includes('provider-materialization-missing [codex]'),
      ),
    ).toBe(true);
  });
});
