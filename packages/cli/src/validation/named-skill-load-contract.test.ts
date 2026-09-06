import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
   * skill outside its matched rows' union is unclassified, so a new pointer
   * appended to an already-classified sentence cannot inherit its exemption.
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
  /\b(load|loads|loaded|loading|delegate|delegates|delegated|delegating|chain|chains|chained|chaining|invoke|invokes|invoked|invoking|dispatch|dispatches|dispatched|dispatching|route|routes|routed|routing|run|runs|ran|running|follow|follows|followed|following)\b/i;
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

/** Splits markdown prose into blank-line separated blocks, skipping fenced code. */
function collectProseBlocks(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  let fence: string | null = null;
  let buffer: string[] = [];
  let bufferLine = 0;
  let anchor = '(preamble)';

  const flush = (): void => {
    if (buffer.length === 0) return;
    const text = normalize(buffer.join(' '));
    if (text) blocks.push({ text, line: bufferLine, anchor });
    buffer = [];
  };

  for (const [index, line] of lines.entries()) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        flush();
        fence = marker;
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
      flush();
      anchor = line.replace(/^#{1,6}\s+/, '').trim();
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (buffer.length === 0) bufferLine = index + 1;
    buffer.push(line.replace(/^\s*(?:[-*+]|\d+\.|>)\s+/, '').trim());
  }
  flush();

  return blocks;
}

/** Section text keyed by heading, used by `scope: 'section'` rows. */
function collectSections(content: string): Map<string, string> {
  const lines = content.split(/\r?\n/);
  const sections = new Map<string, string>();
  let anchor = '(preamble)';
  let buffer: string[] = [];

  const flush = (): void => {
    const existing = sections.get(anchor) ?? '';
    sections.set(anchor, normalize(`${existing} ${buffer.join(' ')}`));
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      flush();
      anchor = line.replace(/^#{1,6}\s+/, '').trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return sections;
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

interface ScanResult {
  candidates: Candidate[];
  sections: Map<string, Map<string, string>>;
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

  return { candidates, sections };
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
  missingClauses: string[];
  malformedRows: string[];
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

async function inspectContract(
  repoRoot: string,
  matrix: readonly CallSiteRow[],
): Promise<ContractReport> {
  const { candidates, sections } = await scanBoundedSurface(repoRoot);

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

  return { unclassified, deadRows, missingClauses, malformedRows };
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

async function assertContractCurrent(
  repoRoot: string,
  matrix: readonly CallSiteRow[],
): Promise<void> {
  const report = await inspectContract(repoRoot, matrix);
  if (
    report.unclassified.length > 0 ||
    report.deadRows.length > 0 ||
    report.missingClauses.length > 0 ||
    report.malformedRows.length > 0
  ) {
    throw new Error(formatReport(report));
  }
}

const PLAN_WRITING_CONTRACT_CLAUSE =
  'load the current `oat-project-plan-writing/SKILL.md` and follow that contract as written';

const CALL_SITE_MATRIX: readonly CallSiteRow[] = [
  // ---------------------------------------------------------------- autonomous
  {
    file: '.agents/skills/oat-project-autonomous/SKILL.md',
    anchor: 'Step 0.5: Capability Detection and Tier Selection',
    match:
      'load the current `oat-project-dispatch-subagents/SKILL.md` and follow it',
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
    skills: ['oat-project-new', 'oat-project-quick-start'],
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
    match:
      'loading the current `oat-project-dispatch-subagents/SKILL.md`, following it',
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
    match: 'If direct skill invocation is unavailable',
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
      "it must not re-prompt, re-check, regenerate a declined summary, or run pr-final's push, PR-opening, or state-transition steps",
      'When skill loading is unavailable in the current host/runtime, the mapping below is the explicit inline fallback',
    ],
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
    skills: ['oat-project-new', 'oat-project-quick-start'],
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
    match:
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
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

  // ---------------------------------------------------------------------- plan
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Prerequisites',
    match: 'If missing, run the `oat-project-design` skill first',
    classification: 'non-executing',
    skills: ['oat-project-design'],
    reason: 'Terminal handoff: plan stops when design is missing.',
  },
  {
    file: '.agents/skills/oat-project-plan/SKILL.md',
    anchor: 'Prerequisites',
    match: 'to begin execution." **`import`**',
    classification: 'non-executing',
    skills: ['oat-project-implement'],
    reason: 'Quoted message telling the user which skill to run next.',
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
    match:
      'load the current `oat-project-plan-writing/SKILL.md` and follow its canonical format rules',
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
    match:
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
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
    match: 'If direct skill invocation is unavailable',
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
    anchor: 'Usage',
    match: 'Run `oat-project-progress` at any time to',
    classification: 'non-executing',
    skills: ['oat-project-progress'],
    reason: 'Usage documentation addressed to the user.',
  },

  // --------------------------------------------------------------- quick-start
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
    match:
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
    classification: 'load-required',
    skills: ['oat-project-plan-writing'],
    requires: [
      'Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written',
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
    file: '.agents/skills/oat-project-review-provide/SKILL.md',
    anchor: 'Recommended Next Step',
    match:
      'Run the `oat-project-review-receive` skill to convert findings into plan tasks',
    classification: 'non-executing',
    skills: ['oat-project-review-receive'],
    reason: 'Recommended next step printed to the user after the review ends.',
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
    const report = await inspectContract(repoRoot, CALL_SITE_MATRIX);

    expect(
      formatReport({
        ...report,
        deadRows: [],
        missingClauses: [],
        malformedRows: [],
      }),
    ).toBe('');
    expect(report.unclassified).toHaveLength(0);
  });

  it('keeps every load-required and explicit-fallback clause at its execution boundary', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(repoRoot, CALL_SITE_MATRIX);

    expect(report.missingClauses).toEqual([]);
  });

  it('keeps every matrix row bound to a live call site', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const report = await inspectContract(repoRoot, CALL_SITE_MATRIX);

    expect(
      report.deadRows.map(
        (row) => `${row.file} [${row.anchor}] ${row.match ?? ''}`,
      ),
    ).toEqual([]);
  });

  it('classifies the closeout and completion rows the outcome depends on', () => {
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
});
