import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * An absolute path inside a quoted span, taken whole.
 *
 * A path may contain spaces, commas, and even a stray quote of the other kind,
 * and every reachable producer of one of these messages quotes it
 * (`lstat '/a/Private Client/x'`). Matching to the *matching* delimiter, rather
 * than to the first character that looks like a separator, is what stops the
 * bare pass below from redacting a prefix and forwarding the rest. The span must
 * start with `/`, so an already-redacted `'<project>/…'` or `'~/…'` is left
 * intact, and the match is lazy so two quoted spans in one message do not merge.
 */
const QUOTED_ABSOLUTE_PATH = /(['"`])(\/[^\n]*?)\1/g;

/**
 * An absolute path that is not quoted.
 *
 * The leading `/` may follow anything that is not a path character, which covers
 * `=`, `:`, `[`, `<`, and a bare token boundary alike; requiring a specific
 * delimiter is what let `path=/Users/…` through. Excluding `[A-Za-z0-9_~.>-]`
 * before the slash is what keeps a relative `.oat/sync/…` and an
 * already-redacted `<project>/…` or `~/…` intact.
 *
 * The path itself runs to whitespace or a quote and to nothing else. A comma, a
 * bracket, and a brace are all legal in a filename, so treating one as a
 * terminator would end the match inside a real path and forward its tail —
 * `/outside/public,Private` would redact to `<path>,Private`. Swallowing a
 * trailing bracket is the safe direction. A URL is redacted from its `//`
 * onwards, which is over-redaction rather than a leak, and no producer of these
 * messages emits one.
 */
const BARE_ABSOLUTE_PATH = /(^|[^A-Za-z0-9_~.>-])(\/[^\s'"`]*)/g;

/**
 * Makes a failure reason safe to print and to paste into a bug report.
 *
 * The scope root becomes its conventional placeholder, matching how the pack
 * surfaces redact paths, but only where the root genuinely contains what
 * follows — a `/` or the end of the string. Replacing it anywhere turned a
 * sibling that merely shares the prefix (`/project-private/secret`, or
 * `/project private/secret`) into `<project>-private/secret`, which both lies
 * about the location and forwards the rest of a path that was never inside the
 * scope root. A non-contained sibling falls through to the passes below and is
 * replaced wholesale instead.
 *
 * Any absolute path still standing after that is by definition outside the
 * scope root — a manifest `providerPath` that escapes it, for instance, which
 * the detector resolves and names verbatim in an `ENOTDIR`/`ENOENT` message —
 * so it is replaced wholesale rather than forwarded. Redaction is deliberately
 * greedy here: over-redacting a reason costs a user nothing, and under-redacting
 * one puts a username or a private directory name into a bug report.
 */
function redactScopeRoot(
  text: string,
  scope: ConcreteScope,
  scopeRoot: string,
): string {
  const placeholder = scope === 'project' ? '<project>' : '~';
  return text
    .replace(new RegExp(`${escapeRegExp(scopeRoot)}(?=/|$)`, 'g'), placeholder)
    .replace(QUOTED_ABSOLUTE_PATH, '$1<path>$1')
    .replace(BARE_ABSOLUTE_PATH, '$1<path>');
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
    // The probes below use the real path; the row may not. An escaping path is
    // replaced with the same placeholder a reason gets, so the divergence is
    // still reported honestly without naming a location outside the scope.
    const renderableEntry =
      manifestEntry && escapesScope(manifestEntry.providerPath)
        ? { ...manifestEntry, providerPath: '<path>' }
        : manifestEntry;
    // One provider's unreadable path is not evidence about the other four.
    // `detectDrift` throws before `readProjectedVersion`'s own catch can
    // classify, and letting that reach the scope-level catch took the whole
    // section down with it. Only the failing row degrades now.
    try {
      observations.push(
        await observeProjection({
          deps,
          scopeRoot,
          projection,
          manifestEntry,
          renderableEntry,
        }),
      );
    } catch (error) {
      observations.push({
        projection,
        manifestEntry: renderableEntry,
        drift: null,
        viewPresent: false,
        unavailableReason: redactScopeRoot(
          error instanceof Error ? error.message : String(error),
          scope,
          scopeRoot,
        ),
      });
    }
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

/**
 * Whether a manifest `providerPath` names something outside its own scope.
 *
 * Manifest paths are scope-relative by convention, so anything absolute or
 * reaching back through `..` describes a location the scope root placeholder
 * cannot stand in for. Such a path is never rendered verbatim: a row that named
 * it would disclose a location outside the tree the user asked about, which is
 * exactly what the reason redaction exists to prevent.
 */
function escapesScope(providerPath: string): boolean {
  return isAbsolute(providerPath) || providerPath.split(/[\\/]/).includes('..');
}

/** Reads one provider's reality for one expected projection. */
async function observeProjection(input: {
  deps: SkillViewDependencies;
  scopeRoot: string;
  projection: ExpectedProjection;
  /** The real entry, used for every filesystem probe. */
  manifestEntry: ManifestEntryV2 | null;
  /** The same entry with an escaping path redacted, used for the row. */
  renderableEntry: ManifestEntryV2 | null;
}): Promise<SkillViewObservation> {
  const { deps, scopeRoot, projection, manifestEntry } = input;
  const viewPresent = await deps.pathExists(
    join(scopeRoot, projection.providerPath),
  );
  // `detectDrift` requires a manifest entry, so a never-synced projection
  // is classified from the expected path alone and never probes drift.
  const drift = manifestEntry
    ? await deps.detectDrift(manifestEntry, scopeRoot)
    : null;
  // `detectDrift` resolves the manifest entry's own `providerPath`, and the
  // manifest is keyed by `(canonicalPath, provider)` with no path check, so
  // the two can name different files. Everything about a tracked row is then
  // read from the tracked path, because that is the path the drift verdict
  // already describes; mixing the two would report one file's version beside
  // another file's state. The extra probe only runs when they actually
  // diverge, so the ordinary row is unchanged.
  const trackedPath = manifestEntry?.providerPath;
  const pathDiverges =
    trackedPath !== undefined && trackedPath !== projection.providerPath;
  const trackedPresent = pathDiverges
    ? await deps.pathExists(join(scopeRoot, trackedPath))
    : viewPresent;
  // A tracked path that escapes the scope is not read for a version. Its
  // `SKILL.md` is a file outside the tree the user asked about, so reporting
  // its version would both disclose content from outside the scope and compare
  // the canonical skill against something that is not a view of it.
  const comparable =
    manifestEntry?.strategy === 'copy' &&
    !projection.nativeRead &&
    trackedPresent &&
    !(trackedPath !== undefined && escapesScope(trackedPath));

  return {
    projection,
    manifestEntry: input.renderableEntry,
    drift,
    viewPresent,
    ...(comparable
      ? {
          projectedVersion: await deps.readProjectedVersion(
            join(scopeRoot, trackedPath ?? projection.providerPath),
          ),
        }
      : {}),
  };
}

function qualifier(view: SkillViewDiagnosis['views'][number]): string {
  if (view.nativeRead) return ' (native read)';
  if (view.strategy === 'symlink') return ' (symlink)';
  if (view.strategy === 'copy') return ' (copy)';
  if (view.strategy === 'collection') return ' (collection alias)';
  return '';
}

const ACTIONABLE = new Set(['missing-additive', 'removed', 'modified']);

/**
 * Classes for which nothing is projected at all.
 *
 * These rows carry no projection qualifier and no path: `copilot: inactive
 * (native read)  .agents/skills/x` named a file the provider was never going to
 * read and described a strategy that was never going to run.
 */
const NO_PROJECTION = new Set(['inactive', 'unsupported', 'excluded']);

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
      const projected = !NO_PROJECTION.has(view.viewClass);
      const path =
        projected && view.providerPath ? `  ${view.providerPath}` : '';
      lines.push(
        `    ${label} ${view.viewClass}${projected ? qualifier(view) : ''}${path}`,
      );
      // A withheld or ambiguous version comparison is exactly the case a user
      // cannot infer from the class word alone, so it is shown even when the
      // class itself is not actionable.
      if (
        ACTIONABLE.has(view.viewClass) ||
        view.viewClass === 'untracked' ||
        // `unverified` is the class a per-view read failure degrades to, and
        // its detail carries the redacted reason. Withholding it would hide
        // exactly what the scope-level `unavailable` used to print.
        view.viewClass === 'unverified' ||
        // A row naming a path the adapter does not expect is unreadable
        // without the sentence that says why, whatever its class.
        view.expectedProviderPath !== undefined ||
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
