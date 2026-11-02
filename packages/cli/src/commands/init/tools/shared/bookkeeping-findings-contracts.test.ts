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

const PHASE_EXECUTION =
  '.agents/skills/oat-project-implement/references/phase-execution.md';
const CLOSEOUT =
  '.agents/skills/oat-project-implement/references/completion-and-closeout.md';

const VENDORING_SKILLS = [
  'oat-project-review-receive',
  'oat-project-implement',
  'oat-project-quick-start',
  'oat-project-plan',
  'oat-project-import-plan',
  'oat-project-brief',
  'oat-project-goal',
  'oat-project-lite',
  'oat-project-discover',
  'oat-project-design',
  'oat-project-plan-writing',
] as const;

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
      'A structured `plan` review never passes through review-receive: for it, step 6 of the Auto Artifact-Review Loop in `oat-project-plan-writing` acts as that receive branch.',
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
    expect(limits).toContain(
      "Receive moves or archives a review artifact and never edits it: a bookkeeping fix never changes a review artifact's findings, frontmatter or provenance.",
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

describe('implement phase review loop and phase gate (p11)', () => {
  const doc = readRepoFile(PHASE_EXECUTION);
  const loop = sliceBetween(
    doc,
    '#### Bounded Fix and Re-Review Loop',
    '### Optional External Phase Review Gate',
  );
  const branch = normalize(
    sliceBetween(
      loop,
      '**Bookkeeping-only round (checked first).**',
      'On Critical/High findings:',
    ),
  );

  it('settles an all-bookkeeping round before the bounded fix loop starts', () => {
    expect(loop.indexOf('**Bookkeeping-only round (checked first).**')).toBe(
      loop.indexOf('**Bookkeeping-only round'),
    );
    expect(loop.indexOf('**Bookkeeping-only round')).toBeLessThan(
      loop.indexOf('On Critical/High findings:'),
    );
    expect(branch).toContain(VENDORED_DOC);
    expect(branch).toContain('A doubtful finding is not bookkeeping.');
    expect(branch).toContain(
      'When the round has at least one finding and every finding is bookkeeping, this loop does not run.',
    );
    expect(branch).toContain(
      "The root fixes them all in one commit confined to the project's tracking files",
    );
    expect(branch).toContain(`\`passed\` with the note \`${NOTE}\``);
    expect(branch).toContain(
      'No phase implementer is resumed in `mode: fix`, no new reviewer round is dispatched, and no round of `oat_orchestration_retry_limit` is consumed.',
    );
    expect(branch).toContain(
      "In brief modes the fix commit is bookkeeping and does not advance the phase's `**Head:**`.",
    );
    expect(branch).toContain(
      'A round with any finding that is not bookkeeping runs the loop below unchanged, for every finding in it.',
    );
    // Today's loop is untouched beside the branch.
    expect(normalize(loop)).toContain(
      '4. Dispatch one new root-owned reviewer round against the updated range. 5. Repeat until pass or retry exhaustion.',
    );
  });

  it('treats a blocked phase gate with only bookkeeping findings as passed, with no retry and no relaunch', () => {
    const gate = normalize(
      sliceBetween(
        doc,
        '### Optional External Phase Review Gate',
        '#### Reviews Ledger Mutation Contract',
      ),
    );
    const blocked =
      '- `blocked`: consume blocking findings, route fixes to the original phase implementer under the bounded loop, then re-run root review and the gate.';
    const settled = gate.indexOf(
      '- `blocked` with only bookkeeping findings (checked before the bullet above):',
    );

    expect(gate).toContain(blocked);
    expect(settled).toBeGreaterThan(gate.indexOf(blocked));
    const bullet = gate.slice(settled, gate.indexOf('- target execution'));
    expect(bullet).toContain(VENDORED_DOC);
    expect(bullet).toContain(`\`passed\` with the note \`${NOTE}\``);
    expect(bullet).toContain('the gate has passed for this phase');
    expect(bullet).toContain(
      'Route no fixes to the phase implementer, re-run neither root review nor the gate, and consume no gate retry round.',
    );
    expect(bullet).toContain(
      "The receipt and the gate's terminal line under `## Reviews and Gates` keep the raw verdict and counts.",
    );
    expect(bullet).toContain('A phase gate writes no carrier.');
  });

  it('lets a bookkeeping-only round or gate complete the phase row like a pass', () => {
    const step7b = normalize(
      sliceBetween(
        doc,
        '#### Step 7b: Post-Review Bookkeeping',
        '### Step 8: Check Plan Phase Completion',
      ),
    );
    const transitions = step7b.indexOf('Phase row transitions:');
    const rule = step7b.indexOf(
      'A review round or a `blocked` gate settled as bookkeeping-only (Bounded Fix and Re-Review Loop, Optional External Phase Review Gate) queues nothing and counts as a passing review or a passed gate for these transitions.',
    );

    expect(transitions).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(transitions);
    expect(step7b).toContain(
      'A `blocked` gate keeps the row `in_progress` through the bounded fix loop; gate retry exhaustion sets it `blocked`.',
    );
  });
});

describe('implement final review, exit gate and milestone exit gate (p11)', () => {
  const doc = readRepoFile(CLOSEOUT);
  const step13 = normalize(
    sliceBetween(doc, '### Step 13: Trigger Final Review', '### Step 14:'),
  );
  const step14 = normalize(
    sliceBetween(
      doc,
      '### Step 14: Gate Execution',
      '### Step 15: Final HiLL Closeout Sequence',
    ),
  );

  it('continues past an all-bookkeeping final review with no re-review, on both routes', () => {
    const autonomousFixes =
      '- If receive creates fix tasks, return through the normal bounded implement and re-review loop.';
    const autonomous = step13.indexOf(
      '- A bookkeeping-only result (review-receive Step 2.6, under `references/docs/bookkeeping-findings.md`) creates no fix tasks and records the final Reviews row `passed` with the note `bookkeeping-only fixes applied at receive`, so the run continues to Step 14 with no further reviewer dispatch and no review cycle counted.',
    );
    expect(autonomous).toBeGreaterThan(step13.indexOf(autonomousFixes));

    const loopLine =
      '- Loop until final review passes (max 3 cycles per oat-project-review-receive)';
    const interactive = step13.indexOf(
      '- If every finding is bookkeeping (`references/docs/bookkeeping-findings.md`): receive fixes them in one tracking-file commit, adds no fix tasks and records the final review `passed` with the note `bookkeeping-only fixes applied at receive`; continue to Step 14 with no re-review and no cycle counted',
    );
    expect(interactive).toBeGreaterThan(step13.indexOf(loopLine));
  });

  it('persists a bookkeeping-only exit gate result as allowed/passed with no attempt and no rerun', () => {
    const okRule =
      '- After successful receive, `ok` persists `allowed/passed`. Apply the persisted `on_failure` policy only to a validated, receive-eligible `blocked` envelope after its eligible receive is durably completed.';
    const settled = step14.indexOf(
      '- After successful receive, a `blocked` envelope that review-receive settled in its bookkeeping-only mode',
    );

    expect(step14).toContain(okRule);
    expect(settled).toBeGreaterThan(step14.indexOf(okRule));
    const bullet = step14.slice(
      settled,
      step14.indexOf('- `block` outcomes consume remediation attempts'),
    );
    expect(bullet).toContain(VENDORED_DOC);
    expect(bullet).toContain(`receipt Outcome \`passed — ${NOTE}\``);
    expect(bullet).toContain(
      "persists `allowed/passed` under the shared gate record's bookkeeping-only write rule.",
    );
    expect(bullet).toContain(
      'It skips `on_failure`, leaves `attempts_completed` unchanged, starts no remediation or rerun, and keeps `reviewed_head` and `implementation_fingerprint` at the gate-reviewed basis;',
    );
    expect(bullet).toContain(
      "`envelope_status` stays `blocked`, and the gate's terminal line keeps the raw verdict and counts.",
    );
    expect(bullet).toContain(
      "The fix commit lies between `receive_pre_head` and the receive bookkeeping commit; reconciliation accepts it only when its diff stays inside the project's tracking files.",
    );
    expect(bullet).toContain(
      'Under `effective-delta-v2` it changes only paths inside the exclusion set (`.oat/projects`), so the allowed generation stays fresh.',
    );
    expect(bullet).toContain(
      'That holds for a project under the default `.oat/projects/` root; a project whose `projects.root` lies outside it, or a legacy v1 generation, goes stale and follows the stale-generation rule.',
    );
    // The attempt rule it sits beside is unchanged.
    expect(step14).toContain(
      '- `block` outcomes consume remediation attempts only after a valid configured gate result and its eligible receive disposition are durably processed. Increment `attempts_completed` before remediation/rerun.',
    );
  });

  it('keeps a bookkeeping-only exit gate result out of the onFailure policies', () => {
    const policies = sliceBetween(
      step14,
      '5. Do not route policy from a generic nonzero exit.',
      '**Complexity review at `maxAttempts`.**',
    );
    const warn = policies.indexOf(
      '- `warn`: persist the warned allowance and failure details before continuing.',
    );
    const branch = policies.indexOf(
      'A `blocked` envelope that receive settled as bookkeeping-only never reaches these policies:',
    );

    expect(warn).toBeGreaterThan(-1);
    expect(branch).toBeGreaterThan(warn);
    expect(policies).toContain(
      'with no remediation attempt consumed and no gate rerun. A result with any finding that is not bookkeeping follows the policies above unchanged.',
    );
    expect(policies).toContain(
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
    );
  });

  it('relies on the effective-delta v2 exclusion of project tracking paths', () => {
    // The bookkeeping fix stays fresh only because v2 excludes these paths.
    for (const pathspec of [
      ':(exclude,literal)$PROJECT_PATH/state.md',
      ':(exclude,literal).oat/projects',
      ':(exclude,literal).oat/repo',
    ]) {
      expect(step14, pathspec).toContain(pathspec);
    }
  });

  it('writes the milestone exit carrier allowed/passed for a bookkeeping-only result, with the stale fallback', () => {
    const milestone = normalize(
      sliceBetween(
        doc,
        '### Goal Milestone Closeout',
        '**Terminal `pr` step.**',
      ),
    );
    const blockedRule =
      'A blocked outcome records `status: blocked`, `disposition: null`, and no transition. This carrier is never `oat_implement_exit_gate`.';
    const settled = milestone.indexOf(
      'A blocking result that receive settled as bookkeeping-only (every finding bookkeeping under `references/docs/bookkeeping-findings.md`) records `status: allowed`, `disposition: passed`',
    );

    expect(milestone).toContain(blockedRule);
    expect(settled).toBeGreaterThan(milestone.indexOf(blockedRule));
    expect(settled).toBeLessThan(
      milestone.indexOf('3. **Read freshness before any transition.**'),
    );
    expect(milestone).toContain(
      "under the shared gate record's bookkeeping-only write rule, uses no attempt and is not relaunched; `reviewed_head` stays the head the gate reviewed.",
    );
    expect(milestone).toContain(
      'Its fix commit must be a section 12.8 bookkeeping successor, so step 3 decides whether it stands: when the `exit` result reads stale because of that commit, persist `status: blocked`, `disposition: null` and handle the result under `onFailure` and `maxAttempts` as before, the attempt included.',
    );
  });
});

describe('effective-delta v2 exclusions leave a tracking-only fix out of the delta (p11)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function git(cwd: string, ...args: string[]): string {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_AUTHOR_NAME: 'oat',
        GIT_AUTHOR_EMAIL: 'oat@example.invalid',
        GIT_COMMITTER_NAME: 'oat',
        GIT_COMMITTER_EMAIL: 'oat@example.invalid',
      },
    });
  }

  function commitFile(cwd: string, path: string, body: string): void {
    mkdirSync(join(cwd, path, '..'), { recursive: true });
    writeFileSync(join(cwd, path), body);
    git(cwd, 'add', '--', path);
    git(cwd, 'commit', '-q', '--no-verify', '-m', path);
  }

  it('hashes the same delta before and after a tracking-only fix commit, and a different one after a code change', () => {
    const closeout = readRepoFile(CLOSEOUT);
    const project = '.oat/projects/shared/demo';
    // The exact literal pathspecs the closeout contract names, read from it.
    const pathspecs = [
      ...closeout.matchAll(/`(:\(exclude,literal\)[^`]+)`/g),
    ].map((match) => match[1]!.replace('$PROJECT_PATH', project));
    expect(pathspecs).toEqual([
      `:(exclude,literal)${project}/state.md`,
      ':(exclude,literal).oat/projects',
      ':(exclude,literal).oat/repo',
    ]);

    const repo = mkdtempSync(join(tmpdir(), 'oat-bookkeeping-delta-'));
    tempDirs.push(repo);
    git(repo, 'init', '-q', '-b', 'main');
    commitFile(repo, 'README.md', 'base\n');
    const base = git(repo, 'rev-parse', 'HEAD').trim();
    commitFile(repo, 'src/feature.ts', 'export const x = 1;\n');
    commitFile(repo, `${project}/plan.md`, '| p01 | code | received |\n');

    const delta = () =>
      git(
        repo,
        'diff',
        '--raw',
        '-z',
        '--no-renames',
        '--no-abbrev',
        `${base}..HEAD`,
        '--',
        '.',
        ...pathspecs,
      );
    const reviewed = delta();

    // A bookkeeping-only fix: Reviews cell, journal note, state pointer.
    commitFile(repo, `${project}/plan.md`, '| p01 | code | passed |\n');
    commitFile(repo, `${project}/implementation.md`, '- note\n');
    commitFile(repo, `${project}/state.md`, 'oat_current_task: p02\n');
    expect(delta()).toBe(reviewed);

    // Control: a code change after the review changes the delta.
    commitFile(repo, 'src/feature.ts', 'export const x = 2;\n');
    expect(delta()).not.toBe(reviewed);
  });
});

describe('planning skill gate executions (p11)', () => {
  function skillDoc(skill: string): string {
    return readRepoFile(`.agents/skills/${skill}/SKILL.md`);
  }

  function gateSection(skill: string, heading: string): string {
    const doc = skillDoc(skill);
    const start = doc.indexOf(`\n${heading}\n`);
    if (start < 0) {
      throw new Error(`${skill} is missing ${heading}`);
    }
    const next = doc.indexOf('\n### ', start + heading.length + 1);
    return normalize(doc.slice(start, next < 0 ? doc.length : next));
  }

  const BRANCH_OPENING =
    'A receive-eligible `blocked` result that review-receive settled in its bookkeeping-only mode (every finding bookkeeping under `references/docs/bookkeeping-findings.md`, fixed in one tracking-file commit, receipt Outcome `passed — bookkeeping-only fixes applied at receive`) has satisfied the gate: skip `onFailure`,';
  const BRANCH_CLOSE =
    'A result with any finding that is not bookkeeping follows the policies above unchanged.';

  it.each([
    [
      'oat-project-quick-start',
      '### Gate Execution',
      '- `warn`: record the gate failure and continue.',
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
      'count no attempt toward `maxAttempts`, and do not re-run the gate. Persist it as `allowed/passed` below.',
    ],
    [
      'oat-project-plan',
      '### Gate Execution',
      '- `warn`: record the gate failure and continue.',
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
      'count no attempt toward `maxAttempts`, and do not re-run the gate.',
    ],
    [
      'oat-project-import-plan',
      '### Gate Execution',
      '- `warn`: record the gate failure and continue.',
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
      'count no attempt toward `maxAttempts`, and do not re-run the gate.',
    ],
    [
      'oat-project-discover',
      '### Step 12: Gate Execution',
      '- `warn`: record the gate failure and continue.',
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
      'count no attempt toward `maxAttempts`, and do not re-run the gate.',
    ],
    [
      'oat-project-design',
      '### Step 7: Gate Execution',
      '- `warn`: record the gate failure and continue.',
      '- `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`).',
      'count no attempt toward `maxAttempts`, and do not re-run the gate.',
    ],
    [
      'oat-project-brief',
      '### Gate Execution',
      '- `warn`: record the validated gate failure and continue.',
      '- `block`: remediate and re-run the gate up to `maxAttempts` attempts (default `2`);',
      'count no attempt toward `maxAttempts`, and do not re-run the gate. Persist it as `allowed/passed` below.',
    ],
    [
      'oat-project-goal',
      '### Gate Execution',
      '- `warn`: record the validated gate failure and continue.',
      '- `block`: remediate and re-run the gate up to `maxAttempts` attempts (default `2`);',
      'count no attempt toward `maxAttempts`, and do not re-run the gate. Hold it as an allowed `passed` outcome for Step 3.7.',
    ],
    [
      'oat-project-lite',
      '### Gate Execution',
      '- `warn`: record the validated gate failure and continue.',
      '- `block`: remediate and retry up to the configured limit;',
      'count no attempt toward the configured limit, and do not re-run the gate.',
    ],
  ])(
    '%s satisfies a bookkeeping-only blocked gate beside its onFailure policies',
    (skill, heading, warn, block, clause) => {
      const gate = gateSection(skill, heading);
      const warnIndex = gate.indexOf(warn);
      const branchIndex = gate.indexOf(BRANCH_OPENING);

      expect(gate, `${skill} keeps its block policy`).toContain(block);
      expect(warnIndex, `${skill} warn bullet`).toBeGreaterThan(-1);
      expect(
        branchIndex,
        `${skill} branch follows the policies`,
      ).toBeGreaterThan(warnIndex);
      const branch = gate.slice(branchIndex);
      expect(branch, skill).toContain(clause);
      expect(branch.indexOf(BRANCH_CLOSE), skill).toBeGreaterThan(
        branch.indexOf(clause),
      );
    },
  );

  it.each(['oat-project-quick-start', 'oat-project-brief'])(
    '%s persists a bookkeeping-only gate as allowed/passed beside the passed row',
    (skill) => {
      const gate = gateSection(skill, '### Gate Execution');
      const passed = gate.indexOf('- passed: `allowed/passed`;');
      const settled = gate.indexOf(
        '- `blocked` only by bookkeeping findings settled at receive: `allowed/passed`, with no attempt counted and no relaunch;',
      );

      expect(passed).toBeGreaterThan(-1);
      expect(settled).toBeGreaterThan(passed);
    },
  );

  it.each([
    [
      'oat-project-brief',
      '- Fold minor, artifact-local findings into the brief without changing intent.',
    ],
    [
      'oat-project-goal',
      'Disposition of findings (`GOAL-09`): fold minor, artifact-local findings',
    ],
  ])(
    '%s routes an all-bookkeeping artifact review through the shared loop branch',
    (skill, disposition) => {
      const step36 = normalize(
        sliceBetween(skillDoc(skill), '### Step 3.6:', '### Gate Execution'),
      );
      const branch = step36.indexOf(
        "When every finding is bookkeeping under `references/docs/bookkeeping-findings.md`, the shared loop's bookkeeping-only branch applies: one tracking-file commit, a note per finding, the `plan` row `passed` with the note `bookkeeping-only fixes applied at receive`, and no re-run.",
      );

      expect(step36.indexOf(disposition)).toBeGreaterThan(-1);
      expect(branch).toBeGreaterThan(step36.indexOf(disposition));
    },
  );
});

describe('plan-writing auto artifact-review loop (p11)', () => {
  const doc = readRepoFile('.agents/skills/oat-project-plan-writing/SKILL.md');
  const loop = normalize(
    sliceBetween(
      doc,
      '## Auto Artifact-Review Loop',
      '## Canonical Plan Format',
    ),
  );

  it('settles an all-bookkeeping plan result without a new attempt or retry', () => {
    const clean = loop.indexOf(
      '- If the structured review is clean, proceed to outcome recording.',
    );
    const branch = loop.indexOf(
      '- Bookkeeping-only result (`plan` target, checked before the bullets below):',
    );
    const highFixes = loop.indexOf(
      '- Apply Critical and High fixes by default when they are local to the reviewed artifact and the fix is unambiguous.',
    );

    expect(clean).toBeGreaterThan(-1);
    expect(branch).toBeGreaterThan(clean);
    expect(highFixes).toBeGreaterThan(branch);
    const text = loop.slice(branch, highFixes);
    expect(text).toContain(VENDORED_DOC);
    expect(text).toContain('a doubtful finding is not bookkeeping');
    expect(text).toContain(
      "apply them all in one commit confined to the project's tracking files",
    );
    expect(text).toContain(
      'This starts no new review attempt and consumes no retry.',
    );
    expect(text).toContain(
      'A result with any finding that is not bookkeeping follows the bullets below unchanged.',
    );
    // The retry rule it bypasses is unchanged.
    expect(loop).toContain(
      '- Each rewrite/re-dispatch cycle consumes one retry.',
    );
  });

  it('records the plan row passed with the note, never as a clean review', () => {
    const plainRow = loop.indexOf(
      '- For `plan`, update the `plan` artifact row in the Reviews table without deleting any existing rows. Use `passed` when clean;',
    );
    const settled = loop.indexOf(
      `- For a bookkeeping-only \`plan\` result (step 4), use \`passed\` with the note \`${NOTE}\` and one line per finding in the lifecycle output; never report it as a clean review.`,
    );

    expect(plainRow).toBeGreaterThan(-1);
    expect(settled).toBeGreaterThan(plainRow);
  });
});

describe('brief contract bookkeeping-only settlement (p11)', () => {
  const contract = readRepoFile(
    '.agents/skills/oat-project-brief/references/brief-contract.md',
  );

  function contractSection(heading: string): string {
    const start = contract.indexOf(`\n${heading}\n`);
    if (start < 0) {
      throw new Error(`Missing brief contract section: ${heading}`);
    }
    const next = contract.indexOf('\n#', start + heading.length + 1);
    return normalize(contract.slice(start, next < 0 ? contract.length : next));
  }

  it('settles a bookkeeping-only result in the review ladder without a correction round', () => {
    const ladder = contractSection('## 5. Review ladder');
    const exhausted =
      'Exhausted correction rounds never convert blocking findings into acceptance.';
    const settled = ladder.indexOf(
      'A review or gate result whose every finding is bookkeeping under the shared definition (`bookkeeping-findings.md`, vendored as `references/docs/bookkeeping-findings.md`) is settled at receive:',
    );

    expect(ladder).toContain(exhausted);
    expect(settled).toBeGreaterThan(ladder.indexOf(exhausted));
    expect(ladder).toContain(
      `the review recorded \`passed\` with the note \`${NOTE}\`, no re-review and no review cycle, and for a gate no attempt and no rerun.`,
    );
    expect(ladder).toContain(
      'That settlement is not a correction round and turns no other finding into acceptance.',
    );
    expect(ladder).toContain('(reruns bounded by its `maxAttempts`)');
  });

  it('keeps a bookkeeping-only result off the queued-fix route and behind the delivery check', () => {
    const goalLadder = contractSection(
      '### 12.5 Goal exception to the shared ladder',
    );
    const route =
      '5. a received `passed` review with a fresh allowed carrier → delivery.';
    const settled = goalLadder.indexOf(
      'A bookkeeping-only result (section 5) queues no fixes, so it never takes the first route.',
    );

    expect(settled).toBeGreaterThan(goalLadder.indexOf(route));
    expect(goalLadder).toContain(
      'A blocking milestone exit gate settled that way records its `exit` carrier `allowed`/`passed` with no attempt and no rerun',
    );
    expect(goalLadder).toContain(
      'Both stand only while `oat project delivery check` reads the evidence fresh after that commit; a stale result follows the routing above.',
    );
    expect(goalLadder).toContain(
      'queued fixes invalidate both the integrated-review and the exit-gate evidence, so the gate runs again before the next integrated review.',
    );
  });

  it('makes a goal-path bookkeeping fix a section 12.8 bookkeeping successor', () => {
    const freshness = contractSection(
      '### 12.8 Bookkeeping-successor freshness',
    );

    expect(freshness).toContain(
      'A bookkeeping-only review or gate fix (section 5) on a goal path is a change this section permits, so its commit is a bookkeeping successor of the evidence it follows. A fix this section would call substantive is not bookkeeping.',
    );
  });
});

describe('autonomy rows for the implement and planning paths (p11)', () => {
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

  const GATE =
    'a `blocked` result whose every finding is bookkeeping (`bookkeeping-findings.md`) is settled at receive without a stop: the gate is satisfied, no attempt is counted and it is not relaunched';
  const LOOP =
    'a result whose every finding is bookkeeping (`bookkeeping-findings.md`) is fixed in one tracking-file commit and recorded `passed` with no re-review and no retry';
  const GUARD =
    'a bookkeeping repair never infers completion, waives HiLL, grants approval or accepts an unresolved Critical';

  it.each([
    'QS-12',
    'LITE-09',
    'BRIEF-10',
    'GOAL-10',
    'DISC-08',
    'DES-08',
    'PLAN-11',
    'IMPORT-09',
    'IMPLEMENT-18',
  ])('%s satisfies an all-bookkeeping blocked gate with no attempt', (id) => {
    expect(row(id)).toContain(GATE);
  });

  it.each(['QS-11', 'LITE-08', 'BRIEF-09', 'GOAL-09', 'PLAN-09', 'IMPORT-08'])(
    '%s settles an all-bookkeeping artifact review with no re-review',
    (id) => {
      expect(row(id)).toContain(LOOP);
    },
  );

  it('IMPLEMENT-12 and IMPLEMENT-18 keep the boundary guard', () => {
    expect(row('IMPLEMENT-12')).toContain(
      'a bookkeeping-only final review result (`bookkeeping-findings.md`) is recorded `passed` and continues to the exit gate with no re-review and no cycle counted',
    );
    expect(row('IMPLEMENT-12')).toContain(GUARD);
    expect(row('IMPLEMENT-18')).toContain(
      'persisting `allowed/passed` with `attempts_completed` unchanged',
    );
    expect(row('IMPLEMENT-18')).toContain(GUARD);
    // The rows' existing stops are unchanged.
    expect(row('IMPLEMENT-12')).toContain(
      'a failed blocking review or no adequate route stops',
    );
    expect(row('IMPLEMENT-18')).toContain(
      'all operational, validation, correlation, malformed/contradictory-envelope, launch, and receive failures stop regardless of `onFailure`',
    );
  });
});
