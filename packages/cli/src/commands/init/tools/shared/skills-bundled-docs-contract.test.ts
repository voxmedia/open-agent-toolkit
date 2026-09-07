import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveCanonicalRole } from '@agents/canonical';
import type { PackDefinition } from '@commands/tools/shared/pack-manifest';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  classifyCanonicalSkillDir,
  classifyCanonicalSkillDirs,
  extractScriptReferences,
  findMissingShippedSkillDirs,
  findUnshippedScriptReferences,
  formatScriptReferenceViolation,
  listShippedSkills,
  resolveOwningPack,
} from './skill-script-references';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
}).trim();

const SKILLS_DIR = join(REPO_ROOT, '.agents', 'skills');
const AGENTS_DIR = join(REPO_ROOT, '.agents', 'agents');
const SHARED_DOCS_DIR = join(REPO_ROOT, '.agents', 'docs');
const BUNDLE_ASSETS_SCRIPT = join(
  REPO_ROOT,
  'packages',
  'cli',
  'scripts',
  'bundle-assets.sh',
);

// Matches a Markdown reference to a real shared doc, e.g. `.agents/docs/skills-guide.md`.
const SHARED_DOC_REF = /\.agents\/docs\/([a-zA-Z0-9_-]+)\.md/g;

// A line carrying this marker is opting out: the reference is intentionally
// monorepo-internal and not expected to resolve in consumer repos.
const MONOREPO_ONLY_MARKER = /monorepo only/i;

// ── External-plan readiness contract ────────────────────────────────────
//
// Plan readiness and execution readiness are separate questions. A plan is
// plan-ready when it is well formed; it is execution-ready when its hard
// dependencies have merged. The rules below make that split checkable, and
// the legacy branch keeps every plan authored before the contract readable
// exactly as written.

const EXTERNAL_PLANS_DIR = join(
  REPO_ROOT,
  '.oat',
  'repo',
  'reference',
  'external-plans',
);
const SNAPSHOT_FIXTURES_DIR = join(import.meta.dirname, '__fixtures__');

/**
 * Read a captured fixture, dropping the leading provenance comment so the
 * bytes below it are exactly what was captured from the source artifact.
 */
function readSnapshotFixture(name: string): string {
  const text = readFileSync(join(SNAPSHOT_FIXTURES_DIR, name), 'utf8');
  const header = /^<!--[\s\S]*?-->\n+/.exec(text);

  expect(
    header,
    `${name} must record its provenance in a header comment`,
  ).not.toBeNull();
  expect(header?.[0], `${name} header must name its source`).toContain(
    'Source:',
  );
  expect(header?.[0], `${name} header must name its captured commit`).toMatch(
    /Captured: +[0-9a-f]{40}/,
  );

  return text.slice(header?.[0].length ?? 0);
}

const REPO_IMPROVE_SKILL = join(SKILLS_DIR, 'oat-repo-improve', 'SKILL.md');
const PLAN_TEMPLATE = join(
  SKILLS_DIR,
  'oat-repo-improve',
  'references',
  'plan-template.md',
);

// The date this contract landed. A plan dated before it, or carrying no date
// at all, is read in legacy mode. Keep this in step with the "Legacy plans"
// paragraph in `plan-template.md`.
const CONTRACT_LANDING_DATE = '2026-09-07';

// A `Hard` row records one of these named unblock states, so "is this plan
// blocked?" is answerable without reading prose.
const SATISFIED_UNBLOCK_STATES = ['satisfied', 'landed', 'merged', 'accepted'];
const UNSATISFIED_UNBLOCK_STATES = ['pending', 'blocked', 'in flight'];
const DEPENDENCY_TYPES = ['hard', 'soft', 'satisfied'];

const DEPENDENCY_COLUMNS = [
  'type',
  'dependency',
  'required state',
  'current state',
];
const LANDING_EVENT_COLUMNS = [
  'event',
  'affected',
  'files in common',
  'required update',
];

const FULL_SHA = /^[0-9a-f]{40}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// CommonMark: an opener may be indented up to three spaces and may carry an
// info string; a closer carries none.
const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSER = /^ {0,3}(`{3,}|~{3,})\s*$/;

const SHORT_SHA_VIOLATION =
  'oat_external_plan_commit must be the full 40-character SHA of the inspected HEAD';
const MISSING_MAIN_COMMIT_VIOLATION =
  'oat_external_plan_main_commit must record the compared origin/main SHA';
const CONTRADICTORY_STATUS_VIOLATION =
  'an unsatisfied hard dependency contradicts oat_execution_status: READY';
const UNJUSTIFIED_BLOCK_VIOLATION =
  'oat_execution_status: BLOCKED names no unsatisfied hard dependency';
const MISSING_STATUS_VIOLATION =
  'oat_execution_status must be READY or BLOCKED';
const MISSING_DEPENDENCY_TABLE_VIOLATION =
  '## Dependencies must declare a Type / Dependency / Required state / Current state table';
const MISSING_LANDING_EVENT_TABLE_VIOLATION =
  '## Landing-event impact must declare an Event / Affected / Files in common / Required update table';
const EMPTY_REVALIDATION_VIOLATION =
  '## Revalidation Before Execution must name at least one revalidation trigger';
const MALFORMED_DATE_VIOLATION =
  'oat_external_plan_date must be an ISO YYYY-MM-DD date';
const MISSING_PROGRAM_INDEXES_VIOLATION =
  'oat_program_indexes must list at least one plan index';
const MISSING_STATUS_LEDGER_TABLE_VIOLATION =
  '## Status Ledger must declare a Wave / Theme / Lanes / Status / Record table';
const EMPTY_STATUS_LEDGER_VIOLATION =
  '## Status Ledger must record at least one wave';
const EMPTY_WAVE_TABLE_VIOLATION =
  '## Wave Table must record at least one plan';
const MISSING_SOURCE_BACKLINK_VIOLATION =
  '## Source and live evidence must link the plan back to its source item, or record it as none';

// `oat-wave-program` documents `composed → in-progress → merged` for a wave's
// ledger row (SKILL.md:66) and also instructs the final row to flip to `done`
// at program close (SKILL.md:116). Both spellings come from the producer, so
// both are accepted here; this contract reads programs, it does not redefine
// that skill's vocabulary.
const WAVE_STATUSES = ['composed', 'in-progress', 'merged', 'done'];
const STATUS_LEDGER_COLUMNS = ['wave', 'theme', 'lanes', 'status', 'record'];

type PlanReadinessMode = 'legacy' | 'prospective';
type PlanDocumentKind = 'plan' | 'index' | 'program';

interface PlanReadiness {
  mode: PlanReadinessMode;
  kind: PlanDocumentKind;
  status: 'READY' | 'BLOCKED';
  violations: string[];
}

function parsePlanFrontmatter(text: string): Record<string, unknown> {
  const block = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text)?.[1];
  if (block === undefined) return {};
  const parsed: unknown = YAML.parse(block);
  return typeof parsed === 'object' && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * Body of a top-level section, skipping headings that only appear inside a
 * fenced example. A plain `indexOf` would treat a quoted `## Dependencies` in
 * a code fence as the real section, and a multiline `$` in a regex would match
 * at every line end and truncate the body to its first line.
 */
function findSection(
  text: string,
  matches: (heading: string) => boolean,
): string | undefined {
  const lines = text.split('\n');
  let fence: string | undefined;
  let start = -1;
  let end = lines.length;

  for (const [index, line] of lines.entries()) {
    if (fence === undefined) {
      const opener = FENCE_OPENER.exec(line)?.[1];
      if (opener !== undefined) {
        fence = opener;
        continue;
      }
    } else {
      // A closer carries no info string and is at least as long as its
      // opener, so ```bash nested in a ``` block does not end it.
      const closer = FENCE_CLOSER.exec(line)?.[1];
      if (
        closer !== undefined &&
        closer[0] === fence[0] &&
        closer.length >= fence.length
      ) {
        fence = undefined;
      }
      continue;
    }

    const heading = line.startsWith('## ')
      ? line.slice(3).trimEnd()
      : undefined;
    if (start === -1) {
      if (heading !== undefined && matches(heading)) start = index + 1;
      continue;
    }
    if (heading !== undefined) {
      end = index;
      break;
    }
  }

  return start === -1 ? undefined : lines.slice(start, end).join('\n');
}

function planSection(text: string, heading: string): string | undefined {
  return findSection(text, (candidate) => candidate === heading);
}

// The bullets that name a plan's source. Only these four labels carry the
// contract: `oat-repo-improve/SKILL.md:216,221` and its `plan-template.md`
// define them, and no plan in the durable corpus names a source any other
// way. A `Related history` or `Related decisions` bullet is context, so a link
// there must not stand in for the source backlink.
const SOURCE_DECLARATION_LABEL =
  /^-[ \t]*(?:Source backlog item|Source issue|Source artifact or scope|Related backlog items)[ \t]*:/i;
// Inline, reference-style, and autolink forms all satisfy "link" as the skill
// and the template use the word. The inline destination allows one level of
// balanced parentheses and never overlaps its optional title, so a real path
// like `a_(b)/x.ts` survives and an unterminated link cannot backtrack.
const INLINE_LINK =
  /(!)?\[([^\]]*)\]\(\s*([^()\s]*(?:\([^()]*\)[^()\s]*)*)(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE_LINK = /(!)?\[([^\]]*)\]\[([^\]]*)\]/g;
const AUTOLINK = /<([a-z][a-z0-9+.-]*:[^>\s]+)>/gi;
const LINK_DEFINITION = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(\S+)/gm;

// What a declaration can name in its own words. A backticked value counts as a
// path only when it looks like one; otherwise the declaration may still name a
// scope in prose, and its longer words are what a link has to pick up.
const BACKLOG_ID = /\bBL-[A-Za-z0-9][A-Za-z0-9-]*/g;
const ISSUE_REFERENCE = /#\d+(?!\d)/g;
const BACKTICKED_VALUE = /`([^`]+)`/g;
const SCOPE_WORD = /[\p{L}\p{N}][\p{L}\p{N}._/-]{3,}/gu;

type NamedSourceKind = 'backlog' | 'issue' | 'path' | 'scope';

interface NamedSource {
  kind: NamedSourceKind;
  value: string;
}

interface DeclarationLink {
  label: string;
  destination: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** CommonMark folds case and collapses whitespace in a reference label. */
function normalizeReferenceLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Inline code spans and HTML comments render no navigable link. */
function withoutInlineCode(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, ' ').replace(/(`+)[\s\S]*?\1/g, ' ');
}

function linkDefinitions(section: string): Map<string, string> {
  const definitions = new Map<string, string>();
  // A definition inside a fence is an example, and the first definition is the
  // one Markdown resolves against.
  for (const match of withoutFences(section).matchAll(LINK_DEFINITION)) {
    const name = normalizeReferenceLabel(match[1] as string);
    if (!definitions.has(name)) definitions.set(name, match[2] as string);
  }
  return definitions;
}

/** Every link one declaration actually renders. */
function declarationLinks(
  declaration: string,
  section: string,
): DeclarationLink[] {
  const definitions = linkDefinitions(section);
  const text = withoutInlineCode(declaration);
  const links: DeclarationLink[] = [];

  for (const match of text.matchAll(INLINE_LINK)) {
    // An image is not a backlink: nothing navigates to its source.
    if (match[1] === '!') continue;
    links.push({ label: match[2] as string, destination: match[3] as string });
  }
  for (const match of text.matchAll(REFERENCE_LINK)) {
    if (match[1] === '!') continue;
    const label = match[2] as string;
    const destination = definitions.get(
      normalizeReferenceLabel((match[3] as string) || label),
    );
    // An unresolved reference renders as literal text, not a link.
    if (destination === undefined) continue;
    links.push({ label, destination });
  }
  for (const match of text.matchAll(AUTOLINK)) {
    const url = match[1] as string;
    links.push({ label: url, destination: url });
  }

  return links;
}

/**
 * The sources a declaration names outside its own links: the backlog IDs,
 * issue references, and paths a reader sees without following anything, or
 * failing those, the words of the scope it names in prose. Only a declaration
 * whose value *is* the link names nothing here.
 */
function namedSources(declaration: string): NamedSource[] {
  const residual = declaration
    .replace(SOURCE_DECLARATION_LABEL, ' ')
    .replace(INLINE_LINK, ' ')
    .replace(REFERENCE_LINK, ' ')
    .replace(AUTOLINK, ' ');

  const named: NamedSource[] = [];
  for (const match of residual.matchAll(BACKLOG_ID)) {
    named.push({ kind: 'backlog', value: match[0] });
  }
  for (const match of residual.matchAll(ISSUE_REFERENCE)) {
    named.push({ kind: 'issue', value: match[0].slice(1) });
  }
  for (const match of residual.matchAll(BACKTICKED_VALUE)) {
    const value = (match[1] as string).trim();
    if (value.includes('/')) named.push({ kind: 'path', value });
  }
  if (named.length > 0) return named;

  for (const match of residual
    .replace(BACKTICKED_VALUE, ' $1 ')
    .matchAll(SCOPE_WORD)) {
    named.push({ kind: 'scope', value: match[0] });
  }
  return named;
}

/**
 * Does this link identify that named source? Matching is bounded per kind, so
 * a link to `BL-1234` never satisfies a declared `BL-123`, `x.tsx` never
 * satisfies `x.ts`, and `/posts/239` never satisfies issue `#239`.
 */
function identifiesSource(link: DeclarationLink, named: NamedSource): boolean {
  const haystack = `${link.label} ${link.destination}`.toLowerCase();
  const destination = link.destination.toLowerCase();
  const value = named.value.toLowerCase();

  switch (named.kind) {
    case 'backlog':
      // `BL-260902` may name `BL-260902-add-...`: an ID extends by a new
      // segment, never by more digits.
      return new RegExp(`(?<![a-z0-9-])${escapeRegExp(value)}(?![0-9])`).test(
        haystack,
      );
    case 'issue':
      return (
        new RegExp(`#${value}(?![0-9])`).test(haystack) ||
        new RegExp(`/(?:issues|pull)/${value}(?![0-9])`).test(destination)
      );
    case 'path':
      // The path has to end where it ends.
      return new RegExp(`${escapeRegExp(value)}(?![a-z0-9])`).test(haystack);
    default:
      return haystack.includes(value);
  }
}

/**
 * A declaration links back to its own source, rather than merely containing a
 * link. `- Source backlog item: BL-123 — see [unrelated](https://example.com)`
 * names `BL-123` and links somewhere else, so it proves no relationship; some
 * link's label or destination has to identify the source the declaration
 * names. Several links pass if any one of them identifies it.
 */
function linksToItsSource(declaration: string, section: string): boolean {
  if (recordsNoSource(declaration)) return true;

  const links = declarationLinks(declaration, section);
  if (links.length === 0) return false;

  const named = namedSources(declaration);
  if (named.length === 0) return true;

  return named.some((source) =>
    links.some((link) => identifiesSource(link, source)),
  );
}

/** Drop fenced blocks so an example bullet cannot stand in for the record. */
function withoutFences(section: string): string {
  const kept: string[] = [];
  let fence: string | undefined;

  for (const line of section.split('\n')) {
    if (fence === undefined) {
      const opener = FENCE_OPENER.exec(line)?.[1];
      if (opener === undefined) kept.push(line);
      else fence = opener;
      continue;
    }
    const closer = FENCE_CLOSER.exec(line)?.[1];
    if (
      closer !== undefined &&
      closer[0] === fence[0] &&
      closer.length >= fence.length
    ) {
      fence = undefined;
    }
  }

  return kept.join('\n');
}

/**
 * Every source declaration in the section, each as its bullet plus the
 * indented continuation lines below it. The template puts the link on that
 * continuation line, and its canonical bullet order puts an unlinked
 * `Source artifact or scope` above the linked `Related backlog items`, so
 * reading only the first match would reject the template's own shape.
 */
function sourceDeclarations(section: string): string[] {
  const lines = withoutFences(section).split('\n');
  const declarations: string[] = [];

  for (const [index, line] of lines.entries()) {
    if (!SOURCE_DECLARATION_LABEL.test(line)) continue;
    const declaration = [line];
    for (const next of lines.slice(index + 1)) {
      if (!/^\s+\S/.test(next)) break;
      declaration.push(next);
    }
    declarations.push(declaration.join('\n'));
  }

  return declarations;
}

/** `none` as the declaration's whole value, not the word loose in its prose. */
function recordsNoSource(declaration: string): boolean {
  const value = declaration
    .replace(SOURCE_DECLARATION_LABEL, '')
    .replaceAll('`', '')
    .trim()
    .replace(/[.,;]$/, '')
    .toLowerCase();
  return value === 'none';
}

/**
 * A program's wave-table heading carries a coverage suffix, as in
 * `## Wave Table (coverage: 31 plans = 31 index rows; verified 2026-09-04)`.
 */
function planSectionStartingWith(
  text: string,
  prefix: string,
): string | undefined {
  // Exact heading, or the heading followed by its parenthesised suffix. A
  // bare `startsWith` would also match `## Wave Tables`.
  return findSection(
    text,
    (candidate) => candidate === prefix || candidate.startsWith(`${prefix} (`),
  );
}

/** Leading `YYYY-MM-DD` of a date or ISO timestamp value, when it has one. */
function isoDatePart(value: unknown): string | undefined {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : undefined;
  const candidate = text?.slice(0, 10);

  return candidate !== undefined && ISO_DATE.test(candidate)
    ? candidate
    : undefined;
}

/**
 * Table rows that are neither delimiter rows nor blank. A well-formed table
 * has at least two: its header and one row of content.
 */
function contentTableRows(section: string): number {
  let rows = 0;

  for (const line of section.split('\n')) {
    if (!isTableRow(line)) continue;
    const first = tableCells(line)[0];
    if (first === undefined) continue;
    if (/^:?-+:?$/.test(first)) continue;
    rows += 1;
  }

  return rows;
}

/** Status cell of each real row in a program's Status Ledger table. */
function waveStatuses(ledger: string): string[] {
  const statuses: string[] = [];

  for (const line of ledger.split('\n')) {
    if (!isTableRow(line)) continue;
    const cells = tableCells(line);
    if (cells.length < STATUS_LEDGER_COLUMNS.length) continue;
    const status = cells[3];
    if (status === undefined) continue;
    if (status.toLowerCase() === 'status') continue;
    if (/^:?-+:?$/.test(status)) continue;
    statuses.push(status);
  }

  return statuses;
}

/**
 * Cells of one Markdown table row. Outer pipes are optional and an escaped
 * `\|` is content rather than a cell boundary.
 */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));
}

function isTableRow(line: string): boolean {
  return line.includes('|') && line.trim() !== '';
}

/**
 * A required table must declare its exact columns, so an empty, prose-only, or
 * differently-shaped section cannot pass by having nothing to check.
 */
function hasTableHeader(section: string, columns: string[]): boolean {
  for (const line of section.split('\n')) {
    if (!isTableRow(line)) continue;
    const cells = tableCells(line).map((cell) => cell.toLowerCase());
    if (cells.length !== columns.length) continue;
    if (columns.every((column, index) => cells[index] === column)) return true;
  }

  return false;
}

/**
 * Classify a dependency by the first word of its Type cell. Matching whole
 * tokens rather than prefixes keeps `Hardly` and `Software` from reading as
 * `Hard` and `Soft`.
 */
function dependencyClass(type: string): string | undefined {
  const first = type
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)[0];

  return first !== undefined && DEPENDENCY_TYPES.includes(first)
    ? first
    : undefined;
}

/** Whether a Current state cell opens with one of the named unblock states. */
function namesState(value: string, states: string[]): boolean {
  const normalized = value.trim().toLowerCase();

  return states.some(
    (state) =>
      normalized === state ||
      (normalized.startsWith(state) &&
        !/[a-z]/.test(normalized.charAt(state.length))),
  );
}

/** Type and current-state cells of each real row in a dependency table. */
function dependencyRows(
  section: string,
): { type: string; currentState: string }[] {
  const rows: { type: string; currentState: string }[] = [];

  for (const line of section.split('\n')) {
    if (!isTableRow(line)) continue;
    const cells = tableCells(line);
    const type = cells[0];
    const currentState = cells.at(-1);
    if (type === undefined || currentState === undefined) continue;
    if (cells.length < 4) continue;
    if (type.toLowerCase() === 'type') continue;
    if (/^:?-+:?$/.test(type)) continue;
    rows.push({ type, currentState });
  }

  return rows;
}

// Every dated file in `external-plans/` is swept. Anything else must be named
// here, so a new artifact cannot quietly fall outside the corpus check.
const DATED_PLAN_FILE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const NON_CONTRACT_PLAN_FILES = ['docs-readability-reorg-plan.md'];

const PROSPECTIVE_HEAD_SHA = 'a'.repeat(40);
const PROSPECTIVE_MAIN_SHA = 'b'.repeat(40);
const PROSPECTIVE_DATE = '2026-09-10';

const DEFAULT_DEPENDENCY_TABLE = [
  '| Type | Dependency | Required state | Current state |',
  '| ---- | ---------- | -------------- | ------------- |',
  '| Soft ordering | [Plan](./x.md) | Land first. | Landed. |',
].join('\n');

const DEFAULT_LANDING_EVENT_TABLE = [
  '| Event | Affected | Files in common | Required update |',
  '| ----- | -------- | --------------- | --------------- |',
  '| PR lands | Minor | `x.ts` | Re-anchor. |',
].join('\n');

const DEFAULT_REVALIDATION = 'Revalidate when `origin/main` advances.';

// The template's canonical bullet order: an unlinked `Source artifact or
// scope` first, the linked item further down, and the link itself on the
// continuation line below its label.
const DEFAULT_SOURCE_EVIDENCE = [
  '- Source artifact or scope: `packages/cli/src/x.ts`',
  '- Planning date: `2026-09-10`',
  '- Related backlog items:',
  '  [BL-260907-example — Example item](../../pjm/backlog/items/BL-260907-example.md)',
  '- Verified evidence:',
  '  - `src/x.ts:1` — what it establishes',
].join('\n');

interface ProspectivePlanOverrides {
  commit?: string;
  mainCommit?: string | null;
  date?: string;
  status?: string | null;
  dependencies?: string | null;
  landingEvents?: string | null;
  revalidation?: string | null;
  sourceEvidence?: string | null;
}

/** A minimal plan that satisfies every prospective rule unless overridden. */
function buildProspectivePlan(
  overrides: ProspectivePlanOverrides = {},
): string {
  const {
    commit = PROSPECTIVE_HEAD_SHA,
    mainCommit = PROSPECTIVE_MAIN_SHA,
    date = PROSPECTIVE_DATE,
    status = 'READY',
    dependencies = DEFAULT_DEPENDENCY_TABLE,
    landingEvents = DEFAULT_LANDING_EVENT_TABLE,
    revalidation = DEFAULT_REVALIDATION,
    sourceEvidence = DEFAULT_SOURCE_EVIDENCE,
  } = overrides;

  const frontmatter = [
    'oat_generated: true',
    'oat_external_plan: true',
    `oat_external_plan_commit: ${commit}`,
    ...(mainCommit === null
      ? []
      : [`oat_external_plan_main_commit: ${mainCommit}`]),
    `oat_external_plan_date: '${date}'`,
    ...(status === null ? [] : [`oat_execution_status: ${status}`]),
  ];

  const body = ['# Title', ''];
  if (sourceEvidence !== null) {
    body.push('## Source and live evidence', '', sourceEvidence, '');
  }
  if (dependencies !== null) body.push('## Dependencies', '', dependencies, '');
  if (landingEvents !== null) {
    body.push('## Landing-event impact', '', landingEvents, '');
  }
  if (revalidation !== null) {
    body.push('## Revalidation Before Execution', '', revalidation, '');
  }

  return ['---', ...frontmatter, '---', '', ...body].join('\n');
}

const DEFAULT_STATUS_LEDGER = [
  '| Wave | Theme | Lanes | Status | Record |',
  '| ---- | ----- | ----- | ------ | ------ |',
  '| W1 | Theme | 4 | merged | PR #262. |',
  '| W2 | Theme | 5 | composed | Awaiting approval. |',
].join('\n');

const DEFAULT_WAVE_TABLE = [
  '| Plan | Index | Wave | Ordering notes | Status |',
  '| ---- | ----- | ---- | -------------- | ------ |',
  '| [Plan](./x.md) | [Index](./i.md) | W1 | None. | merged |',
].join('\n');

interface ProgramDocumentOverrides {
  date?: string | null;
  programIndexes?: string[] | null;
  statusLedger?: string | null;
  waveTable?: string | null;
  waveTableHeading?: string;
}

/**
 * A minimal execution-program document that satisfies every prospective
 * program rule unless overridden. Shaped after the real
 * `2026-08-31-execution-program.md` and `oat-wave-program`'s own
 * `execution-program-template.md`.
 */
function buildProgramDocument(
  overrides: ProgramDocumentOverrides = {},
): string {
  const {
    date = PROSPECTIVE_DATE,
    programIndexes = ['.oat/repo/reference/external-plans/i.md'],
    statusLedger = DEFAULT_STATUS_LEDGER,
    waveTable = DEFAULT_WAVE_TABLE,
    waveTableHeading = '## Wave Table (coverage: 1 plan = 1 index row)',
  } = overrides;

  const frontmatter = [
    'oat_generated: true',
    'oat_external_plan_index: false',
    'oat_execution_program: true',
    ...(programIndexes === null
      ? []
      : ['oat_program_indexes:', ...programIndexes.map((p) => `  - ${p}`)]),
    ...(date === null ? [] : [`oat_external_plan_date: '${date}'`]),
  ];

  const body = ['# Execution Program', ''];
  if (statusLedger !== null)
    body.push('## Status Ledger', '', statusLedger, '');
  if (waveTable !== null) body.push(waveTableHeading, '', waveTable, '');

  return ['---', ...frontmatter, '---', '', ...body].join('\n');
}

/**
 * Read one external plan under the mode its date selects. Legacy plans are
 * accepted exactly as written; prospective plans must carry full provenance,
 * a status, the three contract sections, and a status that agrees with their
 * own dependency table.
 */
function evaluateExternalPlan(text: string): PlanReadiness {
  const frontmatter = parsePlanFrontmatter(text);
  const violations: string[] = [];

  const kind: PlanDocumentKind =
    frontmatter.oat_execution_program === true
      ? 'program'
      : frontmatter.oat_external_plan_index === true
        ? 'index'
        : 'plan';

  const date =
    typeof frontmatter.oat_external_plan_date === 'string'
      ? frontmatter.oat_external_plan_date
      : undefined;
  // A program has no `oat_external_plan_date`: its producing template
  // (`oat-wave-program/assets/execution-program-template.md`) carries only
  // `created`. Without this fallback every generated program would sort into
  // legacy mode forever and never be checked at all.
  const effectiveDate =
    kind === 'program' ? (date ?? isoDatePart(frontmatter.created)) : date;
  // Dates are compared lexically, which is only sound for ISO dates. A present
  // but malformed date fails closed into prospective mode rather than sorting
  // its way into the permissive branch.
  const malformedDate = date !== undefined && !ISO_DATE.test(date);
  const mode: PlanReadinessMode =
    !malformedDate &&
    (effectiveDate === undefined || effectiveDate < CONTRACT_LANDING_DATE)
      ? 'legacy'
      : 'prospective';

  const declaredStatus =
    typeof frontmatter.oat_execution_status === 'string'
      ? frontmatter.oat_execution_status
      : undefined;
  // A missing status reads as READY. Legacy plans rely on this and are never
  // rewritten to add one.
  const status = declaredStatus === 'BLOCKED' ? 'BLOCKED' : 'READY';

  // Narrowing this branch is precisely what would make the durable corpus
  // unimportable, so legacy plans return accepted before any further rule.
  if (mode === 'legacy') return { mode, kind, status, violations };

  if (malformedDate) violations.push(MALFORMED_DATE_VIOLATION);

  // An execution program maps other plans rather than being one. It inspects
  // no tree, so it carries no provenance SHAs and no `oat_execution_status` of
  // its own; requiring those would reject every document `oat-wave-program`'s
  // template produces. What it must carry is its ledger, so that is enforced.
  if (kind === 'program') {
    const indexes = frontmatter.oat_program_indexes;
    if (
      !Array.isArray(indexes) ||
      indexes.length === 0 ||
      !indexes.every(
        (entry) => typeof entry === 'string' && entry.trim() !== '',
      )
    ) {
      violations.push(MISSING_PROGRAM_INDEXES_VIOLATION);
    }

    const ledger = planSection(text, 'Status Ledger');
    if (ledger === undefined) {
      violations.push('missing ## Status Ledger');
    } else if (!hasTableHeader(ledger, STATUS_LEDGER_COLUMNS)) {
      violations.push(MISSING_STATUS_LEDGER_TABLE_VIOLATION);
    } else {
      const statuses = waveStatuses(ledger);
      if (statuses.length === 0) violations.push(EMPTY_STATUS_LEDGER_VIOLATION);
      for (const waveStatus of statuses) {
        if (!WAVE_STATUSES.includes(waveStatus.toLowerCase())) {
          violations.push(
            `wave status "${waveStatus}" is not ${WAVE_STATUSES.join(', ')}`,
          );
        }
      }
    }

    const waveTable = planSectionStartingWith(text, 'Wave Table');
    if (waveTable === undefined) {
      violations.push('missing ## Wave Table');
    } else if (contentTableRows(waveTable) < 2) {
      violations.push(EMPTY_WAVE_TABLE_VIOLATION);
    }

    return { mode, kind, status, violations };
  }

  const commit = frontmatter.oat_external_plan_commit;
  if (typeof commit !== 'string' || !FULL_SHA.test(commit)) {
    violations.push(SHORT_SHA_VIOLATION);
  }

  const mainCommit = frontmatter.oat_external_plan_main_commit;
  if (typeof mainCommit !== 'string' || !FULL_SHA.test(mainCommit)) {
    violations.push(MISSING_MAIN_COMMIT_VIOLATION);
  }

  // An index carries the same provenance but no readiness of its own; each
  // plan it lists answers that question for itself.
  if (kind === 'index') return { mode, kind, status, violations };

  if (declaredStatus !== 'READY' && declaredStatus !== 'BLOCKED') {
    violations.push(MISSING_STATUS_VIOLATION);
  }

  for (const heading of [
    'Dependencies',
    'Landing-event impact',
    'Revalidation Before Execution',
  ]) {
    if (planSection(text, heading) === undefined) {
      violations.push(`missing ## ${heading}`);
    }
  }

  const landingEvents = planSection(text, 'Landing-event impact');
  if (
    landingEvents !== undefined &&
    !hasTableHeader(landingEvents, LANDING_EVENT_COLUMNS)
  ) {
    violations.push(MISSING_LANDING_EVENT_TABLE_VIOLATION);
  }

  const revalidation = planSection(text, 'Revalidation Before Execution');
  if (revalidation !== undefined && revalidation.trim() === '') {
    violations.push(EMPTY_REVALIDATION_VIOLATION);
  }

  // The plan -> item half of the bidirectional link. The item -> plan half
  // lives in the backlog item's `external_plans` list, which nothing here can
  // see, so without this rule a template regression can delete one direction
  // of the tracking relationship with every other assertion still green. A
  // plan with genuinely no source item says so, exactly as the template's
  // `<ID and title, or none>` placeholder allows.
  const sourceEvidence = planSection(text, 'Source and live evidence');
  const declarations =
    sourceEvidence === undefined ? [] : sourceDeclarations(sourceEvidence);
  if (
    !declarations.some((declaration) =>
      linksToItsSource(declaration, sourceEvidence ?? ''),
    )
  ) {
    violations.push(MISSING_SOURCE_BACKLINK_VIOLATION);
  }

  const dependencies = planSection(text, 'Dependencies');
  if (dependencies !== undefined) {
    let unsatisfiedHard = false;

    if (!hasTableHeader(dependencies, DEPENDENCY_COLUMNS)) {
      violations.push(MISSING_DEPENDENCY_TABLE_VIOLATION);
    }

    for (const { type, currentState } of dependencyRows(dependencies)) {
      const dependencyType = dependencyClass(type);
      if (dependencyType === undefined) {
        violations.push(
          `dependency type "${type}" is not Hard, Soft, or Satisfied`,
        );
        continue;
      }

      // A `Satisfied` row asserts its dependency is met, so its state must say
      // so; only a `Hard` row can leave the plan blocked.
      if (dependencyType === 'satisfied') {
        if (!namesState(currentState, SATISFIED_UNBLOCK_STATES)) {
          violations.push(
            `satisfied dependency current state "${currentState}" names no satisfied state`,
          );
        }
        continue;
      }
      if (dependencyType !== 'hard') continue;

      if (namesState(currentState, UNSATISFIED_UNBLOCK_STATES)) {
        unsatisfiedHard = true;
      } else if (!namesState(currentState, SATISFIED_UNBLOCK_STATES)) {
        violations.push(
          `hard dependency current state "${currentState}" names no unblock state`,
        );
      }
    }

    // The status and the table must agree in both directions: claiming READY
    // while blocked hides the block, and claiming BLOCKED with nothing
    // unsatisfied parks work for no recorded reason.
    if (unsatisfiedHard && status === 'READY') {
      violations.push(CONTRADICTORY_STATUS_VIOLATION);
    }
    if (!unsatisfiedHard && status === 'BLOCKED') {
      violations.push(UNJUSTIFIED_BLOCK_VIOLATION);
    }
  }

  return { mode, kind, status, violations };
}

interface Violation {
  file: string;
  doc: string;
  line: string;
}

// A cross-skill read, identified by the authoring file plus the exact skill and
// path it points at. Keeping the target path inside the identity stops a new
// file, a new target skill, or a new target file from silently inheriting an
// existing exemption.
interface CrossSkillReference {
  file: string;
  targetSkill: string;
  targetPath: string;
}

interface CrossSkillTarget {
  targetSkill: string;
  targetPath: string;
}

type PortableAssetTarget =
  | { kind: 'skill'; name: string }
  | { kind: 'agent'; name: string };

interface PortableAssetFinding {
  asset: PortableAssetTarget;
  target: string;
  evidence: string;
}

interface PortableAssetReference extends PortableAssetFinding {
  file: string;
}

// Authored Markdown shipped by one user-default pack asset.
interface MarkdownAsset {
  kind: 'skill' | 'agent';
  owner: string;
  files: string[];
}

// Executable repository-relative cross-skill reads take two spellings, and both
// dangle once the owning pack is installed at user scope:
//   - `.agents/skills/<name>/…`, optionally prefixed by any number of `./` or
//     `../` segments; and
//   - `../<name>/…`, a parent-relative hop out of the authoring skill, with any
//     number of `../` segments.
// Either spelling can target the sibling's `SKILL.md` or a file or directory at
// or below the sibling's `references/`.
//
// The parent-segment repetition is load-bearing, not defensive: authored
// Markdown is collected from the whole skill tree, so a file at
// `.agents/skills/<owner>/references/<doc>.md` reaches a sibling skill through
// exactly `../../<name>/…`. Matching only a single `../` would let that
// spelling — the natural one from every scanned `references/` file — slip past
// the ratchet.
//
// Portable reads stay unmatched once repetition is allowed, by two separate
// guards. The leading lookbehind rejects any candidate start preceded by `/` or
// an identifier character, which covers every rooted spelling:
// `${SKILL_DIR}/../<name>/…`, `${SKILL_DIR}/../../<name>/…`, and
// `${HOME}/.agents/skills/…`. The required prefix alternation independently
// rejects `${SKILLS_ROOT}/<name>/…`, which carries neither an `.agents/skills/`
// segment nor a leading `../`.
//
// Short forms such as `subagent-orchestration/references/provider-codex.md` are
// deliberately not matched: they are follow-on reads local to a sibling root
// that an earlier read already bound and validated. The caller-contract
// assertions below enforce that anchoring requirement instead.
const PORTABLE_SKILL_READ =
  /(?<![/a-zA-Z0-9_.-])(?:(?:\.\.?\/)*\.agents\/skills\/|(?:\.\.\/)+)([a-zA-Z0-9_-]+)\/(SKILL\.md|references(?:\/[a-zA-Z0-9_.-]+)*\/?)/g;

const PORTABLE_AGENT_READ =
  /(?<![/a-zA-Z0-9_.-])(?:(?:\.\.?\/)*\.agents\/agents\/|(?:\.\.\/)+agents\/)([a-zA-Z0-9_-]+)\.md/g;

const PORTABLE_SKILLS_ROOT_CANDIDATES = [
  '`${SKILL_DIR}/..`',
  '`${HOME}/.agents/skills`',
  '`<repo-root>/.agents/skills`',
] as const;

// A materialized agent has no stable loaded-agent source path across Codex,
// Claude, and Cursor, so it resolves siblings from user scope, then project
// scope, and must not invent a loaded-agent candidate.
const PORTABLE_AGENT_SKILLS_ROOT_CANDIDATES = [
  '`${HOME}/.agents/skills`',
  '`<repo-root>/.agents/skills`',
] as const;

const PORTABLE_AGENT_ROOT_CANDIDATES = [
  '`${SKILL_DIR}/../..`',
  '`${HOME}/.agents`',
  '`<repo-root>/.agents`',
] as const;

function listSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function canonicalRoleFixture(name: string): string {
  return `---\nname: ${name}\nversion: 1.0.0\ndescription: Test canonical role\n---\n\n# ${name}\n`;
}

function listAuthoredMarkdown(skillDir: string): string[] {
  // Recurse the skill, but skip references/docs/ — those are vendored copies of
  // shared docs (symlinks materialized at build time), not authored pointers.
  return readdirSync(skillDir, { recursive: true, encoding: 'utf8' })
    .filter((rel) => {
      const normalizedSegments = rel.replaceAll('\\', '/').split('/');
      const isMaterializedDocsCopy =
        normalizedSegments[0] === 'references' &&
        normalizedSegments[1] === 'docs';

      return rel.endsWith('.md') && !isMaterializedDocsCopy;
    })
    .map((rel) => join(skillDir, rel));
}

function expectCandidateOrder(
  content: string,
  candidates: readonly string[],
  source: string,
): void {
  const positions = candidates.map((candidate) => content.indexOf(candidate));

  for (const [index, candidate] of candidates.entries()) {
    expect(
      positions[index],
      `${source} is missing ${candidate}`,
    ).toBeGreaterThan(-1);
  }
  for (let index = 1; index < positions.length; index += 1) {
    expect(
      positions[index - 1],
      `${source} must list ${candidates[index - 1]} before ${candidates[index]}`,
    ).toBeLessThan(positions[index]!);
  }
}

function expectPortableSkillsRootCandidateOrder(
  content: string,
  source: string,
): void {
  expectCandidateOrder(content, PORTABLE_SKILLS_ROOT_CANDIDATES, source);
}

function expectPortableAgentSkillsRootCandidateOrder(
  content: string,
  source: string,
): void {
  expectCandidateOrder(content, PORTABLE_AGENT_SKILLS_ROOT_CANDIDATES, source);
  // A materialized agent must not claim a loaded-agent or loaded-skill root.
  expect(content, `${source} must not invent a loaded-agent root`).not.toMatch(
    /\$\{(?:SKILL_DIR|AGENT_DIR)\}/,
  );
}

function expectPortableAgentRootCandidateOrder(
  content: string,
  source: string,
): void {
  expectCandidateOrder(content, PORTABLE_AGENT_ROOT_CANDIDATES, source);
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const skill of listSkillDirs()) {
    const skillDir = join(SKILLS_DIR, skill);

    for (const file of listAuthoredMarkdown(skillDir)) {
      const relFile = file.slice(REPO_ROOT.length + 1);

      for (const line of readFileSync(file, 'utf8').split('\n')) {
        for (const match of line.matchAll(SHARED_DOC_REF)) {
          const doc = match[1];

          // Illustrative example paths (e.g. my-guide.md) don't exist — skip.
          if (!existsSync(join(SHARED_DOCS_DIR, `${doc}.md`))) continue;
          // The skill vendors the doc into its own bundle — it travels. OK.
          if (existsSync(join(skillDir, 'references', 'docs', `${doc}.md`))) {
            continue;
          }
          // Explicit opt-out: intentionally monorepo-internal.
          if (MONOREPO_ONLY_MARKER.test(line)) continue;

          violations.push({
            file: relFile,
            doc: `${doc}.md`,
            line: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

function compareCrossSkillTargets(
  left: CrossSkillTarget,
  right: CrossSkillTarget,
): number {
  return (
    left.targetSkill.localeCompare(right.targetSkill) ||
    left.targetPath.localeCompare(right.targetPath)
  );
}

function compareCrossSkillReferences(
  left: CrossSkillReference,
  right: CrossSkillReference,
): number {
  return (
    left.file.localeCompare(right.file) || compareCrossSkillTargets(left, right)
  );
}

function crossSkillReferenceKey({
  file,
  targetSkill,
  targetPath,
}: CrossSkillReference): string {
  return `${file}|${targetSkill}|${targetPath}`;
}

function classifyPortableAssetTargets(
  markdown: string,
): PortableAssetFinding[] {
  const indexed: Array<PortableAssetFinding & { index: number }> = [];

  for (const match of markdown.matchAll(PORTABLE_SKILL_READ)) {
    const evidence = match[0];
    indexed.push({
      asset: { kind: 'skill', name: match[1]! },
      target: evidence,
      evidence,
      index: match.index,
    });
  }

  const canonicalAgentNames = new Set(
    readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length)),
  );
  for (const match of markdown.matchAll(PORTABLE_AGENT_READ)) {
    const name = match[1]!;
    if (!canonicalAgentNames.has(name)) continue;
    const lineStart = markdown.lastIndexOf('\n', match.index) + 1;
    const nextLineBreak = markdown.indexOf('\n', match.index);
    const lineEnd = nextLineBreak === -1 ? markdown.length : nextLineBreak;
    const line = markdown.slice(lineStart, lineEnd);
    const evidence = match[0];
    const occurrenceStart = match.index - lineStart;
    if (
      isProviderAgentSyncOccurrence(
        line,
        occurrenceStart,
        occurrenceStart + evidence.length,
        name,
      )
    ) {
      continue;
    }
    indexed.push({
      asset: { kind: 'agent', name },
      target: evidence,
      evidence,
      index: match.index,
    });
  }

  return indexed
    .sort((left, right) => left.index - right.index)
    .map(({ index: _index, ...finding }) => finding);
}

function isProviderAgentSyncOccurrence(
  line: string,
  occurrenceStart: number,
  occurrenceEnd: number,
  canonicalName: string,
): boolean {
  const before = line.slice(0, occurrenceStart);
  const after = line.slice(occurrenceEnd);

  // Canonical source followed immediately by its Claude/Cursor sync target.
  // A directory-only target inherits the canonical occurrence's role; a
  // target that names a role must name the same one.
  const syncedProvider = after.match(
    /^`?\s*\(synced to `?\.(?:claude|cursor)\/agents\/(?:([a-zA-Z0-9_-]+)\.md)?`?\)/i,
  );
  if (
    syncedProvider &&
    (!syncedProvider[1] || syncedProvider[1] === canonicalName)
  ) {
    return true;
  }

  // Provider view followed immediately by its exact canonical sync target.
  // Matching the role on both sides keeps an unrelated earlier provider path
  // from exempting this canonical occurrence.
  const syncedCanonical = before.match(
    /\.(?:claude|cursor)\/agents\/([a-zA-Z0-9_-]+)\.md`?\s*\(synced (?:to|from) `?$/i,
  );
  return syncedCanonical?.[1] === canonicalName && /^`?\)/.test(after);
}

function collectCrossSkillTargets(
  content: string,
  owner: string,
): CrossSkillTarget[] {
  const targets = new Map<string, CrossSkillTarget>();

  for (const finding of classifyPortableAssetTargets(content)) {
    if (finding.asset.kind !== 'skill') continue;
    const targetSkill = finding.asset.name;
    // A read that names the authoring asset's own skill travels with the
    // bundle, so it is a local read rather than a cross-skill dependency.
    if (targetSkill === owner) continue;
    const targetPath = finding.target.slice(
      finding.target.lastIndexOf(`${targetSkill}/`) + targetSkill.length + 1,
    );
    targets.set(`${targetSkill}/${targetPath}`, { targetSkill, targetPath });
  }

  return [...targets.values()].sort(compareCrossSkillTargets);
}

function collectBareCrossSkillTargets(
  content: string,
  owner: string,
): string[] {
  return [
    ...new Set(
      collectCrossSkillTargets(content, owner).map(
        ({ targetSkill }) => targetSkill,
      ),
    ),
  ].sort();
}

/**
 * Derive the user-default skill and agent asset surface from a pack manifest.
 * Coverage follows the manifest rather than a hand-curated skill list, so a new
 * user-default asset is scanned the moment it ships.
 */
function selectUserDefaultAssetRefs(
  manifest: readonly PackDefinition[],
): { kind: 'skill' | 'agent'; name: string }[] {
  const refs = new Map<string, { kind: 'skill' | 'agent'; name: string }>();

  for (const pack of manifest) {
    if (pack.defaultScope !== 'user') continue;

    for (const asset of pack.assets) {
      if (asset.kind === 'skill') {
        refs.set(asset.id, {
          kind: 'skill',
          name: asset.id.slice('skill:'.length),
        });
      } else if (asset.kind === 'agent') {
        refs.set(asset.id, {
          kind: 'agent',
          name: asset.id.slice('agent:'.length).replace(/\.md$/, ''),
        });
      }
    }
  }

  return [...refs.values()].sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name),
  );
}

function collectUserDefaultMarkdownAssets(
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): MarkdownAsset[] {
  const assets: MarkdownAsset[] = [];

  for (const ref of selectUserDefaultAssetRefs(manifest)) {
    if (ref.kind === 'skill') {
      const skillDir = join(SKILLS_DIR, ref.name);
      if (!existsSync(skillDir)) continue;
      assets.push({
        kind: 'skill',
        owner: ref.name,
        files: listAuthoredMarkdown(skillDir),
      });
      continue;
    }

    const agentFile = join(AGENTS_DIR, `${ref.name}.md`);
    if (!existsSync(agentFile)) continue;
    assets.push({ kind: 'agent', owner: ref.name, files: [agentFile] });
  }

  return assets;
}

function collectCrossSkillReferencesForAsset(
  asset: MarkdownAsset,
  relativeRoot: string,
): CrossSkillReference[] {
  const references: CrossSkillReference[] = [];

  for (const file of asset.files) {
    const relFile = file.slice(relativeRoot.length + 1);
    for (const { targetSkill, targetPath } of collectCrossSkillTargets(
      readFileSync(file, 'utf8'),
      asset.owner,
    )) {
      references.push({ file: relFile, targetSkill, targetPath });
    }
  }

  return references;
}

function collectUserDefaultCrossSkillReferences(): CrossSkillReference[] {
  return collectUserDefaultMarkdownAssets()
    .flatMap((asset) => collectCrossSkillReferencesForAsset(asset, REPO_ROOT))
    .sort(compareCrossSkillReferences);
}

function collectPortableAssetReferences(
  assets: readonly MarkdownAsset[],
): PortableAssetReference[] {
  return assets.flatMap((asset) =>
    asset.files.flatMap((file) => {
      const relativeFile = file.slice(REPO_ROOT.length + 1);
      return classifyPortableAssetTargets(readFileSync(file, 'utf8')).map(
        (finding) => ({ file: relativeFile, ...finding }),
      );
    }),
  );
}

function collectUserDefaultPortableAssetReferences(): PortableAssetReference[] {
  return collectPortableAssetReferences(collectUserDefaultMarkdownAssets());
}

function collectCanonicalSkillPortableAssetReferences(): PortableAssetReference[] {
  return collectPortableAssetReferences(
    listSkillDirs().map((owner) => ({
      kind: 'skill',
      owner,
      files: listAuthoredMarkdown(join(SKILLS_DIR, owner)),
    })),
  );
}

// Non-executable evidence only. Each entry is pinned by source file, target
// skill, and target path so it can never widen into a wildcard allowance.
const PINNED_HISTORICAL_CROSS_SKILL_READS: readonly CrossSkillReference[] = [
  // Historical dogfood evidence records the paths exercised at that time.
  ...[
    'oat-idea-ideate',
    'oat-idea-new',
    'oat-idea-summarize',
    'oat-pjm-add-backlog-item',
    'oat-project-new',
  ].map((targetSkill) => ({
    file: '.agents/skills/oat-brainstorm/references/dogfood-results.md',
    targetSkill,
    targetPath: 'SKILL.md',
  })),
  // The mini-wave fixture documents the canonical path promoted by its test.
  {
    file: '.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md',
    targetSkill: 'oat-wave-program',
    targetPath: 'SKILL.md',
  },
];

// Repository-local authoring and utility skills live under `.agents/skills`
// without belonging to any pack. Naming them here at collection time makes the
// unshipped set visible in the reporter output on a passing run, which is the
// point of classifying them: they are reported, never failed.
const CANONICAL_UNSHIPPED_SKILL_DIRS =
  classifyCanonicalSkillDirs(listSkillDirs()).canonicalUnshipped;

/**
 * Authored Markdown of one shipped skill, shaped for the script-reference check.
 *
 * This is the scan boundary: `listAuthoredMarkdown` takes `**\/*.md` under the
 * skill directory and skips the vendored `references/docs/` copies, so a script
 * reference authored in a non-Markdown skill asset is outside the check. That
 * costs nothing today — every skill file naming `.oat/scripts` is a `SKILL.md` —
 * but widening it is a deliberate change here, not an assumption the extractor
 * makes.
 */
function collectSkillScriptSources(skill: string) {
  const skillDir = join(SKILLS_DIR, skill);
  if (!existsSync(skillDir)) return [];

  return listAuthoredMarkdown(skillDir).map((file) => ({
    skill,
    file: file.slice(REPO_ROOT.length + 1),
    text: readFileSync(file, 'utf8'),
  }));
}

describe('skills bundled docs contract', () => {
  it('no shipped skill references a shared .agents/docs/ doc that does not travel with it', () => {
    const violations = collectViolations();

    // A reference to `.agents/docs/<doc>.md` resolves inside this monorepo but
    // dangles once the skill is installed standalone, since `.agents/docs/` is
    // not part of the skill bundle. Fix by vendoring the doc via symlink into
    // the skill's `references/docs/` and pointing at that bundled path, or — if
    // the reference is intentionally monorepo-internal — annotate the line with
    // a "monorepo only" marker.
    const detail = violations
      .map((v) => `  ${v.file} -> .agents/docs/${v.doc}\n    ${v.line}`)
      .join('\n');

    expect(
      violations,
      `Skill(s) reference a shared doc that won't ship with the bundle:\n${detail}`,
    ).toEqual([]);
  });

  it('does not add bare repo-relative cross-skill reads to user-default packs', () => {
    // A skill or agent in a pack that defaults to user scope is normally
    // installed under `~/.agents/`, so a repo-relative
    // `.agents/skills/<name>/…` read — or a `../<name>/…` hop out of the
    // authoring skill directory — dangles: neither path exists on a default
    // install. Executable reads must bind an installed root instead.
    //
    // The accepted set is exactly the historical evidence, pinned by source
    // file, target skill, and target path, so no new file or target inherits
    // an exemption. There is no migration allowlist: executable debt is fixed
    // at the caller, never parked in a temporary inventory.
    const found = collectUserDefaultCrossSkillReferences();
    const detail = found
      .map(
        ({ file, targetSkill, targetPath }) =>
          `  ${file} -> ${targetSkill}/${targetPath}`,
      )
      .join('\n');

    expect(
      found,
      `Repo-relative cross-skill reads changed; resolve executable reads from the installed scope and baseline only exact historical evidence:\n${detail}`,
    ).toEqual(
      [...PINNED_HISTORICAL_CROSS_SKILL_READS].sort(
        compareCrossSkillReferences,
      ),
    );
  });

  it('leaves zero executable cross-skill debt in user-default assets', () => {
    // Applying only the exact historical/self-reference classification must
    // leave the manifest-derived executable finding set empty.
    const historical = new Set(
      PINNED_HISTORICAL_CROSS_SKILL_READS.map(crossSkillReferenceKey),
    );
    const executable = collectUserDefaultCrossSkillReferences().filter(
      (reference) => !historical.has(crossSkillReferenceKey(reference)),
    );
    const detail = executable
      .map(
        ({ file, targetSkill, targetPath }) =>
          `  ${file} -> ${targetSkill}/${targetPath}`,
      )
      .join('\n');

    expect(
      executable,
      `Executable cross-skill debt must be fixed at the caller, not baselined:\n${detail}`,
    ).toEqual([]);
    // Every pinned entry must still describe a real, non-executable read.
    expect(
      PINNED_HISTORICAL_CROSS_SKILL_READS.every(
        ({ file }) =>
          file.includes('/references/dogfood-results.md') ||
          file.includes('/tests/'),
      ),
      'Historical evidence stays limited to dogfood records and test fixtures',
    ).toBe(true);
  });

  it.each([
    [
      'manifest-derived user-default',
      collectUserDefaultPortableAssetReferences,
    ],
    ['every canonical skill', collectCanonicalSkillPortableAssetReferences],
  ] as const)(
    'leaves zero executable canonical agent reads in the %s scan',
    (_scope, collectReferences) => {
      const agentReferences = collectReferences().filter(
        ({ asset }) => asset.kind === 'agent',
      );
      const detail = agentReferences
        .map(({ file, target }) => `  ${file} -> ${target}`)
        .join('\n');

      expect(
        agentReferences,
        `Executable canonical agent reads must resolve from a bound provider root:\n${detail}`,
      ).toEqual([]);
    },
  );

  it('keeps skeptic and other provider-view descriptions classified as examples', () => {
    const exampleLines = listSkillDirs().flatMap((skill) =>
      listAuthoredMarkdown(join(SKILLS_DIR, skill)).flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => /\.(?:claude|cursor)\/agents\//.test(line))
          .map((line) => ({
            file: file.slice(REPO_ROOT.length + 1),
            line,
            findings: classifyPortableAssetTargets(line).filter(
              ({ asset }) => asset.kind === 'agent',
            ),
          })),
      ),
    );
    const skepticExamples = exampleLines.filter(({ file }) =>
      file.endsWith('/skeptic/SKILL.md'),
    );

    expect(skepticExamples).toHaveLength(2);
    expect(
      exampleLines.flatMap(({ file, findings }) =>
        findings.map(({ target }) => `${file} -> ${target}`),
      ),
    ).toEqual([]);
  });

  it.each([
    [
      'canonical repo-relative skill',
      'Read `.agents/skills/oat-dispatch-subagents/SKILL.md`.',
      [
        {
          asset: { kind: 'skill', name: 'oat-dispatch-subagents' },
          evidence: '.agents/skills/oat-dispatch-subagents/SKILL.md',
          target: '.agents/skills/oat-dispatch-subagents/SKILL.md',
        },
      ],
    ],
    [
      'canonical repo-relative agent',
      'Read `.agents/agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: '.agents/agents/oat-reviewer.md',
          target: '.agents/agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'dot-relative canonical agent',
      'Read `./.agents/agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: './.agents/agents/oat-reviewer.md',
          target: './.agents/agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'repeated-parent canonical agent hop',
      'Read `../../agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: '../../agents/oat-reviewer.md',
          target: '../../agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'mixed executable read and same-role provider-sync example',
      'Read `.agents/agents/oat-reviewer.md`; provider `.claude/agents/oat-reviewer.md` (synced to `.agents/agents/oat-reviewer.md`)',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: '.agents/agents/oat-reviewer.md',
          target: '.agents/agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'portable provider root',
      'Read `${AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'canonical user root',
      'Read `${HOME}/.agents/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'canonical repository root',
      'Read `<repo-root>/.agents/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'Claude provider view',
      'Claude exposes `.claude/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'Cursor provider view',
      'Cursor exposes `.cursor/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'suffixed provider variant',
      'Read `.cursor/agents/oat-reviewer-gpt-5-6-sol-medium.md`.',
      [],
    ],
    ['Codex TOML variant', 'Read `.codex/agents/oat-reviewer.toml`.', []],
    ['unanchored prose', 'The canonical role is agents/oat-reviewer.md.', []],
  ])('classifies %s portable asset syntax', (_name, content, expected) => {
    expect(classifyPortableAssetTargets(content as string)).toEqual(expected);
  });

  it.each([
    [
      'backticked SKILL.md',
      'Read `.agents/skills/sibling/SKILL.md`.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'plain text SKILL.md',
      'Read .agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'dot-relative path',
      'Read ./.agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'parent-relative path',
      'Read ../.agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'Markdown link',
      'Read [the sibling contract](.agents/skills/sibling/SKILL.md).',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'parent-relative sibling hop',
      'Read `../sibling/SKILL.md` before dispatch.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      // The spelling a scanned `references/<doc>.md` file would actually use.
      'two-level parent-relative sibling hop',
      'Read `../../sibling/SKILL.md` before dispatch.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'two-level parent-relative reference file',
      'Read `../../sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'two-level parent-relative reference directory',
      'Pick one file from `../../sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    [
      'two-level dot-relative path',
      'Read `../../.agents/skills/sibling/SKILL.md`.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'reference file',
      'Read `.agents/skills/sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'parent-relative reference file',
      'Read `../sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'Markdown-linked reference file',
      'See [the schema](../sibling/references/schema-base.md).',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'reference directory with trailing slash',
      'Pick one file from `.agents/skills/sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    [
      'reference directory without trailing slash',
      'Pick one file from `.agents/skills/sibling/references`.',
      [{ targetSkill: 'sibling', targetPath: 'references' }],
    ],
    [
      'nested reference directory',
      'Copy the templates in `.agents/skills/sibling/references/templates/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/templates/' }],
    ],
    [
      'parent-relative reference directory',
      'Pick the mechanics reference from `../sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    ['portable skills root', 'Read `${SKILLS_ROOT}/sibling/SKILL.md`.', []],
    [
      // The lookbehind must keep holding once repeated segments are allowed.
      'portable loaded-skill root hop',
      'Read `${SKILL_DIR}/../sibling/SKILL.md`.',
      [],
    ],
    [
      'portable loaded-skill root two-level hop',
      'Read `${SKILL_DIR}/../../sibling/SKILL.md`.',
      [],
    ],
    [
      'unrelated repeated parent path',
      'See `../../roadmap.md` and `../../../../docs/skills-guide.md`.',
      [],
    ],
    [
      'portable reference read',
      'Read `${DISPATCH_SKILLS_ROOT}/sibling/references/schema-base.md`.',
      [],
    ],
    [
      'user-scope absolute path',
      'Read `${HOME}/.agents/skills/sibling/SKILL.md`.',
      [],
    ],
    [
      'short-form follow-on read',
      'Then read `sibling/references/provider-codex.md` under that bound root.',
      [],
    ],
    ['same-owner local reference', 'Read `references/audit-playbook.md`.', []],
    ['self-reference SKILL.md', 'Read `.agents/skills/source/SKILL.md`.', []],
    [
      'self-reference file',
      'Read `.agents/skills/source/references/plan-template.md`.',
      [],
    ],
  ])('matches %s cross-skill syntax', (_name, content, expected) => {
    expect(collectCrossSkillTargets(content as string, 'source')).toEqual(
      expected,
    );
  });

  it('derives the scanned surface from user-default manifest packs', () => {
    const bothScopes = ['project', 'user'] as const;
    const asset = (id: string, kind: 'skill' | 'agent' | 'template') => ({
      id,
      kind,
      destination: `.agents/${id}`,
      scopes: bothScopes,
      ownership: { project: 'managed', user: 'managed' } as const,
    });
    const manifestFixture: readonly PackDefinition[] = [
      {
        name: 'utility',
        allowedScopes: bothScopes,
        defaultScope: 'user',
        assets: [
          asset('skill:user-default-skill', 'skill'),
          asset('agent:user-default-agent.md', 'agent'),
          asset('template:ignored.md', 'template'),
        ],
      },
      {
        name: 'research',
        allowedScopes: bothScopes,
        defaultScope: 'project',
        assets: [
          asset('skill:project-default-skill', 'skill'),
          asset('agent:project-default-agent.md', 'agent'),
        ],
      },
    ];

    expect(selectUserDefaultAssetRefs(manifestFixture)).toEqual([
      { kind: 'agent', name: 'user-default-agent' },
      { kind: 'skill', name: 'user-default-skill' },
    ]);
  });

  it('scans user-default agent assets alongside user-default skills', () => {
    expect(selectUserDefaultAssetRefs(PACK_MANIFEST)).toEqual(
      expect.arrayContaining([
        { kind: 'agent', name: 'oat-codebase-mapper' },
        { kind: 'agent', name: 'oat-phase-implementer' },
        { kind: 'agent', name: 'oat-reviewer' },
        { kind: 'skill', name: 'oat-dispatch-subagents' },
      ]),
    );

    const scanned = collectUserDefaultMarkdownAssets().map(
      ({ kind, owner }) => `${kind}:${owner}`,
    );

    expect(scanned).toEqual(
      expect.arrayContaining([
        'agent:oat-codebase-mapper',
        'agent:oat-phase-implementer',
        'agent:oat-reviewer',
        'skill:oat-dispatch-subagents',
      ]),
    );
    // Skills that ship in no user-default pack stay outside the rule.
    expect(scanned).not.toContain('skill:codex-skill');
    expect(scanned).not.toContain('skill:create-oat-skill');
  });

  it('proves the manifest-derived user-default surface covers every canonical agent', () => {
    const canonicalAgents = readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length))
      .sort();
    const manifestAgents = collectUserDefaultMarkdownAssets()
      .filter((asset) => asset.kind === 'agent')
      .map((asset) => asset.owner)
      .sort();

    expect(manifestAgents).toEqual(canonicalAgents);
  });

  it('keeps recon dispatch dependencies installed-scope owned with a visible generic-role fallback', () => {
    const content = readFileSync(join(SKILLS_DIR, 'recon', 'SKILL.md'), 'utf8');

    expect(content).toContain('`oat-dispatch-subagents/SKILL.md`');
    expect(content).toContain('`subagent-orchestration/SKILL.md`');
    expect(content).toMatch(
      /\$\{SKILL_DIR\}\/\.\.[\s\S]+\$\{HOME\}\/\.agents\/skills[\s\S]+<repo-root>\/\.agents\/skills/,
    );
    expect(content).toContain('dependency read to that same scope');
    expect(content).toContain('visible generic role fallback');
    expect(content).toContain('scripts/validate-packet.mjs');
    expect(content).toContain('scripts/render-packet.mjs');
    expect(collectCrossSkillTargets(content, 'recon')).toEqual([]);
  });

  it('skips only the materialized references/docs subtree', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-authored-markdown-'));
    const materializedDocsDir = join(fixtureRoot, 'references', 'docs');
    const authoredReference = join(
      fixtureRoot,
      'references',
      'docs-root-resolution.md',
    );
    const nestedAuthoredDir = join(
      fixtureRoot,
      'examples',
      'references',
      'docs',
    );
    const nestedAuthoredReference = join(nestedAuthoredDir, 'authored.md');

    try {
      mkdirSync(materializedDocsDir, { recursive: true });
      mkdirSync(nestedAuthoredDir, { recursive: true });
      writeFileSync(join(materializedDocsDir, 'shared.md'), '# Shared copy\n');
      writeFileSync(authoredReference, '# Authored reference\n');
      writeFileSync(
        nestedAuthoredReference,
        'Read `.agents/skills/sibling/SKILL.md`.\n',
      );

      expect(listAuthoredMarkdown(fixtureRoot)).toHaveLength(2);
      expect(listAuthoredMarkdown(fixtureRoot)).toEqual(
        expect.arrayContaining([authoredReference, nestedAuthoredReference]),
      );
      expect(
        collectCrossSkillReferencesForAsset(
          {
            kind: 'skill',
            owner: 'source',
            files: listAuthoredMarkdown(fixtureRoot),
          },
          fixtureRoot,
        ),
      ).toEqual([
        {
          file: 'examples/references/docs/authored.md',
          targetSkill: 'sibling',
          targetPath: 'SKILL.md',
        },
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it.each(['oat-idea-ideate', 'oat-idea-new', 'oat-idea-summarize'])(
    '%s resolves chained idea skills from its installed scope',
    (skill) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('Probe each candidate for `<name>/SKILL.md`');
      expect(content).toContain(
        'stop the current branch instead of improvising its process',
      );
      expect(content).toContain(
        'oat tools install ideas --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack ideas --scope <user|project>',
      );
      expect(collectBareCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('binds plan artifact-review instructions from the workflows scope', () => {
    const skill = 'oat-project-plan-writing';
    const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
    const boundRead = '${WORKFLOWS_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md';

    expectPortableAgentRootCandidateOrder(content, skill);
    expect(
      content.match(new RegExp(boundRead.replaceAll('$', '\\$&'), 'g')),
    ).toHaveLength(1);
    expect(content).toMatch(
      /stop before[\s\S]{0,80}(?:artifact-review|fresh-child)[\s\S]{0,80}(?:dispatch|fallback)/i,
    );
    expect(content).toContain(
      'oat tools install workflows --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack workflows --scope <user|project>',
    );
    expect(content).toMatch(
      /exact\s+registered[\s\S]{0,240}(?:variant|agent_type)[\s\S]{0,180}first/i,
    );
    expect(content).toMatch(
      /role instructions[\s\S]{0,240}(?:must not|cannot)[\s\S]{0,180}(?:target|provider)[\s\S]{0,120}model[\s\S]{0,120}effort[\s\S]{0,120}variant/i,
    );
  });

  it('binds implementation fallback roles independently from the workflows scope', () => {
    const source = 'oat-project-implement dispatch reference';
    const content = readFileSync(
      join(
        SKILLS_DIR,
        'oat-project-implement',
        'references',
        'dispatch-and-dry-run.md',
      ),
      'utf8',
    );

    expectPortableAgentRootCandidateOrder(content, source);
    expect(content).toContain(
      '${IMPLEMENTER_AGENT_PROVIDER_ROOT}/agents/oat-phase-implementer.md',
    );
    expect(content).toContain(
      '${REVIEWER_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md',
    );
    expect(content).toMatch(
      /independently[\s\S]{0,260}oat-phase-implementer[\s\S]{0,260}oat-reviewer/i,
    );
    expect(content).toMatch(
      /exact unsuffixed[\s\S]{0,160}same-scope canonical file[\s\S]{0,180}symlink/i,
    );
    expect(content).toMatch(/stop before[\s\S]{0,100}fresh-child fallback/i);
    expect(content).toContain(
      'oat tools install workflows --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack workflows --scope <user|project>',
    );
  });

  it('maps brainstorm sibling recovery to the owning pack', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-brainstorm', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain('`ideas` for `oat-idea-*`');
    expect(content).toContain('`project-management` for `oat-pjm-*`');
    expect(content).toContain('`workflows` for `oat-project-*`');
    expect(content).toContain(
      'oat tools install <pack> --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack <pack> --scope <user|project>',
    );
  });

  it('ships the portable brainstorm summarize handoff in the bundled copy', () => {
    const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-portable-assets-'));

    try {
      execFileSync('bash', [BUNDLE_ASSETS_SCRIPT], {
        env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
        stdio: 'pipe',
      });
      const bundledDestination = readFileSync(
        join(
          assetsRoot,
          'skills',
          'oat-brainstorm',
          'references',
          'destinations.md',
        ),
        'utf8',
      );

      expect(bundledDestination).toContain(
        '`${SKILLS_ROOT}/oat-idea-new/SKILL.md`',
      );
      expect(bundledDestination).toContain(
        '`${SKILLS_ROOT}/oat-idea-summarize/SKILL.md`',
      );
      expect(
        collectBareCrossSkillTargets(bundledDestination, 'oat-brainstorm'),
      ).toEqual([]);
    } finally {
      rmSync(assetsRoot, { recursive: true, force: true });
    }
  }, 15_000);

  it('ships portable sibling reads in the bundled skill and agent copies', () => {
    const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-portable-bundle-'));
    const bundledSkills = [
      [
        'oat-dispatch-subagents',
        '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
        'utility',
      ],
      [
        'oat-repo-improve',
        '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
        'utility',
      ],
      [
        'oat-review-provide-remote',
        '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
        'utility',
      ],
      [
        'oat-project-review-provide',
        '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
        'utility',
      ],
      [
        'analyze',
        '${RESEARCH_SKILLS_ROOT}/deep-research/references/schema-base.md',
        'research',
      ],
      [
        'compare',
        '${RESEARCH_SKILLS_ROOT}/deep-research/references/schema-comparative.md',
        'research',
      ],
    ] as const;
    const bundledAgents = [
      [
        'oat-phase-implementer',
        '${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md',
        'workflows',
      ],
      [
        'oat-reviewer',
        '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
        'utility',
      ],
      [
        'oat-codebase-mapper',
        '${KNOWLEDGE_INDEX_SKILLS_ROOT}/oat-repo-knowledge-index/references/templates/',
        'workflows',
      ],
    ] as const;

    try {
      execFileSync('bash', [BUNDLE_ASSETS_SCRIPT], {
        env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
        stdio: 'pipe',
      });

      for (const [skill, exactTarget, pack] of bundledSkills) {
        const content = readFileSync(
          join(assetsRoot, 'skills', skill, 'SKILL.md'),
          'utf8',
        );

        expectPortableSkillsRootCandidateOrder(content, `bundled ${skill}`);
        expect(content, `bundled ${skill} exact target`).toContain(exactTarget);
        expect(content, `bundled ${skill} recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(collectCrossSkillTargets(content, skill)).toEqual([]);
      }

      for (const [agent, exactTarget, pack] of bundledAgents) {
        const content = readFileSync(
          join(assetsRoot, 'agents', `${agent}.md`),
          'utf8',
        );

        expectPortableAgentSkillsRootCandidateOrder(
          content,
          `bundled ${agent}`,
        );
        expect(content, `bundled ${agent} exact target`).toContain(exactTarget);
        expect(content, `bundled ${agent} recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(collectCrossSkillTargets(content, agent)).toEqual([]);
      }
    } finally {
      rmSync(assetsRoot, { recursive: true, force: true });
    }
  }, 30_000);

  it.each([
    [
      'oat-project-implement',
      'stop every implementation, fix, or reviewer\ndispatch',
    ],
    [
      'oat-project-plan-writing',
      'Stop before the artifact self-review dispatch',
    ],
  ])(
    '%s resolves both dispatch contracts before dispatch',
    (skill, stopText) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
      const projectDispatchRead =
        skill === 'oat-project-implement'
          ? '`${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`'
          : '`${SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`';
      const sharedDispatchRead =
        skill === 'oat-project-implement'
          ? '`${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`'
          : '`${SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`';

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toContain(stopText);
      expect(content).toMatch(
        /never ambient\s+discovery|Do not fall back to ambient skill\s+discovery/,
      );
      expect(content).toContain(
        'oat tools install workflows --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack workflows --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools install utility --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack utility --scope <user|project>',
      );
      expect(content.indexOf(projectDispatchRead)).toBeLessThan(
        content.indexOf(sharedDispatchRead),
      );
      expect(collectBareCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('preserves launch notices and effective-target disclosure', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-project-implement', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain(
      'Display structured resolver notices before every implementation, fix, or reviewer launch',
    );
    expect(content).toContain('uses the effective resolved target');
    expect(content).toContain('never the bundled recommendation version');
    expect(content).toContain(
      'the named `provider-cursor.md`, `provider-codex.md`, or',
    );
    expect(content.indexOf('active-provider selection')).toBeLessThan(
      content.indexOf('matching mechanics reference'),
    );
  });

  it('resolves implementation dispatch dependencies independently', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-project-implement', 'SKILL.md'),
      'utf8',
    );
    const bindings = [
      [
        'PROJECT_DISPATCH_SKILLS_ROOT',
        'oat-project-dispatch-subagents/SKILL.md',
      ],
      ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
      [
        'ORCHESTRATION_SKILLS_ROOT',
        'subagent-orchestration/references/model-selection-principles.md',
      ],
    ] as const;

    expect(content).toContain('independently probe each required');
    for (const [root, path] of bindings) {
      expect(content).toContain(`\${${root}}`);
      expect(content).toContain(`\${${root}}/${path}`);
    }
    expect(content).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/',
    );
    expect(content).not.toMatch(
      /\$\{SKILLS_ROOT\}\/(?:oat-project-dispatch-subagents|oat-dispatch-subagents|subagent-orchestration)/,
    );
  });

  it.each([
    [
      'oat-dispatch-subagents',
      [
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
      ],
      'stop class-constrained dispatch',
    ],
    [
      'oat-repo-improve',
      [
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
      ],
      'stop delegated reconnaissance',
    ],
    [
      'oat-review-provide-remote',
      [
        [
          'REVIEW_PROVIDE_SKILLS_ROOT',
          'oat-review-provide/references/review-artifact-template.md',
        ],
      ],
      'stop the review instead of improvising a checklist',
    ],
  ] as const)(
    '%s resolves its utility siblings from the installed skill scope',
    (skill, bindings, stopText) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      // Loaded-skill candidate order: loaded scope, then user, then project.
      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toContain('never ambient discovery');
      expect(content).toContain(stopText);
      // Every dependency binds its own root, so mixed-scope installs work.
      expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
      for (const [root, path] of bindings) {
        expect(content, `${skill} binds \${${root}}`).toContain(`\${${root}}`);
        // The exact target is validated, not merely the root.
        expect(content, `${skill} reads \${${root}}/${path}`).toContain(
          `\${${root}}/${path}`,
        );
      }
      // Fail closed with owning-pack recovery for the intended scope.
      expect(content).toContain(
        'oat tools install utility --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack utility --scope <user|project>',
      );
      expect(collectCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it.each([
    ['analyze', ['references/schema-base.md', 'references/schema-analysis.md']],
    ['compare', ['references/schema-comparative.md']],
  ] as const)(
    '%s resolves deep-research schemas from the installed skill scope',
    (skill, schemas) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
      expect(content).toContain('never ambient discovery');
      // Fail closed rather than inventing a report schema.
      expect(content).toContain(
        'stop before writing the artifact instead of inventing a schema',
      );
      for (const schema of schemas) {
        // The exact target is validated, not merely the resolved root.
        expect(content, `${skill} reads ${schema}`).toContain(
          `\${RESEARCH_SKILLS_ROOT}/deep-research/${schema}`,
        );
      }
      expect(content).toContain(
        'oat tools install research --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack research --scope <user|project>',
      );
      expect(collectCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('oat-project-review-provide resolves the utility review template portably', () => {
    const skill = 'oat-project-review-provide';
    const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

    expectPortableSkillsRootCandidateOrder(content, skill);
    expect(content).toContain('`<name>/SKILL.md`');
    expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
    expect(content).toMatch(/never ambient\s+discovery/);
    // The exact companion template is bound, not just its owning root.
    expect(content).toContain(
      '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
    );
    // The companion is optional context, so a miss must not silently swap in an
    // improvised format for the project review output.
    expect(content).toMatch(
      /without substituting an improvised companion\s+format/,
    );
    expect(content).toContain(
      'oat tools install utility --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack utility --scope <user|project>',
    );
    expect(collectCrossSkillTargets(content, skill)).toEqual([]);
  });

  it.each([
    ['oat-project-review-provide', 2],
    ['oat-project-review-provide-remote', 2],
  ] as const)(
    '%s binds canonical reviewer instructions from the workflows scope',
    (skill, expectedReads) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
      const boundRead =
        '${WORKFLOWS_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md';

      expectPortableAgentRootCandidateOrder(content, skill);
      expect(content).toMatch(
        /exact[\s\S]{0,40}unsuffixed[\s\S]{0,20}`agents\/oat-reviewer\.md`/,
      );
      expect(content).toMatch(/same-scope canonical file[\s\S]{0,180}symlink/i);
      expect(content).toMatch(
        /missing[\s\S]{0,80}broken[\s\S]{0,80}escaping[\s\S]{0,80}copied[\s\S]{0,80}transformed[\s\S]{0,80}suffixed[\s\S]{0,120}noncanonical candidate[\s\S]{0,100}continue/i,
      );
      expect(
        content.match(new RegExp(boundRead.replaceAll('$', '\\$&'), 'g')),
      ).toHaveLength(expectedReads);
      expect(content).toMatch(
        /stop before[\s\S]{0,40}(?:launching|starting)[\s\S]{0,40}fresh-child fallback/i,
      );
      expect(content).toContain(
        'oat tools install workflows --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack workflows --scope <user|project>',
      );
    },
  );

  it.each([
    [
      'oat-phase-implementer',
      [
        [
          'PROJECT_DISPATCH_SKILLS_ROOT',
          'oat-project-dispatch-subagents/SKILL.md',
        ],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/references/'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
        ['ORCHESTRATION_SKILLS_ROOT', 'subagent-orchestration/references/'],
      ],
      ['workflows', 'utility'],
      'stop the optional launch and implement the task directly',
    ],
    [
      'oat-reviewer',
      [
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/references/'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
        ['ORCHESTRATION_SKILLS_ROOT', 'subagent-orchestration/references/'],
      ],
      ['utility'],
      'stop the reconnaissance launch and review inline',
    ],
    [
      'oat-codebase-mapper',
      [
        [
          'KNOWLEDGE_INDEX_SKILLS_ROOT',
          'oat-repo-knowledge-index/references/templates/',
        ],
      ],
      ['workflows'],
      'stop before writing any document instead of inventing a format',
    ],
  ] as const)(
    '%s resolves sibling skills from user then project scope',
    (agent, bindings, packs, stopText) => {
      const content = readFileSync(join(AGENTS_DIR, `${agent}.md`), 'utf8');

      expectPortableAgentSkillsRootCandidateOrder(content, agent);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toMatch(/[Ii]ndependently probe each required/);
      expect(content).toContain('never ambient discovery');
      expect(content).toContain(stopText);
      for (const [root, path] of bindings) {
        // Independent roots keep mixed-scope installs resolvable, and the exact
        // target is validated rather than only its containing root.
        expect(content, `${agent} reads \${${root}}/${path}`).toContain(
          `\${${root}}/${path}`,
        );
      }
      for (const pack of packs) {
        expect(content, `${agent} ${pack} install recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(content, `${agent} ${pack} update recovery`).toContain(
          `oat tools update --pack ${pack} --scope <user|project>`,
        );
      }
      // No executable bare agent read survives.
      expect(collectCrossSkillTargets(content, agent)).toEqual([]);
      expect(content).not.toMatch(
        /\$\{SKILLS_ROOT\}\/(?:oat-project-dispatch-subagents|oat-dispatch-subagents|subagent-orchestration|oat-repo-knowledge-index)/,
      );
    },
  );

  it('binds repo-improve dispatch and orchestration references independently', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-repo-improve', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/',
    );
    expect(content).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/',
    );
    // A single shared root would silently break a mixed-scope install.
    expect(content).not.toMatch(
      /\$\{SKILLS_ROOT\}\/(?:oat-dispatch-subagents|subagent-orchestration)/,
    );
  });

  // ── External-plan readiness contract ──────────────────────────────────
  //
  // `oat-repo-improve` separates plan readiness (the plan is well formed)
  // from execution readiness (its prerequisites have merged). These cases are
  // the executable backstop for that split. They pin the skill and template
  // prose, and they run the readiness rules over the real durable plan corpus
  // so that a rule which would invalidate an existing plan fails here rather
  // than after the plans stop being importable.

  it('requires plan readiness to be evaluated separately from execution readiness', () => {
    const skill = readFileSync(REPO_IMPROVE_SKILL, 'utf8');

    expect(skill).toContain('`plan_ready`');
    expect(skill).toContain('`execution_ready`');
    // The operative rule: a blocked candidate is planned, not dropped.
    expect(skill).toContain(
      'Dependency state alone does not disqualify a candidate',
    );
    expect(skill).toMatch(
      /`plan_ready` but not `execution_ready` is still planned/,
    );
    expect(skill).toContain('oat_execution_status: BLOCKED');
  });

  it('plan template carries typed dependencies, landing events, execution status, and revalidation', () => {
    const template = readFileSync(PLAN_TEMPLATE, 'utf8');

    // Each heading must exist as a real section. A `toContain` check would
    // pass on the prose and Quality Gate lines that merely name these
    // sections, so deleting the sections themselves would go unnoticed.
    for (const heading of [
      'Dependencies',
      'Landing-event impact',
      'Revalidation Before Execution',
    ]) {
      expect(
        template
          .split('\n')
          .filter((line) => line.trimEnd() === `## ${heading}`),
        `## ${heading} must exist as a section, not only as prose`,
      ).toHaveLength(1);
    }

    // The plan frontmatter block specifically, not any placeholder that also
    // appears in the multi-plan index block further down the file.
    const planFrontmatter = /```yaml\n([\s\S]*?)\n```/.exec(template)?.[1];
    expect(planFrontmatter).toBeDefined();
    expect(planFrontmatter).toContain(
      'oat_external_plan_commit: <full 40-character SHA of the inspected HEAD>',
    );
    expect(planFrontmatter).toContain('oat_external_plan_main_commit:');
    expect(planFrontmatter).toContain('oat_external_plan_date:');
    expect(planFrontmatter).toContain('oat_execution_status: READY|BLOCKED');

    // Named unblock states are what make a `Hard` row machine-checkable.
    for (const state of [
      ...SATISFIED_UNBLOCK_STATES,
      ...UNSATISFIED_UNBLOCK_STATES,
    ]) {
      expect(template.toLowerCase(), state).toContain(`\`${state}\``);
    }

    expect(template).toMatch(
      /unsatisfied hard dependency in `## Dependencies`/,
    );
    // The rewritten permission boundary: canonical lifecycle state stays
    // forbidden while external readiness metadata is explicitly allowed.
    expect(template).toContain('must not carry canonical OAT lifecycle state');
    expect(template).toContain('External execution-readiness metadata');
    // The legacy branch is what keeps the durable corpus readable.
    expect(template).toContain('### Legacy plans');
    expect(template).toContain(CONTRACT_LANDING_DATE);
  });

  it('plan readiness requires the plan body to link back to its source item', () => {
    const skill = readFileSync(REPO_IMPROVE_SKILL, 'utf8');
    const template = readFileSync(PLAN_TEMPLATE, 'utf8');

    // The authoring rule, in the skill that states it and the template that
    // renders it. Both halves of the tracking relationship are named, so
    // deleting either one fails here rather than silently shipping a plan that
    // its source item points at but that points nowhere back.
    expect(skill).toContain(
      'link back to its source backlog item or artifact from the plan body',
    );
    // The item -> plan half. Guarding only the plan -> item half would leave
    // exactly the same "half the relationship can be deleted silently" gap
    // one direction over.
    expect(skill).toContain('ensure frontmatter contains `external_plans`');
    expect(skill).toContain(
      "Links must run in both directions: the item's `external_plans` array points at the plan, and the plan body's source section links back to the item.",
    );
    expect(
      template
        .split('\n')
        .filter((line) => line.trimEnd() === '## Source and live evidence'),
      '## Source and live evidence must exist as a section',
    ).toHaveLength(1);
    expect(template).toContain(
      'link the item from this plan body so the link runs in both directions',
    );
    // The Quality Gate is what an author actually checks before shipping.
    expect(template).toContain('the plan body links back to its source item');

    // Accepted control: the template's own shape, link and all.
    expect(evaluateExternalPlan(buildProspectivePlan()).violations).toEqual([]);

    // Mutation control: the same plan with the link stripped off the source
    // bullet. The item is still named, so every other rule still passes and
    // only this one can catch it.
    const rejected = (sourceEvidence: string | null, why: string): void => {
      expect(
        evaluateExternalPlan(buildProspectivePlan({ sourceEvidence }))
          .violations,
        why,
      ).toEqual([MISSING_SOURCE_BACKLINK_VIOLATION]);
    };
    const accepted = (sourceEvidence: string, why: string): void => {
      expect(
        evaluateExternalPlan(buildProspectivePlan({ sourceEvidence }))
          .violations,
        why,
      ).toEqual([]);
    };

    rejected(
      [
        '- Source artifact or scope: `packages/cli/src/x.ts`',
        '- Related backlog items: BL-260907-example — Example item',
        '- Verified evidence:',
        '  - `src/x.ts:1` — what it establishes',
      ].join('\n'),
      'a named but unlinked source item',
    );

    // Dropping the whole section fails the same way.
    rejected(null, 'no ## Source and live evidence section at all');

    // `none` is an escape hatch for the value, not a word that may appear
    // anywhere in the bullet's prose.
    rejected(
      '- Source backlog item: BL-260907-example — none of its prior links survived',
      'the word none inside an unlinked declaration',
    );

    // Context bullets are not source declarations, so a link in one of them
    // cannot stand in for the missing backlink.
    rejected(
      [
        '- Source backlog item: BL-260907-example — Example item',
        '- Related history: [an earlier plan](./2026-08-19-example.md)',
      ].join('\n'),
      'a link in an unrelated Related history bullet',
    );

    // A fenced example of a source bullet is an example, not the record.
    rejected(
      [
        '- Source backlog item: BL-260907-example — Example item',
        '',
        '```markdown',
        '- Source backlog item: [BL-260907-example](../../pjm/backlog/items/BL-260907-example.md)',
        '```',
      ].join('\n'),
      'a fenced example of a linked declaration',
    );

    // A plan with genuinely no source item records that, which the template's
    // `<ID and title, or none>` placeholder explicitly allows.
    accepted('- Related backlog items: none', 'an explicit none');
    accepted(
      '- Related backlog items: `none`',
      'an explicit none in backticks',
    );

    // The skill and template say "link", not "inline Markdown link".
    accepted(
      '- Source issue: <https://github.com/voxmedia/open-agent-toolkit/issues/239>',
      'an autolinked source issue',
    );
    accepted(
      [
        '- Source backlog item: [BL-260907-example][item]',
        '',
        '[item]: ../../pjm/backlog/items/BL-260907-example.md',
      ].join('\n'),
      'a reference-style link',
    );

    // A link is only the backlink when it links back to THIS plan's source.
    // A declaration that names its item and then links somewhere else proves
    // no relationship at all, which is the whole point of the contract.
    rejected(
      '- Source backlog item: BL-260907-example — see [unrelated](https://example.com)',
      'a declared backlog ID beside an unrelated link',
    );
    rejected(
      '- Source issue: #239 discussed in [a blog post](https://example.com/post)',
      'a declared issue number beside an unrelated link',
    );
    rejected(
      '- Source artifact or scope: `packages/cli/src/x.ts` — see [docs](https://example.com)',
      'a declared artifact path beside an unrelated link',
    );
    // Issue numbers are matched bounded, so a link to a different issue whose
    // number merely contains the declared digits is not the backlink.
    rejected(
      '- Source issue: #239 — [#2391](https://github.com/voxmedia/open-agent-toolkit/issues/2391)',
      'a link to an issue whose number only contains the declared one',
    );

    // Identifying the named source satisfies it, by destination or by label,
    // and one identifying link among several is enough.
    accepted(
      '- Source backlog item: BL-260907-example — [the item](../../pjm/backlog/items/BL-260907-example.md)',
      'a declared backlog ID whose link destination names it',
    );
    accepted(
      '- Source backlog item: BL-260907-example — [BL-260907-example](https://example.com/x)',
      'a declared backlog ID whose link label names it',
    );
    accepted(
      '- Source issue: #239 — [#239](https://github.com/voxmedia/open-agent-toolkit/issues/239)',
      'a declared issue number whose link names it',
    );
    accepted(
      '- Source artifact or scope: `packages/cli/src/x.ts` — [the file](../../../packages/cli/src/x.ts)',
      'a declared artifact path whose link names it',
    );
    accepted(
      [
        '- Source backlog item: BL-260907-example — [unrelated](https://example.com) and',
        '  [the item](../../pjm/backlog/items/BL-260907-example.md)',
      ].join('\n'),
      'one identifying link among several',
    );
    accepted(
      [
        '- Source backlog item: BL-260907-example — [the item][item]',
        '',
        '[item]: ../../pjm/backlog/items/BL-260907-example.md',
      ].join('\n'),
      'a reference-style link resolved to a destination naming the source',
    );
    accepted(
      '- Source issue: #239 — <https://github.com/voxmedia/open-agent-toolkit/issues/239>',
      'an autolink naming the declared issue',
    );
    // A scope named in prose is still a named source: the link has to pick it
    // up, not merely exist beside it.
    accepted(
      '- Source artifact or scope: the docs app — [the docs app](../../../apps/oat-docs)',
      'a prose scope whose link names it',
    );
    rejected(
      '- Source artifact or scope: the docs app — [unrelated](https://example.com)',
      'a prose scope beside an unrelated link',
    );

    // Identity is bounded per kind, so a near-miss is not the source. Each of
    // these links resolves to a real but different thing.
    rejected(
      '- Source backlog item: BL-123 — [x](../../pjm/backlog/items/BL-1234.md)',
      'a link to a backlog ID that merely extends the declared one by a digit',
    );
    rejected(
      '- Source artifact or scope: `packages/cli/src/x.ts` — [x](../../../packages/cli/src/x.tsx)',
      'a link to a path that merely extends the declared one',
    );
    rejected(
      '- Source issue: #239 — [x](https://example.com/posts/239)',
      'a link whose path merely ends in the declared issue number',
    );
    rejected(
      '- Source issue: #239 — [239 reasons](https://example.com/z)',
      'a link whose label merely contains the declared issue number',
    );
    // The extending-segment case is the one that must keep working.
    accepted(
      '- Source backlog item: BL-260902 — [the item](../../pjm/backlog/items/BL-260902-add-an-exclusion-mechanism.md)',
      'a link to the full ID the declaration abbreviates',
    );

    // Markdown that renders no navigable link cannot be the backlink.
    rejected(
      '- Source backlog item: BL-260907-example — [item][BL-260907-example]',
      'a reference link with no definition to resolve',
    );
    rejected(
      '- Source backlog item: BL-260907-example — ![BL-260907-example](image.png)',
      'an image whose alt text names the source',
    );
    rejected(
      [
        '- Source backlog item: BL-260907-example — `[BL-260907-example](../../pjm/backlog/items/BL-260907-example.md)`',
      ].join('\n'),
      'a link inside an inline code span',
    );
    rejected(
      [
        '- Source backlog item: BL-260907-example — [the item][item]',
        '',
        '```markdown',
        '[item]: ../../pjm/backlog/items/BL-260907-example.md',
        '```',
      ].join('\n'),
      'a reference definition that only exists inside a fenced example',
    );

    // Valid Markdown the parser must not reject.
    accepted(
      '- Source artifact or scope: `packages/a_(b)/x.ts` — [f](../../../packages/a_(b)/x.ts)',
      'a destination containing balanced parentheses',
    );
    accepted(
      [
        '- Source backlog item: BL-260907-example — [the item][ITEM   REF]',
        '',
        '[item ref]: ../../pjm/backlog/items/BL-260907-example.md',
      ].join('\n'),
      'a reference label matched with folded case and collapsed whitespace',
    );

    // Legacy plans are never retrofitted, so the rule must not reach them.
    expect(
      evaluateExternalPlan(
        readFileSync(
          join(EXTERNAL_PLANS_DIR, '2026-08-19-hermetic-cli-assets-root.md'),
          'utf8',
        ),
      ).violations,
    ).toEqual([]);
  });

  it('plan provenance pins the full inspected HEAD SHA and a separate comparison SHA', () => {
    const skill = readFileSync(REPO_IMPROVE_SKILL, 'utf8');
    const template = readFileSync(PLAN_TEMPLATE, 'utf8');

    // A working-tree short SHA cannot identify the inspected tree later, so
    // the command the contract replaces must be gone from both files.
    expect(skill).not.toContain('git rev-parse --short HEAD');
    expect(template).not.toContain('git rev-parse --short HEAD');

    expect(skill).toContain('git rev-parse HEAD');
    expect(skill).toContain(
      'git fetch origin main && git rev-parse origin/main',
    );
    expect(skill).toContain('git merge-base HEAD origin/main');
    expect(skill).toContain('git status --porcelain');
    expect(skill).toMatch(
      /[Nn]ever stamp it with a fetched tip that was not read/,
    );

    expect(skill).toContain('oat_external_plan_main_commit');
    expect(template).toContain('oat_external_plan_main_commit');
    expect(template).toContain('<full 40-character SHA of the inspected HEAD>');
  });

  it('legacy plans without a date are read in legacy mode and default to READY', () => {
    // A real durable plan rather than a synthetic fixture: short SHA, no
    // date, no status, and none of the three contract sections.
    const text = readFileSync(
      join(EXTERNAL_PLANS_DIR, '2026-08-19-hermetic-cli-assets-root.md'),
      'utf8',
    );
    const frontmatter = parsePlanFrontmatter(text);

    expect(frontmatter.oat_external_plan_commit).toBe('6f443c08');
    expect(frontmatter.oat_external_plan_date).toBeUndefined();
    expect(frontmatter.oat_execution_status).toBeUndefined();
    expect(text).not.toContain('\n## Dependencies\n');

    const readiness = evaluateExternalPlan(text);

    expect(readiness.mode).toBe('legacy');
    expect(readiness.status).toBe('READY');
    expect(readiness.violations).toEqual([]);
  });

  it('every current external plan is accepted under its date-selected mode', () => {
    const markdown = readdirSync(EXTERNAL_PLANS_DIR)
      .filter((name) => name.endsWith('.md'))
      .sort();
    const plans = markdown.filter((name) => DATED_PLAN_FILE.test(name));
    const skipped = markdown.filter((name) => !DATED_PLAN_FILE.test(name));

    // Every artifact in the directory is either swept or explicitly declared a
    // non-contract file, so a new plan cannot fall outside the sweep silently.
    expect(skipped).toEqual(NON_CONTRACT_PLAN_FILES);
    expect(plans).toHaveLength(
      markdown.length - NON_CONTRACT_PLAN_FILES.length,
    );
    // Guards against the sweep quietly shrinking and proving less over time.
    expect(plans.length).toBeGreaterThanOrEqual(44);

    const rejected: string[] = [];
    const modes = new Map<string, PlanReadinessMode>();

    for (const name of plans) {
      const readiness = evaluateExternalPlan(
        readFileSync(join(EXTERNAL_PLANS_DIR, name), 'utf8'),
      );
      modes.set(name, readiness.mode);
      if (readiness.violations.length > 0) {
        rejected.push(`${name}: ${readiness.violations.join('; ')}`);
      }
    }

    // No rule may make a durable plan unreadable; retrofitting the corpus is
    // explicitly not a prerequisite for this contract.
    expect(rejected).toEqual([]);

    // The whole corpus predates the contract today. New prospective plans may
    // join it later without disturbing this: they are accepted on their own
    // terms by the sweep above.
    expect(modes.get('2026-08-19-hermetic-cli-assets-root.md')).toBe('legacy');
    expect(modes.get('2026-09-04-honor-metadata-version-for-skills.md')).toBe(
      'legacy',
    );
  });

  it('a post-contract plan with a short SHA is rejected; HEAD and origin/main may differ', () => {
    // Planning from a branch: the inspected HEAD is deliberately not the
    // fetched tip, and recording both is the point of the second field.
    const differing = evaluateExternalPlan(buildProspectivePlan());

    expect(differing.mode).toBe('prospective');
    expect(differing.violations).toEqual([]);
    expect(PROSPECTIVE_HEAD_SHA).not.toBe(PROSPECTIVE_MAIN_SHA);

    const shortSha = evaluateExternalPlan(
      buildProspectivePlan({ commit: '6f443c08' }),
    );

    expect(shortSha.mode).toBe('prospective');
    expect(shortSha.violations).toEqual([SHORT_SHA_VIOLATION]);
  });

  it('every prospective contract rule rejects its own violation', () => {
    // One isolated fixture per rule, each differing from an accepted plan by
    // exactly the thing under test, so no rule can be deleted while the suite
    // stays green.
    const cases: [string, ProspectivePlanOverrides, string][] = [
      ['short inspected SHA', { commit: '6f443c08' }, SHORT_SHA_VIOLATION],
      [
        'missing comparison SHA',
        { mainCommit: null },
        MISSING_MAIN_COMMIT_VIOLATION,
      ],
      ['missing status', { status: null }, MISSING_STATUS_VIOLATION],
      ['unrecognized status', { status: 'MAYBE' }, MISSING_STATUS_VIOLATION],
      [
        'missing dependencies section',
        { dependencies: null },
        'missing ## Dependencies',
      ],
      [
        'missing landing events',
        { landingEvents: null },
        'missing ## Landing-event impact',
      ],
      [
        'missing revalidation',
        { revalidation: null },
        'missing ## Revalidation Before Execution',
      ],
      [
        'landing events present but empty',
        { landingEvents: 'Nothing in flight.' },
        MISSING_LANDING_EVENT_TABLE_VIOLATION,
      ],
      [
        'revalidation present but empty',
        { revalidation: '' },
        EMPTY_REVALIDATION_VIOLATION,
      ],
      [
        'malformed planning date',
        { date: 'september' },
        MALFORMED_DATE_VIOLATION,
      ],
      [
        'dependency table with the wrong columns',
        {
          dependencies: [
            '| Kind | Thing | Needs | Status |',
            '| ---- | ----- | ----- | ------ |',
            '| Soft ordering | [Plan](./x.md) | Land first. | Landed. |',
          ].join('\n'),
        },
        MISSING_DEPENDENCY_TABLE_VIOLATION,
      ],
      [
        'type that merely starts with a keyword',
        {
          dependencies: [
            '| Type | Dependency | Required state | Current state |',
            '| ---- | ---------- | -------------- | ------------- |',
            '| Software ordering | [Plan](./x.md) | Land first. | Landed. |',
          ].join('\n'),
        },
        'dependency type "Software ordering" is not Hard, Soft, or Satisfied',
      ],
      [
        'satisfied row that is not actually satisfied',
        {
          dependencies: [
            '| Type | Dependency | Required state | Current state |',
            '| ---- | ---------- | -------------- | ------------- |',
            '| Satisfied predecessor | [Plan](./x.md) | Land first. | Pending. |',
          ].join('\n'),
        },
        'satisfied dependency current state "Pending." names no satisfied state',
      ],
      [
        'prose-only dependencies section',
        { dependencies: 'No dependencies worth typing.' },
        MISSING_DEPENDENCY_TABLE_VIOLATION,
      ],
      [
        'untyped dependency row',
        {
          dependencies: [
            '| Type | Dependency | Required state | Current state |',
            '| ---- | ---------- | -------------- | ------------- |',
            '| Downstream | [Plan](./x.md) | Land first. | Landed. |',
          ].join('\n'),
        },
        'dependency type "Downstream" is not Hard, Soft, or Satisfied',
      ],
      [
        'hard row with no named unblock state',
        {
          dependencies: [
            '| Type | Dependency | Required state | Current state |',
            '| ---- | ---------- | -------------- | ------------- |',
            '| Hard ordering | [Plan](./x.md) | Land first. | Written, not shipped. |',
          ].join('\n'),
        },
        'hard dependency current state "Written, not shipped." names no unblock state',
      ],
      [
        'READY despite an unsatisfied hard dependency',
        {
          dependencies: [
            '| Type | Dependency | Required state | Current state |',
            '| ---- | ---------- | -------------- | ------------- |',
            '| Hard ordering | [Plan](./x.md) | Land first. | Pending in W1. |',
          ].join('\n'),
        },
        CONTRADICTORY_STATUS_VIOLATION,
      ],
      [
        'BLOCKED with nothing unsatisfied',
        { status: 'BLOCKED' },
        UNJUSTIFIED_BLOCK_VIOLATION,
      ],
    ];

    for (const [name, overrides, expected] of cases) {
      const readiness = evaluateExternalPlan(buildProspectivePlan(overrides));
      expect(readiness.mode, name).toBe('prospective');
      expect(readiness.violations, name).toContain(expected);
    }

    // An index carries provenance but no execution readiness of its own, so
    // the exemption must be exactly that: no status, no sections, but both
    // SHAs still enforced.
    const index = evaluateExternalPlan(
      buildProspectivePlan({
        status: null,
        dependencies: null,
        landingEvents: null,
        revalidation: null,
        // Dropped too, so this control still proves the exemption if the
        // source-backlink rule ever moves above the index return.
        sourceEvidence: null,
      }).replace('oat_external_plan: true', 'oat_external_plan_index: true'),
    );

    expect(index.kind).toBe('index');
    expect(index.violations).toEqual([]);

    const indexWithShortSha = evaluateExternalPlan(
      buildProspectivePlan({
        commit: '6f443c08',
        status: null,
        dependencies: null,
        landingEvents: null,
        revalidation: null,
        sourceEvidence: null,
      }).replace('oat_external_plan: true', 'oat_external_plan_index: true'),
    );

    expect(indexWithShortSha.kind).toBe('index');
    expect(indexWithShortSha.violations).toEqual([SHORT_SHA_VIOLATION]);

    // Outer pipes are optional in Markdown; a table written without them must
    // still be read rather than silently contributing no rows.
    const withoutOuterPipes = evaluateExternalPlan(
      buildProspectivePlan({
        status: 'BLOCKED',
        dependencies: [
          'Type | Dependency | Required state | Current state',
          '---- | ---------- | -------------- | -------------',
          'Hard ordering | [Plan](./x.md) | Land first. | Pending in W1.',
        ].join('\n'),
      }),
    );

    expect(withoutOuterPipes.violations).toEqual([]);
  });

  it('holds an execution program to its own contract instead of exempting it', () => {
    // `oat_execution_program` is vocabulary owned by `oat-wave-program`, whose
    // documents are maps rather than plans: they inspect no tree, so they
    // carry no provenance SHAs and no `oat_execution_status`. Requiring those
    // would reject every document that skill's own template produces. What a
    // program must carry is its ledger, and that is what is enforced here.
    const accepted = evaluateExternalPlan(buildProgramDocument());

    expect(accepted.kind).toBe('program');
    expect(accepted.mode).toBe('prospective');
    expect(accepted.violations).toEqual([]);

    const cases: [string, ProgramDocumentOverrides, string][] = [
      [
        'no program indexes',
        { programIndexes: null },
        MISSING_PROGRAM_INDEXES_VIOLATION,
      ],
      [
        'empty program indexes',
        { programIndexes: [] },
        MISSING_PROGRAM_INDEXES_VIOLATION,
      ],
      ['no status ledger', { statusLedger: null }, 'missing ## Status Ledger'],
      ['no wave table', { waveTable: null }, 'missing ## Wave Table'],
      [
        'status ledger without its columns',
        { statusLedger: 'Everything is fine.' },
        MISSING_STATUS_LEDGER_TABLE_VIOLATION,
      ],
      [
        'wave status outside the vocabulary',
        {
          statusLedger: [
            '| Wave | Theme | Lanes | Status | Record |',
            '| ---- | ----- | ----- | ------ | ------ |',
            '| W1 | Theme | 4 | shipped | PR #262. |',
          ].join('\n'),
        },
        `wave status "shipped" is not ${WAVE_STATUSES.join(', ')}`,
      ],
      [
        'status ledger with a header but no waves',
        {
          statusLedger: [
            '| Wave | Theme | Lanes | Status | Record |',
            '| ---- | ----- | ----- | ------ | ------ |',
          ].join('\n'),
        },
        EMPTY_STATUS_LEDGER_VIOLATION,
      ],
      [
        'wave table with a header but no plans',
        {
          waveTable: [
            '| Plan | Index | Wave | Ordering notes | Status |',
            '| ---- | ----- | ---- | -------------- | ------ |',
          ].join('\n'),
        },
        EMPTY_WAVE_TABLE_VIOLATION,
      ],
      [
        'program indexes that are not paths',
        { programIndexes: ['   '] },
        MISSING_PROGRAM_INDEXES_VIOLATION,
      ],
    ];

    for (const [name, overrides, expected] of cases) {
      const readiness = evaluateExternalPlan(buildProgramDocument(overrides));
      expect(readiness.kind, name).toBe('program');
      expect(readiness.mode, name).toBe('prospective');
      expect(readiness.violations, name).toContain(expected);
    }

    // Producer-shaped: `oat-wave-program`'s template emits `created` and no
    // `oat_external_plan_date` at all. Without the created-date fallback every
    // generated program would sort into legacy mode forever, and the rules
    // above would never run on real output.
    const producerShaped = buildProgramDocument({ date: null }).replace(
      '---\n\n# Execution Program',
      "created: '2026-09-20T05:24:43Z'\n---\n\n# Execution Program",
    );

    expect(producerShaped).not.toContain('oat_external_plan_date');
    expect(evaluateExternalPlan(producerShaped).mode).toBe('prospective');
    expect(evaluateExternalPlan(producerShaped).violations).toEqual([]);

    const producerShapedMissingLedger = evaluateExternalPlan(
      buildProgramDocument({ date: null, statusLedger: null }).replace(
        '---\n\n# Execution Program',
        "created: '2026-09-20T05:24:43Z'\n---\n\n# Execution Program",
      ),
    );

    expect(producerShapedMissingLedger.mode).toBe('prospective');
    expect(producerShapedMissingLedger.violations).toContain(
      'missing ## Status Ledger',
    );

    // A heading that merely starts with the same words is not the section.
    expect(
      evaluateExternalPlan(
        buildProgramDocument({ waveTableHeading: '## Wave Tables' }),
      ).violations,
    ).toContain('missing ## Wave Table');

    // Both real program documents predate the contract and carry no date, so
    // legacy mode must keep tolerating a program with none of the above.
    const legacyProgram = evaluateExternalPlan(
      buildProgramDocument({
        date: null,
        programIndexes: null,
        statusLedger: null,
        waveTable: null,
      }),
    );

    expect(legacyProgram.mode).toBe('legacy');
    expect(legacyProgram.violations).toEqual([]);

    // The real corpus shape: the wave-table heading carries a coverage suffix.
    for (const name of [
      '2026-08-31-execution-program.md',
      '2026-08-19-execution-program.md',
    ]) {
      const text = readFileSync(join(EXTERNAL_PLANS_DIR, name), 'utf8');
      const readiness = evaluateExternalPlan(text);
      expect(readiness.kind, name).toBe('program');
      expect(readiness.mode, name).toBe('legacy');
      expect(readiness.violations, name).toEqual([]);
      // Re-dated past the contract, the real documents satisfy the program
      // rules on their own shape rather than needing a retrofit.
      const redated = text.replace(
        /^---\n/,
        `---\noat_external_plan_date: '${PROSPECTIVE_DATE}'\n`,
      );
      const prospective = evaluateExternalPlan(redated);
      expect(prospective.mode, name).toBe('prospective');
      expect(prospective.violations, name).toEqual([]);
    }
  });

  it('rejects a post-contract plan whose unsatisfied hard dependency claims READY', () => {
    // Negative control captured from a real artifact, not an invented one.
    // The snapshot holds the source's frontmatter and `## Dependencies`
    // verbatim: `oat_execution_status: READY` alongside a `Hard ordering` row
    // reading "Pending in W1; this plan is BLOCKED until then." Legacy mode
    // accepts those bytes; re-dated past the contract they are rejected.
    //
    // Snapshotted rather than read live so that repairing the real plan --
    // the correct maintenance action, deliberately out of scope here -- does
    // not break this test. Provenance is in the fixture's own header.
    const real = readSnapshotFixture('blocked-plan-claiming-ready.md');

    expect(
      real,
      'the recorded negative control must keep an unsatisfied hard dependency alongside a READY status',
    ).toContain('| Hard ordering ');
    expect(real).toContain('oat_execution_status: READY');

    const asWritten = evaluateExternalPlan(real);
    expect(asWritten.mode).toBe('legacy');
    expect(asWritten.violations).toEqual([]);

    // The planning date is the only mutation; the file on disk is untouched.
    const redated = real.replace(
      "oat_external_plan_date: '2026-09-02'",
      "oat_external_plan_date: '2026-09-10'",
    );
    expect(redated).not.toBe(real);

    const prospective = evaluateExternalPlan(redated);
    expect(prospective.mode).toBe('prospective');
    expect(prospective.violations).toContain(CONTRADICTORY_STATUS_VIOLATION);

    // Normalize the fields this plan never had to carry as a legacy artifact,
    // so the accepted control below differs from the rejected one by the
    // status alone rather than by unrelated legacy gaps.
    const normalized = [
      redated
        .replace(
          `oat_external_plan_date: '${PROSPECTIVE_DATE}'`,
          `oat_external_plan_main_commit: ${PROSPECTIVE_MAIN_SHA}\noat_external_plan_date: '${PROSPECTIVE_DATE}'`,
        )
        .replace('| Related, distinct |', '| Soft adjacency |'),
      // The snapshot keeps only the frontmatter and the three sections its
      // assertion needs, so it has no `## Source and live evidence`. The real
      // source carries one at `:45-48`, with exactly this backlink; restoring
      // it verbatim is part of the same legacy-gap normalization.
      '',
      '## Source and live evidence',
      '',
      '- Source backlog item:',
      '  [BL-260902-add-an-exclusion-mechanism — Add an exclusion mechanism to oat docs generate-index](../../pjm/backlog/items/BL-260902-add-an-exclusion-mechanism.md)',
    ].join('\n');

    expect(evaluateExternalPlan(normalized).violations).toEqual([
      CONTRADICTORY_STATUS_VIOLATION,
    ]);

    // Being blocked is not the defect; claiming READY while blocked is. The
    // same plan recorded honestly is accepted with no violations at all.
    const blocked = evaluateExternalPlan(
      normalized.replace(
        'oat_execution_status: READY',
        'oat_execution_status: BLOCKED',
      ),
    );

    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.violations).toEqual([]);
  });

  it('anchors dispatch short-form provider reads to an already bound root', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-dispatch-subagents', 'SKILL.md'),
      'utf8',
    );
    const anchor = content.indexOf(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
    );

    expect(anchor).toBeGreaterThan(-1);
    expect(content).toMatch(
      /short-form paths below are relative to those two already-bound\s+roots/,
    );
    // Short-form follow-on reads must come after the anchoring bound read.
    for (const shortForm of [
      'subagent-orchestration/references/provider-claude.md',
      'subagent-orchestration/references/provider-codex.md',
      'subagent-orchestration/references/provider-cursor.md',
      'subagent-orchestration/references/evidence-and-refresh.md',
    ]) {
      expect(content.indexOf(shortForm), shortForm).toBeGreaterThan(anchor);
    }
  });

  it('resolves shared tracking scripts from each loaded skill scope', () => {
    const consumers: string[] = [];
    const bareReferences: string[] = [];

    for (const skill of listSkillDirs()) {
      const skillFile = join(SKILLS_DIR, skill, 'SKILL.md');
      const content = readFileSync(skillFile, 'utf8');
      if (!content.includes('resolve-tracking.sh')) continue;
      consumers.push(skill);
      if (
        content.includes('TRACKING_SCRIPT=".oat/scripts/resolve-tracking.sh"')
      ) {
        bareReferences.push(skill);
      }
      const loadedSkillDir =
        skill === 'oat-agent-instructions-apply'
          ? 'APPLY_SKILL_DIR'
          : 'SKILL_DIR';
      expect(content, skill).toContain(
        `SCOPE_ROOT="$(cd "$${loadedSkillDir}/../../.." && pwd)"`,
      );
      expect(content, skill).toContain(
        'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"',
      );
    }

    expect(consumers).toEqual(
      expect.arrayContaining([
        'oat-docs-analyze',
        'oat-docs-apply',
        'oat-agent-instructions-analyze',
        'oat-agent-instructions-apply',
        'oat-repo-knowledge-index',
      ]),
    );
    expect(bareReferences).toEqual([]);
  });

  // ── Skill-to-script reference integrity ───────────────────────────────
  //
  // The case above is a shell-shape check on one known script: it proves the
  // consumers resolve `resolve-tracking.sh` from the loaded skill's scope root
  // rather than the process cwd, and it never consults the manifest. The cases
  // below supply the missing half generally — every shipped skill, every script
  // it names, checked against what its own pack actually installs — so a new
  // skill naming a script its pack does not ship fails without anyone
  // remembering to add a bespoke case for it.

  it("every shipped skill's script references exist in its owning pack", () => {
    // Driven by the manifest, not by `listSkillDirs()`: the canonical tree is a
    // superset that also holds skills no pack ships, and resolving one of those
    // to an owning pack would fail on the live tree instead of on a defect.
    const sources = listShippedSkills().flatMap(collectSkillScriptSources);

    // A file that names no script is skipped explicitly. Silence is the normal
    // case for most shipped skills and is never an error.
    const referencing = sources.filter(
      ({ text }) => extractScriptReferences(text).length > 0,
    );

    expect(
      findUnshippedScriptReferences(referencing).map(
        formatScriptReferenceViolation,
      ),
      'a shipped skill names a script its own pack does not install',
    ).toEqual([]);

    // A check with nothing to check would pass forever. Pin the known live
    // consumers so an extractor that silently stops matching is itself a
    // failure. `arrayContaining` keeps a new, correct consumer from failing
    // this case; the contract above still covers it.
    expect([...new Set(referencing.map(({ skill }) => skill))].sort()).toEqual(
      expect.arrayContaining([
        'oat-agent-instructions-analyze',
        'oat-agent-instructions-apply',
        'oat-docs-analyze',
        'oat-docs-apply',
        'oat-repo-knowledge-index',
      ]),
    );
  });

  it('classifies every canonical skill directory as shipped or canonical-unshipped', () => {
    const dirs = listSkillDirs();
    const { shipped, canonicalUnshipped } = classifyCanonicalSkillDirs(dirs);

    expect(
      [...shipped, ...canonicalUnshipped].sort(),
      `every canonical skill directory must classify; canonical-unshipped: ${canonicalUnshipped.join(', ') || 'none'}`,
    ).toEqual([...dirs].sort());

    // The asymmetry is deliberate. An unshipped directory is ordinary; a
    // manifest entry with no canonical directory is a broken promise to install
    // something that does not exist.
    expect(
      findMissingShippedSkillDirs(dirs),
      'the manifest ships a skill with no canonical directory',
    ).toEqual([]);
  });

  it.each(CANONICAL_UNSHIPPED_SKILL_DIRS)(
    'reports canonical-unshipped skill directory %s without resolving it to a pack',
    (name) => {
      expect(classifyCanonicalSkillDir(name)).toBe('canonical-unshipped');
      // Reported, never failed — even when it carries script references, which
      // no pack manifest can adjudicate.
      expect(() => resolveOwningPack(name)).toThrow(/shipped by no pack/);
    },
  );

  it('reports the skill, reference, and pack when a live reference leaves its pack', () => {
    // The mutation proof runs the live skill's own Markdown against a manifest
    // fixture in which the referenced script has been renamed out from under
    // it. Same content, one changed fact, so a green result on the real
    // manifest cannot be an artifact of the extractor matching nothing.
    const consumer = 'oat-docs-analyze';
    const sources = collectSkillScriptSources(consumer).filter(
      ({ text }) => extractScriptReferences(text).length > 0,
    );
    expect(sources.length).toBeGreaterThan(0);

    const bothScopes = ['project', 'user'] as const;
    const managed = { project: 'managed', user: 'managed' } as const;
    const manifestFixture: readonly PackDefinition[] = [
      {
        name: 'docs',
        allowedScopes: bothScopes,
        defaultScope: 'user',
        assets: [
          {
            id: `skill:${consumer}`,
            kind: 'skill',
            source: `skills/${consumer}`,
            destination: `.agents/skills/${consumer}`,
            scopes: bothScopes,
            ownership: managed,
          },
          {
            id: 'script:resolve-tracking-v2.sh',
            kind: 'script',
            source: 'scripts/resolve-tracking-v2.sh',
            destination: '.oat/scripts/resolve-tracking-v2.sh',
            scopes: bothScopes,
            ownership: managed,
            executable: true,
          },
        ],
      },
    ];

    const violations = findUnshippedScriptReferences(sources, manifestFixture);

    expect(violations.length).toBeGreaterThan(0);
    // The line number is left unpinned so ordinary edits to the skill do not
    // break the proof; skill, reference, and owning pack are all pinned.
    expect(formatScriptReferenceViolation(violations[0]!)).toMatch(
      new RegExp(
        `^${consumer} \\(pack docs\\) references \\.oat/scripts/resolve-tracking\\.sh at \\.agents/skills/${consumer}/SKILL\\.md:\\d+, but pack docs ships \\.oat/scripts/resolve-tracking-v2\\.sh$`,
      ),
    );

    // The same sources are clean against the real manifest.
    expect(findUnshippedScriptReferences(sources)).toEqual([]);
  });

  it('resolves only exact canonical agent targets across provider layouts', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-provider-root-'));
    const userScope = join(fixtureRoot, 'user');
    const projectScope = join(fixtureRoot, 'project');
    const canonicalName = 'oat-reviewer';
    const canonicalRelative = join('agents', `${canonicalName}.md`);

    try {
      const userCanonical = join(userScope, '.agents', canonicalRelative);
      const projectCanonical = join(projectScope, '.agents', canonicalRelative);
      const canonicalSkillDir = join(
        userScope,
        '.agents',
        'skills',
        'consumer',
      );
      const claudeSkillDir = join(userScope, '.claude', 'skills', 'consumer');
      const claudeAgent = join(userScope, '.claude', canonicalRelative);
      const cursorSkillDir = join(userScope, '.cursor', 'skills', 'consumer');
      const cursorAgent = join(userScope, '.cursor', canonicalRelative);

      mkdirSync(join(userCanonical, '..'), { recursive: true });
      mkdirSync(join(projectCanonical, '..'), { recursive: true });
      mkdirSync(canonicalSkillDir, { recursive: true });
      mkdirSync(join(claudeSkillDir, '..'), { recursive: true });
      mkdirSync(join(claudeAgent, '..'), { recursive: true });
      mkdirSync(cursorSkillDir, { recursive: true });
      mkdirSync(join(cursorAgent, '..'), { recursive: true });
      writeFileSync(userCanonical, canonicalRoleFixture(canonicalName));
      writeFileSync(projectCanonical, canonicalRoleFixture(canonicalName));
      symlinkSync(canonicalSkillDir, claudeSkillDir, 'dir');
      symlinkSync(userCanonical, claudeAgent);
      symlinkSync(userCanonical, cursorAgent);

      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: claudeSkillDir,
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          selectedPath: '<loaded>/agents/oat-reviewer.md',
          canonicalPath: '<user>/agents/oat-reviewer.md',
          validation: 'exact-canonical-symlink',
        }),
      );

      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          selectedPath: '<loaded>/agents/oat-reviewer.md',
          canonicalPath: '<user>/agents/oat-reviewer.md',
          validation: 'exact-canonical-symlink',
        }),
      );

      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: realpathSync(claudeSkillDir),
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          selectedPath: '<loaded>/agents/oat-reviewer.md',
          // The canonical file is the user root, so it is labelled `<user>`
          // even though it was selected through the loaded tier. Roots are
          // compared by resolved path, so this holds whether or not the
          // caller passed a realpath'd `skillDir`, and on platforms where a
          // tmpdir realpaths to a different prefix.
          canonicalPath: '<user>/agents/oat-reviewer.md',
          validation: 'direct-canonical',
        }),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('continues past copies, variants, TOML, and unsafe loaded targets', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-misses-'));
    const canonicalName = 'oat-reviewer';

    try {
      const userCanonicalRoot = join(fixtureRoot, 'user', '.agents');
      const projectCanonicalRoot = join(fixtureRoot, 'project', '.agents');
      const cursorRoot = join(fixtureRoot, 'loaded', '.cursor');
      const cursorSkillDir = join(cursorRoot, 'skills', 'consumer');
      const cursorAgentDir = join(cursorRoot, 'agents');
      const userCanonical = join(
        userCanonicalRoot,
        'agents',
        `${canonicalName}.md`,
      );

      mkdirSync(cursorSkillDir, { recursive: true });
      mkdirSync(cursorAgentDir, { recursive: true });
      mkdirSync(join(userCanonical, '..'), { recursive: true });
      writeFileSync(userCanonical, canonicalRoleFixture(canonicalName));
      writeFileSync(
        join(cursorAgentDir, `${canonicalName}.md`),
        '# Canonical bytes\n',
      );
      writeFileSync(
        join(cursorAgentDir, `${canonicalName}-gpt-5-6-sol-medium.md`),
        '# Variant\n',
      );
      mkdirSync(join(cursorRoot, '..', '.codex', 'agents'), {
        recursive: true,
      });
      writeFileSync(
        join(cursorRoot, '..', '.codex', 'agents', `${canonicalName}.toml`),
        'developer_instructions = "transformed"\n',
      );

      const copyMiss = resolveCanonicalRole({
        dependency: 'workflows',
        canonicalRole: canonicalName,
        skillDir: cursorSkillDir,
        userCanonicalRoot,
        projectCanonicalRoot,
      });
      expect(copyMiss).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'user' }),
      );
      expect(copyMiss.candidateMisses).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'noncanonical-copy',
        }),
      ]);

      const codexRoot = join(fixtureRoot, 'codex', '.codex');
      const codexSkillDir = join(codexRoot, 'skills', 'consumer');
      const codexAgentDir = join(codexRoot, 'agents');
      mkdirSync(codexSkillDir, { recursive: true });
      mkdirSync(codexAgentDir, { recursive: true });
      writeFileSync(
        join(codexAgentDir, `${canonicalName}.md`),
        '# Transformed Markdown copy\n',
      );
      writeFileSync(
        join(codexAgentDir, `${canonicalName}.toml`),
        'developer_instructions = "transformed"\n',
      );
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: codexSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).candidateMisses,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'noncanonical-copy',
        }),
      ]);
      rmSync(join(codexAgentDir, `${canonicalName}.md`));
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: codexSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).candidateMisses,
      ).toEqual([
        expect.objectContaining({ tier: 'loaded', outcome: 'missing' }),
      ]);

      rmSync(join(cursorAgentDir, `${canonicalName}.md`));
      symlinkSync(
        join(fixtureRoot, 'outside.md'),
        join(cursorAgentDir, `${canonicalName}.md`),
      );
      writeFileSync(join(fixtureRoot, 'outside.md'), '# Outside\n');
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).candidateMisses,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'escaping-symlink',
        }),
      ]);

      rmSync(join(cursorAgentDir, `${canonicalName}.md`));
      symlinkSync(
        join(fixtureRoot, 'missing.md'),
        join(cursorAgentDir, `${canonicalName}.md`),
      );
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).candidateMisses,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'broken-symlink',
        }),
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('uses loaded then user then project and fails closed per dependency', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-order-'));

    try {
      const loadedRoot = join(fixtureRoot, 'loaded', '.agents');
      const skillDir = join(loadedRoot, 'skills', 'consumer');
      const userCanonicalRoot = join(fixtureRoot, 'user', '.agents');
      const projectCanonicalRoot = join(fixtureRoot, 'project', '.agents');
      mkdirSync(skillDir, { recursive: true });

      const writeAgent = (root: string, name: string): string => {
        const file = join(root, 'agents', `${name}.md`);
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, canonicalRoleFixture(name));
        return file;
      };

      writeAgent(userCanonicalRoot, 'oat-reviewer');
      writeAgent(projectCanonicalRoot, 'oat-reviewer');
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: 'oat-reviewer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(expect.objectContaining({ status: 'resolved', tier: 'user' }));

      writeAgent(loadedRoot, 'oat-reviewer');
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: 'oat-reviewer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'loaded' }),
      );

      const missing = resolveCanonicalRole({
        dependency: 'research',
        canonicalRole: 'skeptical-evaluator',
        skillDir,
        userCanonicalRoot,
        projectCanonicalRoot,
      });
      expect(missing).toEqual(
        expect.objectContaining({
          status: 'missing',
          dependency: 'research',
          recovery: [
            {
              command: 'oat tools install research --scope <user|project>',
            },
            {
              command:
                'oat tools update --pack research --scope <user|project>',
            },
          ],
        }),
      );
      expect(missing.candidateMisses.map(({ tier }) => tier)).toEqual([
        'loaded',
        'user',
        'project',
      ]);

      writeAgent(projectCanonicalRoot, 'skeptical-evaluator');
      expect(
        resolveCanonicalRole({
          dependency: 'research',
          canonicalRole: 'skeptical-evaluator',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'project' }),
      );
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: 'oat-phase-implementer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).status,
      ).toBe('missing');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
