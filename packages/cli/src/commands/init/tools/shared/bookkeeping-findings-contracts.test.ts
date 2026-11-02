import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * Bookkeeping-only review findings (m01, p10).
 *
 * The definition lives once in `.agents/docs/bookkeeping-findings.md` and is
 * vendored into each skill that receives reviews. `oat-project-review-receive`
 * applies it as one branch checked before every other handling mode, the
 * single exception to "`passed` is never written for completed fixes", and the
 * shared gate approval record carries the matching gate write rule.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const SHARED_DOC = '.agents/docs/bookkeeping-findings.md';
const VENDORED_DOC = 'references/docs/bookkeeping-findings.md';
const RECEIVE = '.agents/skills/oat-project-review-receive/SKILL.md';
const GATE_RECORD = '.agents/docs/gate-approval-record.md';
const AUTONOMY = '.agents/docs/autonomy-contract.md';
const NOTE = 'bookkeeping-only fixes applied at receive';

const VENDORING_SKILLS = ['oat-project-review-receive'] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function sliceBetween(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex < 0) {
    throw new Error(`Missing section start: ${start}`);
  }
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex < 0) {
    throw new Error(`Missing section end after ${start}: ${end}`);
  }
  return content.slice(startIndex, endIndex);
}

function section(doc: string, heading: string): string {
  const start = doc.indexOf(`\n## ${heading}\n`);
  if (start < 0) {
    throw new Error(`Missing doc section: ${heading}`);
  }
  const next = doc.indexOf('\n## ', start + 1);
  return doc.slice(start, next < 0 ? doc.length : next);
}

describe('shared bookkeeping definition', () => {
  const doc = readRepoFile(SHARED_DOC);

  it('defines bookkeeping as correcting a record of existing evidence or state', () => {
    const definition = normalize(section(doc, 'Definition'));

    expect(definition).toContain(
      'A finding is **bookkeeping** when it only asks to correct a record of existing evidence or state:',
    );
    for (const kind of [
      'a stale Reviews row cell or status label',
      'an archived-artifact path reference',
      'a derived counter',
      'a task-SHA list',
      'a progress label',
      'provenance wording',
    ]) {
      expect(definition, kind).toContain(kind);
    }
  });

  it('lists every exclusion, including the section 12.8 set-once fields', () => {
    const exclusions = normalize(section(doc, 'Exclusions'));

    expect(exclusions).toContain(
      'A finding is never bookkeeping when it asks for:',
    );
    for (const excluded of [
      'a missing review',
      'a requirement change',
      'an approval',
      'a new receipt',
      'completion of unfinished work',
      "an edit to a `**Status:**` acceptance marker, a Reviews row's `Reviewed Head`, or a set-once delivery field (brief contract section 12.8)",
    ]) {
      expect(exclusions, excluded).toContain(excluded);
    }
    // Severity is a separate dimension (Round 1 Q4).
    expect(exclusions).toContain(
      'A High finding can be bookkeeping, and a Low finding about content is still content.',
    );
  });

  it('counts a pointer copied from recorded journal state, never one inferred from commits', () => {
    const definition = normalize(section(doc, 'Definition'));

    expect(definition).toContain(
      'A pointer such as `oat_current_task` or another resume pointer is bookkeeping when the fix copies state the journal already records.',
    );
    expect(definition).toContain(
      'A pointer or a completion inferred from commits is never bookkeeping.',
    );
  });

  it('names the acceptance markers and treats the state.md summary Status line as a progress label', () => {
    const exclusions = normalize(section(doc, 'Exclusions'));

    expect(exclusions).toContain(
      'The `**Status:**` acceptance markers are the phase and task `**Status:**` lines in `implementation.md`.',
    );
    expect(exclusions).toContain(
      'The summary `**Status:**` line in `state.md` is a progress label.',
    );
  });

  it('states the three limits on the fix and voids a finding that would break one', () => {
    const limits = normalize(section(doc, 'Limits on the fix'));

    expect(limits).toContain(
      "The fix touches only the project's own tracking files under `.oat/projects/<scope>/<project>/`:",
    );
    expect(limits).toContain(
      'On goal paths the fix is a change brief contract section 12.8 permits: a correcting journal line is appended rather than a recorded one rewritten, approved brief sections are never edited, and Reviews-row edits are limited to status and date cells or a move to the archived counterpart artifact.',
    );
    expect(limits).toContain(
      'A Reviews Status cell is set to `passed` only by the bookkeeping-only receive branch for the review being received.',
    );
    expect(limits).toContain(
      'A finding whose fix would break any of them is not bookkeeping.',
    );
    // Exactly three numbered limits.
    expect([...limits.matchAll(/ \d\. \*\*/g)]).toHaveLength(3);
  });

  it('names the tracking files and never counts a requirement artifact as one', () => {
    const limits = normalize(section(doc, 'Limits on the fix'));

    expect(limits).toContain(
      "The fix touches only the project's own tracking files under `.oat/projects/<scope>/<project>/`: `state.md`, the tracking sections of `plan.md` (its Reviews table and progress totals), `implementation.md`, `project-log.md`, `summary.md`, and the project's review artifacts.",
    );
    expect(limits).toContain(
      'Requirement artifacts (`discovery.md`, `spec.md`, `design.md`) are never tracking files.',
    );
  });

  it("lets a fix correct another event's stale non-`passed` cells but never promote it, move its head or add its row", () => {
    const limits = normalize(section(doc, 'Limits on the fix'));

    expect(limits).toContain(
      'A bookkeeping fix never promotes any other review event.',
    );
    expect(limits).toContain(
      "It may correct another existing event's stale non-`passed` Status, Date or Artifact cell, monotonically (never moving a status backward), but never that event's `Reviewed Head`.",
    );
    expect(limits).toContain(
      'A missing row is not a stale cell: adding a row for another event is never bookkeeping.',
    );
  });

  it('leaves classification to the receiver and keeps the reviewer mark advisory', () => {
    const who = normalize(section(doc, 'Who classifies'));

    expect(who).toContain(
      'The receiving agent classifies each finding against this definition. A doubtful finding is not bookkeeping.',
    );
    expect(who).toContain('`(bookkeeping)` inside its bold finding title');
    expect(who).toContain(
      'it never changes a count, a severity or a verdict, the receiver decides',
    );
  });

  it('permits one fix commit, `passed` with the note, no reviewer, no cycle and no gate attempt', () => {
    const permits = normalize(
      section(doc, 'What an all-bookkeeping result permits'),
    );

    expect(permits).toContain(
      'has at least one finding and every finding is bookkeeping',
    );
    expect(permits).toContain(
      'fixes them all in one commit and writes a one-line note per finding in the receipt',
    );
    expect(permits).toContain(`\`passed\` with the note \`${NOTE}\``);
    expect(permits).toContain(
      'dispatches no reviewer and counts no review cycle',
    );
    expect(permits).toContain(
      'uses no attempt and does not relaunch the gate. The gate counts as satisfied (carrier `status: allowed`, `disposition: passed`), while its receipt keeps the raw verdict and counts.',
    );
    expect(permits).toContain(
      'A result with any finding that is not bookkeeping follows the existing flow unchanged',
    );
    expect(permits).toContain(
      'The rule never rewrites raw findings, severities, counts or verdicts.',
    );
    expect(permits).toContain(
      'never infers task or phase completion, waives a HiLL checkpoint, grants an approval, or accepts an unresolved Critical finding',
    );
    expect(permits).toContain(
      'Under `OAT_AUTONOMOUS=1` the rule applies without a stop.',
    );
  });

  it.each(VENDORING_SKILLS)('vendors the shared doc into %s', (skill) => {
    const vendored = join(REPO_ROOT, '.agents/skills', skill, VENDORED_DOC);
    expect(existsSync(vendored)).toBe(true);
    expect(realpathSync(vendored)).toBe(
      realpathSync(join(REPO_ROOT, SHARED_DOC)),
    );
  });

  it('ships the shared doc as a linked bundle input', () => {
    expect(readRepoFile('packages/cli/scripts/bundle-inputs.mjs')).toContain(
      `'${SHARED_DOC}'`,
    );
  });
});

describe('review-receive bookkeeping-only branch', () => {
  const skill = readRepoFile(RECEIVE);
  const step26 = sliceBetween(
    skill,
    '### Step 2.6: Select Review Handling Mode (Required)',
    '### Step 3: Determine Task Scope',
  );
  const branch = normalize(
    sliceBetween(
      step26,
      '**Bookkeeping-only mode (checked first, for every review type and invocation).**',
      '- If `oat_review_type == artifact`:',
    ),
  );

  it('sits before every other handling mode, fix-task creation and gate failure policy', () => {
    const branchIndex = step26.indexOf('**Bookkeeping-only mode');
    expect(branchIndex).toBeGreaterThan(-1);
    for (const later of [
      '- If `oat_review_type == artifact`:',
      '**Auto-disposition mode.**',
      '**Judgment-sweep mode.**',
      '- If `oat_review_type == code` (manual or `oat_review_invocation` absent):',
    ]) {
      expect(step26.indexOf(later), later).toBeGreaterThan(branchIndex);
    }
    expect(skill.indexOf('**Bookkeeping-only mode')).toBeLessThan(
      skill.indexOf('### Step 5: Convert Findings to Tasks'),
    );
    expect(branch).toContain(
      'Before any mode below, before fix-task creation, and before any gate failure policy',
    );
  });

  it('classifies against the vendored shared definition and treats doubt as not bookkeeping', () => {
    expect(branch).toContain(VENDORED_DOC);
    expect(branch).toContain('A doubtful finding is not bookkeeping');
    expect(branch).toContain(
      "reviewer's `(bookkeeping)` title mark is advisory only",
    );
  });

  it('fixes in one commit, notes each finding, records `passed` and skips re-review and the cycle count', () => {
    expect(branch).toContain('Fix every finding in one commit');
    expect(branch).toContain('write one note line per finding');
    expect(branch).toContain(
      `**Outcome:** passed — ${NOTE} (reviews/archived/$REVIEW_FILENAME)`,
    );
    expect(branch).toContain(
      "set the received review's Reviews event to `passed`",
    );
    expect(branch).toContain('Never set any other event to `passed`.');
    expect(branch).not.toContain("Never set any other event's Status.");
    expect(branch).toContain('Create no fix tasks, queue no execution records');
    expect(branch).toContain('no reviewer is dispatched again for this result');
    expect(branch).toContain(
      'skip Step 8 (this result counts no review cycle)',
    );
  });

  it("lets Step 6 correct another event's stale non-`passed` cells monotonically, beside 'update only that row'", () => {
    const step6 = normalize(
      sliceBetween(
        skill,
        '### Step 6: Update Plan.md',
        '### Step 7: Update Implementation.md',
      ),
    );
    const rowRule = step6.indexOf('then update only that row:');
    const allowance = step6.indexOf(
      'Beside "update only that row": a bookkeeping-only fix (Step 2.6) may also correct another existing event\'s stale non-`passed` Status, Date or Artifact cell, monotonically (never moving a status backward), but it never changes that event\'s `Reviewed Head` and never adds a missing row.',
    );

    expect(rowRule).toBeGreaterThan(-1);
    expect(allowance).toBeGreaterThan(rowRule);
    expect(allowance).toBeLessThan(step6.indexOf('**Status semantics (v1):**'));
    expect(step6).toContain(
      "or update a different event that happens to share the same scope/type, except for the bookkeeping-only correction of an existing event's stale non-`passed` cells described above.",
    );
  });

  it('hands a gate result to its owner as satisfied with the raw counts kept', () => {
    expect(branch).toContain(
      "writes its carrier `allowed` / `passed` under the shared gate carrier record's bookkeeping-only write rule, uses no attempt and does not relaunch the gate",
    );
    expect(branch).toContain(
      "The receipt's `**Findings:**` line keeps the gate's raw counts exactly as reported.",
    );
  });

  it('leaves any result with a non-bookkeeping finding to the existing modes', () => {
    expect(normalize(step26)).toContain(
      'A result with any finding that is not bookkeeping skips this mode entirely and follows the modes below for every finding, the bookkeeping ones included.',
    );
  });

  it('states the single exception to the `passed` rule next to the pinned note', () => {
    const cleanPass = normalize(
      sliceBetween(
        skill,
        '**If Critical + High + Medium == 0:**',
        '### Step 2.5:',
      ),
    );
    const rule =
      'If fixes exist, use `fixes_completed` until a re-review passes.';
    const exception = `Single exception: a bookkeeping-only result (Step 2.6) is recorded \`passed\` after its fixes land, with the note \`${NOTE}\`. That is the only case where \`passed\` follows completed fixes without a re-review, and it applies only to the review being received.`;

    expect(cleanPass).toContain(rule);
    expect(cleanPass).toContain(exception);
    expect(cleanPass.indexOf(exception)).toBeGreaterThan(
      cleanPass.indexOf(rule),
    );
    // The exception is stated once, not as a second competing rule.
    expect(normalize(skill).split('Single exception:')).toHaveLength(2);
    // Status semantics and the fix-task route name the same exception.
    expect(normalize(skill)).toContain(
      'this is the single exception to the re-review requirement above, and no other writer sets `passed` for bookkeeping fixes',
    );
    expect(normalize(skill)).toContain(
      'A bookkeeping-only result (Step 2.6) has no fix tasks and never takes this route',
    );
  });

  it('takes the goal clean-receive transition and writes delivering only on `status: ok`', () => {
    const goal = normalize(
      sliceBetween(
        skill,
        '**Goal mode (`oat_workflow_mode: goal`).**',
        '### Step 4: Determine Next Task IDs',
      ),
    );

    expect(goal).toContain(
      'A bookkeeping-only result (Step 2.6) queues no fixes, so it takes this clean-receive transition after its fix commit lands',
    );
    expect(goal).toContain('the delivery check runs against the committed fix');
    expect(goal).toContain(
      'Write `reviewing → delivering` (or advance the recovery record) only on `status: ok`.',
    );
    expect(goal).toContain(
      'A stale or otherwise not-`ok` result follows the interpretations above unchanged; the branch never edits evidence to make the check pass.',
    );
  });

  it('routes onward without the fix-task menu or the artifact re-review option', () => {
    const step10 = normalize(
      sliceBetween(skill, '### Step 10: Route to Next Action', '### Step 10A:'),
    );
    const step10a = normalize(
      sliceBetween(skill, '### Step 10A:', '### Step 11: Output Summary'),
    );

    expect(step10).toContain(
      '**Bookkeeping-only result (Step 2.6):** no fix tasks exist, so skip the menu below.',
    );
    expect(step10a).toContain(
      'A bookkeeping-only result (Step 2.6) skips the re-review option below: continue the phase flow with the review recorded `passed`.',
    );
    expect(normalize(skill)).toContain(`Review cycle: not counted (${NOTE})`);
  });
});

describe('review-receive cycle count skips bookkeeping-only results', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function cycleCountScript(): string {
    const step8 = sliceBetween(
      readRepoFile(RECEIVE),
      '### Step 8: Check Review Cycle Count',
      '### Step 8.5: Final Scope Deferred-Medium Resurfacing',
    );
    const fence = /```bash\n([\s\S]*?)```/.exec(step8);
    if (!fence?.[1]) {
      throw new Error('Step 8 is missing its cycle-count snippet');
    }
    return fence[1];
  }

  function countCycles(journal: string): number {
    const project = mkdtempSync(join(tmpdir(), 'oat-bookkeeping-cycles-'));
    tempDirs.push(project);
    mkdirSync(join(project, 'reviews', 'archived'), { recursive: true });
    const artifact = (name: string, invocation: string) =>
      writeFileSync(
        join(project, 'reviews', 'archived', name),
        `---\noat_review_scope: p03\noat_review_invocation: ${invocation}\n---\n`,
      );
    artifact('p03-review-2026-11-01T100000Z.md', 'auto');
    artifact('p03-review-2026-11-01T110000Z.md', 'auto');
    artifact('p03-review-2026-11-01T120000Z.md', 'gate');
    writeFileSync(join(project, 'implementation.md'), journal);
    const output = execFileSync('/bin/bash', ['-c', cycleCountScript()], {
      env: { ...process.env, PROJECT_PATH: project, SCOPE_TOKEN: 'p03' },
      encoding: 'utf8',
    });
    return Number(output.trim());
  }

  it('excludes an artifact whose receipt records the bookkeeping-only outcome', () => {
    const plain = countCycles('# Implementation\n');
    const settled = countCycles(
      `# Implementation\n\n**Outcome:** passed — ${NOTE} (reviews/archived/p03-review-2026-11-01T110000Z.md)\n`,
    );

    // Two non-gate review artifacts are two cycles; the gate artifact never counts.
    expect(plain).toBe(2);
    // The bookkeeping-only result counted no cycle.
    expect(settled).toBe(1);
  });
});

describe('gate approval record bookkeeping-only write rule', () => {
  const doc = readRepoFile(GATE_RECORD);
  const flat = normalize(doc);

  it('adds the write-rule row for a gate blocked only by bookkeeping findings', () => {
    expect(doc).toMatch(
      /\| Blocked only by bookkeeping findings fixed at receive\s*\| `allowed` \/ `passed` \(no attempt counted, no relaunch\)\s*\|/,
    );
  });

  it('keeps the gate reviewed head and the raw verdict and counts in the receipt', () => {
    expect(flat).toContain(
      "When a blocking gate result's findings are all bookkeeping under the shared definition (`bookkeeping-findings.md`",
    );
    expect(flat).toContain(
      'the gate is satisfied: write `allowed` / `passed`. No attempt is counted and the gate is not relaunched.',
    );
    expect(flat).toContain(
      '`reviewed_head` stays the commit the gate reviewed, never the fix commit.',
    );
    expect(flat).toContain(
      `The gate receipt keeps the raw verdict and counts: the \`### Review Received\` receipt's \`**Findings:**\` line and the gate's terminal line under \`## Reviews and Gates\` record the reported verdict and counts unchanged, with the note \`${NOTE}\`.`,
    );
    expect(flat).toContain(
      'A result with any finding that is not bookkeeping follows the rows above unchanged.',
    );
  });
});

describe('REVIEWRECEIVE autonomy rows', () => {
  const contract = readRepoFile(AUTONOMY);

  function row(id: string): string {
    const line = contract
      .split('\n')
      .find((entry) => entry.startsWith(`| ${id} `));
    if (!line) {
      throw new Error(`Missing autonomy row ${id}`);
    }
    return normalize(line);
  }

  it.each([
    ['REVIEWRECEIVE-01', 'is fixed in one commit and recorded `passed`'],
    ['REVIEWRECEIVE-02', 'counts no review cycle'],
    [
      'REVIEWRECEIVE-06',
      'a blocking gate result settled this way uses no attempt and is not relaunched',
    ],
    [
      'REVIEWRECEIVE-07',
      'is recorded `passed` and continues without re-review',
    ],
  ])('%s applies the bookkeeping-only rule', (id, clause) => {
    const text = row(id);
    expect(text).toContain(
      'a bookkeeping-only result (`bookkeeping-findings.md`)',
    );
    expect(text).toContain(clause);
  });

  it('REVIEWRECEIVE-09 keeps the unresolved-Critical boundary', () => {
    const text = row('REVIEWRECEIVE-09');
    expect(text).toContain('never pass while a Critical remains unresolved');
    expect(text).toContain(
      'a bookkeeping repair never infers completion, waives HiLL, grants approval or accepts an unresolved Critical',
    );
  });
});
