/**
 * Skill-to-script reference integrity.
 *
 * A shipped skill may name a helper script through its installed destination,
 * `.oat/scripts/<name>`. Nothing in the install path proves the pack that ships
 * the skill also ships that script, so a rename or a pack move can leave a
 * skill pointing at a file its own installation never materializes.
 *
 * This module supplies the join: a syntax-aware extractor for the reference
 * spellings authored Markdown actually uses, a manifest-derived view of the
 * shipped skill surface, and an owning-pack resolver. Callers compare the two
 * and fail when a shipped skill references a script its owning pack does not
 * ship.
 *
 * The shipped surface is derived from the pack manifest, never from the
 * canonical `.agents/skills` directory listing: that listing is a superset that
 * also holds repository-local authoring and utility skills no pack ships. Those
 * directories are classified and reported, never resolved to a pack and never a
 * failure by themselves.
 */

import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type {
  PackAssetDefinition,
  PackDefinition,
  PackName,
} from '@commands/tools/shared/types';

/** Installed destination prefix produced by the manifest's `script()` helper. */
export const SCRIPT_DESTINATION_PREFIX = '.oat/scripts/';

// Extraction runs in two stages, and the split is the whole point.
//
// Stage one finds where a reference starts. The lookbehind rejects a candidate
// glued to an identifier, so `myrepo.oat/scripts/…` never matches, while every
// rooted spelling authored today still does: a leading `/` is explicitly
// allowed, which covers `$SCOPE_ROOT/.oat/scripts/…`, `${HOME}/.oat/scripts/…`,
// `~/.oat/scripts/…`, and the plain relative form. The trailing slash is
// required, so a mention of the directory itself — `${HOME}/.oat/scripts` — is
// not a reference start at all.
const SCRIPT_REFERENCE_START = /(?<![A-Za-z0-9_.-])\.oat\/scripts\//g;

// Stage two reads the name that follows, losslessly, up to the first character
// that closes the surrounding Markdown construct: whitespace, the backtick or
// quote closing an inline span, the `)` or `>` closing a link target, or a
// list/table separator.
//
// Reading the whole token rather than matching a "valid-looking" name is what
// makes the check fail closed. A name class that stopped at the first
// unexpected character would quietly truncate `…/resolve-tracking.sh/<file>`
// down to the shipped `resolve-tracking.sh` and report success, and a class
// that required a leading alphanumeric would drop `_missing.sh` on the floor
// instead of flagging it. Both are fail-open, and a fail-open integrity check
// is worse than none.
//
// Only true closers belong here, never ordinary punctuation. Every character in
// this set truncates the token, so admitting one that can appear mid-path would
// reintroduce exactly the truncation this design removes.
const REFERENCE_TOKEN_TERMINATOR = /[\s`"'),;\]|>]/;

// Prose puts a mark after a path without making it part of the path, and each
// of these is a real authored spelling: `run .oat/scripts/x.sh.`,
// `did you run .oat/scripts/x.sh?`, `run .oat/scripts/x.sh: it resolves…`.
//
// Exactly one such character is dropped, and only in the final position. That
// is deliberately weaker than trimming a run: a doubled `x.sh..` keeps a period
// and still fails, so a malformed spelling cannot be normalized into a shipped
// name. Position-anchored trimming also cannot truncate a path the way a
// terminator does.
const TRAILING_PROSE_MARK = /[.:!?]$/;

// A token carrying shell, glob, or documentation-placeholder syntax names no
// concrete file: `~/.oat/scripts/<file>` and `.oat/scripts/${NAME}` are prose
// about the directory, not references into it. These negatives are as
// load-bearing as the matches, since a false positive here blocks CI on
// documentation that is entirely correct.
//
// This test runs after the prose mark is dropped, so a `?` that merely ended a
// question is gone before it can be mistaken for a glob.
const PLACEHOLDER_SYNTAX = /[<{}$*?]/;

function readReferenceToken(line: string, from: number): string {
  let end = from;
  while (end < line.length && !REFERENCE_TOKEN_TERMINATOR.test(line[end]!)) {
    end += 1;
  }
  return line.slice(from, end);
}

/** One extracted reference, kept line-addressed so failures cite a location. */
export interface ScriptReference {
  /** Manifest-comparable destination, e.g. `.oat/scripts/resolve-tracking.sh`. */
  reference: string;
  /** 1-based line number of the occurrence within the scanned text. */
  line: number;
}

/** Authored text belonging to one skill, ready to be scanned. */
export interface SkillScriptSource {
  /** Canonical skill name, as shipped by a pack. */
  skill: string;
  /** Display path used in failure messages. */
  file: string;
  /** File contents. */
  text: string;
}

/** A shipped skill naming a script its owning pack does not ship. */
export interface ScriptReferenceViolation {
  skill: string;
  file: string;
  line: number;
  reference: string;
  /** Every pack that ships the skill; membership in any one satisfies the check. */
  packs: PackName[];
  /** Script destinations those packs do ship, for an actionable message. */
  shipped: string[];
}

/** How a canonical `.agents/skills` directory relates to the pack manifest. */
export type CanonicalSkillDirClass = 'shipped' | 'canonical-unshipped';

/** Split of canonical skill directories by manifest membership. */
export interface CanonicalSkillDirClassification {
  shipped: string[];
  canonicalUnshipped: string[];
}

function skillNameOf(asset: PackAssetDefinition): string {
  return asset.id.slice('skill:'.length);
}

/**
 * Extract every `.oat/scripts/<name>` reference from authored text.
 *
 * Scanning is line-by-line so each occurrence carries its own line number, and
 * so a reference can never be assembled across a line break.
 *
 * A reference is returned essentially as authored. Nothing is truncated to a
 * shipped-looking prefix, and the only edit is dropping a single trailing prose
 * mark, so a malformed name reaches the manifest comparison intact and fails
 * there rather than being normalized into a name that happens to exist.
 */
export function extractScriptReferences(text: string): ScriptReference[] {
  const references: ScriptReference[] = [];

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    for (const match of line.matchAll(SCRIPT_REFERENCE_START)) {
      const name = readReferenceToken(
        line,
        match.index + match[0].length,
      ).replace(TRAILING_PROSE_MARK, '');

      // Prose about the directory, not a reference into it.
      if (PLACEHOLDER_SYNTAX.test(name)) continue;

      // A bare `.oat/scripts/` mention names no script.
      if (name.length === 0) continue;

      references.push({
        reference: `${SCRIPT_DESTINATION_PREFIX}${name}`,
        line: index + 1,
      });
    }
  }

  return references;
}

/**
 * The union of every pack's skill assets: the surface the manifest claims to
 * ship, which is what the contract checks.
 */
export function listShippedSkills(
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): string[] {
  const names = new Set<string>();

  for (const pack of manifest) {
    for (const asset of pack.assets) {
      if (asset.kind === 'skill') names.add(skillNameOf(asset));
    }
  }

  return [...names].sort();
}

/** Script destinations shipped by one pack. */
export function listPackScriptDestinations(
  pack: PackName,
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): string[] {
  const definition = manifest.find(({ name }) => name === pack);
  if (!definition) throw new Error(`Unknown pack: ${pack}`);

  return definition.assets
    .filter((asset) => asset.kind === 'script')
    .map(({ destination }) => destination)
    .sort();
}

/**
 * Classify a canonical skill directory against the manifest.
 *
 * `canonical-unshipped` is an ordinary, expected state: repository-local
 * authoring and utility skills live under `.agents/skills` without belonging to
 * any pack. It is reported, never failed.
 */
export function classifyCanonicalSkillDir(
  name: string,
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): CanonicalSkillDirClass {
  return listShippedSkills(manifest).includes(name)
    ? 'shipped'
    : 'canonical-unshipped';
}

/** Classify a whole directory listing in one pass. */
export function classifyCanonicalSkillDirs(
  names: readonly string[],
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): CanonicalSkillDirClassification {
  const shipped = new Set(listShippedSkills(manifest));

  return {
    shipped: names.filter((name) => shipped.has(name)).sort(),
    canonicalUnshipped: names.filter((name) => !shipped.has(name)).sort(),
  };
}

/**
 * Shipped skills the manifest names but whose canonical directory is absent.
 *
 * The inverse of `classifyCanonicalSkillDirs`, and unlike an unshipped
 * directory this *is* a failure: the manifest promises to install something the
 * repository does not contain.
 */
export function findMissingShippedSkillDirs(
  existingDirs: readonly string[],
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): string[] {
  const existing = new Set(existingDirs);
  return listShippedSkills(manifest).filter((name) => !existing.has(name));
}

/**
 * Every pack that ships `skillName`.
 *
 * Throws for a name no pack ships. That is a caller bug rather than a repository
 * defect: callers drive from `listShippedSkills`, so an unshipped canonical
 * directory never reaches here.
 *
 * A skill carried by more than one pack resolves to all of them, and membership
 * in any one satisfies the reference check — the same shared-ownership rule the
 * manifest applies to a script shipped by two packs under one `sharedOwner`.
 */
export function resolveOwningPack(
  skillName: string,
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): PackName[] {
  const packs = manifest
    .filter((pack) =>
      pack.assets.some(
        (asset) => asset.kind === 'skill' && skillNameOf(asset) === skillName,
      ),
    )
    .map(({ name }) => name);

  if (packs.length === 0) {
    throw new Error(
      `resolveOwningPack: skill "${skillName}" is shipped by no pack; pass a name from listShippedSkills()`,
    );
  }

  return packs;
}

/**
 * The contract itself: every script reference authored by a shipped skill must
 * name a `kind: 'script'` destination of a pack that ships that skill.
 *
 * Sources for skills no pack ships must not be passed; drive callers from
 * `listShippedSkills` so `resolveOwningPack` stays a caller-bug signal.
 */
export function findUnshippedScriptReferences(
  sources: readonly SkillScriptSource[],
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): ScriptReferenceViolation[] {
  const violations: ScriptReferenceViolation[] = [];

  for (const { skill, file, text } of sources) {
    const packs = resolveOwningPack(skill, manifest);
    const shipped = [
      ...new Set(
        packs.flatMap((pack) => listPackScriptDestinations(pack, manifest)),
      ),
    ].sort();

    for (const { reference, line } of extractScriptReferences(text)) {
      if (shipped.includes(reference)) continue;
      violations.push({ skill, file, line, reference, packs, shipped });
    }
  }

  return violations;
}

/** Render one violation so the failure names the skill, reference, and pack. */
export function formatScriptReferenceViolation({
  skill,
  file,
  line,
  reference,
  packs,
  shipped,
}: ScriptReferenceViolation): string {
  const owner = `pack${packs.length > 1 ? 's' : ''} ${packs.join(', ')}`;
  const available = shipped.length > 0 ? shipped.join(', ') : 'no scripts';
  return `${skill} (${owner}) references ${reference} at ${file}:${line}, but ${owner} ${packs.length > 1 ? 'ship' : 'ships'} ${available}`;
}
