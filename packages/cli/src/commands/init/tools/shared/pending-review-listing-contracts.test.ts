import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { listPendingReviews } from '@commands/review/pending';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * m02 p13: before PR creation, pr-progress and pr-final list the required
 * reviews still `pending` for the PR's scope (`oat review pending`), and the
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
const WAIVER_TEMPLATE =
  '`**Review waived:** <scope> <type> · **Waived by:** <user> · **Date:** <YYYY-MM-DD> · **Reason:** <text>`';

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
      '**Non-interactive run** (`OAT_NON_INTERACTIVE=1` or `OAT_AUTONOMOUS=1`): stop at this boundary with required reviews pending and no waiver.',
    );
    expect(text).toContain(
      'write no waiver, and create, register or push nothing.',
    );
    expect(text).toContain(
      "only on the user's explicit choice and with the reason the user gives, append one line per waived row under `## Reviews and Gates` in `implementation.md`:",
    );
    expect(step).toContain(WAIVER_TEMPLATE);
    expect(text).toContain('Leave the `## Reviews` row `pending`.');
    expect(normalize(progress)).toContain(
      "Step 3.5's pending-review listing runs before item 4 writes a `registering` entry; a stop there registers nothing.",
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
      '- If `OAT_AUTONOMOUS=1` or `OAT_NON_INTERACTIVE=1`, gate `PRFINAL-06` is a boundary stop: required reviews are pending without a waiver. Never write a waiver and never proceed.',
    );
    expect(text).toContain(
      'stop before writing the PR artifact, pushing, creating the PR or writing a `registering` entry.',
    );
    expect(text).toContain(
      '- Otherwise ask the user to choose one option for the pending rows:',
    );
    expect(step).toContain(WAIVER_TEMPLATE);
    expect(text).toContain('Leave the `## Reviews` row `pending`.');

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
      /\|\s*PRFINAL-06\s*\|\s*`oat-project-pr-final`\s*\|\s*Required reviews pending without a waiver\s*\|[^\n]*\|\s*`boundary:unresolved-critical-findings`\s*\|/,
    );
  });

  it('documents a waiver line that oat review pending applies', async () => {
    const lines = [readRepoFile(PROGRESS), readRepoFile(FINAL)].map(
      (content) =>
        /`(\*\*Review waived:\*\* [^`]+)`/.exec(content)?.[1] ?? null,
    );
    expect(lines[0]).not.toBeNull();
    expect(lines[1]).toBe(lines[0]);
    const filled = (lines[0] as string)
      .replace('<scope> <type>', 'p02 code')
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
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '| ----- | ---- | ------ | ---- | -------- |',
        '| p02 | code | pending | - | - |',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, project, 'implementation.md'),
      ['## Reviews and Gates', '', filled, ''].join('\n'),
      'utf8',
    );

    const result = await listPendingReviews({
      repoRoot: root,
      projectPath: project,
      scope: 'p02',
    });

    expect(result.pending).toEqual([]);
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
    ]);
  });
});
