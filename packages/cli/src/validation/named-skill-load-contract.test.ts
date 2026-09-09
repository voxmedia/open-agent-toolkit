import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * Named-skill execution contract for canonical OAT project lifecycle skills.
 *
 * Bounded surface: `.agents/skills/oat-project-*\/SKILL.md`, their direct
 * `references/*.md`, and `.agents/skills/create-oat-skill/SKILL.md`.
 *
 * Candidate definition: a prose sentence (outside fenced code blocks) that
 * contains an execution verb followed, in the same sentence, by a named
 * `oat-project-*` skill. Fenced blocks are literal commands and printed output
 * templates, not orchestrator directives, so they are outside the candidate
 * definition.
 *
 * The suite has two halves:
 *
 * 1. Discovery — every candidate must be classified by a row below. A newly
 *    added bare pointer fails with its file, anchor, and sentence.
 * 2. Matrix — every `load-required` and `explicit-fallback` row must still
 *    carry its clause, and every row must still bind to a live call site, so
 *    deleting a clause or a pointer fails too.
 */

type Classification = 'load-required' | 'explicit-fallback' | 'non-executing';

interface CallSiteRow {
  /** Repository-relative markdown file. */
  file: string;
  /** Nearest preceding markdown heading text (stable semantic anchor). */
  anchor: string;
  /**
   * Distinctive substring of the candidate sentence this row classifies.
   * Omitted for anchor-only contract rows that assert a clause without binding
   * to a candidate sentence.
   */
  match?: string;
  classification: Classification;
  /**
   * Every `oat-project-*` skill this row accounts for. A candidate that names a
   * skill outside its matched rows' union is unclassified, so a pointer to a
   * *different* skill appended to an already-classified sentence cannot inherit
   * its exemption.
   *
   * Known residual: a second pointer to a skill the row already declares, added
   * inside that same sentence, is still absorbed — `skillsIn` de-duplicates, so
   * the declared set is unchanged. The offending prose would have to both
   * mandate loading X and direct running X from memory in one sentence. The
   * behaviour is pinned by 'absorbs a repeated pointer to a skill the row
   * already declares' below; change it deliberately, not by accident.
   */
  skills: string[];
  /** Substrings that must be present for the row to be satisfied. */
  requires?: string[];
  /** Where `requires` must appear. Defaults to the candidate's own block. */
  scope?: 'block' | 'section';
  /** Why an exempt row needs no load clause. */
  reason?: string;
}

interface Candidate {
  file: string;
  anchor: string;
  line: number;
  sentence: string;
  block: string;
}

const EXECUTION_VERB =
  /\b(load|loads|loaded|loading|delegate|delegates|delegated|delegating|chain|chains|chained|chaining|invoke|invokes|invoked|invoking|dispatch|dispatches|dispatched|dispatching|route|routes|routed|routing|run|runs|ran|running|follow|follows|followed|following|use|uses|used|using|apply|applies|applied|applying|execute|executes|executed|executing|call|calls|called|calling|perform|performs|performed|performing)\b/i;
const SKILL_NAME = /oat-project-[a-z0-9]+(?:-[a-z0-9]+)*/;
const SKILL_NAME_GLOBAL = new RegExp(SKILL_NAME.source, 'g');

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function contains(haystack: string, needle: string): boolean {
  return normalize(haystack)
    .toLowerCase()
    .includes(normalize(needle).toLowerCase());
}

interface Block {
  text: string;
  line: number;
  anchor: string;
}

type WalkedLine =
  | { kind: 'heading'; heading: string; line: number }
  | { kind: 'fence'; line: number }
  | { kind: 'blank'; text: string; line: number }
  | { kind: 'text'; text: string; line: number };

/**
 * Single fence-aware line walk over a markdown file. Fenced content is dropped,
 * so a `#` comment inside a fenced block is never mistaken for a heading.
 *
 * An opening fence is emitted as a `fence` boundary rather than swallowed:
 * a fenced block terminates the prose block before it, so prose on either side
 * of a fence never merges into one block. Without that boundary a block-scoped
 * `requires` could be satisfied by a clause on the far side of a fence.
 */
function walkMarkdown(content: string): WalkedLine[] {
  const lines = content.split(/\r?\n/);
  const walked: WalkedLine[] = [];
  let fence: string | null = null;

  for (const [index, line] of lines.entries()) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        fence = marker;
        walked.push({ kind: 'fence', line: index + 1 });
        continue;
      }
      if (
        marker[0] === fence[0] &&
        marker.length >= fence.length &&
        line.trim() === marker
      ) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;
    if (/^#{1,6}\s/.test(line)) {
      walked.push({
        kind: 'heading',
        heading: line.replace(/^#{1,6}\s+/, '').trim(),
        line: index + 1,
      });
      continue;
    }
    walked.push({
      kind: line.trim() === '' ? 'blank' : 'text',
      text: line,
      line: index + 1,
    });
  }

  return walked;
}

/** Splits markdown prose into blank-line separated blocks, skipping fenced code. */
function collectProseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let bufferLine = 0;
  let anchor = '(preamble)';

  const flush = (): void => {
    if (buffer.length === 0) return;
    const text = normalize(buffer.join(' '));
    if (text) blocks.push({ text, line: bufferLine, anchor });
    buffer = [];
  };

  for (const walked of walkMarkdown(content)) {
    if (walked.kind === 'heading') {
      flush();
      anchor = walked.heading;
      continue;
    }
    if (walked.kind === 'blank' || walked.kind === 'fence') {
      flush();
      continue;
    }
    if (buffer.length === 0) bufferLine = walked.line;
    buffer.push(walked.text.replace(/^\s*(?:[-*+]|\d+\.|>)\s+/, '').trim());
  }
  flush();

  return blocks;
}

/**
 * Section text keyed by heading, used by `scope: 'section'` rows.
 *
 * Shares `collectProseBlocks`'s fence-aware line walk: a `#` shell comment
 * inside a fenced block is not a heading, so a section is never truncated at an
 * in-fence comment.
 */
function collectSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  let anchor = '(preamble)';
  let buffer: string[] = [];

  const flush = (): void => {
    const existing = sections.get(anchor) ?? '';
    sections.set(anchor, normalize(`${existing} ${buffer.join(' ')}`));
    buffer = [];
  };

  for (const line of walkMarkdown(content)) {
    if (line.kind === 'heading') {
      flush();
      anchor = line.heading;
      continue;
    }
    if (line.kind === 'fence') continue;
    buffer.push(line.text);
  }
  flush();

  return sections;
}

interface FenceDefect {
  file: string;
  line: number;
  span: number;
  detail: string;
}

/**
 * Fence hygiene over the fence-scan inventory.
 *
 * A stray fence silently removes an arbitrary span of directives from this
 * scanner, so the defect class this contract was written to catch could hide
 * itself. Three shapes fail here:
 *
 * 1. an unclosed fence at end of file;
 * 2. an "orphan" fence — a bare fence marker (no info string) opening
 *    immediately after a closing fence with only blank lines between them, and
 *    swallowing at least one `##`-or-deeper heading. That is the
 *    duplicated-closer shape found in `oat-project-plan`,
 *    `oat-project-review-receive`, and `oat-project-revise`; and
 * 3. an "after-prose" fence — a bare fence marker whose *first non-blank body
 *    line* is a `##`-or-deeper heading. Shape 2 structurally cannot see this
 *    one: its `gap` test requires the bare fence to open immediately after a
 *    *closing* fence with only blank lines between them, so a bare fence that
 *    opens after ordinary prose never reaches the heading condition.
 *
 * Shape 3 is `||`-joined to shape 2 rather than folded into it. Shape 2's
 * blank-gap term is preserved verbatim so nothing it rejects today becomes
 * acceptable, and shape 3 deliberately carries no gap term at all, because
 * opening after prose is exactly shape 2's blind spot.
 *
 * Why the first-body-line test and not a fence-length test: the source item
 * proposed "a bare fence of length >= 4 that swallows a heading". Measured over
 * every regular markdown file under `.agents/skills`, that discriminator is
 * wrong in both directions. It misses the two three-backtick defects
 * (`create-agnostic-skill/references/skill-template.md` and
 * `oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`),
 * and it falsely reports the three legitimate bare four-backtick agent-prompt
 * blocks in `.agents/skills/oat-repo-knowledge-index/SKILL.md` at `:373`,
 * `:424`, and `:475`, whose bodies open on `subagent_type: "Explore"` and
 * legitimately contain `## Include frontmatter:`. The first-body-line rule
 * separates the corpus exactly, and it also spares the two legitimate printed
 * console templates whose bodies open on a `━━━` rule:
 * `.agents/skills/oat-doctor/SKILL.md:231` and
 * `.agents/skills/oat-project-document/SKILL.md:434`. Fixture cases below pin
 * all three of those sparings, so a future maintainer cannot re-adopt the
 * length discriminator without going red.
 *
 * The inventory this runs over is `collectFenceScanFiles`, not
 * `collectBoundedFiles`: four of the five live defects sat in files the
 * bounded candidate corpus never reads.
 */
function findFenceDefects(file: string, content: string): FenceDefect[] {
  const lines = content.split(/\r?\n/);
  const defects: FenceDefect[] = [];
  const closed: { open: number; close: number }[] = [];
  let fence: string | null = null;
  let openLine = 0;
  let info = '';
  let body: string[] = [];

  for (const [index, raw] of lines.entries()) {
    const fenceMatch = raw.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        fence = marker;
        openLine = index + 1;
        info = fenceMatch[2].trim();
        body = [];
        continue;
      }
      if (
        marker[0] === fence[0] &&
        marker.length >= fence.length &&
        raw.trim() === marker
      ) {
        const previous = closed.at(-1);
        const gap =
          previous === undefined
            ? null
            : lines.slice(previous.close, openLine - 1);
        const orphan =
          info === '' &&
          gap !== null &&
          gap.every((line) => line.trim() === '') &&
          body.some((line) => /^#{2,6}\s/.test(line));
        const afterProse =
          info === '' &&
          /^#{2,6}\s/.test(body.find((line) => line.trim() !== '') ?? '');
        if (orphan || afterProse) {
          defects.push({
            file,
            line: openLine,
            span: index + 1 - openLine,
            detail: orphan
              ? 'bare fence opens immediately after a closing fence and swallows a heading; likely a duplicated closing fence'
              : 'bare fence opens directly onto a heading; likely a closing fence read as an opener',
          });
        }
        closed.push({ open: openLine, close: index + 1 });
        fence = null;
        body = [];
      }
      continue;
    }
    if (fence !== null) body.push(raw);
  }

  if (fence !== null) {
    defects.push({
      file,
      line: openLine,
      span: lines.length - openLine,
      detail: 'fence is never closed',
    });
  }

  return defects;
}

function splitSentences(block: string): string[] {
  return block.split(/(?<=[.!?:])\s+(?=[A-Z`*_[(]|\d)/);
}

function candidatesInBlock(block: Block, file: string): Candidate[] {
  const found: Candidate[] = [];
  for (const sentence of splitSentences(block.text)) {
    if (!SKILL_NAME.test(sentence)) continue;
    // A verb spelled inside a skill identifier (`oat-project-dispatch-subagents`)
    // is part of a name, not a directive, so strip identifiers before the check.
    if (!EXECUTION_VERB.test(sentence.replace(/oat-[a-z0-9-]+/g, ' ')))
      continue;
    found.push({
      file,
      anchor: block.anchor,
      line: block.line,
      sentence,
      block: block.text,
    });
  }
  return found;
}

async function collectBoundedFiles(repoRoot: string): Promise<string[]> {
  const skillsRoot = join(repoRoot, '.agents', 'skills');
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries
    .filter((candidate) => candidate.name.startsWith('oat-project-'))
    .map((candidate) => candidate.name)
    .sort()) {
    files.push(`.agents/skills/${entry}/SKILL.md`);
    let references: string[] = [];
    try {
      references = await readdir(join(skillsRoot, entry, 'references'));
    } catch {
      references = [];
    }
    for (const reference of references
      .filter((name) => name.endsWith('.md'))
      .sort()) {
      files.push(`.agents/skills/${entry}/references/${reference}`);
    }
  }

  files.push('.agents/skills/create-oat-skill/SKILL.md');

  const present: string[] = [];
  for (const file of files) {
    try {
      await readFile(join(repoRoot, file), 'utf8');
      present.push(file);
    } catch {
      // A bounded skill without a SKILL.md is covered by the structural validator.
    }
  }
  return present;
}

/**
 * Fence-scan inventory: every regular markdown file under `.agents/skills`.
 *
 * Deliberately wider than `collectBoundedFiles`, and separate from it. A stray
 * fence deletes an arbitrary span from whatever file it lands in, so confining
 * the fence scan to the candidate corpus let this defect class hide in an
 * unscanned directory — four of the five live instances sat outside the
 * bounded corpus. The candidate sweep stays exactly as bounded as it is today;
 * widening it is a separate, larger outcome (measured at 33 new unclassified
 * candidates needing 33 classified rows).
 *
 * Recursion is required: `glob-scoped-rule.md` sits at
 * `oat-agent-instructions-apply/references/instruction-file-templates/`, two
 * levels below `references/`.
 *
 * Both `Dirent` predicates are false for a symlink, so the eleven symlinked
 * markdown files and the one symlinked directory under `.agents/skills` are
 * skipped rather than followed. That is deliberate, and it means two different
 * things for the two kinds of link. The symlinked directory
 * (`oat-agent-instructions-apply/references/docs`) points at a sibling skill's
 * real directory inside `.agents/skills`, so its files are still scanned where
 * they live. The eleven file links all point into `.agents/docs/`, which is
 * outside this inventory and is not scanned at all — those eight targets are
 * fence-clean and are explicitly out of scope. Skipping links keeps each file
 * scanned at most once and keeps the reported path stable.
 */
async function collectFenceScanFiles(repoRoot: string): Promise<string[]> {
  const files: string[] = [];

  const walk = async (relativeDir: string): Promise<void> => {
    // Deliberately unguarded. Swallowing a `readdir` failure would let an
    // unreadable or vanished directory shrink the inventory silently, and the
    // floor only catches a shrinkage larger than its headroom — up to 25 files
    // could disappear while this stayed green. A scan that cannot read part of
    // its surface must fail loudly, not scan less. The only `readdir` here that
    // can fail on a missing path is the `.agents/skills` root, because every
    // deeper call is made against an entry `readdir` already reported as a
    // directory. `collectBoundedFiles` treats its skills root the same way.
    const entries = await readdir(join(repoRoot, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const child = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(child);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(child);
    }
  };

  await walk('.agents/skills');
  return files.sort();
}

interface ScanResult {
  files: string[];
  fenceScanFiles: string[];
  candidates: Candidate[];
  sections: Map<string, Map<string, string>>;
  fenceDefects: FenceDefect[];
}

async function scanBoundedSurface(repoRoot: string): Promise<ScanResult> {
  const files = await collectBoundedFiles(repoRoot);
  const candidates: Candidate[] = [];
  const sections = new Map<string, Map<string, string>>();

  for (const file of files) {
    const content = await readFile(join(repoRoot, file), 'utf8');
    sections.set(file, collectSections(content));
    for (const block of collectProseBlocks(content)) {
      candidates.push(...candidatesInBlock(block, file));
    }
  }

  const fenceScanFiles = await collectFenceScanFiles(repoRoot);
  const fenceDefects: FenceDefect[] = [];
  for (const file of fenceScanFiles) {
    const content = await readFile(join(repoRoot, file), 'utf8');
    fenceDefects.push(...findFenceDefects(file, content));
  }

  return { files, fenceScanFiles, candidates, sections, fenceDefects };
}

function rowMatches(row: CallSiteRow, candidate: Candidate): boolean {
  return (
    row.match !== undefined &&
    row.file === candidate.file &&
    row.anchor === candidate.anchor &&
    contains(candidate.sentence, row.match)
  );
}

interface ContractReport {
  unclassified: Candidate[];
  deadRows: CallSiteRow[];
  overMatchedRows: string[];
  missingClauses: string[];
  malformedRows: string[];
  fenceDefects: FenceDefect[];
  corpusShortfalls: string[];
}

function skillsIn(sentence: string): string[] {
  return [...new Set(sentence.match(SKILL_NAME_GLOBAL) ?? [])].sort();
}

function validateRowShape(row: CallSiteRow): string[] {
  const id = `${row.file} [${row.anchor}]${row.match ? ` match="${row.match}"` : ' (anchor row)'}`;
  const problems: string[] = [];
  if (row.classification === 'non-executing') {
    if (!row.reason) {
      problems.push(`${id} is non-executing but records no exemption reason`);
    }
  } else if (!row.requires || row.requires.length === 0) {
    problems.push(
      `${id} is ${row.classification} but declares no required clause`,
    );
  }
  if (row.match === undefined && (!row.requires || row.requires.length === 0)) {
    problems.push(`${id} is an anchor row with no required clause`);
  }
  return problems;
}

interface CorpusMinimums {
  files: number;
  fenceScanFiles: number;
  candidates: number;
}

/**
 * A glob or path regression that empties the corpus would otherwise surface
 * only indirectly, as dead rows. Fail on the shrinkage itself.
 */
function corpusShortfalls(
  files: readonly string[],
  fenceScanFiles: readonly string[],
  candidates: readonly Candidate[],
  minimums: CorpusMinimums,
): string[] {
  const shortfalls: string[] = [];
  if (files.length < minimums.files) {
    shortfalls.push(
      `bounded surface shrank to ${files.length} files (floor ${minimums.files})`,
    );
  }
  if (fenceScanFiles.length < minimums.fenceScanFiles) {
    shortfalls.push(
      `fence-scan inventory shrank to ${fenceScanFiles.length} files (floor ${minimums.fenceScanFiles})`,
    );
  }
  if (candidates.length < minimums.candidates) {
    shortfalls.push(
      `candidate sweep shrank to ${candidates.length} sentences (floor ${minimums.candidates})`,
    );
  }
  return shortfalls;
}

async function inspectContract(
  repoRoot: string,
  matrix: readonly CallSiteRow[],
  minimums: CorpusMinimums = { files: 0, fenceScanFiles: 0, candidates: 0 },
): Promise<ContractReport> {
  const { files, fenceScanFiles, candidates, sections, fenceDefects } =
    await scanBoundedSurface(repoRoot);

  const unclassified = candidates.filter((candidate) => {
    const matched = matrix.filter((row) => rowMatches(row, candidate));
    if (matched.length === 0) return true;
    const covered = new Set(matched.flatMap((row) => row.skills));
    return skillsIn(candidate.sentence).some((skill) => !covered.has(skill));
  });

  const deadRows = matrix.filter((row) => {
    if (row.match === undefined) {
      // Anchor rows bind to a heading rather than a sentence; a vanished or
      // renamed heading must fail exactly like a vanished pointer.
      return !sections.get(row.file)?.get(row.anchor);
    }
    return !candidates.some((candidate) => rowMatches(row, candidate));
  });

  // Enumerated, not pattern-wide: a `match` is a handle on exactly one
  // enumerated sentence. A row that starts matching a second sentence has been
  // widened into a pattern, so a new directive could be absorbed by an existing
  // exemption. That is as much a defect as a dead row.
  const overMatchedRows = matrix.flatMap((row) => {
    if (row.match === undefined) return [];
    const bound = candidates.filter((candidate) => rowMatches(row, candidate));
    if (bound.length <= 1) return [];
    const sentences = bound
      .map((candidate) => `      L${candidate.line}: ${candidate.sentence}`)
      .join('\n');
    return [
      `${row.file} [${row.anchor}] match="${row.match}" now matches ${bound.length} sentences:\n${sentences}`,
    ];
  });

  const malformedRows = matrix.flatMap(validateRowShape);

  const missingClauses: string[] = [];
  for (const row of matrix) {
    if (!row.requires || row.requires.length === 0) continue;
    const useSection = row.scope === 'section' || row.match === undefined;
    const haystacks = useSection
      ? [sections.get(row.file)?.get(row.anchor) ?? '']
      : candidates
          .filter((candidate) => rowMatches(row, candidate))
          .map((candidate) => candidate.block);
    for (const required of row.requires) {
      // Every matched call site must carry the clause, not merely one of them.
      if (
        haystacks.length === 0 ||
        !haystacks.every((haystack) => contains(haystack, required))
      ) {
        missingClauses.push(
          `${row.file} [${row.anchor}] is missing its ${row.classification} clause: "${required}"`,
        );
      }
    }
  }

  return {
    unclassified,
    deadRows,
    overMatchedRows,
    missingClauses,
    malformedRows,
    fenceDefects,
    corpusShortfalls: corpusShortfalls(
      files,
      fenceScanFiles,
      candidates,
      minimums,
    ),
  };
}

function formatReport(report: ContractReport): string {
  const lines: string[] = [];
  if (report.unclassified.length > 0) {
    lines.push(
      'Unclassified named-skill execution candidates (add a row to CALL_SITE_MATRIX):',
    );
    for (const candidate of report.unclassified) {
      const skills = [
        ...new Set(candidate.sentence.match(SKILL_NAME_GLOBAL) ?? []),
      ];
      lines.push(
        `  ${candidate.file}:${candidate.line} [${candidate.anchor}] -> ${skills.join(', ')}`,
      );
      lines.push(`    ${candidate.sentence}`);
    }
  }
  if (report.malformedRows.length > 0) {
    lines.push('Malformed matrix rows:');
    for (const problem of report.malformedRows) lines.push(`  ${problem}`);
  }
  if (report.fenceDefects.length > 0) {
    lines.push(
      'Fenced-code defects under .agents/skills (a stray fence hides directives from this scanner):',
    );
    for (const defect of report.fenceDefects) {
      lines.push(
        `  ${defect.file}:${defect.line} (+${defect.span} lines) — ${defect.detail}`,
      );
    }
  }
  if (report.corpusShortfalls.length > 0) {
    lines.push('A scanned corpus shrank below its floor:');
    for (const shortfall of report.corpusShortfalls)
      lines.push(`  ${shortfall}`);
  }
  if (report.overMatchedRows.length > 0) {
    lines.push(
      'Matrix rows that match more than one sentence (exemptions must stay enumerated):',
    );
    for (const row of report.overMatchedRows) lines.push(`  ${row}`);
  }
  if (report.deadRows.length > 0) {
    lines.push('Matrix rows that no longer bind to a live call site:');
    for (const row of report.deadRows) {
      lines.push(`  ${row.file} [${row.anchor}] match="${row.match ?? ''}"`);
    }
  }
  if (report.missingClauses.length > 0) {
    lines.push('Execution boundaries missing their required clause:');
    for (const clause of report.missingClauses) {
      lines.push(`  ${clause}`);
    }
  }
  return lines.join('\n');
}

function reportIsClean(report: ContractReport): boolean {
  return (
    report.unclassified.length === 0 &&
    report.deadRows.length === 0 &&
    report.overMatchedRows.length === 0 &&
    report.missingClauses.length === 0 &&
    report.malformedRows.length === 0 &&
    report.fenceDefects.length === 0 &&
    report.corpusShortfalls.length === 0
  );
}

async function assertContractCurrent(
  repoRoot: string,
  matrix: readonly CallSiteRow[],
  minimums?: CorpusMinimums,
): Promise<void> {
  const report = await inspectContract(repoRoot, matrix, minimums);
  if (!reportIsClean(report)) {
    throw new Error(formatReport(report));
  }
}

const PLAN_WRITING_CONTRACT_CLAUSE =
  'load the current `oat-project-plan-writing/SKILL.md` and follow that contract as written';

const CALL_SITE_MATRIX: readonly CallSiteRow[] = [
  // ---------------------------------------------------------------------- lite
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Step 5: Resolve Dispatch Ceiling',
    match: 'Managed Dispatch Readiness and Review Contract',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Step 5: Resolve Dispatch Ceiling',
    match: 'follow that contract as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Invoke the complete **Managed Dispatch Readiness and Review Contract** from `oat-project-plan-writing`',
    ],
  },
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Step 5.5: Configure Lifecycle Gate Posture',
    match: 'At this boundary, load the current',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Step 6: Run Plan Artifact Review Loop',
    match:
      'Invoke the `Auto Artifact-Review Loop` from `oat-project-plan-writing`',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Step 6: Run Plan Artifact Review Loop',
    match: 'follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Invoke the `Auto Artifact-Review Loop` from `oat-project-plan-writing`',
    ],
  },
  {
    file: '.agents/skills/oat-project-lite/SKILL.md',
    anchor: 'Success Criteria',
    match: 'Completion state was committed separately and routes to',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Success-criteria checklist describing the terminal handoff; Step 8 owns the execution boundary.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'a passed final review routes directly to `oat-project-pr-final`',
    classification: 'non-executing',
    skills: ['oat-project-pr-final'],
    reason:
      'Lite routing rule inside the router table; Step 6 owns the invocation boundary.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Prerequisites',
    match: 'Lite planning is owned by `oat-project-lite`',
    classification: 'non-executing',
    skills: ['oat-project-lite'],
    reason:
      'Terminal handoff: this skill stops and tells the user which entry point owns lite planning.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 3: Collect Project Summary',
    match: 'do not invoke `oat-project-summary` for lite',
    classification: 'non-executing',
    skills: ['oat-project-summary'],
    reason: 'Negative directive: lite explicitly does not run the named skill.',
  },
  // ---------------------------------------------------------------- autonomous
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 0.5: Capability Detection and Tier Selection',
    match:
      'Before artifact writes, external side effects, tests, or long-running work',
    classification: 'load-required',
    skills: ['oat-project-dispatch-subagents'],
    requires: [
      'load the current `oat-project-dispatch-subagents/SKILL.md` and follow it',
    ],
  },
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 1: Detect the Persisted Entry State',
    match: 'Continue to Step 2, then invoke the selected creation skill',
    classification: 'non-executing',
    skills: [
      'oat-project-design',
      'oat-project-discover',
      'oat-project-implement',
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-plan',
      'oat-project-quick-start',
    ],
    reason:
      'Entry-state routing table; Step 2 and Step 5 own the execution boundaries.',
  },
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 2: Select Workflow Mode by Review Density',
    match: 'Invoke `oat-project-new` for spec-driven mode',
    classification: 'load-required',
    skills: ['oat-project-lite', 'oat-project-new', 'oat-project-quick-start'],
    requires: [
      "load the selected creation skill's current `SKILL.md` and follow it",
    ],
  },
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 5: Invoke Lifecycle Skills and Reviews',
    classification: 'load-required',
    skills: [],
    requires: [
      "Invoking a lifecycle skill means loading that skill's current `SKILL.md` and following it",
    ],
    reason: 'Anchor contract for the autonomous lifecycle chaining boundary.',
  },
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 5: Invoke Lifecycle Skills and Reviews',
    match: 'Resolve the route before launch',
    classification: 'load-required',
    skills: ['oat-project-dispatch-subagents'],
    requires: [
      'loading the current `oat-project-dispatch-subagents/SKILL.md`, following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: "Step 7: Complete Through Implement's Lifecycle Tail",
    match: 'keep invoking `oat-project-implement`',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'loading the current `oat-project-implement/SKILL.md` and following it on every resume',
    ],
  },
  {
    file: '.agents/skills/oat-project-autonomous/references/gate-inventory.md',
    anchor: 'Gate inventory',
    match: '| ID | Skill | Gate | Interactive behavior |',
    classification: 'non-executing',
    skills: [
      'oat-project-design',
      'oat-project-discover',
      'oat-project-implement',
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-new',
      'oat-project-plan',
      'oat-project-quick-start',
    ],
    reason: 'Gate inventory table header; an inventory, not a directive.',
  },
  {
    file: '.agents/skills/oat-project-autonomous/references/gate-inventory.md',
    anchor: 'Gate inventory',
    match: 'IMPLEMENT-14',
    classification: 'non-executing',
    skills: [
      'oat-project-complete',
      'oat-project-dispatch-subagents',
      'oat-project-document',
      'oat-project-implement',
      'oat-project-lite',
      'oat-project-pr-final',
      'oat-project-review-provide',
      'oat-project-review-receive',
      'oat-project-summary',
    ],
    reason: 'Gate inventory rows describing other skills’ gate behavior.',
  },
  {
    file: '.agents/skills/oat-project-autonomous/references/gate-inventory.md',
    anchor: 'HEAD prompt-site coverage',
    match: 'Stable prompt-site mappings',
    classification: 'non-executing',
    skills: [
      'oat-project-complete',
      'oat-project-design',
      'oat-project-discover',
      'oat-project-dispatch-subagents',
      'oat-project-document',
      'oat-project-implement',
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-new',
      'oat-project-plan',
      'oat-project-pr-final',
      'oat-project-quick-start',
      'oat-project-review-provide',
      'oat-project-review-receive',
      'oat-project-summary',
    ],
    reason: 'Prompt-site coverage table; evidence, not a directive.',
  },
  {
    file: '.agents/skills/oat-project-autonomous/references/gate-inventory.md',
    anchor: 'Prompt-scan comparison',
    match: 'inventory row` comparison',
    classification: 'non-executing',
    skills: [
      'oat-project-complete',
      'oat-project-design',
      'oat-project-discover',
      'oat-project-dispatch-subagents',
      'oat-project-document',
      'oat-project-implement',
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-new',
      'oat-project-plan',
      'oat-project-pr-final',
      'oat-project-quick-start',
      'oat-project-review-provide',
      'oat-project-review-receive',
      'oat-project-summary',
    ],
    reason: 'Prompt-scan comparison table; evidence, not a directive.',
  },

  // ------------------------------------------------------------------- capture
  {
    file: '.agents/skills/oat-project-capture/SKILL.md',
    anchor: 'When NOT to Use',
    match: 'use `oat-project-reconcile` instead',
    classification: 'non-executing',
    skills: [
      'oat-project-lite',
      'oat-project-new',
      'oat-project-quick-start',
      'oat-project-reconcile',
    ],
    reason:
      'When-NOT-to-Use guidance naming the correct entry points for the user.',
  },
  {
    file: '.agents/skills/oat-project-capture/SKILL.md',
    anchor: 'Step 8: Refresh Dashboard and Report',
    match: 'run a self-review before sharing',
    classification: 'non-executing',
    skills: [
      'oat-project-pr-final',
      'oat-project-reconcile',
      'oat-project-review-provide',
    ],
    reason: 'Next-step suggestions printed to the user.',
  },

  // ------------------------------------------------------------------ complete
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 2: Upfront User Questions (Batched)',
    match: 'Also preflight summary status using the same freshness rules',
    classification: 'load-required',
    skills: ['oat-project-summary'],
    requires: [
      'read from the current `oat-project-summary/SKILL.md` rather than a remembered version of that step',
    ],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: '3.3: Documentation Sync Status',
    match: 'ask user to run `oat-project-document` or explicitly skip',
    classification: 'non-executing',
    skills: ['oat-project-document'],
    reason: 'Gate asks the user to run the skill in their own turn.',
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 3.5: Summary Gate',
    match:
      'When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md`',
    classification: 'load-required',
    skills: ['oat-project-summary'],
    requires: [
      'When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md` and follow it',
      'never synthesize the summary from a remembered version of that skill',
    ],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 3.5: Summary Gate',
    match: 'generate or update `summary.md` inline',
    classification: 'explicit-fallback',
    skills: ['oat-project-summary'],
    requires: [
      'If direct skill invocation is unavailable',
      'following the same synthesis rules as `oat-project-summary`',
    ],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 3.5.5: Retro Safety-Net',
    match: 'dispatch `oat-project-retro` in generate',
    classification: 'load-required',
    skills: ['oat-project-retro'],
    requires: ['load the current `oat-project-retro/SKILL.md` and follow it'],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 3.7: Project Log Completion Gate',
    match:
      'load the current `oat-project-summary/SKILL.md` and follow it; only when skill loading is unavailable',
    classification: 'explicit-fallback',
    skills: ['oat-project-summary'],
    requires: [
      'load the current `oat-project-summary/SKILL.md` and follow it',
      'only when skill loading is unavailable in the current host/runtime, author a complete summary inline before continuing',
    ],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 7: Generate PR Description',
    match:
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5',
    classification: 'explicit-fallback',
    skills: ['oat-project-pr-final'],
    requires: [
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5 through 4 as the authoritative source for the templates and policies this step applies',
      "then execute completion's adapted mapping below instead of pr-final's own step sequence",
      "Apply only pr-final's templates and content policies; apply none of its gates, prompts, blocks, or state writes",
      'Step 5 has already run `oat project complete-state`, so blocking or re-deciding a gate here would strand a completed project mid-lifecycle',
      'When skill loading is unavailable in the current host/runtime, the mapping below is the explicit inline fallback',
    ],
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 7: Generate PR Description',
    match:
      '**Collect project summary** — if `summary.md` exists (from Step 3.5)',
    classification: 'explicit-fallback',
    skills: ['oat-project-pr-final'],
    scope: 'section',
    requires: [
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5 through 4 as the authoritative source',
      "Apply only pr-final's templates and content policies; apply none of its gates, prompts, blocks, or state writes",
    ],
    reason:
      "Adapted inline execution of pr-final Step 3.0, governed by Step 7's load-and-fallback clause.",
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 7: Generate PR Description',
    match: 'Use the **current/head branch** for the blob link',
    classification: 'explicit-fallback',
    skills: ['oat-project-pr-final'],
    scope: 'section',
    requires: [
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5 through 4 as the authoritative source',
      "Apply only pr-final's templates and content policies; apply none of its gates, prompts, blocks, or state writes",
    ],
    reason:
      "Adapted inline execution of pr-final Step 4's reference-link policy, governed by Step 7's load-and-fallback clause.",
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 7: Generate PR Description',
    match:
      'Apply the existing `localPaths`-based exclusion rule from `oat-project-pr-final` Step 4',
    classification: 'explicit-fallback',
    skills: ['oat-project-pr-final'],
    scope: 'section',
    requires: [
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5 through 4 as the authoritative source',
      "Apply only pr-final's templates and content policies; apply none of its gates, prompts, blocks, or state writes",
    ],
    reason:
      "Adapted inline execution of pr-final Step 4's local-path exclusion, governed by Step 7's load-and-fallback clause.",
  },
  {
    file: '.agents/skills/oat-project-complete/SKILL.md',
    anchor: 'Step 7: Generate PR Description',
    match:
      'following the template and policies from `oat-project-pr-final` Step 4',
    classification: 'explicit-fallback',
    skills: ['oat-project-pr-final'],
    scope: 'section',
    requires: [
      'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5 through 4 as the authoritative source',
      'When skill loading is unavailable in the current host/runtime, the mapping below is the explicit inline fallback',
    ],
    reason:
      "Adapted inline execution of pr-final Step 4, governed by Step 7's load-and-fallback clause.",
  },

  // -------------------------------------------------------------------- design
  {
    file: '.agents/skills/oat-project-design/SKILL.md',
    anchor: 'Prerequisites',
    match: 'If the user already ran `oat-project-spec` standalone',
    classification: 'non-executing',
    skills: ['oat-project-spec'],
    reason: 'Describes a prior user action, not a step to execute.',
  },
  {
    file: '.agents/skills/oat-project-design/SKILL.md',
    anchor: 'Step 1: Check Specification Complete',
    match: 'the user ran the standalone `oat-project-spec` skill first',
    classification: 'non-executing',
    skills: ['oat-project-spec'],
    reason: 'Parenthetical describing how the existing spec.md was produced.',
  },
  {
    file: '.agents/skills/oat-project-design/SKILL.md',
    anchor: 'Step 2: Requirements Confirmation (folded spec authoring)',
    match: 'ported from `oat-project-spec` Steps 6-16',
    classification: 'non-executing',
    skills: ['oat-project-spec'],
    reason:
      'Provenance note; the ported steps are reproduced in full in this skill and are followed from here.',
  },
  {
    file: '.agents/skills/oat-project-design/SKILL.md',
    anchor: 'Step 4a: Selective Review Pass',
    match:
      'Use `.agents/skills/oat-project-design/references/selective-review-pass.md`',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason:
      "Points at this skill's own reference file by path, not at another skill.",
  },
  {
    file: '.agents/skills/oat-project-design/references/selective-review-pass.md',
    anchor: 'Selective Review Pass',
    match: 'This reference defines the prose-driven classification pass',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason: 'Self-describing reference header.',
  },
  {
    file: '.agents/skills/oat-project-design/references/selective-review-pass.md',
    anchor: 'Dogfood run 2026-04-30: collaborative-design-workflow',
    match: 'is a provider skill, not an executable CLI command',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason: 'Dogfood evidence note.',
  },

  // ------------------------------------------------------------------ discover
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Prerequisites',
    match: 'route to `oat-project-new` for spec-driven setup',
    classification: 'non-executing',
    skills: ['oat-project-lite', 'oat-project-new', 'oat-project-quick-start'],
    reason:
      'Terminal handoff: this skill declines and stops; the named skill is the next entry point.',
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 1: Resolve Active Spec-Driven Project',
    match: 'stop and route: quick project',
    classification: 'non-executing',
    skills: [
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-progress',
      'oat-project-quick-start',
    ],
    reason: 'Mode mismatch stops this skill and names the correct entry point.',
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 1: Resolve Active Spec-Driven Project',
    match: 'Stop here until the user has selected/created the intended project',
    classification: 'non-executing',
    skills: ['oat-project-new', 'oat-project-open'],
    reason: 'User-facing instructions printed before this skill stops.',
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 1: Resolve Active Spec-Driven Project',
    match: 'Stop here until `activeProject` in `.oat/config.local.json` is set',
    classification: 'non-executing',
    skills: ['oat-project-new', 'oat-project-open'],
    reason: 'User-facing instructions printed before this skill stops.',
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 15: Commit Discovery',
    match: 'This shows what users will do when USING oat-project-discover',
    classification: 'non-executing',
    skills: ['oat-project-discover'],
    reason: 'Self-referential note about the printed guidance.',
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 9: Explore Solution Space',
    match: 'invoke the `oat-project-split` skill with a `SplitPayload`',
    classification: 'load-required',
    skills: ['oat-project-split'],
    requires: [
      'Invoking it means loading the current `oat-project-split/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 9: Explore Solution Space',
    match: 'Invoking it means loading the current `oat-project-split/SKILL.md`',
    classification: 'load-required',
    skills: ['oat-project-split'],
    requires: [
      'Invoking it means loading the current `oat-project-split/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-discover/SKILL.md',
    anchor: 'Step 11: Human-in-the-Loop Lifecycle (HiLL) Gate (If Configured)',
    match: 'invoke `oat-project-split` with `origin: "detected-convergence"`',
    classification: 'load-required',
    skills: ['oat-project-split'],
    requires: [
      'loading the current `oat-project-split/SKILL.md` and following it rather than a remembered split procedure',
    ],
  },

  // ------------------------------------------------------------------ document
  {
    file: '.agents/skills/oat-project-document/SKILL.md',
    anchor: '(preamble)',
    match: 'run oat-project-document',
    classification: 'non-executing',
    skills: ['oat-project-document'],
    reason: 'Frontmatter description listing example user phrasings.',
  },

  // ----------------------------------------------------------------- implement
  {
    file: '.agents/skills/oat-project-implement/SKILL.md',
    anchor: 'Prerequisites',
    match: 'If missing, run the `oat-project-plan` skill first',
    classification: 'non-executing',
    skills: ['oat-project-plan'],
    reason:
      'Terminal handoff: implement stops when the plan is missing; plan is the next entry point.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 11: Prepare Final Closeout Baseline',
    match:
      'Before requesting final review / running `oat-project-pr-final`, update',
    classification: 'non-executing',
    skills: ['oat-project-pr-final'],
    reason:
      'Temporal context for the implementation.md update; pr-final runs at Step 15 and Step 17.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match:
      'run `oat-project-review-provide code final` followed immediately by `oat-project-review-receive`',
    classification: 'load-required',
    skills: ['oat-project-review-provide', 'oat-project-review-receive'],
    requires: [
      'Run each of those by loading its current `SKILL.md` and following it, or by dispatching a child that carries it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match: 'run the review in-context by loading the current',
    classification: 'load-required',
    skills: ['oat-project-review-provide'],
    requires: [
      'loading the current `oat-project-review-provide/SKILL.md` and following it in this context',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match: 'then executes the review per `oat-project-review-provide`',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason:
      'Option description inside the user-facing review-execution prompt; the inline execution boundary is the `REVIEW_MODEL` inline bullet.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match:
      'User runs `oat-project-review-provide code final` in a separate session',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Fresh-session option text describing what the user does.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match: 'User runs `oat-project-review-receive` to process findings',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Fresh-session option text describing what the user does.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 13: Trigger Final Review',
    match: 'Fix tasks added, re-run the `oat-project-implement` skill',
    classification: 'non-executing',
    skills: ['oat-project-implement', 'oat-project-review-receive'],
    reason: 'Printed outcome summary for the user.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 14: Gate Execution',
    match: 'commit it before calling `oat-project-review-receive`',
    classification: 'load-required',
    skills: ['oat-project-review-receive'],
    requires: [
      'Calling receive means loading the current `oat-project-review-receive/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 14: Gate Execution',
    match:
      'Calling receive means loading the current `oat-project-review-receive/SKILL.md`',
    classification: 'load-required',
    skills: ['oat-project-review-receive'],
    requires: [
      'Calling receive means loading the current `oat-project-review-receive/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 14: Gate Execution',
    match:
      'stop with the recovery command `oat-project-review-receive`; do not invoke it automatically',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason:
      'Names the operator recovery command and explicitly forbids invoking it from this step.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 15: Final HiLL Closeout Sequence',
    match: 'Step 8 has already run `oat-project-review-provide code final`',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Narrates prior state and prohibits a duplicate review.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 15: Final HiLL Closeout Sequence',
    match: 'dispatch respectively `oat-project-summary`',
    classification: 'load-required',
    skills: [
      'oat-project-document',
      'oat-project-pr-final',
      'oat-project-retro',
      'oat-project-summary',
    ],
    requires: [
      "Immediately before each of those steps, load that step's current `SKILL.md` and follow it, or dispatch a child that carries it",
      'a remembered outcome from an earlier run or an ambiently discovered copy does not satisfy the step',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 17: Prompt for Next Steps',
    match: 'Invoke `oat-project-summary` to generate summary.md',
    classification: 'load-required',
    skills: [
      'oat-project-document',
      'oat-project-pr-final',
      'oat-project-summary',
    ],
    scope: 'section',
    requires: [
      "Immediately before each numbered step below, load that named skill's current `SKILL.md` and follow it, or dispatch a child that carries it",
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 17: Prompt for Next Steps',
    match: 'Do not route directly to `oat-project-complete`',
    classification: 'non-executing',
    skills: ['oat-project-complete'],
    reason: 'Prohibition, not an execution directive.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    anchor: 'Step 17: Prompt for Next Steps',
    match: 'Run the skills individually when ready',
    classification: 'non-executing',
    skills: [
      'oat-project-document',
      'oat-project-pr-final',
      'oat-project-summary',
    ],
    reason: 'Exit message printed to the user.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    anchor: 'Dispatch And Dry Run',
    match: 'own capability probing, catalog observation',
    classification: 'non-executing',
    skills: ['oat-project-dispatch-subagents'],
    reason:
      'Ownership statement naming the skills that own the dispatch contract.',
  },
  {
    file: '.agents/skills/oat-project-implement/references/phase-execution.md',
    anchor: 'Step 8: Check Plan Phase Completion',
    match: 'For the final implementation phase use',
    classification: 'load-required',
    skills: ['oat-project-review-provide'],
    requires: [
      'loading the current `oat-project-review-provide/SKILL.md` and following it, or dispatching a child that carries it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/phase-execution.md',
    anchor: 'Step 8: Check Plan Phase Completion',
    match: 'run `oat-project-review-provide code final`',
    classification: 'load-required',
    skills: ['oat-project-review-provide'],
    requires: [
      'loading the current `oat-project-review-provide/SKILL.md` and following it, or dispatching a child that carries it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/plan-and-resume.md',
    anchor: 'Autonomous checkpoint review and receive',
    match:
      'dispatch `oat-project-review-provide` with `oat_review_invocation: auto`',
    classification: 'load-required',
    skills: ['oat-project-review-provide'],
    requires: [
      'loading the current `oat-project-review-provide/SKILL.md` and following it or dispatching a child that carries it',
    ],
  },
  {
    file: '.agents/skills/oat-project-implement/references/plan-and-resume.md',
    anchor: 'Autonomous checkpoint review and receive',
    match: 'invoke `oat-project-review-receive` immediately',
    classification: 'load-required',
    skills: ['oat-project-review-receive'],
    requires: [
      'loading the current `oat-project-review-receive/SKILL.md` and following it rather than a remembered receive procedure',
    ],
  },

  // --------------------------------------------------------------- import-plan
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 3: Normalize Into Canonical OAT plan.md',
    match: 'Apply `oat-project-plan-writing` invariants after mapping',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'load the current `oat-project-plan-writing/SKILL.md` and follow its invariants as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4: Update Plan Metadata',
    match:
      '`oat-project-next` must route it back to the same planning workflow',
    classification: 'non-executing',
    skills: ['oat-project-next'],
    reason: 'Describes how the router treats an incomplete imported plan.',
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.1: Adopt Complete Ladders and Record the Named Ceiling',
    match: 'Invoke the `Complete Dispatch Ladder Adoption Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.25: Configure Optional Phase Gate Review',
    match: 'invoke the `Shared Phase Gate Review Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.35: Configure Lifecycle Gate Posture',
    match: 'invoke the `Shared Lifecycle Gate Posture Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.5: Run Import-Aware Plan Artifact Review Loop',
    match: 'invoke the `Managed Dispatch Readiness and Review Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.5: Run Import-Aware Plan Artifact Review Loop',
    match: 'Invoke the shared `Auto Artifact-Review Loop` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Step 4.5: Run Import-Aware Plan Artifact Review Loop',
    match: 'follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Invoke the shared `Auto Artifact-Review Loop` from `oat-project-plan-writing`',
    ],
  },
  {
    file: '.agents/skills/oat-project-import-plan/SKILL.md',
    anchor: 'Success Criteria',
    match: 'records the import-aware plan artifact review row',
    classification: 'non-executing',
    skills: ['oat-project-implement', 'oat-project-review-receive'],
    reason: 'Success checklist.',
  },

  // ---------------------------------------------------------------------- next
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 0: Resolve Active Project',
    match: '— Create a spec-driven project',
    classification: 'non-executing',
    skills: [
      'oat-project-import-plan',
      'oat-project-lite',
      'oat-project-new',
      'oat-project-quick-start',
    ],
    reason:
      'Error report listing available entry points for the user before an explicit STOP.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 0: Resolve Active Project',
    match: 'invoke `oat-project-open` by loading the current',
    classification: 'load-required',
    skills: ['oat-project-open'],
    requires: [
      'loading the current `oat-project-open/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 4: Check for Unprocessed Reviews (Review Safety Check)',
    match: 'override routing target to `oat-project-review-receive`',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Routing decision; Step 6 owns this router’s execution boundary.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'use the full raw Git byte algorithm read from the current',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'read from the current `oat-project-implement/SKILL.md`, with only its literal state-carrier exclusion, rather than a remembered version of that algorithm',
    ],
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'If `oat_implement_exit_gate` is absent',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Implementation exit gate freshness checkpoint pending',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match:
      'This override applies even when `oat_phase_status` is `complete` or `pr_open`',
    classification: 'non-executing',
    skills: ['oat-project-complete'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'An unchanged qualified fingerprint preserves freshness',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'invalidates the implementation fingerprint and routes to',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Routing is read-only',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'When the snapshot exists and is incomplete',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'revision phases are historical',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only terminal-status guard that suppresses a route; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Revision tasks pending',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Unprocessed review feedback detected',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Implementation complete — triggering final code review',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Review fixes implemented — triggering re-review',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'no active review artifact exists',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Final review passed — generating project summary',
    classification: 'non-executing',
    skills: ['oat-project-summary'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'Summary complete — creating final PR',
    classification: 'non-executing',
    skills: ['oat-project-pr-final'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 5: Post-Implementation Router',
    match: 'PR is open — ready to complete project',
    classification: 'non-executing',
    skills: ['oat-project-complete'],
    reason:
      'Read-only routing decision; Step 6 loads and follows the selected target.',
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 6: Announce and Invoke',
    classification: 'load-required',
    skills: [],
    requires: [
      "Invoking the target means loading the target skill's current `SKILL.md` and following it directly, or dispatching a child that carries it",
      "This step, not the Step 5 routing decisions, is this router's execution boundary",
    ],
    reason: 'Anchor contract for the router execution boundary.',
  },

  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 3b: Phase Routing Tables',
    match: 'Readiness is the named **quick plan readiness** predicate',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'load `oat-project-quick-start/SKILL.md` and apply it as written to `{PROJECT_PATH}/plan.md`',
    ],
  },
  {
    file: '.agents/skills/oat-project-next/SKILL.md',
    anchor: 'Step 3b: Phase Routing Tables',
    match: 'A `not ready` result resumes the quick workflow in place',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    ],
  },

  // ---------------------------------------------------------------------- plan
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Prerequisites',
    match: 'Run the `oat-project-design` skill first, then return to planning.',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason:
      'Terminal handoff, matching the sibling `quick` and `import` bullets: plan stops and tells the user to run design.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Prerequisites',
    match: 'to import and normalize the external plan first',
    classification: 'non-executing',
    skills: ['oat-project-implement', 'oat-project-import-plan'],
    reason: 'Quoted message telling the user which skill to run next.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Plan Format Contract',
    match: 'When creating or editing `plan.md`',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'load the current `oat-project-plan-writing/SKILL.md` and follow its canonical format rules',
    ],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Progress Indicators (User-Facing)',
    match: 're-run the `oat-project-plan` skill',
    classification: 'non-executing',
    skills: ['oat-project-plan'],
    reason: 'Self-reference inside user-facing STOP guidance.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 1: Determine Workflow Mode and Route',
    match:
      'Decide the continuation with the named **quick plan readiness** predicate',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'load `oat-project-quick-start/SKILL.md` and apply that predicate as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 1: Determine Workflow Mode and Route',
    match:
      'Then load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'Then load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    ],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 1: Determine Workflow Mode and Route',
    match:
      'Then load `oat-project-implement/SKILL.md` and follow it to begin execution',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'Then load `oat-project-implement/SKILL.md` and follow it to begin execution',
    ],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 1: Determine Workflow Mode and Route',
    match: 'to begin execution." If no',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Quoted message telling the user which skill to run next.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 1: Determine Workflow Mode and Route',
    match: 'Print: "Run `oat-project-import-plan`',
    classification: 'non-executing',
    skills: ['oat-project-import-plan'],
    reason: 'Quoted message printed before this skill exits.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 9: Specify Exact Details',
    match: 'leave that for oat-project-implement',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Ownership note about what plans must not contain.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 10.1: Keep Reviews Table Rows',
    match: 'follow its review table preservation rules',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow its review table preservation rules',
    ],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor:
      'Step 11.5: Resolve Dispatch Policy Before Implementation Readiness',
    match: 'invoke the `Complete Dispatch Ladder Adoption Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 12.25: Configure Optional Phase Gate Review',
    match: 'invoke the `Shared Phase Gate Review Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 12.35: Configure Lifecycle Gate Posture',
    match: 'invoke the `Shared Lifecycle Gate Posture Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 12.5: Run Plan Artifact Review Loop',
    match: 'invoke the `Managed Dispatch Readiness and Review Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 12.5: Run Plan Artifact Review Loop',
    match: 'Invoke the shared `Auto Artifact-Review Loop` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    ],
  },

  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Step 12.5: Run Plan Artifact Review Loop',
    match: 'follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Invoke the shared `Auto Artifact-Review Loop` from `oat-project-plan-writing`',
    ],
  },

  // -------------------------------------------------------------- plan-writing
  {
    file: '.agents/skills/oat-project-plan-writing/SKILL.md',
    anchor: 'Shared Subagent Dispatch Contract',
    match: 'run `oat tools install workflows --scope <user|project>`',
    classification: 'non-executing',
    skills: ['oat-project-dispatch-subagents'],
    reason:
      'Recovery command for installing a missing skill, not a directive to execute it.',
  },
  {
    file: '.agents/skills/oat-project-plan-writing/SKILL.md',
    anchor: 'Shared Subagent Dispatch Contract',
    match: 'Resolve, read, and follow',
    classification: 'load-required',
    skills: ['oat-project-dispatch-subagents'],
    requires: [
      'Resolve, read, and follow `${SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`',
    ],
  },

  // ------------------------------------------------------------------ pr-final
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: '(preamble)',
    match: 'run oat-project-pr-final',
    classification: 'non-executing',
    skills: ['oat-project-pr-final'],
    reason: 'Frontmatter description listing example user phrasings.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Without arguments',
    match: 'Run the `oat-project-pr-final` skill and it will ask for',
    classification: 'non-executing',
    skills: ['oat-project-pr-final'],
    reason: 'Usage documentation addressed to the user.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 2: Check Final Review Status',
    match: 'Route the resumable next step to',
    classification: 'non-executing',
    skills: ['oat-project-review-provide', 'oat-project-review-receive'],
    reason:
      'Boundary stop records the resume target; this skill stops before executing it.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 2: Check Final Review Status',
    match: 'Ask whether to proceed anyway',
    classification: 'non-executing',
    skills: ['oat-project-review-provide', 'oat-project-review-receive'],
    reason: 'Quoted message telling the user which skills to run.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 2: Check Final Review Status',
    match: 'If the status is `fixes_completed`: fixes were implemented',
    classification: 'non-executing',
    skills: ['oat-project-review-provide', 'oat-project-review-receive'],
    reason: 'Quoted message telling the user which skills to re-run.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 3: Collect Project Summary',
    match:
      'When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md`',
    classification: 'load-required',
    skills: ['oat-project-summary'],
    requires: [
      'When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md` and follow it',
      'never synthesize the summary from a remembered version of that skill',
    ],
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 3: Collect Project Summary',
    match: 'generate or update `summary.md` inline',
    classification: 'explicit-fallback',
    skills: ['oat-project-summary'],
    requires: [
      'If direct skill invocation is unavailable',
      'following the same synthesis rules as `oat-project-summary`',
    ],
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Step 3: Collect Project Summary',
    match: 'to finalize the summary (if implementation just completed)',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Recommendation printed to the user when the final summary is empty.',
  },
  {
    file: '.agents/skills/oat-project-pr-final/SKILL.md',
    anchor: 'Success Criteria',
    match: 'Next milestone references both `oat-project-revise`',
    classification: 'non-executing',
    skills: ['oat-project-revise', 'oat-project-complete'],
    reason: 'Success checklist.',
  },

  // -------------------------------------------------- pr-progress and progress
  {
    file: '.agents/skills/oat-project-pr-progress/SKILL.md',
    anchor: 'Without arguments',
    match: 'Run the `oat-project-pr-progress` skill and it will ask',
    classification: 'non-executing',
    skills: ['oat-project-pr-progress'],
    reason: 'Usage documentation addressed to the user.',
  },
  {
    file: '.agents/skills/oat-project-progress/SKILL.md',
    anchor: 'Step 5: Determine Next Skill',
    match:
      'Recommend continuing the current phase skill to capture explicit approval',
    classification: 'non-executing',
    skills: ['oat-project-design', 'oat-project-discover'],
    reason:
      'Recommendation table naming the phase skill the user should run next.',
  },
  {
    file: '.agents/skills/oat-project-progress/SKILL.md',
    anchor: 'Step 5: Determine Next Skill',
    match:
      'Load `oat-project-quick-start/SKILL.md` and apply that predicate as written',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'Load `oat-project-quick-start/SKILL.md` and apply that predicate as written to `{PROJECT_PATH}/plan.md`',
    ],
  },
  {
    file: '.agents/skills/oat-project-progress/SKILL.md',
    anchor: 'Step 5: Determine Next Skill',
    match: 'A not-ready quick plan is not a dead end',
    classification: 'load-required',
    skills: ['oat-project-quick-start'],
    requires: [
      'load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    ],
  },
  {
    file: '.agents/skills/oat-project-progress/SKILL.md',
    anchor: 'Usage',
    match: 'Run `oat-project-progress` at any time to',
    classification: 'non-executing',
    skills: ['oat-project-progress'],
    reason: 'Usage documentation addressed to the user.',
  },

  // --------------------------------------------------------------- quick-start
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 0.5: Resolve Active Project',
    match: 'Create project via the same scaffolding path used by',
    classification: 'non-executing',
    skills: ['oat-project-new'],
    reason:
      'Names the shared `oat project new` CLI scaffolding path shown below, not a directive to execute the named skill.',
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Quick Plan Readiness (Named Predicate)',
    match: 'the same absent-or-false convention',
    classification: 'non-executing',
    skills: ['oat-project-next'],
    reason:
      'Cites the boundary-tier convention that router documents for the same field; nothing is executed here.',
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 0.5: Resolve Active Project',
    match: 'Ready → there is nothing left to author here',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'load `oat-project-implement/SKILL.md` and follow it to begin execution',
    ],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3: Generate Plan Directly',
    match:
      'Plan requirements — apply `oat-project-plan-writing` canonical format invariants',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'loading the current `oat-project-plan-writing/SKILL.md` and following them as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Mode Assertion',
    match: 'Route implementation to `oat-project-implement`',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Scope-recovery guidance; the handoff happens when the quick workflow ends.',
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 2.5: Decision Point — Design Depth',
    match: 'Run `oat-project-design` next',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason: 'Quoted message informing the user of the next entry point.',
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3: Generate Plan Directly',
    match:
      '`oat-project-next` must route it back to the current planning workflow',
    classification: 'non-executing',
    skills: ['oat-project-next'],
    reason: 'Describes how the router treats an incomplete quick plan.',
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.5: Resolve Dispatch Policy Before Implementation Readiness',
    match: 'Invoke the `Complete Dispatch Ladder Adoption Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.55: Configure Optional Phase Gate Review',
    match: 'invoke the `Shared Phase Gate Review Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.57: Configure Lifecycle Gate Posture',
    match: 'invoke the `Shared Lifecycle Gate Posture Setup Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.6: Run Plan Artifact Review Loop',
    match: 'invoke the `Managed Dispatch Readiness and Review Contract` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [PLAN_WRITING_CONTRACT_CLAUSE],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.6: Run Plan Artifact Review Loop',
    match: 'Invoke the shared `Auto Artifact-Review Loop` from',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    ],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Step 3.6: Run Plan Artifact Review Loop',
    match: 'follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Invoke the shared `Auto Artifact-Review Loop` from `oat-project-plan-writing`',
    ],
  },
  {
    file: '.agents/skills/oat-project-quick-start/SKILL.md',
    anchor: 'Success Criteria',
    match: '`oat_ready_for: oat-project-implement`',
    classification: 'non-executing',
    skills: ['oat-project-implement', 'oat-project-review-receive'],
    reason: 'Success checklist.',
  },

  // ---------------------------------------------------------------------- retro
  {
    file: '.agents/skills/oat-project-retro/SKILL.md',
    anchor: 'Step 4: Resolve Post-Generation Consent',
    match: 'Filing remains owned by `oat-project-retro-file`',
    classification: 'non-executing',
    skills: ['oat-project-retro-file'],
    reason: "Ownership statement bounding this skill's generate/apply modes.",
  },
  {
    file: '.agents/skills/oat-project-retro/SKILL.md',
    anchor: 'Step 5: Record the Run',
    match: 'verify the generated structural heading uses producer',
    classification: 'non-executing',
    skills: ['oat-project-retro'],
    reason: 'Self-reference inside a receipt verification instruction.',
  },
  {
    file: '.agents/skills/oat-project-reconcile/SKILL.md',
    anchor: 'Success Criteria',
    match: 'produce correct results after reconciliation',
    classification: 'non-executing',
    skills: ['oat-project-progress', 'oat-project-review-provide'],
    reason: 'Success checklist naming downstream skills.',
  },
  {
    file: '.agents/skills/oat-project-retro/SKILL.md',
    anchor: 'Step 4: Resolve Post-Generation Consent',
    match: 'Chain to `oat-project-retro-file`',
    classification: 'load-required',
    skills: ['oat-project-retro-file'],
    requires: [
      'chaining means loading the current `oat-project-retro-file/SKILL.md` and following it, or dispatching a child that carries it',
    ],
  },

  // ------------------------------------------------------------ review-provide
  {
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Step 8: Write Review Artifact (if Tier 3)',
    match: 'uses standard disposition behavior',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Describes how the downstream receive skill dispositions findings.',
  },
  {
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Step 8: Write Review Artifact (if Tier 3)',
    match: 'uses relaxed disposition',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Describes how the downstream receive skill dispositions findings.',
  },
  {
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Success Criteria',
    match: 'User guided to next step',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Success checklist.',
  },
  {
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Model Invocation Gate',
    match: 'do not run this skill; offer',
    classification: 'non-executing',
    skills: ['oat-project-open', 'oat-project-quick-start'],
    reason: 'Declines and offers the user other entry points.',
  },
  {
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Without arguments',
    match: 'Run the `oat-project-review-provide` skill and it will',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Usage documentation addressed to the user.',
  },
  {
    file: '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    anchor: 'Step 7: Build the Review Body + Verdict',
    match: "machine A's `oat-project-review-receive-remote` routes findings",
    classification: 'non-executing',
    skills: ['oat-project-review-receive-remote'],
    reason:
      'Explains why the review payload carries the resolved project path.',
  },
  {
    file: '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    anchor: 'Remote Review Provide (Project-Scoped GitHub PR)',
    match: 'Tier 1/2/3 dispatch model that matches',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Comparison with the non-remote sibling skill.',
  },

  // ------------------------------------------------------------ review-receive
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Progress Indicators (User-Facing)',
    match: 'Routing to oat-project-implement',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Progress feedback list; Step 10 owns the execution boundary.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 1: Locate Latest Review Artifact',
    match: 'offer to run `oat-project-review-provide`',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Offers the user another entry point after blocking.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 1: Locate Latest Review Artifact',
    match:
      'Block and ask user to run the `oat-project-review-provide` skill first',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'Blocks and asks the user to run the named skill.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Re-Review Scoping',
    match: 'is called after fix tasks exist',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: "Describes the other skill's re-review scoping behavior.",
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 2.6: Select Review Handling Mode (Required)',
    match: 'return control to the blocking-gate path',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason:
      'Parenthetical describing what the blocking-gate path does after control returns.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 8: Check Review Cycle Count',
    match: 'phase gate re-runs are governed by the phase review gate flow',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Explains which skill owns a different flow.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 10: Route to Next Action',
    match:
      'Or directly invoke `oat-project-implement` if environment supports skill chaining',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'loading the current `oat-project-implement/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 10: Route to Next Action',
    match:
      'Review `plan.md`, then run the `oat-project-implement` skill when ready',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Quoted message telling the user what to do next.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 10: Route to Next Action',
    match: 'Run the `oat-project-implement` skill when ready."',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Quoted message telling the user what to do next.',
  },
  {
    file: '.agents/skills/oat-project-review-receive/SKILL.md',
    anchor: 'Step 10A: Route to Next Action for Artifact Reviews',
    match: 'Re-run `oat-project-review-provide artifact {scope}`',
    classification: 'non-executing',
    skills: ['oat-project-review-provide'],
    reason: 'User-facing option list for artifact reviews.',
  },

  // -------------------------------------------------------------------- revise
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: 'Progress Indicators (User-Facing)',
    match: 'Routing to oat-project-implement for execution',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Progress feedback list; 4g owns the execution boundary.',
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: '4g: Route to Implement',
    match:
      'Run the `oat-project-implement` skill to execute them starting from',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Quoted message telling the user what to do next.',
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: '4g: Route to Implement',
    match:
      'Or directly invoke `oat-project-implement` if environment supports skill chaining',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'loading the current `oat-project-implement/SKILL.md` and following it',
    ],
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: '5b: Delegate',
    match: 'Delegate to `oat-project-review-receive-remote`',
    classification: 'load-required',
    skills: ['oat-project-review-receive', 'oat-project-review-receive-remote'],
    requires: [
      "Delegating means loading the selected skill's current `SKILL.md` and following it, or dispatching a child that carries it",
    ],
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: '5c: Post-Delegation State',
    match: 'Route to `oat-project-implement` by loading the current',
    classification: 'load-required',
    skills: ['oat-project-implement'],
    requires: [
      'loading the current `oat-project-implement/SKILL.md` and following it, or by dispatching a child that carries it',
    ],
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: '5c: Post-Delegation State',
    match:
      'Run oat-project-revise for more feedback or oat-project-complete when approved',
    classification: 'non-executing',
    skills: ['oat-project-complete', 'oat-project-revise'],
    reason: 'Quoted next-milestone message.',
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: 'After Revision Tasks Complete',
    match: 'Invokes `oat-project-summary` to update summary.md if it exists',
    classification: 'non-executing',
    skills: ['oat-project-summary'],
    reason:
      'Narrates what oat-project-implement does after revision tasks; not this skill’s step.',
  },
  {
    file: '.agents/skills/oat-project-revise/SKILL.md',
    anchor: 'After Revision Tasks Complete',
    match:
      'Run oat-project-revise for more feedback or oat-project-complete when approved',
    classification: 'non-executing',
    skills: ['oat-project-complete', 'oat-project-revise'],
    reason: 'Quoted next-milestone message.',
  },

  {
    file: '.agents/skills/oat-project-spec/SKILL.md',
    anchor: 'Step 20: Commit Specification',
    match: 'This shows what users will do when USING oat-project-spec',
    classification: 'non-executing',
    skills: ['oat-project-spec'],
    reason: 'Self-referential note about the printed guidance.',
  },
  {
    file: '.agents/skills/oat-project-spec/SKILL.md',
    anchor: '(preamble)',
    match: 'oat-project-design confirms requirements automatically',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason: 'Frontmatter description explaining when this skill is optional.',
  },
  // --------------------------------------------------- spec, split and summary
  {
    file: '.agents/skills/oat-project-spec/SKILL.md',
    anchor: 'Prerequisites',
    match: 'If missing, run the `oat-project-discover` skill first',
    classification: 'non-executing',
    skills: ['oat-project-discover'],
    reason: 'Terminal handoff: spec stops when discovery is missing.',
  },
  {
    file: '.agents/skills/oat-project-split/SKILL.md',
    anchor: 'Children Resume At Discovery (Revalidation Contract)',
    match: 'treats `oat_template: true` as a still-a-template signal',
    classification: 'non-executing',
    skills: ['oat-project-next'],
    reason: 'Describes how the router reads state written by this skill.',
  },
  {
    file: '.agents/skills/oat-project-summary/SKILL.md',
    anchor: '(preamble)',
    match: 'run oat-project-summary',
    classification: 'non-executing',
    skills: ['oat-project-summary'],
    reason: 'Frontmatter description listing example user phrasings.',
  },
];

/**
 * Floors, not exact counts: the corpus grows, but a glob or path regression that
 * shrinks it must fail loudly rather than quietly widening every exemption.
 * Recorded at 42 bounded files / 205 fence-scan files / 179 candidate
 * sentences, so losing a single scanned file or one reference file's worth of
 * candidates breaches the floor. The fence-scan floor is the same guarantee for
 * the wider inventory: a walk that stopped recursing or started skipping
 * directories must fail on the shrinkage itself, not silently scan less.
 * The negative control below reads these values rather than restating them, so
 * lowering them cannot silently disarm the guard.
 */
const CORPUS_MINIMUMS: CorpusMinimums = {
  files: 40,
  fenceScanFiles: 180,
  candidates: 150,
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function writeFixtureSkill(root: string, body: string): Promise<void> {
  const skillRoot = join(root, '.agents', 'skills', 'oat-project-fixture');
  await mkdir(skillRoot, { recursive: true });
  await writeFile(join(skillRoot, 'SKILL.md'), body, 'utf8');
  const authoringRoot = join(root, '.agents', 'skills', 'create-oat-skill');
  await mkdir(authoringRoot, { recursive: true });
  await writeFile(join(authoringRoot, 'SKILL.md'), '# Authoring\n', 'utf8');
}

async function writeFixtureFile(
  root: string,
  relativePath: string,
  body: string,
): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body, 'utf8');
}

const COMPLIANT_FIXTURE = [
  '# Fixture',
  '',
  '## Step 1: Close Out',
  '',
  'Dispatch `oat-project-summary` to produce the summary: load the current',
  '`oat-project-summary/SKILL.md` and follow it, or dispatch a child that',
  'carries it.',
  '',
].join('\n');

const FIXTURE_MATRIX: readonly CallSiteRow[] = [
  {
    file: '.agents/skills/oat-project-fixture/SKILL.md',
    anchor: 'Step 1: Close Out',
    match: 'Dispatch `oat-project-summary` to produce the summary',
    classification: 'load-required',
    skills: ['oat-project-summary'],
    requires: ['load the current `oat-project-summary/SKILL.md` and follow it'],
  },
];

describe('named-skill execution contract', () => {
  it('classifies every named-skill execution candidate at repository HEAD', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(
      repoRoot,
      CALL_SITE_MATRIX,
      CORPUS_MINIMUMS,
    );

    expect(
      formatReport({
        ...report,
        deadRows: [],
        overMatchedRows: [],
        missingClauses: [],
        malformedRows: [],
        fenceDefects: [],
      }),
    ).toBe('');
    expect(report.unclassified).toHaveLength(0);
    expect(report.corpusShortfalls).toEqual([]);
  });

  it('keeps every load-required and explicit-fallback clause at its execution boundary', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(repoRoot, CALL_SITE_MATRIX);

    expect(report.missingClauses).toEqual([]);
  });

  it('keeps every matrix row bound to exactly one live call site', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(repoRoot, CALL_SITE_MATRIX);

    expect(
      report.deadRows.map(
        (row) => `${row.file} [${row.anchor}] ${row.match ?? ''}`,
      ),
    ).toEqual([]);
    expect(report.overMatchedRows).toEqual([]);
  });

  it('rejects all three stray-fence shapes across every markdown file under .agents/skills', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(
      repoRoot,
      CALL_SITE_MATRIX,
      CORPUS_MINIMUMS,
    );

    expect(
      report.fenceDefects.map(
        (defect) => `${defect.file}:${defect.line} — ${defect.detail}`,
      ),
    ).toEqual([]);
    expect(report.corpusShortfalls).toEqual([]);
  });

  it('matrix integrity (no corpus read): keeps the closeout and completion classifications the outcome depends on', () => {
    const find = (file: string, anchor: string, match: string): CallSiteRow => {
      const row = CALL_SITE_MATRIX.find(
        (candidate) =>
          candidate.file === file &&
          candidate.anchor === anchor &&
          candidate.match === match,
      );
      expect(row, `${file} [${anchor}] ${match}`).toBeDefined();
      return row as CallSiteRow;
    };

    expect(
      find(
        '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
        'Step 15: Final HiLL Closeout Sequence',
        'dispatch respectively `oat-project-summary`',
      ).classification,
    ).toBe('load-required');
    expect(
      find(
        '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
        'Step 17: Prompt for Next Steps',
        'Invoke `oat-project-summary` to generate summary.md',
      ).classification,
    ).toBe('load-required');
    expect(
      find(
        '.agents/skills/oat-project-complete/SKILL.md',
        'Step 7: Generate PR Description',
        'Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5',
      ).classification,
    ).toBe('explicit-fallback');
  });

  it('keeps the authoring convention that makes the corpus rule reusable', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const authoring = await readFile(
      join(repoRoot, '.agents', 'skills', 'create-oat-skill', 'SKILL.md'),
      'utf8',
    );
    const normalized = normalize(authoring);

    expect(normalized).toContain('**Named-skill execution');
    expect(normalized).toContain(
      "require loading that skill's current `SKILL.md` and following its current steps, or dispatching a child that carries it",
    );
    expect(normalized).toContain(
      'Achieving a remembered outcome, paraphrasing what the named skill used to do, or relying on ambient discovery to locate it is not compliant',
    );
    expect(normalized).toContain('**user advice**');
    expect(normalized).toContain('**non-executing reference**');
    expect(normalized).toContain('**explicit capability fallback**');
  });

  it('accepts a compliant execution boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).resolves.toBeUndefined();
  });

  it('fails when a load clause is removed from a classified execution boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /missing its load-required clause: "load the current `oat-project-summary\/SKILL\.md` and follow it"/,
    );
  });

  it('fails on an unclassified bare pointer added outside every existing anchor', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        '## Step 2: Unclassified',
        '',
        'Run `oat-project-document` now.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /Unclassified named-skill execution candidates[\s\S]*Step 2: Unclassified[\s\S]*Run `oat-project-document` now\./,
    );
  });

  it('fails when a second skill is appended to an already-classified sentence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary, then dispatch',
        '`oat-project-document`: load the current `oat-project-summary/SKILL.md` and',
        'follow it, or dispatch a child that carries it.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /Unclassified named-skill execution candidates[\s\S]*oat-project-document/,
    );
  });

  it('fails when one of several matched call sites drops the clause', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        'Dispatch `oat-project-summary` to produce the summary again.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(/missing its load-required clause/);
  });

  it('rejects a load-required row that declares no clause', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    await expect(
      assertContractCurrent(root, [
        {
          file: '.agents/skills/oat-project-fixture/SKILL.md',
          anchor: 'Step 1: Close Out',
          match: 'Dispatch `oat-project-summary` to produce the summary',
          classification: 'load-required',
          skills: ['oat-project-summary'],
        },
      ]),
    ).rejects.toThrowError(/is load-required but declares no required clause/);
  });

  it('fails when an anchor-only contract row loses its heading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    await expect(
      assertContractCurrent(root, [
        ...FIXTURE_MATRIX,
        {
          file: '.agents/skills/oat-project-fixture/SKILL.md',
          anchor: 'Step 9: Removed Heading',
          classification: 'load-required',
          skills: [],
          requires: ['load the target skill'],
        },
      ]),
    ).rejects.toThrowError(/no longer bind to a live call site/);
  });

  it('keeps prose on either side of a fence in separate blocks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary.',
        '```bash',
        'echo build',
        '```',
        'load the current `oat-project-summary/SKILL.md` and follow it.',
        '',
      ].join('\n'),
    );

    // No blank line on either side of the fence. The clause after the fence
    // must not satisfy a block-scoped `requires` on the candidate before it.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(/missing its load-required clause/);
  });

  it('resolves a section-scoped clause across an in-fence `#` comment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary.',
        '',
        '```bash',
        '# Not a heading: a shell comment inside a fenced block.',
        'echo build',
        '```',
        '',
        'load the current `oat-project-summary/SKILL.md` and follow it.',
        '',
      ].join('\n'),
    );

    // The clause sits after a fenced block whose `#` comment would truncate the
    // section if `collectSections` were not fence-aware.
    await expect(
      assertContractCurrent(root, [
        {
          file: '.agents/skills/oat-project-fixture/SKILL.md',
          anchor: 'Step 1: Close Out',
          match: 'Dispatch `oat-project-summary` to produce the summary',
          classification: 'load-required',
          skills: ['oat-project-summary'],
          scope: 'section',
          requires: [
            'load the current `oat-project-summary/SKILL.md` and follow it',
          ],
        },
        {
          file: '.agents/skills/oat-project-fixture/SKILL.md',
          anchor: 'Step 1: Close Out',
          match:
            'load the current `oat-project-summary/SKILL.md` and follow it.',
          classification: 'load-required',
          skills: ['oat-project-summary'],
          requires: ['Dispatch `oat-project-summary` to produce the summary'],
          scope: 'section',
        },
      ]),
    ).resolves.toBeUndefined();
  });

  it('fails when an exemption starts matching a second sentence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        'Now immediately Dispatch `oat-project-summary` to produce the summary,',
        'from memory, without loading anything.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /match more than one sentence[\s\S]*from memory, without loading anything/,
    );
  });

  it('absorbs a repeated pointer to a skill the row already declares (known residual)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary: load the current',
        '`oat-project-summary/SKILL.md` and follow it, or dispatch a child that',
        'carries it, and then run `oat-project-summary` again from memory.',
        '',
      ].join('\n'),
    );

    // Pinned, not endorsed: one sentence that both mandates loading a skill and
    // directs running that same skill from memory still passes, because the
    // row's declared skill set is unchanged. See the `skills` doc comment.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).resolves.toBeUndefined();
  });

  it('rejects a non-executing row that records no exemption reason', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    await expect(
      assertContractCurrent(root, [
        {
          file: '.agents/skills/oat-project-fixture/SKILL.md',
          anchor: 'Step 1: Close Out',
          match: 'Dispatch `oat-project-summary` to produce the summary',
          classification: 'non-executing',
          skills: ['oat-project-summary'],
        },
      ]),
    ).rejects.toThrowError(/is non-executing but records no exemption reason/);
  });

  it('fails on a stray fence that would hide directives from the scanner', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Dispatch `oat-project-summary` to produce the summary: load the current',
        '`oat-project-summary/SKILL.md` and follow it, or dispatch a child that',
        'carries it.',
        '',
        '````markdown',
        '## Sample',
        '````',
        '',
        '````',
        '',
        '### Step 2: Hidden By The Stray Fence',
        '',
        'Run `oat-project-document` now.',
        '````',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /Fenced-code defects[\s\S]*oat-project-fixture\/SKILL\.md:13[\s\S]*duplicated closing fence/,
    );
  });

  it('fails on an unclosed fence in a bounded file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [COMPLIANT_FIXTURE, '```bash', 'echo "never closed"', ''].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(/Fenced-code defects[\s\S]*fence is never closed/);
  });

  it('fails when the bounded corpus shrinks below its floor', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX, CORPUS_MINIMUMS),
    ).rejects.toThrowError(
      new RegExp(
        `bounded surface shrank to 2 files \\(floor ${CORPUS_MINIMUMS.files}\\)` +
          `[\\s\\S]*fence-scan inventory shrank to 2 files \\(floor ${CORPUS_MINIMUMS.fenceScanFiles}\\)` +
          `[\\s\\S]*candidate sweep shrank to 1 sentences \\(floor ${CORPUS_MINIMUMS.candidates}\\)`,
      ),
    );
  });

  it('fails when a classified pointer disappears, leaving a dead matrix row', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        '# Fixture',
        '',
        '## Step 1: Close Out',
        '',
        'Nothing happens here.',
        '',
      ].join('\n'),
    );

    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(/no longer bind to a live call site/);
  });

  it('fails on a bare fence that opens onto a heading after prose', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        '````markdown',
        '## Printed Sample',
        '````',
        '',
        'Ordinary prose sits between the closing fence and the stray one, so the',
        'blank-gap rule cannot reach its heading test.',
        '',
        '````',
        '',
        '### Step 2: Hidden By The Stray Fence',
        '',
        'Run `oat-project-document` now.',
        '````',
        '',
      ].join('\n'),
    );

    // The shape rule 2 structurally cannot see. Its `gap` term requires only
    // blank lines between the previous closing fence and this opener; here the
    // gap is prose, so only the first-non-blank-body-line rule can fire.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /Fenced-code defects[\s\S]*bare fence opens directly onto a heading/,
    );
  });

  it('spares a printed console template that legitimately contains headings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        'The skill prints this dashboard verbatim:',
        '',
        '```',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'OAT Doctor',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '## Installed Packs',
        '',
        'workflows  ok',
        '```',
        '',
      ].join('\n'),
    );

    // Pins the discriminator. A "bare fence that swallows a heading" rule — the
    // shape the source item asked for — would report this legitimate console
    // template. The first-body-line test spares it because the body opens on a
    // rule, not a heading. Live instances: `oat-doctor/SKILL.md:231` and
    // `oat-project-document/SKILL.md:434`.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).resolves.toBeUndefined();
  });

  it('spares a bare four-backtick prompt template whose body opens on content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(
      root,
      [
        COMPLIANT_FIXTURE,
        'Dispatch each mapper with this prompt:',
        '',
        '````',
        '',
        'subagent_type: "Explore"',
        'description: "Map codebase architecture"',
        '',
        'Prompt:',
        'Focus: arch',
        '',
        'Format as:',
        '',
        '```markdown',
        '<content here>',
        '```',
        '',
        '## Include frontmatter:',
        '',
        '- oat_source_head_sha',
        '````',
        '',
      ].join('\n'),
    );

    // The executable disproof of the source item's acceptance criterion 2. A
    // `ticks >= 4` discriminator reports this block, which is exactly the shape
    // of the three repaired agent-prompt templates in
    // `oat-repo-knowledge-index/SKILL.md` at `:373`, `:424`, and `:475`.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).resolves.toBeUndefined();
  });

  it('scans skill markdown nested below references/', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);
    await writeFixtureFile(
      root,
      '.agents/skills/oat-fixture/references/templates/x.md',
      [
        '# Template',
        '',
        'Prose before the stray fence.',
        '',
        '````',
        '',
        '## Swallowed Guidance',
        '',
        '````',
        '',
      ].join('\n'),
    );

    // Two levels below `references/`, in a directory the bounded candidate
    // corpus never reads — the position that hid `glob-scoped-rule.md`. A
    // non-recursive walk passes this fixture.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).rejects.toThrowError(
      /Fenced-code defects[\s\S]*oat-fixture\/references\/templates\/x\.md/,
    );
  });

  it('surfaces a directory it cannot read instead of scanning less', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);

    // Called directly, not through `assertContractCurrent`: `collectBoundedFiles`
    // reads the same root first and would throw on its own, so routing this
    // through the suite entry point would pass whether or not the fence scan
    // swallows its errors. Asserting on the unit is the only way to pin it.
    await expect(collectFenceScanFiles(root)).rejects.toThrowError(
      /ENOENT|no such file or directory/,
    );

    // And the same call is genuinely productive at repository HEAD, so the
    // rejection above is about unreadability, not about the walk being inert.
    const live = await collectFenceScanFiles(
      resolve(process.cwd(), '..', '..'),
    );
    expect(live.length).toBeGreaterThan(CORPUS_MINIMUMS.fenceScanFiles);
    expect(live).toContain(
      '.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md',
    );
  });

  it('does not follow symlinks in the fence-scan inventory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-named-skill-load-'));
    tempDirs.push(root);
    await writeFixtureSkill(root, COMPLIANT_FIXTURE);

    const defect = [
      '# Outside',
      '',
      'Prose before the stray fence.',
      '',
      '````',
      '',
      '## Swallowed Guidance',
      '',
      '````',
      '',
    ].join('\n');
    await writeFixtureFile(root, 'outside.md', defect);
    await writeFixtureFile(root, 'outside-dir/nested.md', defect);

    await mkdir(join(root, '.agents/skills/oat-fixture/references/docs'), {
      recursive: true,
    });
    await symlink(
      '../../../../../outside.md',
      join(root, '.agents/skills/oat-fixture/references/docs/outside.md'),
    );
    await symlink(
      '../../../../outside-dir',
      join(root, '.agents/skills/oat-fixture/references/linked'),
    );

    // Both links must be live, or this case would pass for the wrong reason:
    // a broken link reports nothing either.
    await expect(
      readFile(
        join(root, '.agents/skills/oat-fixture/references/docs/outside.md'),
        'utf8',
      ),
    ).resolves.toContain('## Swallowed Guidance');
    await expect(
      readFile(
        join(root, '.agents/skills/oat-fixture/references/linked/nested.md'),
        'utf8',
      ),
    ).resolves.toContain('## Swallowed Guidance');

    // `isFile()` and `isDirectory()` are both false for a symlink, so the
    // linked file and the linked directory are skipped rather than scanned
    // through the link. Targets are scanned where they live.
    await expect(
      assertContractCurrent(root, FIXTURE_MATRIX),
    ).resolves.toBeUndefined();
  });
});
