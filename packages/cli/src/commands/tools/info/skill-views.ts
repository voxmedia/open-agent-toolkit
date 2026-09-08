import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
import type { ProviderContextDependencies } from '@commands/tools/shared/provider-context';
import { resolveScopeProviderContext } from '@commands/tools/shared/provider-context';
import type {
  DriftReport,
  ExpectedProjection,
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
  /** Reads a SKILL.md version from a skill directory. */
  getSkillVersion: (skillDir: string) => Promise<string | null>;
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
 * Reads the version of a projected skill copy.
 *
 * The engine prepends an OAT-managed provenance banner to a copied `SKILL.md`
 * (`engine/markers.ts`), which puts the frontmatter past byte zero where the
 * canonical reader will not look. Falls back to parsing the content after that
 * banner, so a copy-strategy view reports a version instead of a blank.
 *
 * `getSkillVersion` remains the source of truth for *where* a version lives.
 * This fallback resolves the top-level `version` field only, so it agrees with
 * that reader exactly as long as the top-level field is the only location. A
 * reader that introduces a second location with its own precedence must
 * replace this parse rather than sit beside it, because a SKILL.md carrying
 * both would otherwise resolve differently here than canonically.
 */
export async function readProjectedSkillVersion(
  skillDir: string,
  getSkillVersion: (dir: string) => Promise<string | null>,
): Promise<string | null> {
  const direct = await getSkillVersion(skillDir);
  if (direct !== null) return direct;

  try {
    const content = await readFile(join(skillDir, 'SKILL.md'), 'utf8');
    if (!content.startsWith(OAT_MARKER_PREFIX)) return null;
    const stripped = content.slice(content.indexOf('\n') + 1);
    const block = getFrontmatterBlock(stripped);
    const version = block ? getFrontmatterField(block, 'version') : null;
    // The canonical reader normalizes an empty or comment-only value to
    // `null`; this fallback must not report `''` where that reports nothing.
    return version !== null && version.length > 0 ? version : null;
  } catch {
    return null;
  }
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
      // the user asked about: `loadManifest` throws on a manifest that is
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

  // Provider reachability is additive evidence: a missing or unreadable sync
  // config degrades to "no provider evidence" rather than failing `info`.
  const providerScopeContext = await resolveScopeProviderContext({
    scope,
    scopeRoot,
    ...(input.providerContext ? { dependencies: input.providerContext } : {}),
  });
  if (!providerScopeContext) return null;

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
      viewVersion: comparable
        ? await readProjectedSkillVersion(
            join(scopeRoot, projection.providerPath),
            deps.getSkillVersion,
          )
        : null,
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
      if (ACTIONABLE.has(view.viewClass) || view.viewClass === 'untracked') {
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
