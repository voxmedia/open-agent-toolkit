import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { listPendingReviews } from '@commands/review/pending';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * m02 p13: before PR creation, pr-progress and pr-final list the required
 * reviews still `pending` or `missing` for the PR's scope (`oat review
 * pending`), and the
 * user runs them, waives them with a recorded reason, or stops; a
 * non-interactive run stops. These pins hold the listing's position, the stop
 * and the waiver line, and check that the waiver line the skills document is
 * the line the command applies.
 */

function readRepoFile(relativePath: string): string {
  return readFileSync(
    join(import.meta.dirname, '../../../../../../../', relativePath),
    'utf8',
  );
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function section(content: string, start: string, end: string): string {
  const from = content.indexOf(start);
  const to = content.indexOf(end, from + start.length);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return content.slice(from, to);
}

const PROGRESS = '.agents/skills/oat-project-pr-progress/SKILL.md';
const FINAL = '.agents/skills/oat-project-pr-final/SKILL.md';
const LISTING =
  'oat --json review pending --project "$PROJECT_PATH" --scope "$PENDING_SCOPE"';
const MISSING_LIKE_PENDING =
  'Treat a `missing` entry exactly like a `pending` one: below, the pending rows are both lists. When `pending` and `missing` are both empty, continue.';
const MISSING_LIST =
  'its `missing` list holds the required `code` keys of concrete phases (not `**Provisional:** yes`) that have no `## Reviews` row at all;';
const LEDGER_UNCHANGED =
  'Leave the `## Reviews` table unchanged: a `pending` row stays `pending` and a `missing` key gets no row.';
const WAIVER_TEMPLATE =
  '`**Review waived:** <scope> <type> · **Row:** <row> · **Waived by:** <user> · **Date:** <YYYY-MM-DD> · **Reason:** <text>`';
const WAIVER_ROW =
  'where `<row>` is the row number the listing reports (`-` for a `missing` entry).';
const WAIVER_RETIRED =
  'A waiver covers only the row it names: once that row records a review, or a later row is appended for its key, the waiver is inert and the key is listed again. A line naming no row stops applying once any row of its key records a review, and while a `## Reviews` row that does not parse sits above a parsed row (`unapplied: unparsed-row`); fix that row, then re-run the listing.';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('pending required reviews before a pull request', () => {
  it('pr-progress lists pending required reviews before PR creation and goal registration', () => {
    const progress = readRepoFile(PROGRESS);
    const step = section(
      progress,
      '### Step 3.5: List Pending Required Reviews',
      '### Step 4: Collect Scope Data',
    );
    const text = normalize(step);

    expect(step).toContain(LISTING);
    expect(text).toContain(
      'This step runs before Step 6 creates a pull request and, in goal mode, before Step 5.5 item 4 writes its `registering` entry.',
    );
    expect(text).toContain(
      '**Non-interactive run** (`OAT_NON_INTERACTIVE=1` or `OAT_AUTONOMOUS=1`): stop at this boundary with required reviews pending or missing and no waiver.',
    );
    expect(text).toContain(
      'write no waiver, and create, register or push nothing.',
    );
    expect(text).toContain(
      "only on the user's explicit choice and with the reason the user gives, append one line per waived row under `## Reviews and Gates` in `implementation.md`:",
    );
    expect(step).toContain(WAIVER_TEMPLATE);
    expect(text).toContain(WAIVER_ROW);
    expect(text).toContain(WAIVER_RETIRED);
    expect(text).toContain(MISSING_LIST);
    expect(text).toContain(MISSING_LIKE_PENDING);
    expect(text).toContain(LEDGER_UNCHANGED);
    expect(text).toContain('not `pending` or `missing`.');
    expect(normalize(progress)).toContain(
      "Step 3.5's pending-review listing runs before item 4 writes a `registering` entry; a stop there registers nothing.",
    );
    // Step 3's review-status warning never blocks, but its sentence is scoped
    // to that warning so it does not contradict Step 3.5's stop.
    const step3 = normalize(
      section(
        progress,
        '### Step 3:',
        '### Step 3.5: List Pending Required Reviews',
      ),
    );
    expect(step3).toContain(
      'Do not block PR generation on this warning; Step 3.5 governs pending required reviews.',
    );
    expect(normalize(progress)).not.toContain(
      'Do not block PR generation; this is a progress PR.',
    );
    // The listing precedes the Step 5.5 registration it guards.
    expect(progress.indexOf('### Step 3.5:')).toBeLessThan(
      progress.indexOf('### Step 5.5: Goal Delivery Registration'),
    );
  });

  it('pr-final stops at PRFINAL-06 and lists before PR creation and terminal registration', () => {
    const final = readRepoFile(FINAL);
    const step = section(
      final,
      '### Step 2.5: List Pending Required Reviews',
      '### Step 3: Collect Project Summary',
    );
    const text = normalize(step);

    expect(step).toContain(LISTING);
    expect(text).toContain(
      'Outside goal mode the scope is the whole project (`PENDING_SCOPE=project`)',
    );
    expect(text).toContain(
      '- If `OAT_AUTONOMOUS=1` or `OAT_NON_INTERACTIVE=1`, gate `PRFINAL-06` is a boundary stop: required reviews are pending or missing without a waiver. Never write a waiver and never proceed.',
    );
    expect(text).toContain(
      'stop before writing the PR artifact, pushing, creating the PR or writing a `registering` entry.',
    );
    expect(text).toContain(
      '- Otherwise ask the user to choose one option for the pending rows:',
    );
    // Each listed row routes to the review that records it: a phase row to a
    // code review, the plan row to an artifact plan review.
    const route =
      '`oat-project-review-provide` with `code <pNN>` for a phase row or `artifact plan` for the `plan`/`artifact` row, followed by `oat-project-review-receive`';
    expect(text).toContain(`Route the resumable next step to ${route}.`);
    expect(text).toContain(
      `**Run them:** route to ${route}, and end this run.`,
    );
    expect(text).not.toContain('`code <scope>`');
    expect(step).toContain(WAIVER_TEMPLATE);
    expect(text).toContain(WAIVER_ROW);
    expect(text).toContain(WAIVER_RETIRED);
    expect(text).toContain(MISSING_LIST);
    expect(text).toContain(MISSING_LIKE_PENDING);
    expect(text).toContain(LEDGER_UNCHANGED);
    expect(text).toContain('not `pending` or `missing`.');

    // Goal Step 1.5 replaces Steps 2-6, so it runs the listing itself,
    // between the terminal scope (item 3) and registration (item 4).
    const goal = section(
      final,
      '3. **Terminal scope.**',
      '4. **Same registration contract.**',
    );
    expect(normalize(goal)).toContain(
      "Before item 4 writes a terminal delivery's `registering` entry, run Step 2.5 with `PENDING_SCOPE` set to that delivery's terminal phase ids as a comma list.",
    );

    const contract = readRepoFile('.agents/docs/autonomy-contract.md');
    expect(contract).toMatch(
      /\|\s*PRFINAL-06\s*\|\s*`oat-project-pr-final`\s*\|\s*Required reviews pending or missing, unwaived\s*\|[^\n]*\|\s*`boundary:unresolved-critical-findings`\s*\|/,
    );
  });

  it('documents a waiver line that oat review pending applies to a pending row and a missing key, and not to a retired row', async () => {
    const lines = [readRepoFile(PROGRESS), readRepoFile(FINAL)].map(
      (content) =>
        /`(\*\*Review waived:\*\* [^`]+)`/.exec(content)?.[1] ?? null,
    );
    expect(lines[0]).not.toBeNull();
    expect(lines[1]).toBe(lines[0]);
    const fill = (key: string, row: string): string =>
      (lines[0] as string)
        .replace('<scope> <type>', key)
        .replace('<row>', row)
        .replace('<user>', 'operator')
        .replace('<YYYY-MM-DD>', '2026-11-03')
        .replace('<text>', 'covered by the final review');

    const root = await mkdtemp(join(tmpdir(), 'oat-pending-contract-'));
    tempDirs.push(root);
    const project = '.oat/projects/shared/demo';
    await mkdir(join(root, project), { recursive: true });
    await writeFile(
      join(root, project, 'plan.md'),
      [
        '## Phase p02: Docs',
        '',
        '## Phase p03: More docs',
        '',
        '## Phase p04: Reviewed docs',
        '',
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '| ----- | ---- | ------ | ---- | -------- |',
        '| p02 | code | pending | - | - |',
        '| p04 | code | pending | - | - |',
        '| p04 | code | passed | 2026-11-03 | reviews/archived/p04.md |',
        '| p04 | code | pending | - | - |',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, project, 'implementation.md'),
      [
        '## Reviews and Gates',
        '',
        fill('p02 code', '1'),
        fill('p03 code', '-'),
        // Written for row 2, which a recorded review (row 3) retired.
        fill('p04 code', '2'),
        '',
      ].join('\n'),
      'utf8',
    );

    const result = await listPendingReviews({
      repoRoot: root,
      projectPath: project,
      scope: 'p02,p03,p04',
    });

    expect(result.pending).toMatchObject([{ scope: 'p04', row: 4 }]);
    expect(result.missing).toEqual([]);
    expect(result.waived).toMatchObject([
      {
        scope: 'p02',
        type: 'code',
        status: 'pending',
        waiver: {
          waivedBy: 'operator',
          date: '2026-11-03',
          reason: 'covered by the final review',
        },
      },
      { scope: 'p03', type: 'code', status: null, row: null },
    ]);
  });
});
