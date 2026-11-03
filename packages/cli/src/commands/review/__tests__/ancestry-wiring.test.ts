import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { createProjectListCommand } from '@commands/project/list';
import { createProjectStatusCommand } from '@commands/project/status';
import { createReviewCheckCommand } from '@commands/review/check';
import { createReviewLatestCommand } from '@commands/review/latest';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

// Pins the default-dependency wiring that hands `oat project status`,
// `oat project list`, `oat review latest` and `oat review check` the git
// ancestry resolver. Only presentation dependencies are overridden; every
// project reader and the ancestry resolver run as shipped, against a real git
// repository. The synced layout makes the project directory its own nested
// repository whose history lacks the source commits its Reviewed Heads name,
// so a reader that asks git from inside the project cannot answer the pairs.

type Layout = 'shared' | 'synced-nested';

const PROJECTS: Record<Layout, string> = {
  shared: '.oat/projects/shared/demo',
  'synced-nested': '.oat/projects/synced/demo',
};
const RECEIVE = 'oat-project-review-receive';
const UNRESOLVABLE_HEAD = 'f'.repeat(40);

const tempDirs: string[] = [];

afterEach(async () => {
  process.exitCode = undefined;
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

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

/**
 * A two-commit source repository whose project ledger holds a `received` gate
 * round at the parent commit, with its artifact still active, and a later
 * `passed` gate round at `laterHead`. In the `synced-nested` layout the
 * project directory is then committed into its own repository, and the source
 * repository gets an `origin` so `oat project list --scope synced` can probe
 * the completed ref.
 */
async function createProject(
  layout: Layout,
  laterHead: (child: string) => string,
): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'oat-review-ancestry-wiring-'));
  tempDirs.push(base);
  const root = join(base, 'repo');
  await mkdir(root);
  git(root, ['init', '-q']);
  await writeFile(join(root, 'a.txt'), 'a\n', 'utf8');
  git(root, ['add', 'a.txt']);
  git(root, ['commit', '-q', '-m', 'one']);
  const parent = git(root, ['rev-parse', 'HEAD']);
  await writeFile(join(root, 'a.txt'), 'b\n', 'utf8');
  git(root, ['commit', '-q', '-am', 'two']);
  const child = git(root, ['rev-parse', 'HEAD']);

  const projectDir = join(root, PROJECTS[layout]);
  await mkdir(join(projectDir, 'reviews'), { recursive: true });
  await writeFile(
    join(projectDir, 'state.md'),
    `---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hill_checkpoints: []
oat_hill_completed: []
oat_parallel_execution: false
oat_phase: implement
oat_phase_status: pr_open
oat_execution_mode: single-thread
oat_lifecycle: active
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: null
oat_pr_status: open
oat_pr_url: https://example.test/pr/1
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:00:00Z'
oat_generated: false
---
`,
    'utf8',
  );
  await writeFile(
    join(projectDir, 'reviews', 'final-review-r1.md'),
    `---
oat_review_scope: final
oat_review_type: code
oat_review_invocation: gate
oat_generated_at: 2026-06-13
---

# Round one
`,
    'utf8',
  );
  await writeFile(
    join(projectDir, 'plan.md'),
    `---
oat_status: complete
oat_template: false
---

## Phase 1: Example

### Task p01-t01: Example

## Reviews

| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- | ----------- |
| p01 | code | passed | 2026-06-12 | reviews/p01-review.md | - | manual | - |
| final | code | received | 2026-06-13 | reviews/final-review-r1.md | ${parent} | gate | codex-6-sol-xhigh |
| final | code | passed | 2026-06-14 | reviews/archived/final-review-r2.md | ${laterHead(child)} | gate | claude-opus-5-5-high |
`,
    'utf8',
  );
  if (layout === 'synced-nested') {
    git(base, ['init', '-q', '--bare', 'origin.git']);
    git(root, ['remote', 'add', 'origin', join(base, 'origin.git')]);
    git(projectDir, ['init', '-q']);
    git(projectDir, ['add', '.']);
    git(projectDir, ['commit', '-q', '-m', 'project tracking']);
  }
  return root;
}

function context(
  root: string,
  capture: ReturnType<typeof createLoggerCapture>,
): (options: GlobalOptions) => CommandContext {
  return (options) => ({
    scope: 'project',
    dryRun: false,
    verbose: false,
    json: options.json ?? false,
    cwd: root,
    home: join(root, 'home'),
    interactive: false,
    logger: capture.logger,
  });
}

async function run(command: Command, args: string[]): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  program.addCommand(command);
  await program.parseAsync(['--json', ...args], { from: 'user' });
}

interface Readings {
  status: string;
  list: string;
  latest: string | null;
  check: string[];
}

/** Runs status, list, latest and check through their default readers. */
async function readAll(root: string, layout: Layout): Promise<Readings> {
  const project = PROJECTS[layout];
  const statusCapture = createLoggerCapture();
  await run(
    new Command('project').addCommand(
      createProjectStatusCommand({
        buildCommandContext: context(root, statusCapture),
      }),
    ),
    ['project', 'status', '--project-path', project],
  );
  const listCapture = createLoggerCapture();
  await run(
    new Command('project').addCommand(
      createProjectListCommand({
        buildCommandContext: context(root, listCapture),
        processEnv: {},
      }),
    ),
    ['project', 'list', '--scope', layout === 'shared' ? 'shared' : 'synced'],
  );
  const latestCapture = createLoggerCapture();
  await run(
    new Command('review').addCommand(
      createReviewLatestCommand({
        buildCommandContext: context(root, latestCapture),
      }),
    ),
    ['review', 'latest', '--project', project, '--actionable-project'],
  );
  const checkCapture = createLoggerCapture();
  await run(
    new Command('review').addCommand(
      createReviewCheckCommand({
        buildCommandContext: context(root, checkCapture),
      }),
    ),
    ['review', 'check', '--project', project],
  );

  const status = statusCapture.jsonPayloads[0] as {
    project: { recommendation: { skill: string } };
  };
  const list = listCapture.jsonPayloads[0] as {
    projects: Array<{ name: string; recommendation: { skill: string } }>;
  };
  const latest = latestCapture.jsonPayloads[0] as { path: string | null };
  const check = checkCapture.jsonPayloads[0] as {
    diagnostics: Array<{ code: string }>;
  };
  const listed = list.projects.find((entry) => entry.name === 'demo');
  return {
    status: status.project.recommendation.skill,
    list: listed?.recommendation.skill ?? 'missing',
    latest: latest.path,
    check: check.diagnostics.map((diagnostic) => diagnostic.code),
  };
}

describe.each<Layout>(['shared', 'synced-nested'])(
  'review supersession through the default command readers (%s)',
  (layout) => {
    it('keeps the received round live when the later head is not a resolvable descendant', async () => {
      const root = await createProject(layout, () => UNRESOLVABLE_HEAD);

      const readings = await readAll(root, layout);

      expect(readings).toEqual({
        status: RECEIVE,
        list: RECEIVE,
        latest: `${PROJECTS[layout]}/reviews/final-review-r1.md`,
        check: [],
      });
    });

    it('retires the received round at a descendant head in status, list, latest and check', async () => {
      const root = await createProject(layout, (child) => child);

      const readings = await readAll(root, layout);

      expect(readings.status).not.toBe(RECEIVE);
      expect(readings.list).not.toBe(RECEIVE);
      expect(readings.latest).toBeNull();
      expect(readings.check).toEqual(['superseded_received_row']);
    });
  },
);
