import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  getFrontmatterBlock,
  parseSkillFrontmatter,
  resolveSkillVersion,
} from '@commands/shared/frontmatter';
import type { ProviderContextDependencies } from '@commands/tools/shared/provider-context';
import { resolveScopeProviderContextOutcome } from '@commands/tools/shared/provider-context';
import type {
  DriftReport,
  ExpectedProjection,
  ProjectedSkillVersion,
  SkillViewDiagnosis,
  SkillViewObservation,
} from '@drift/index';
import { diagnoseSkillViews } from '@drift/index';
import { OAT_MARKER_PREFIX } from '@engine/markers';
import type { Manifest, ManifestEntryV2 } from '@manifest/manifest.types';
import type { ProviderRegistration } from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

/**
 * Read-only inputs the provider-view diagnostic needs.
 *
 * Every one of these is injected so the diagnostic path can be proven to
 * mutate nothing: there is deliberately no manifest save, no writer, and no
 * sync entry point in this dependency set.
 */
export interface SkillViewDependencies {
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  detectDrift: (
    entry: ManifestEntryV2,
    scopeRoot: string,
  ) => Promise<DriftReport>;
  resolveExpectedProjections: (input: {
    skillName: string;
    scope: ConcreteScope;
    registrations: readonly ProviderRegistration[];
  }) => ExpectedProjection[];
  /** Existence probe for a canonical or provider path. */
  pathExists: (path: string) => Promise<boolean>;
  /** Reads a SKILL.md version from a canonical skill directory. */
  getSkillVersion: (skillDir: string) => Promise<string | null>;
  /**
   * Reads a projected view's version *with* the resolver's verdict. Separate
   * from `getSkillVersion` on purpose: a string alone cannot say whether the
   * declaration behind it conflicted, so a double that returned one would let
   * a conflicting view read as cleanly resolved.
   */
  readProjectedVersion: (skillDir: string) => Promise<ProjectedSkillVersion>;
}

export interface CollectSkillViewsInput {
  skillName: string;
  scopes: readonly ConcreteScope[];
  roots: Readonly<Partial<Record<ConcreteScope, string>>>;
  /** Canonical version already resolved for the scope the tool resolved in. */
  resolvedScope: ConcreteScope;
  resolvedVersion: string | null;
  dependencies: SkillViewDependencies;
  providerContext?: ProviderContextDependencies;
}

function canonicalSkillPath(skillName: string): string {
  return join('.agents', 'skills', skillName);
}

/**
 * Existence probe that treats only a genuinely absent path as absent.
 *
 * A permission or I/O failure is not evidence of a projection gap: reporting
 * one as `missing-additive` would tell the user to run a sync that cannot fix
 * anything. Anything we failed to read is reported as present, which downgrades
 * the classification to `untracked` and suppresses the repair suggestion.
 */
export async function probeProviderPath(
  path: string,
  stat: (target: string) => Promise<unknown> = lstat,
): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    return !(code === 'ENOENT' || code === 'ENOTDIR');
  }
}

/**
 * Reads the version of a projected skill copy, with the state of that reading.
 *
 * The only thing this does differently from the canonical reader is strip the
 * OAT-managed provenance banner the engine prepends to a copied `SKILL.md`
 * (`engine/markers.ts`), which puts the frontmatter past byte zero where
 * `getFrontmatterBlock`'s start-anchored match will not look. Everything after
 * that is `parseSkillFrontmatter` + `resolveSkillVersion` — the same functions
 * `getSkillVersion` uses — so a view and its canonical source can never
 * resolve by different precedence rules. A private parse here previously read
 * the deprecated top-level `version` while the canonical side had already
 * moved to `metadata.version`, which reported a byte-identical copy as stale.
 *
 * The state follows the resolver, never the parse in isolation: once the
 * resolver returns a version, that version is what canonical resolution would
 * report too, so an ignored sibling declaration that happens to be unusable
 * must not downgrade it. `unusable` and `malformed` are reserved for readings
 * that produced no version at all. A read failure yields no version rather
 * than a guess, so a transient failure can never launder a conflicting
 * declaration into a clean one.
 */
export async function readProjectedSkillVersion(
  skillDir: string,
): Promise<ProjectedSkillVersion> {
  let content: string;
  try {
    content = await readFile(join(skillDir, 'SKILL.md'), 'utf8');
  } catch {
    return { version: null, state: 'absent' };
  }

  const stripped = content.startsWith(OAT_MARKER_PREFIX)
    ? content.slice(content.indexOf('\n') + 1)
    : content;
  const block = getFrontmatterBlock(stripped);
  if (!block) return { version: null, state: 'absent' };

  const parsed = parseSkillFrontmatter(block);
  if (parsed.malformed) return { version: null, state: 'malformed' };

  const resolved = resolveSkillVersion(parsed);
  if (!resolved) {
    return {
      version: null,
      state: parsed.unusableVersionDeclaration ? 'unusable' : 'absent',
    };
  }
  if (resolved.conflict) {
    return {
      version: resolved.version,
      state: 'conflict',
      conflict: resolved.conflict,
    };
  }
  return { version: resolved.version, state: 'resolved' };
}

/**
 * Diagnoses one canonical skill against every provider view, for each concrete
 * scope where the canonical skill exists.
 *
 * The scope loop is deliberately wider than `oat tools info`'s name
 * resolution, which returns the first scope that has the skill: a project-scope
 * copy resolving first does not make a user-scope projection gap disappear, and
 * the repair for each scope is its own concrete `oat sync --scope`.
 */
export async function collectSkillViewDiagnoses(
  input: CollectSkillViewsInput,
): Promise<SkillViewDiagnosis[]> {
  const canonicalRelative = canonicalSkillPath(input.skillName);
  const diagnoses: SkillViewDiagnosis[] = [];

  for (const scope of input.scopes) {
    const scopeRoot = input.roots[scope];
    if (!scopeRoot) continue;

    try {
      const diagnosis = await diagnoseScope({
        ...input,
        scope,
        scopeRoot,
        canonicalRelative,
      });
      if (diagnosis) diagnoses.push(diagnosis);
    } catch (error) {
      // Every input this diagnostic reads can fail independently of the tool
      // the user asked about: the sync config and the manifest both throw when
      // present but invalid or unreadable, and the probes can fail on a
      // permission error. None of that may remove the tool detail or change
      // the exit code, so the section reports itself unavailable instead.
      diagnoses.push({
        skill: input.skillName,
        scope,
        result: 'unavailable',
        reason: redactScopeRoot(
          error instanceof Error ? error.message : String(error),
          scope,
          scopeRoot,
        ),
        views: [],
      });
    }
  }

  return diagnoses;
}

/**
 * Makes a failure reason safe to print and to paste into a bug report.
 *
 * The scope root becomes its conventional placeholder, matching how the pack
 * surfaces redact paths. Any absolute path still standing after that is by
 * definition outside the scope root — a manifest `providerPath` that escapes
 * it, for instance, which the detector resolves and names verbatim in an
 * `ENOTDIR`/`ENOENT` message — so it is replaced wholesale rather than
 * forwarded. The second pass only matches a path at a token boundary, which
 * leaves an already-redacted `<project>/…` or `~/…` untouched.
 */
function redactScopeRoot(
  text: string,
  scope: ConcreteScope,
  scopeRoot: string,
): string {
  const placeholder = scope === 'project' ? '<project>' : '~';
  return text
    .replaceAll(`${scopeRoot}/`, `${placeholder}/`)
    .replaceAll(scopeRoot, placeholder)
    .replace(/(^|[\s'"(])(\/[^\s'")]*)/g, '$1<path>');
}

async function diagnoseScope(
  input: CollectSkillViewsInput & {
    scope: ConcreteScope;
    scopeRoot: string;
    canonicalRelative: string;
  },
): Promise<SkillViewDiagnosis | null> {
  const { dependencies: deps, scope, scopeRoot, canonicalRelative } = input;
  const canonicalDir = join(scopeRoot, canonicalRelative);
  if (!(await deps.pathExists(canonicalDir))) return null;

  // A sync config that is present but unreadable is exactly the failure this
  // diagnostic exists to explain, so it degrades to `unavailable` with a
  // reason like every other unreadable input. Dropping the scope instead would
  // print nothing at all, which reads as "no providers configured" — the
  // opposite of the truth — to the one user most likely to be running this.
  // An absent config is not that case: `loadSyncConfig` answers `ENOENT` with
  // the defaults, so it resolves normally and the scope is diagnosed.
  const contextOutcome = await resolveScopeProviderContextOutcome({
    scope,
    scopeRoot,
    ...(input.providerContext ? { dependencies: input.providerContext } : {}),
  });
  if (contextOutcome.status === 'failed') {
    throw contextOutcome.error instanceof Error
      ? contextOutcome.error
      : new Error(String(contextOutcome.error));
  }
  const providerScopeContext = contextOutcome.context;

  const projections = deps.resolveExpectedProjections({
    skillName: input.skillName,
    scope,
    registrations: providerScopeContext.registrations,
  });
  const manifest = await deps.loadManifest(
    join(scopeRoot, '.oat', 'sync', 'manifest.json'),
  );
  // Collection entries ride in this compatibility view; the per-entry
  // manifest reader narrows them, so read the V2 shape back for `strategy`.
  const entries = manifest.entries as readonly ManifestEntryV2[];
  const observations: SkillViewObservation[] = [];

  for (const projection of projections) {
    const manifestEntry =
      entries.find(
        (entry) =>
          entry.canonicalPath === canonicalRelative &&
          entry.provider === projection.provider,
      ) ?? null;
    const viewPresent = await deps.pathExists(
      join(scopeRoot, projection.providerPath),
    );
    // `detectDrift` requires a manifest entry, so a never-synced projection
    // is classified from the expected path alone and never probes drift.
    const drift = manifestEntry
      ? await deps.detectDrift(manifestEntry, scopeRoot)
      : null;
    const comparable =
      manifestEntry?.strategy === 'copy' &&
      !projection.nativeRead &&
      viewPresent;

    observations.push({
      projection,
      manifestEntry,
      drift,
      viewPresent,
      ...(comparable
        ? {
            projectedVersion: await deps.readProjectedVersion(
              join(scopeRoot, projection.providerPath),
            ),
          }
        : {}),
    });
  }

  return diagnoseSkillViews({
    skillName: input.skillName,
    scope,
    canonicalPresent: true,
    canonicalVersion:
      scope === input.resolvedScope
        ? input.resolvedVersion
        : await deps.getSkillVersion(canonicalDir),
    providerScopeContext,
    observations,
  });
}

function qualifier(view: SkillViewDiagnosis['views'][number]): string {
  if (view.nativeRead) return ' (native read)';
  if (view.strategy === 'symlink') return ' (symlink)';
  if (view.strategy === 'copy') return ' (copy)';
  if (view.strategy === 'collection') return ' (collection alias)';
  return '';
}

const ACTIONABLE = new Set(['missing-additive', 'removed', 'modified']);

/** Renders the human-readable provider-view block. Pure. */
export function formatSkillViewLines(
  diagnoses: readonly SkillViewDiagnosis[],
): string[] {
  const lines: string[] = [];

  for (const diagnosis of diagnoses) {
    if (diagnosis.result === 'unavailable') {
      lines.push(`  Provider views (${diagnosis.scope}): unavailable`);
      if (diagnosis.reason) lines.push(`    ${diagnosis.reason}`);
      continue;
    }
    if (diagnosis.result !== 'diagnosed' || diagnosis.views.length === 0) {
      continue;
    }
    lines.push(`  Provider views (${diagnosis.scope}):`);
    const width = Math.max(
      ...diagnosis.views.map(({ provider }) => provider.length),
    );

    for (const view of diagnosis.views) {
      const label = `${view.provider}:`.padEnd(width + 1);
      const path = view.providerPath ? `  ${view.providerPath}` : '';
      lines.push(`    ${label} ${view.viewClass}${qualifier(view)}${path}`);
      // A withheld or ambiguous version comparison is exactly the case a user
      // cannot infer from the class word alone, so it is shown even when the
      // class itself is not actionable.
      if (
        ACTIONABLE.has(view.viewClass) ||
        view.viewClass === 'untracked' ||
        (view.versionEvidence !== undefined &&
          view.versionEvidence !== 'resolved' &&
          view.versionEvidence !== 'absent')
      ) {
        lines.push(`      ${view.detail}`);
      }
      if (view.versionComparable) {
        lines.push(
          `      versions: canonical ${view.canonicalVersion ?? '-'}, view ${view.viewVersion ?? '-'}`,
        );
      }
    }

    // One suggestion per affected scope, never one per provider and never
    // `--scope all`: the narrowest safe repair is the scope that has the gap.
    const suggestion = diagnosis.views.find(
      ({ suggestion: value }) => value !== null,
    )?.suggestion;
    if (suggestion) lines.push(`    Repair: ${suggestion}`);
  }

  return lines;
}
