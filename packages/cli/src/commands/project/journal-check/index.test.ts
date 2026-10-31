import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  contextFactory,
  createLoggerCapture,
  PROJECT_REL,
  runProjectSubcommand,
} from '@commands/project/closeout-check/__tests__/fixtures';
import {
  deliveryEvidenceScope,
  evaluateSuccessor,
  journalRewrites,
} from '@commands/project/delivery/evidence';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import type { GoalDelivery } from '@open-agent-toolkit/control-plane';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  GOAL_JOURNAL,
  GOAL_PLAN,
  GOAL_STATE,
  journal,
  PLAN,
  realRunLine,
  STATE,
} from './__tests__/fixtures';
import { createProjectJournalCommand } from './index';

let VALID = '';

beforeAll(async () => {
  VALID = journal(await realRunLine());
});

describe('oat project journal check', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode as number | undefined;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function project(
    journalContent: string,
    contents: { plan?: string; state?: string } = {},
  ) {
    const root = await mkdtemp(join(tmpdir(), 'oat-journal-check-'));
    tempDirs.push(root);
    const projectPath = join(root, PROJECT_REL);
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'plan.md'),
      contents.plan ?? PLAN,
      'utf8',
    );
    await writeFile(join(projectPath, 'implementation.md'), journalContent);
    await writeFile(
      join(projectPath, 'state.md'),
      contents.state ?? STATE,
      'utf8',
    );
    return { root, home: root, projectPath };
  }

  function git(root: string, args: string[]): string {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  }

  function initializeGit(
    fixture: { root: string },
    includeJournal = true,
  ): string {
    git(fixture.root, ['init', '-q']);
    git(fixture.root, ['config', 'user.email', 'test@example.com']);
    git(fixture.root, ['config', 'user.name', 'Test']);
    git(fixture.root, [
      'add',
      ...(includeJournal
        ? ['.']
        : [`${PROJECT_REL}/plan.md`, `${PROJECT_REL}/state.md`]),
    ]);
    git(fixture.root, ['commit', '-q', '-m', 'fixture']);
    return git(fixture.root, ['rev-parse', 'HEAD']);
  }

  async function run(
    fixture: { root: string; home: string },
    args: string[],
    json = true,
    gitRunner?: GitRunner,
  ) {
    const capture = createLoggerCapture();
    process.exitCode = undefined;
    await runProjectSubcommand(
      createProjectJournalCommand({
        resolveProjectRoot: async () => fixture.root,
        resolveActiveProject: async () =>
          ({
            status: 'active',
            path: PROJECT_REL,
          }) as never,
        buildCommandContext: contextFactory(fixture, capture),
        ...(gitRunner === undefined ? {} : { git: gitRunner }),
      }),
      'journal',
      ['check', ...args],
      json ? ['--json'] : [],
    );
    return { capture, exitCode: process.exitCode as number | undefined };
  }

  it('passes a valid journal at completion and writes nothing', async () => {
    const fixture = await project(VALID);
    const before = await Promise.all(
      ['plan.md', 'implementation.md', 'state.md'].map((name) =>
        readFile(join(fixture.projectPath, name), 'utf8'),
      ),
    );
    const { capture, exitCode } = await run(fixture, [
      '--project',
      PROJECT_REL,
      '--at',
      'completion',
    ]);
    expect(exitCode).toBe(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      boundary: 'completion',
      reasons: [],
    });
    const after = await Promise.all(
      ['plan.md', 'implementation.md', 'state.md'].map((name) =>
        readFile(join(fixture.projectPath, name), 'utf8'),
      ),
    );
    expect(after).toEqual(before);
  });

  it('refuses with code, path, line and owner and exits 1', async () => {
    const fixture = await project(VALID.replace('**Commit:** 1111111\n', ''));
    const { capture, exitCode } = await run(fixture, ['--at', 'completion']);
    expect(exitCode).toBe(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'refused',
      reasons: [
        {
          code: 'task-commit-missing',
          path: 'implementation.md',
          line: expect.any(Number),
          owner: 'oat-project-implement',
        },
      ],
    });
  });

  it('prints a readable refusal without --json', async () => {
    const fixture = await project(VALID.replace('**Commit:** 1111111\n', ''));
    const { capture, exitCode } = await run(
      fixture,
      ['--at', 'completion'],
      false,
    );
    expect(exitCode).toBe(1);
    expect(capture.info.join('\n')).toMatch(
      /task-commit-missing implementation\.md:\d+ \(oat-project-implement\)/,
    );
  });

  it('requires an explicit validated scope at review', async () => {
    const fixture = await project(VALID);
    expect((await run(fixture, ['--at', 'review'])).exitCode).toBe(1);
    expect(
      (await run(fixture, ['--at', 'review', '--scope', 'p09'])).exitCode,
    ).toBe(1);
    expect(
      (await run(fixture, ['--at', 'completion', '--scope', 'p01'])).exitCode,
    ).toBe(1);
    const scoped = await run(fixture, ['--at', 'review', '--scope', 'p1,p02']);
    expect(scoped.exitCode).toBe(0);
    expect(scoped.capture.jsonPayloads[0]).toMatchObject({
      scope: ['p01', 'p02'],
    });
  });

  it('refuses an unknown boundary', async () => {
    const fixture = await project(VALID);
    const { capture, exitCode } = await run(fixture, ['--at', 'finish']);
    expect(exitCode).toBe(1);
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
  });

  it('reports an uncommitted goal journal rewrite and delivery evidence rejects the committed edit', async () => {
    const fixture = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    const reviewed = initializeGit(fixture);
    const rewritten = GOAL_JOURNAL.replace(
      'Verified with the reader tests.',
      'Verified with rewritten reader tests.',
    );
    await writeFile(
      join(fixture.projectPath, 'implementation.md'),
      rewritten,
      'utf8',
    );

    const checked = await run(fixture, ['--at', 'review', '--scope', 'p01']);
    expect(checked.exitCode).toBe(1);
    expect(checked.capture.jsonPayloads[0]).toMatchObject({
      status: 'refused',
      reasons: [
        {
          code: 'journal-line-rewritten',
          path: 'implementation.md',
          owner: 'oat-project-implement',
          message: expect.stringContaining(
            'restore the committed line and append the correction',
          ),
        },
      ],
    });
    const preflight = await run(fixture, ['--at', 'implement-preflight']);
    expect(preflight.exitCode).toBe(1);
    expect(preflight.capture.jsonPayloads[0]).toMatchObject({
      status: 'refused',
      reasons: [{ code: 'journal-line-rewritten' }],
    });

    git(fixture.root, ['add', `${PROJECT_REL}/implementation.md`]);
    git(fixture.root, ['commit', '-q', '-m', 'rewrite journal']);
    const published = git(fixture.root, ['rev-parse', 'HEAD']);
    const delivery: GoalDelivery = {
      delivery_id: 'd01',
      milestone: 'm01',
      scope: ['p01'],
      endpoint: 'merged',
      kind: 'pr',
      status: 'open',
      superseded_by: null,
      corrects_delivery_id: null,
      covers_scope_of: null,
      lookup: null,
      members: [],
      integrated_review: null,
      exit_gate: null,
      endpoint_attainment: null,
    };
    const scope = deliveryEvidenceScope(
      {
        repoRoot: fixture.root,
        projectDir: PROJECT_REL,
        state: { reviews: [] },
      },
      [delivery],
      delivery,
    );
    await expect(
      evaluateSuccessor(defaultGitRunner, scope, reviewed, published),
    ).resolves.toMatchObject({
      fresh: false,
      code: 'substantive-change',
      path: `${PROJECT_REL}/implementation.md`,
      reason: expect.stringContaining('Verified with the reader tests.'),
    });
  });

  it('accepts an absolute project path spelled through a filesystem alias', async () => {
    const fixture = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    initializeGit(fixture);

    const result = await run(fixture, [
      '--project',
      await realpath(fixture.projectPath),
      '--at',
      'review',
      '--scope',
      'p01',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
  });

  it('refuses when the committed journal frontmatter is unparseable', async () => {
    const fixture = await project(
      GOAL_JOURNAL.replace('oat_status: complete', '['),
      {
        plan: GOAL_PLAN,
        state: GOAL_STATE,
      },
    );
    initializeGit(fixture);
    await writeFile(
      join(fixture.projectPath, 'implementation.md'),
      GOAL_JOURNAL.replace(
        'Verified with the reader tests.',
        'Verified with rewritten reader tests.',
      ),
      'utf8',
    );

    const result = await run(fixture, ['--at', 'review', '--scope', 'p01']);
    expect(result.exitCode).toBe(1);
    expect(result.capture.jsonPayloads[0]).toMatchObject({
      status: 'refused',
      reasons: [
        {
          code: 'journal-frontmatter-malformed',
          path: 'implementation.md',
          owner: 'oat-project-implement',
          message: expect.stringContaining(
            'Committed implementation.md frontmatter could not be parsed',
          ),
        },
      ],
    });
  });

  it('keeps append-only goal changes and extraction markers out of rewrite reasons', async () => {
    const fixture = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    initializeGit(fixture);

    for (const addition of [
      '\n\nAppended observation.',
      '\n\n**Extracted to:** child',
    ]) {
      await writeFile(
        join(fixture.projectPath, 'implementation.md'),
        GOAL_JOURNAL.replace(
          'Verified with the reader tests.',
          `Verified with the reader tests.${addition}`,
        ),
        'utf8',
      );
      const checked = await run(fixture, ['--at', 'review', '--scope', 'p01']);
      const payload = checked.capture.jsonPayloads[0] as {
        reasons: { code: string }[];
      };
      expect(payload.reasons.map((reason) => reason.code)).not.toContain(
        'journal-line-rewritten',
      );
    }
  });

  it('does not compare quick projects or goal projects at completion', async () => {
    const quick = await project(VALID);
    initializeGit(quick);
    await writeFile(
      join(quick.projectPath, 'implementation.md'),
      VALID.replace('Reader reads records.', 'Reader rewrites records.'),
      'utf8',
    );
    const quickResult = await run(quick, ['--at', 'review', '--scope', 'p01']);
    expect(quickResult.exitCode).toBe(0);

    const goal = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    initializeGit(goal);
    await writeFile(
      join(goal.projectPath, 'implementation.md'),
      GOAL_JOURNAL.replace(
        'Verified with the reader tests.',
        'Verified with rewritten reader tests.',
      ),
      'utf8',
    );
    const completion = await run(goal, ['--at', 'completion']);
    const payload = completion.capture.jsonPayloads[0] as {
      reasons: { code: string }[];
    };
    expect(payload.reasons.map((reason) => reason.code)).not.toContain(
      'journal-line-rewritten',
    );
  });

  it('adds no rewrite reason for an untracked journal or unborn HEAD', async () => {
    const untracked = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    initializeGit(untracked, false);
    const untrackedResult = await run(untracked, [
      '--at',
      'review',
      '--scope',
      'p01',
    ]);
    expect(untrackedResult.exitCode).toBe(0);

    const unborn = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    git(unborn.root, ['init', '-q']);
    const unbornResult = await run(unborn, [
      '--at',
      'review',
      '--scope',
      'p01',
    ]);
    expect(unbornResult.exitCode).toBe(0);
  });

  it('reports a dangling HEAD as a command error', async () => {
    const fixture = await project(GOAL_JOURNAL, {
      plan: GOAL_PLAN,
      state: GOAL_STATE,
    });
    initializeGit(fixture);
    git(fixture.root, ['symbolic-ref', 'HEAD', 'refs/heads/dangling']);
    await writeFile(
      join(fixture.root, '.git', 'refs', 'heads', 'dangling'),
      `${'f'.repeat(40)}\n`,
      'utf8',
    );

    const result = await run(fixture, ['--at', 'review', '--scope', 'p01']);
    expect(result.exitCode).toBe(2);
    expect(result.capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('HEAD does not resolve'),
    });
  });

  it.each([1, 2, 3])(
    'reports a failure from committed-journal Git call %i as a command error',
    async (failureCall) => {
      const fixture = await project(GOAL_JOURNAL, {
        plan: GOAL_PLAN,
        state: GOAL_STATE,
      });
      initializeGit(fixture);
      let calls = 0;
      const failingGit: GitRunner = {
        run: async (args, options) => {
          calls += 1;
          return calls === failureCall
            ? {
                code: 128,
                stdout: '',
                stderr: `fatal: inspection ${failureCall} unavailable`,
              }
            : defaultGitRunner.run(args, options);
        },
      };
      const result = await run(
        fixture,
        ['--at', 'review', '--scope', 'p01'],
        true,
        failingGit,
      );
      expect(result.exitCode).toBe(2);
      expect(result.capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining(
          `inspection ${failureCall} unavailable`,
        ),
      });
    },
  );

  it('lists a removed recorded line without requiring a replacement', () => {
    const before = `---
---

Recorded line.
`;
    const after = `---
---
`;

    expect(journalRewrites(before, after)).toEqual([
      { kind: 'recorded-line-rewritten', line: 'Recorded line.' },
    ]);
  });
});
