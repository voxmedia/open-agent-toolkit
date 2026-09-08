import type { ManifestEntryV2 } from '@manifest/manifest.types';
import type {
  PathMapping,
  ProviderAdapter,
} from '@providers/shared/adapter.types';
import type {
  ProviderRegistration,
  ProviderScopeContext,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';
import { describe, expect, it } from 'vitest';

import type { DriftReport } from './drift.types';
import {
  diagnoseSkillViews,
  resolveExpectedSkillProjections,
  type SkillViewObservation,
} from './skill-view-diagnostic';

const SKILL = 'oat-idea-new';

function skillMapping(providerDir: string, nativeRead = false): PathMapping {
  return {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir,
    nativeRead,
  };
}

function registration(input: {
  name: string;
  projectMappings?: PathMapping[];
  userMappings?: PathMapping[];
}): ProviderRegistration {
  const adapter: ProviderAdapter = {
    name: input.name,
    displayName: input.name,
    defaultStrategy: 'symlink',
    projectMappings: input.projectMappings ?? [],
    userMappings: input.userMappings ?? [],
    detect: async () => true,
  };
  return { adapter, extensions: [], capabilities: [] };
}

/** Claude projects skills into `.claude/skills`; Codex reads them in place. */
const claude = registration({
  name: 'claude',
  projectMappings: [skillMapping('.claude/skills')],
  userMappings: [skillMapping('.claude/skills')],
});
const codex = registration({
  name: 'codex',
  projectMappings: [skillMapping('.agents/skills', true)],
  userMappings: [skillMapping('.agents/skills', true)],
});
/** A provider that maps agents only, so no skill view is ever expected. */
const agentsOnly = registration({
  name: 'agents-only',
  projectMappings: [
    {
      contentType: 'agent',
      canonicalDir: '.agents/agents',
      providerDir: '.agents-only/agents',
      nativeRead: false,
    },
  ],
});

function context(input: {
  scope?: ConcreteScope;
  activeProviders: string[];
  registrations: ProviderRegistration[];
}): ProviderScopeContext {
  const scope = input.scope ?? 'project';
  return {
    scope,
    configSource: '<project>/.oat/sync/config.json',
    activeProviders: input.activeProviders,
    detectedProviders: input.activeProviders,
    mismatches: { detectedUnset: [], detectedDisabled: [] },
    activation: input.registrations.map(({ adapter }) => ({
      provider: adapter.name,
      state: input.activeProviders.includes(adapter.name)
        ? ('active' as const)
        : ('inactive' as const),
      source: 'config-enabled' as const,
      reason: 'test activation',
    })),
    registrations: input.registrations,
  };
}

function manifestEntry(
  overrides: Partial<ManifestEntryV2> = {},
): ManifestEntryV2 {
  return {
    canonicalPath: `.agents/skills/${SKILL}`,
    providerPath: `.claude/skills/${SKILL}`,
    provider: 'claude',
    contentType: 'skill',
    contentHash: null,
    isFile: false,
    lastSynced: '2026-09-01T00:00:00.000Z',
    strategy: 'symlink',
    ...overrides,
  };
}

function drift(state: DriftReport['state']): DriftReport {
  return {
    canonical: `.agents/skills/${SKILL}`,
    provider: 'claude',
    providerPath: `.claude/skills/${SKILL}`,
    state,
  };
}

function observation(
  provider: string,
  overrides: Partial<SkillViewObservation> = {},
  projectionOverrides: Partial<SkillViewObservation['projection']> = {},
): SkillViewObservation {
  return {
    projection: {
      provider,
      providerPath:
        provider === 'claude'
          ? `.claude/skills/${SKILL}`
          : `.agents/skills/${SKILL}`,
      contentKind: 'skill',
      nativeRead: provider !== 'claude',
      ...projectionOverrides,
    },
    manifestEntry: null,
    drift: null,
    viewPresent: false,
    ...overrides,
  };
}

function diagnose(input: {
  scope?: ConcreteScope;
  activeProviders: string[];
  registrations: ProviderRegistration[];
  observations: SkillViewObservation[];
  canonicalVersion?: string | null;
  canonicalPresent?: boolean;
}) {
  const scope = input.scope ?? 'project';
  return diagnoseSkillViews({
    skillName: SKILL,
    scope,
    canonicalPresent: input.canonicalPresent ?? true,
    canonicalVersion:
      'canonicalVersion' in input ? (input.canonicalVersion ?? null) : '1.2.1',
    providerScopeContext: context({
      scope,
      activeProviders: input.activeProviders,
      registrations: input.registrations,
    }),
    observations: input.observations,
  });
}

describe('resolveExpectedSkillProjections', () => {
  it('derives the concrete provider path from the adapter mapping without a manifest entry', () => {
    const projections = resolveExpectedSkillProjections({
      skillName: SKILL,
      scope: 'project',
      registrations: [claude, codex, agentsOnly],
    });

    expect(projections).toEqual([
      {
        provider: 'claude',
        providerPath: `.claude/skills/${SKILL}`,
        contentKind: 'skill',
        nativeRead: false,
      },
      {
        provider: 'codex',
        providerPath: `.agents/skills/${SKILL}`,
        contentKind: 'skill',
        nativeRead: true,
      },
    ]);
  });

  it('omits a provider with no skill mapping for the requested scope', () => {
    const userOnlyAgents = registration({
      name: 'claude',
      projectMappings: [skillMapping('.claude/skills')],
      userMappings: [],
    });

    expect(
      resolveExpectedSkillProjections({
        skillName: SKILL,
        scope: 'user',
        registrations: [userOnlyAgents],
      }),
    ).toEqual([]);
  });

  it('marks a projection excluded when a canonical filter omits the skill', () => {
    const [projection] = resolveExpectedSkillProjections({
      skillName: SKILL,
      scope: 'project',
      registrations: [claude],
      allowedCanonicalPaths: ['.agents/skills/other-skill'],
    });

    expect(projection?.excludedReason).toContain(`.agents/skills/${SKILL}`);
  });
});

describe('diagnoseSkillViews', () => {
  it('reports an active provider with no manifest entry as missing-additive with the expected path', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [observation('claude')],
    });

    expect(diagnosis.result).toBe('diagnosed');
    expect(diagnosis.views).toHaveLength(1);
    expect(diagnosis.views[0]).toMatchObject({
      provider: 'claude',
      viewClass: 'missing-additive',
      providerPath: `.claude/skills/${SKILL}`,
      tracked: false,
      driftState: null,
      strategy: null,
      versionComparable: false,
      viewVersion: null,
      canonicalVersion: '1.2.1',
      suggestion: 'oat sync --scope project',
    });
  });

  it('suggests the concrete scope it observed, never --scope all', () => {
    const userDiagnosis = diagnose({
      scope: 'user',
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [observation('claude')],
    });

    expect(userDiagnosis.views[0]?.suggestion).toBe('oat sync --scope user');
    const suggestions = userDiagnosis.views.map(({ suggestion }) => suggestion);
    expect(suggestions.every((s) => s === null || !s.includes('all'))).toBe(
      true,
    );
  });

  it('never suggests a sync for inactive, unsupported, or excluded providers', () => {
    const diagnosis = diagnose({
      activeProviders: [],
      registrations: [claude, agentsOnly],
      observations: [
        observation('claude'),
        observation(
          'excluded-provider',
          {},
          { excludedReason: 'targeted sync filter does not include it' },
        ),
      ],
    });

    const excludedActive = diagnoseSkillViews({
      skillName: SKILL,
      scope: 'project',
      canonicalPresent: true,
      canonicalVersion: '1.2.1',
      providerScopeContext: context({
        activeProviders: ['claude'],
        registrations: [claude],
      }),
      observations: [
        observation(
          'claude',
          {},
          { excludedReason: 'targeted sync filter does not include it' },
        ),
      ],
    });

    expect(diagnosis.views.map(({ viewClass }) => viewClass)).toEqual([
      'inactive',
      'unsupported',
    ]);
    expect(diagnosis.views.every(({ suggestion }) => suggestion === null)).toBe(
      true,
    );
    expect(excludedActive.views[0]).toMatchObject({
      viewClass: 'excluded',
      suggestion: null,
    });
  });

  it('reports a tracked view whose file is gone as removed, not missing-additive', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry(),
          drift: drift({ status: 'missing' }),
        }),
      ],
    });

    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'removed',
      tracked: true,
      driftState: { status: 'missing' },
      suggestion: 'oat sync --scope project',
    });
  });

  it('reports a diverged copy view as modified with both versions', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'copy',
            contentHash: 'sha256:stale',
            isFile: true,
          }),
          drift: drift({ status: 'drifted', reason: 'modified' }),
          viewPresent: true,
          viewVersion: '1.1.0',
        }),
      ],
    });

    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'modified',
      driftState: { status: 'drifted', reason: 'modified' },
      canonicalVersion: '1.2.1',
      viewVersion: '1.1.0',
      versionComparable: true,
      suggestion: 'oat sync --scope project',
    });
  });

  it('reports no version comparison for symlink, collection, and native-read views', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude', 'codex'],
      registrations: [claude, codex],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({ strategy: 'symlink' }),
          drift: drift({ status: 'in_sync' }),
          viewPresent: true,
          viewVersion: '1.2.1',
        }),
        observation('codex', { viewPresent: true }),
      ],
    });
    const collection = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'collection',
            collectionId: 'claude-skills',
          }),
          drift: drift({ status: 'in_sync' }),
          viewPresent: true,
        }),
      ],
    });

    const [symlinkView, nativeView] = diagnosis.views;
    expect(symlinkView).toMatchObject({
      viewClass: 'in-sync',
      versionComparable: false,
      viewVersion: null,
    });
    expect(symlinkView?.detail).toContain('symlink to the canonical file');
    expect(nativeView).toMatchObject({
      provider: 'codex',
      viewClass: 'in-sync',
      nativeRead: true,
      versionComparable: false,
      suggestion: null,
    });
    expect(nativeView?.detail).toContain('reads the canonical skill in place');
    expect(collection.views[0]).toMatchObject({
      viewClass: 'in-sync',
      versionComparable: false,
      viewVersion: null,
    });
    expect(collection.views[0]?.detail).toContain('collection alias');
  });

  it('reports a copy whose version trails canonical as modified even when the manifest agrees', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      canonicalVersion: '2.0.0',
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'copy',
            contentHash: 'sha256:matches-last-sync',
            isFile: true,
          }),
          // The detector compares the copy against the hash written at the
          // last sync, so a canonical-only edit leaves it reading `in_sync`.
          drift: drift({ status: 'in_sync' }),
          viewPresent: true,
          viewVersion: '1.0.0',
        }),
      ],
    });

    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'modified',
      // The unchanged detector verdict is preserved beside the new field.
      driftState: { status: 'in_sync' },
      canonicalVersion: '2.0.0',
      viewVersion: '1.0.0',
      versionComparable: true,
      suggestion: 'oat sync --scope project',
    });
    expect(diagnosis.views[0]?.detail).toContain('stale');
  });

  it('never claims canonical equality for a copy the manifest alone vouches for', () => {
    // Version parity cannot prove content parity: a canonical body edit that
    // keeps the version, and an unversioned skill, both leave the detector
    // agreeing with its own manifest hash. The wording must not overstate it.
    const unversioned = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      canonicalVersion: null,
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'copy',
            contentHash: 'sha256:matches-last-sync',
            isFile: true,
          }),
          drift: drift({ status: 'in_sync' }),
          viewPresent: true,
          viewVersion: null,
        }),
      ],
    });

    expect(unversioned.views[0]).toMatchObject({
      viewClass: 'in-sync',
      canonicalVersion: null,
      viewVersion: null,
      suggestion: null,
    });
    expect(unversioned.views[0]?.detail).toContain('at its last sync');
    expect(unversioned.views[0]?.detail).not.toContain(
      'matches the canonical skill',
    );
  });

  it('keeps a copy in-sync when its version matches canonical', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      canonicalVersion: '2.0.0',
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'copy',
            contentHash: 'sha256:matches-last-sync',
            isFile: true,
          }),
          drift: drift({ status: 'in_sync' }),
          viewPresent: true,
          viewVersion: '2.0.0',
        }),
      ],
    });

    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'in-sync',
      versionComparable: true,
      viewVersion: '2.0.0',
      suggestion: null,
    });
  });

  it('offers no repair for a drifted copy whose version still matches canonical', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      canonicalVersion: '1.4.2',
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry({
            strategy: 'copy',
            contentHash: 'sha256:written-at-sync',
            isFile: true,
          }),
          drift: drift({ status: 'drifted', reason: 'modified' }),
          viewPresent: true,
          viewVersion: '1.4.2',
        }),
      ],
    });

    // The engine's banner and `.oat-generated` sentinel are not accounted for
    // in the manifest hash, so a copy reads as drifted straight after a
    // successful sync. Suggesting a sync there is a repair that repairs
    // nothing.
    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'modified',
      driftState: { status: 'drifted', reason: 'modified' },
      canonicalVersion: '1.4.2',
      viewVersion: '1.4.2',
      suggestion: null,
    });
    expect(diagnosis.views[0]?.detail).toContain(
      'BL-260908-make-copy-strategy-skill',
    );
    // Suppressing the repair is a heuristic: equal versions do not establish
    // equal bodies, and a same-version edit on either side reaches this same
    // branch where a sync WOULD help. The detail must not claim the content
    // is current, and must name the concrete scope command for that case.
    expect(diagnosis.views[0]?.detail).toContain(
      'Equal versions do not prove the bodies match',
    );
    expect(diagnosis.views[0]?.detail).toContain('oat sync --scope project');
    expect(diagnosis.views[0]?.detail).not.toContain('content is current');
  });

  it('reports a tracked entry with no drift observation as unverified, never untracked', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry(),
          drift: null,
          viewPresent: true,
        }),
      ],
    });

    // `untracked` alongside `tracked: true` is self-contradictory on one
    // record; the mapper is a public export, so the branch must stay honest
    // for consumers other than `oat tools info`.
    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'unverified',
      tracked: true,
      suggestion: null,
    });
    expect(diagnosis.views[0]?.detail).toContain('unverified');
  });

  it('reports an untracked file at the expected path as untracked, not missing', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [observation('claude', { viewPresent: true })],
    });

    expect(diagnosis.views[0]).toMatchObject({
      viewClass: 'untracked',
      tracked: false,
      suggestion: null,
    });
    // Stray detection skips a provider entry whose name matches a canonical
    // entry (`drift/strays.ts`), so promising a stray-adoption route here
    // would send the user somewhere that reports nothing.
    // Stray detection skips a provider entry whose name matches a canonical
    // entry (`drift/strays.ts`), while `status` still synthesizes a `missing`
    // report for the untracked projection (`commands/status/index.ts`).
    expect(diagnosis.views[0]?.detail).toContain('not report it as a stray');
    expect(diagnosis.views[0]?.detail).toContain('missing');
    expect(diagnosis.views[0]?.detail).not.toContain('adopt');
    // An on-disk anomaly still gets a next step, while `suggestion` stays
    // null so the command never proposes a write over content OAT does not
    // own.
    expect(diagnosis.views[0]?.detail).toContain('Inspect the path');
  });

  it('keeps an unknown skill distinct from missing distribution', () => {
    const unknown = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [observation('claude')],
      canonicalPresent: false,
    });
    const missing = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [observation('claude')],
    });

    expect(unknown).toEqual({
      skill: SKILL,
      scope: 'project',
      result: 'unknown-skill',
      views: [],
    });
    expect(missing.result).toBe('diagnosed');
    expect(missing.views[0]?.viewClass).toBe('missing-additive');
  });

  it('preserves the unchanged DriftState beside the new classification', () => {
    const diagnosis = diagnose({
      activeProviders: ['claude'],
      registrations: [claude],
      observations: [
        observation('claude', {
          manifestEntry: manifestEntry(),
          drift: drift({ status: 'drifted', reason: 'replaced' }),
          viewPresent: true,
        }),
      ],
    });

    // The additive/removed split is a new field; `DriftState` keeps its own
    // vocabulary, including the reason the detector assigned.
    expect(diagnosis.views[0]?.driftState).toEqual({
      status: 'drifted',
      reason: 'replaced',
    });
    expect(diagnosis.views[0]?.viewClass).toBe('modified');
    expect(diagnosis.views[0]?.detail).toContain('replaced');
  });
});
