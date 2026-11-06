import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkReviewLedger, createReviewCheckCommand } from '../check';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const PROJECT = '.oat/projects/shared/demo';
const SOL_HEAD = '395b90677db9487e42f01d31b045f4819f3d85ae';
const SOL_RUN_ID = '48f5553c-f8fa-4f17-be77-7461789a416c';

const WIDE_HEADER = [
  '| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation | Gate Target |',
  '| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- | ----------- |',
];

const tempDirs: string[] = [];

afterEach(async () => {
  process.exitCode = undefined;
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createRepo(planContent: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-review-check-'));
  tempDirs.push(root);
  await mkdir(join(root, PROJECT, 'reviews', 'archived'), { recursive: true });
  await writeFile(join(root, PROJECT, 'plan.md'), planContent, 'utf8');
  return root;
}

function ledger(rows: string[]): string {
  return ['## Reviews', '', ...WIDE_HEADER, ...rows, ''].join('\n');
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim();
}

/** A repository with two commits, returning [parentHead, childHead]. */
async function createRepoWithHistory(): Promise<{
  root: string;
  parent: string;
  child: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'oat-review-check-git-'));
  tempDirs.push(root);
  git(root, ['init', '-q']);
  await writeFile(join(root, 'a.txt'), 'a\n', 'utf8');
  git(root, ['add', 'a.txt']);
  git(root, ['commit', '-q', '-m', 'one']);
  const parent = git(root, ['rev-parse', 'HEAD']);
  await writeFile(join(root, 'a.txt'), 'b\n', 'utf8');
  git(root, ['commit', '-q', '-am', 'two']);
  const child = git(root, ['rev-parse', 'HEAD']);
  await mkdir(join(root, PROJECT, 'reviews'), { recursive: true });
  return { root, parent, child };
}

describe('checkReviewLedger', () => {
  it('reports the pinned superseded Sol final row and nothing else in the c1a653b97 plan', async () => {
    const fixture = await readFile(
      join(FIXTURES, 'review-gate-integrity-plan-c1a653b97.md'),
      'utf8',
    );
    const root = await createRepo(fixture);

    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });

    expect(result).toMatchObject({ status: 'ok', advisory: true, rows: 22 });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'superseded_received_row',
      severity: 'advisory',
      relation: 'same-head',
      row: {
        row: 16,
        scope: 'final',
        status: 'received',
        artifact: 'reviews/archived/final-review-2026-11-02T213631Z.md',
        reviewedHead: SOL_HEAD,
        invocation: 'gate',
        gateTarget: 'codex-6-sol-xhigh',
        // The fixture copies only plan.md: corroboration is unavailable, never
        // a mismatch.
        corroboration: {
          artifact: 'unavailable',
          reviewedHead: 'unavailable',
          gateRunId: null,
        },
      },
      supersededBy: {
        row: 17,
        status: 'passed',
        artifact: 'reviews/archived/final-review-2026-11-02T233110Z.md',
        reviewedHead: SOL_HEAD,
        gateTarget: 'claude-opus-5-5-high',
      },
    });
    // The two distinct artifact-less `plan` rows and the unclaimed `p07`
    // placeholder form no duplicate key.
    expect(
      result.diagnostics.filter((d) => d.code === 'duplicate_event_key'),
    ).toEqual([]);
  });

  it('corroborates a superseded row from its artifact when the file is present', async () => {
    const fixture = await readFile(
      join(FIXTURES, 'review-gate-integrity-plan-c1a653b97.md'),
      'utf8',
    );
    const root = await createRepo(fixture);
    await writeFile(
      join(
        root,
        PROJECT,
        'reviews/archived/final-review-2026-11-02T213631Z.md',
      ),
      [
        '---',
        `oat_review_head_sha: ${SOL_HEAD}`,
        `oat_gate_run_id: ${SOL_RUN_ID}`,
        '---',
        '',
      ].join('\n'),
      'utf8',
    );

    const [diagnostic] = (
      await checkReviewLedger({ repoRoot: root, projectPath: PROJECT })
    ).diagnostics;

    expect(diagnostic).toMatchObject({
      row: {
        corroboration: {
          artifact: 'present',
          reviewedHead: 'match',
          gateRunId: SOL_RUN_ID,
        },
      },
    });
  });

  it('reports a duplicate event key across a path move, and the artifact-less rows never key', async () => {
    // Synthetic ledger in the #305 shape: the gate child appended its event
    // row and a lifecycle skill wrote a second row for the same artifact.
    const root = await createRepo(
      ledger([
        '| plan | artifact | pending | - | - | - | - | - |',
        '| plan | artifact | fixes_completed | 2026-11-03 | - | - | - | - |',
        '| plan | artifact | received | 2026-11-03 | reviews/artifact-plan-review-2026-11-03T010000Z.md | - | gate | codex-6-sol-xhigh |',
        '| plan | artifact | passed | 2026-11-03 | reviews/archived/artifact-plan-review-2026-11-03T010000Z.md | - | - | - |',
        '| p01 | code | passed | 2026-11-03 | reviews/archived/artifact-plan-review-2026-11-03T010000Z.md | - | manual | - |',
      ]),
    );

    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate_event_key',
        key: {
          scope: 'plan',
          type: 'artifact',
          artifactFilename: 'artifact-plan-review-2026-11-03T010000Z.md',
        },
        rows: [
          expect.objectContaining({ row: 3, status: 'received' }),
          expect.objectContaining({ row: 4, status: 'passed' }),
        ],
      }),
    ]);
  });

  it('reports nothing for a clean ledger', async () => {
    const root = await createRepo(
      ledger([
        '| plan | artifact | passed | 2026-11-03 | - | - | - | - |',
        `| p01 | code | fixes_completed | 2026-11-03 | reviews/archived/p01-a.md | ${SOL_HEAD} | manual | - |`,
        `| p01 | code | passed | 2026-11-03 | reviews/archived/p01-b.md | ${SOL_HEAD} | manual | - |`,
        '| final | code | pending | - | - | - | - | - |',
      ]),
    );

    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.headAncestry).toEqual({ asked: 0, unresolved: 0 });
  });

  it.each([
    {
      name: 'a received gate row followed only by a manual round',
      rows: [
        `| final | code | received | 2026-11-03 | reviews/final-a.md | ${SOL_HEAD} | gate | x |`,
        `| final | code | passed | 2026-11-03 | reviews/final-b.md | ${SOL_HEAD} | manual | - |`,
      ],
    },
    {
      name: 'a `-` Invocation artifact row',
      rows: [
        `| final | code | received | 2026-11-03 | reviews/final-a.md | ${SOL_HEAD} | - | - |`,
        `| final | code | passed | 2026-11-03 | reviews/final-b.md | ${SOL_HEAD} | - | - |`,
      ],
    },
    {
      name: 'a received row followed only by a pending placeholder',
      rows: [
        `| final | code | received | 2026-11-03 | reviews/final-a.md | ${SOL_HEAD} | gate | x |`,
        '| final | code | pending | - | - | - | gate | x |',
      ],
    },
  ])('keeps $name live', async ({ rows }) => {
    const root = await createRepo(ledger(rows));
    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('supersedes at a descendant head through git ancestry, never at an ancestor head', async () => {
    const { root, parent, child } = await createRepoWithHistory();
    await writeFile(
      join(root, PROJECT, 'plan.md'),
      ledger([
        `| final | code | received | 2026-11-03 | reviews/final-a.md | ${parent} | gate | x |`,
        `| final | code | passed | 2026-11-03 | reviews/final-b.md | ${child} | gate | y |`,
        `| p01 | code | received | 2026-11-03 | reviews/p01-a.md | ${child} | manual | - |`,
        `| p01 | code | passed | 2026-11-03 | reviews/p01-b.md | ${parent} | manual | - |`,
      ]),
      'utf8',
    );

    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'superseded_received_row',
        relation: 'descendant-head',
        row: expect.objectContaining({ row: 1 }),
        supersededBy: expect.objectContaining({ row: 2 }),
      }),
    ]);
    expect(result.headAncestry).toEqual({ asked: 2, unresolved: 0 });
  });

  it('keeps a row live when git cannot resolve the head pair', async () => {
    const { root } = await createRepoWithHistory();
    await writeFile(
      join(root, PROJECT, 'plan.md'),
      ledger([
        `| final | code | received | 2026-11-03 | reviews/final-a.md | ${'c'.repeat(40)} | gate | x |`,
        `| final | code | passed | 2026-11-03 | reviews/final-b.md | ${'d'.repeat(40)} | gate | y |`,
      ]),
      'utf8',
    );

    const result = await checkReviewLedger({
      repoRoot: root,
      projectPath: PROJECT,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.headAncestry).toEqual({ asked: 1, unresolved: 1 });
  });

  it('never edits the ledger', async () => {
    const fixture = await readFile(
      join(FIXTURES, 'review-gate-integrity-plan-c1a653b97.md'),
      'utf8',
    );
    const root = await createRepo(fixture);
    await checkReviewLedger({ repoRoot: root, projectPath: PROJECT });
    await expect(
      readFile(join(root, PROJECT, 'plan.md'), 'utf8'),
    ).resolves.toBe(fixture);
  });
});

describe('oat review check', () => {
  function harness(cwd: string): {
    capture: ReturnType<typeof createLoggerCapture>;
    program: Command;
  } {
    const capture = createLoggerCapture();
    const command = createReviewCheckCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd,
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: vi.fn(async () => cwd),
      readOatLocalConfig: vi.fn(async () => ({})),
    });
    const program = new Command().name('oat').option('--json').exitOverride();
    program.addCommand(new Command('review').addCommand(command));
    return { capture, program };
  }

  it('emits structured advisory diagnostics and exits 0', async () => {
    const fixture = await readFile(
      join(FIXTURES, 'review-gate-integrity-plan-c1a653b97.md'),
      'utf8',
    );
    const root = await createRepo(fixture);
    const { capture, program } = harness(root);

    await program.parseAsync(
      ['--json', 'review', 'check', '--project', PROJECT],
      { from: 'user' },
    );

    expect(process.exitCode).toBe(0);
    const [payload] = capture.jsonPayloads as Array<{
      advisory: boolean;
      diagnostics: Array<{ code: string }>;
    }>;
    expect(payload?.advisory).toBe(true);
    expect(payload?.diagnostics.map((d) => d.code)).toEqual([
      'superseded_received_row',
    ]);
  });

  it('exits 1 with a message when no project is given or active', async () => {
    const root = await createRepo(ledger([]));
    const { capture, program } = harness(root);

    await program.parseAsync(['review', 'check'], { from: 'user' });

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toMatch(/No project to check/);
  });
});
