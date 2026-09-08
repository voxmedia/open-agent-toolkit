import { join } from 'node:path';

import type { ManifestEntryV2 } from '@manifest/manifest.types';
import type { PathMapping } from '@providers/shared/adapter.types';
import type {
  ProviderRegistration,
  ProviderScopeContext,
} from '@providers/shared/registry';
import type { ConcreteScope, ContentType } from '@shared/types';

import type { DriftReport, DriftState } from './drift.types';

/**
 * Resolution-time classification of one canonical skill against one provider
 * view.
 *
 * This is a new field that sits *beside* the unchanged {@link DriftState}, not
 * a replacement for it: `detectDrift` answers "does the tracked view still
 * match?", which presupposes a manifest entry. The headline case this module
 * exists for — a canonical skill nobody ever synced — has no manifest entry at
 * all, so its provider and path identity come from the provider scope context
 * and the adapter mappings instead.
 *
 * - `missing-additive`: active, supported, nothing tracked, nothing on disk at
 *   the expected path. The only true projection gap.
 * - `removed`: tracked, but the provider file is gone.
 * - `modified`: tracked, and the provider file diverged.
 * - `in-sync`: the view matches the canonical skill (including a native-read
 *   provider, whose view *is* the canonical file).
 * - `untracked`: something exists at the expected path with no manifest entry.
 *   Reported as such rather than as missing, because nothing is absent.
 * - `unverified`: a manifest entry exists but no drift observation accompanied
 *   it, so the view's state is unknown. Never `untracked`, which would
 *   contradict `tracked: true` on the same record.
 * - `inactive`, `unsupported`, `excluded`: no projection is expected at all, so
 *   none of these ever carries a sync suggestion.
 *
 * Reachability today: `unsupported` needs a registered adapter with no `skill`
 * mapping for the scope, and every shipped adapter maps skills in both scopes;
 * `excluded` needs a canonical-path filter that the `oat tools info` wiring
 * never passes; `unverified` needs a caller that supplies a manifest entry
 * without a drift report, which that wiring never does. All three are
 * defensive branches, covered by fixtures rather than by a live CLI path, and
 * they exist so a future adapter, filter, or consumer cannot be silently
 * misreported as a projection gap.
 */
export type SkillViewClass =
  | 'in-sync'
  | 'missing-additive'
  | 'removed'
  | 'modified'
  | 'untracked'
  | 'unverified'
  | 'inactive'
  | 'unsupported'
  | 'excluded';

/**
 * Where a provider's view of one canonical skill is expected to live.
 *
 * Derived from the adapter's scope mappings, so it exists whether or not a
 * manifest entry does. Deliberately carries no `strategy`: the concrete
 * symlink/copy choice for an *untracked* projection is resolved by the sync
 * engine from config at sync time (`resolveStrategy` in
 * `engine/compute-plan.ts`), and re-deriving that precedence here could
 * contradict it. A tracked projection carries its real strategy on the
 * manifest entry, which is what the version-comparability rule needs.
 */
export interface ExpectedProjection {
  provider: string;
  /** Scope-relative path, matching the manifest's `providerPath` convention. */
  providerPath: string;
  contentKind: ContentType;
  /**
   * The provider reads canonical content in place (`nativeRead` mapping), so
   * the "view" is the canonical file and there is nothing to project.
   */
  nativeRead: boolean;
  /** Set when a canonical-path filter keeps this skill out of the projection. */
  excludedReason?: string;
}

/**
 * How the projected view's own version declaration read.
 *
 * Carries the shared resolver's verdict rather than just a string: a
 * `conflict`, `unusable`, or `malformed` declaration is a parse artifact, and
 * a copy must never be reported as stale on that evidence.
 */
export interface ProjectedSkillVersion {
  version: string | null;
  state: 'resolved' | 'absent' | 'conflict' | 'unusable' | 'malformed';
  conflict?: { metadata: string; topLevel: string };
}

/** One provider's observed reality for the expected projection. */
export interface SkillViewObservation {
  projection: ExpectedProjection;
  /** The manifest entry keyed by (canonicalPath, provider), when tracked. */
  manifestEntry: ManifestEntryV2 | null;
  /** `detectDrift` output; only available when a manifest entry exists. */
  drift: DriftReport | null;
  /** Whether anything exists at the expected provider path. */
  viewPresent: boolean;
  /**
   * Version read from the provider copy, with the resolver's verdict. Only
   * meaningful for `copy` entries.
   */
  projectedVersion?: ProjectedSkillVersion;
}

export interface SkillViewDiagnostic {
  skill: string;
  scope: ConcreteScope;
  provider: string;
  viewClass: SkillViewClass;
  /** Unchanged `DriftState`; `null` when no manifest entry allowed detection. */
  driftState: DriftState | null;
  /**
   * Scope-relative path this row is about; `null` when no view is expected.
   *
   * When a manifest entry tracks the view at a path that is not the adapter's
   * expected projection path, this is the *manifest's* path, because that is
   * the path the drift verdict, the version, and the detail all describe. The
   * expected path then travels separately in `expectedProviderPath`.
   */
  providerPath: string | null;
  /**
   * The adapter's expected projection path, present only when the manifest
   * tracks the view somewhere else.
   *
   * Absent on every ordinary row: a row whose manifest entry sits at the
   * expected path has one path, not two.
   */
  expectedProviderPath?: string;
  tracked: boolean;
  strategy: ManifestEntryV2['strategy'] | null;
  nativeRead: boolean;
  canonicalVersion: string | null;
  viewVersion: string | null;
  /** Versions are comparable only for `copy` views that exist. */
  versionComparable: boolean;
  /**
   * How the view's own version declaration read. `conflict`, `unusable`, and
   * `malformed` are why a comparison may have been withheld.
   */
  versionEvidence?: ProjectedSkillVersion['state'];
  /** Narrowest safe repair: one concrete scope, never `--scope all`. */
  suggestion: string | null;
  detail: string;
}

export interface SkillViewDiagnosis {
  skill: string;
  scope: ConcreteScope;
  /**
   * `unknown-skill` is a distinct top-level result from a skill that exists
   * canonically but reaches no provider view, so missing distribution is never
   * confused with a name the repository does not have.
   *
   * `unavailable` means the diagnostic's own inputs could not be read (an
   * unreadable or invalid manifest, for instance). It is reported in the
   * section with its reason and never raised as a command failure: this
   * diagnostic is additive evidence, so it must not take down the tool detail
   * of the very user whose sync state is already broken.
   */
  result: 'diagnosed' | 'unknown-skill' | 'unavailable';
  /** Why the diagnosis is `unavailable`; scope-root paths are redacted. */
  reason?: string;
  views: SkillViewDiagnostic[];
}

const CANONICAL_SKILL_DIR = join('.agents', 'skills');

function skillMappingFor(
  registration: ProviderRegistration,
  scope: ConcreteScope,
): PathMapping | undefined {
  const mappings =
    scope === 'project'
      ? registration.adapter.projectMappings
      : registration.adapter.userMappings;
  return mappings.find(({ contentType }) => contentType === 'skill');
}

/**
 * Builds the expected provider path for one canonical skill, per registered
 * adapter that maps skills in this scope.
 *
 * Mirrors the engine's own derivation (`providerDir` + entry name in
 * `computeSyncPlan`). A canonical skill is a directory, and the engine applies
 * `providerExtension` only to file entries, so the directory name is carried
 * through unchanged.
 *
 * `allowedCanonicalPaths` mirrors `computeSyncPlan`'s filter of the same name:
 * a targeted sync narrows the plan to specific canonical paths. No durable
 * config excludes a canonical skill today, so the `oat tools info` wiring
 * passes nothing; the parameter exists so that a filtered projection is
 * reported as `excluded` rather than as a projection gap.
 */
export function resolveExpectedSkillProjections(input: {
  skillName: string;
  scope: ConcreteScope;
  registrations: readonly ProviderRegistration[];
  allowedCanonicalPaths?: readonly string[];
}): ExpectedProjection[] {
  const canonicalPath = join(CANONICAL_SKILL_DIR, input.skillName);
  const excluded =
    input.allowedCanonicalPaths !== undefined &&
    !input.allowedCanonicalPaths.includes(canonicalPath);
  const projections: ExpectedProjection[] = [];

  for (const registration of input.registrations) {
    const mapping = skillMappingFor(registration, input.scope);
    if (!mapping) continue;
    projections.push({
      provider: registration.adapter.name,
      providerPath: join(mapping.providerDir, input.skillName),
      contentKind: 'skill',
      nativeRead: mapping.nativeRead,
      ...(excluded
        ? {
            excludedReason: `targeted sync filter does not include ${canonicalPath}`,
          }
        : {}),
    });
  }

  return projections;
}

function driftReasonText(state: DriftState): string {
  return state.status === 'drifted' ? state.reason : state.status;
}

function versionNote(strategy: ManifestEntryV2['strategy'] | null): string {
  if (strategy === 'symlink') {
    return ' The view is a symlink to the canonical file, so it has no separate version.';
  }
  if (strategy === 'collection') {
    return ' The view is inherited from a collection alias, so it has no separate version.';
  }
  return '';
}

/** Names a version declaration the resolver could not take at face value. */
function projectedVersionNote(
  projected: ProjectedSkillVersion | undefined,
  withheld: boolean,
): string {
  if (!projected) return '';
  if (projected.state === 'conflict' && projected.conflict) {
    const declaration = `The projected SKILL.md declares metadata.version ${projected.conflict.metadata} and top-level version ${projected.conflict.topLevel}; reconcile the two fields.`;
    // The resolver is deterministic — it takes `metadata.version` — so a
    // conflicting copy can genuinely be stale. When the comparison is
    // withheld, say the check was skipped rather than implying the view is
    // fine; when the resolved value agrees with canonical, nothing was
    // withheld and claiming otherwise would be its own falsehood.
    return withheld
      ? ` ${declaration} A self-contradicting declaration is not usable as evidence, so the version comparison was skipped: a real difference from canonical would not be reported here.`
      : ` ${declaration} The shared resolver takes metadata.version, which is the version compared above.`;
  }
  if (projected.state === 'unusable') {
    return ' The projected SKILL.md declares a version that cannot be read, so no version comparison is made.';
  }
  if (projected.state === 'malformed') {
    return ' The projected SKILL.md frontmatter does not parse, so no version comparison is made.';
  }
  return '';
}

/**
 * Says which path this row is really about when the manifest disagrees with the
 * adapter.
 *
 * The manifest is keyed by `(canonicalPath, provider)` and never by path, so an
 * entry can point somewhere other than the adapter's expected projection while a
 * healthy file sits at the expected path — reachable after a `providerDir`
 * change or from a manifest written under an older layout. Attaching the drift
 * verdict for the tracked path to a row labelled with the expected path made the
 * row state something false about a file that exists, so the row names the
 * tracked path and this note says what the expected path looks like instead.
 */
function divergentPathNote(observation: SkillViewObservation): string {
  const tracked = observation.manifestEntry?.providerPath;
  if (
    tracked === undefined ||
    tracked === observation.projection.providerPath
  ) {
    return '';
  }
  return ` The manifest tracks this view at ${tracked}, which is not the expected projection path ${observation.projection.providerPath}; the state, path, and version above all describe the tracked path. ${
    observation.viewPresent
      ? 'Something does exist at the expected path, and this row says nothing about it.'
      : 'Nothing exists at the expected path either.'
  } Syncing this scope re-projects the skill to the expected path.`;
}

function classify(
  observation: SkillViewObservation,
  isActive: boolean,
): { viewClass: SkillViewClass; detail: string } {
  const { projection, manifestEntry, drift, viewPresent } = observation;

  if (!isActive) {
    return {
      viewClass: 'inactive',
      detail: 'Provider is not active in this scope, so nothing is projected.',
    };
  }

  if (projection.excludedReason !== undefined) {
    return {
      viewClass: 'excluded',
      detail: `Excluded from this scope's projection: ${projection.excludedReason}.`,
    };
  }

  if (projection.nativeRead) {
    return {
      viewClass: 'in-sync',
      detail:
        'Provider reads the canonical skill in place; there is no separate view to sync or version to compare.',
    };
  }

  if (!manifestEntry) {
    if (viewPresent) {
      return {
        viewClass: 'untracked',
        detail:
          'An untracked file occupies the expected path. Stray detection skips provider entries whose name matches a canonical entry, so "oat status" does not report it as a stray; it reports the untracked projection as missing instead. Inspect the path and remove it if it is not wanted, then sync the scope; no repair is suggested here because a sync could overwrite content OAT does not own.',
      };
    }
    return {
      viewClass: 'missing-additive',
      detail:
        'Canonical skill has never been projected to this view: no manifest entry and nothing at the expected path.',
    };
  }

  if (!drift) {
    // A tracked entry must never be labelled `untracked`: the same record
    // reports `tracked: true`, and the two together are self-contradictory.
    return {
      viewClass: 'unverified',
      detail:
        'A manifest entry tracks this view but no drift observation accompanied it, so its state is unverified.',
    };
  }

  if (drift.state.status === 'missing') {
    return {
      viewClass: 'removed',
      detail:
        'The manifest tracks this view but the provider file is gone from disk.',
    };
  }

  if (drift.state.status === 'drifted') {
    return {
      viewClass: 'modified',
      detail: `The tracked view diverged from the canonical skill (${driftReasonText(drift.state)}).`,
    };
  }

  if (drift.state.status === 'in_sync') {
    return {
      viewClass: 'in-sync',
      // A copy is only known to match the content recorded at its last sync:
      // `detectDrift` compares it against the manifest hash, so a canonical
      // edit that was never re-synced leaves both sides agreeing. Say exactly
      // that rather than claiming canonical equality the check cannot support.
      detail:
        manifestEntry.strategy === 'copy'
          ? 'The tracked copy still matches the content recorded at its last sync; a canonical edit that was never re-synced is not visible in the manifest hash.'
          : 'The tracked view matches the canonical skill.',
    };
  }

  // `detectDrift` never returns `stray` for a keyed entry; treat any such
  // report as unmanaged rather than inventing a projection gap.
  return {
    viewClass: 'untracked',
    detail: 'The provider file is reported as an unmanaged stray.',
  };
}

const REPAIRABLE: readonly SkillViewClass[] = [
  'missing-additive',
  'removed',
  'modified',
];

/**
 * Maps one canonical skill onto one diagnostic per registered provider for a
 * single concrete scope. Pure: every filesystem, manifest, and drift fact is
 * supplied by the caller.
 */
export function diagnoseSkillViews(input: {
  skillName: string;
  scope: ConcreteScope;
  /** Whether the canonical skill exists in this scope. */
  canonicalPresent: boolean;
  canonicalVersion: string | null;
  providerScopeContext: ProviderScopeContext;
  observations: readonly SkillViewObservation[];
}): SkillViewDiagnosis {
  if (!input.canonicalPresent) {
    return {
      skill: input.skillName,
      scope: input.scope,
      result: 'unknown-skill',
      views: [],
    };
  }

  const active = new Set(input.providerScopeContext.activeProviders);
  const byProvider = new Map(
    input.observations.map((observation) => [
      observation.projection.provider,
      observation,
    ]),
  );
  const views: SkillViewDiagnostic[] = [];

  for (const registration of input.providerScopeContext.registrations) {
    const provider = registration.adapter.name;
    const observation = byProvider.get(provider);

    if (!observation) {
      views.push({
        skill: input.skillName,
        scope: input.scope,
        provider,
        viewClass: 'unsupported',
        driftState: null,
        providerPath: null,
        tracked: false,
        strategy: null,
        nativeRead: false,
        canonicalVersion: input.canonicalVersion,
        viewVersion: null,
        versionComparable: false,
        suggestion: null,
        detail: `Provider has no ${input.scope} skill mapping, so no view is expected.`,
      });
      continue;
    }

    const isActive = active.has(provider);
    const classification = classify(observation, isActive);
    const strategy = observation.manifestEntry?.strategy ?? null;
    const nativeRead = observation.projection.nativeRead;
    // A drift verdict computed for the manifest's path may only appear on a row
    // that names that path. The divergence is reported wherever the manifest
    // entry is what drives the row: an inactive, excluded, or natively read
    // provider has no drift verdict to misattribute.
    const trackedPath = observation.manifestEntry?.providerPath;
    const pathDiverges =
      trackedPath !== undefined &&
      trackedPath !== observation.projection.providerPath &&
      isActive &&
      !nativeRead &&
      observation.projection.excludedReason === undefined;
    const copyViewReadable =
      strategy === 'copy' &&
      !nativeRead &&
      (classification.viewClass === 'modified' ||
        classification.viewClass === 'in-sync');
    const projected = observation.projectedVersion;
    const resolvedViewVersion = copyViewReadable
      ? (projected?.version ?? null)
      : null;
    const versionState = projected?.state ?? 'absent';
    // A declaration the resolver could not read, or one that contradicts
    // itself while disagreeing with canonical, is not usable as evidence of
    // divergence. Report no comparable version instead of a stale claim.
    const untrustworthyVersion =
      versionState === 'unusable' ||
      versionState === 'malformed' ||
      (versionState === 'conflict' &&
        resolvedViewVersion !== input.canonicalVersion);
    const viewVersion = untrustworthyVersion ? null : resolvedViewVersion;
    const versionComparable = copyViewReadable && viewVersion !== null;
    // `detectDrift` compares a copy against the hash recorded at the last
    // sync, so a copy that was never re-synced after a canonical edit matches
    // its own manifest entry and reads as `in_sync`. Two different versions
    // are proof the view is not the canonical content, whatever the manifest
    // agrees with. `driftState` still reports exactly what the detector said.
    const staleCopy =
      versionComparable &&
      versionState === 'resolved' &&
      classification.viewClass === 'in-sync' &&
      input.canonicalVersion !== null &&
      viewVersion !== null &&
      viewVersion !== input.canonicalVersion;
    // The mirror case: the detector reports a copy as drifted while its
    // version matches canonical. That is the expected state after a
    // copy-strategy sync, because the OAT-managed banner and `.oat-generated`
    // sentinel are not accounted for in the manifest hash
    // (BL-260908-make-copy-strategy-skill), and no sync clears it.
    //
    // Suppressing the repair here is a conservative heuristic, not a proof:
    // equal versions do not establish equal bodies, so an edit to either side
    // that kept the version reaches this branch too, and a sync would fix
    // that one. The detail therefore says which case it cannot distinguish
    // and names the concrete scope command, rather than claiming the content
    // is current.
    const unrepairableCopy =
      versionComparable &&
      classification.viewClass === 'modified' &&
      input.canonicalVersion !== null &&
      viewVersion === input.canonicalVersion;
    const { viewClass, detail } = staleCopy
      ? {
          viewClass: 'modified' as const,
          detail: `The tracked copy still matches the hash recorded at its last sync, but its version (${viewVersion}) differs from the canonical version (${input.canonicalVersion}), so the view is stale.`,
        }
      : unrepairableCopy
        ? {
            viewClass: 'modified' as const,
            detail: `The detector reports this copy as drifted while its version still matches canonical (${input.canonicalVersion}). That is expected after a copy-strategy sync until BL-260908-make-copy-strategy-skill lands: the OAT-managed banner and ".oat-generated" sentinel are not accounted for in the manifest hash, and no sync clears it. Equal versions do not prove the bodies match, so if either side was edited without a version change, compare them and run "oat sync --scope ${input.scope}" yourself.`,
          }
        : classification;

    views.push({
      skill: input.skillName,
      scope: input.scope,
      provider,
      viewClass,
      driftState: observation.drift?.state ?? null,
      providerPath: pathDiverges
        ? trackedPath
        : observation.projection.providerPath,
      ...(pathDiverges
        ? { expectedProviderPath: observation.projection.providerPath }
        : {}),
      tracked: observation.manifestEntry !== null,
      strategy,
      nativeRead,
      canonicalVersion: input.canonicalVersion,
      viewVersion,
      versionComparable,
      ...(copyViewReadable ? { versionEvidence: versionState } : {}),
      // The narrowest safe repair is the single concrete scope where the gap
      // was observed. `--scope all` would widen a one-scope repair into a
      // two-scope write.
      suggestion:
        REPAIRABLE.includes(viewClass) && !unrepairableCopy
          ? `oat sync --scope ${input.scope}`
          : null,
      detail: `${versionComparable ? detail : `${detail}${versionNote(strategy)}`}${
        copyViewReadable
          ? projectedVersionNote(projected, untrustworthyVersion)
          : ''
      }${pathDiverges ? divergentPathNote(observation) : ''}`,
    });
  }

  return {
    skill: input.skillName,
    scope: input.scope,
    result: 'diagnosed',
    views,
  };
}
