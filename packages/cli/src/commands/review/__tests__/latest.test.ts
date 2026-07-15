import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findLatestReview, createReviewLatestCommand } from '../latest';

interface HarnessOptions {
  cwd: string;
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createReviewLatestCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
  });
  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const review = new Command('review');
  review.addCommand(command);
  program.addCommand(review);

  await program.parseAsync(
    [...globalArgs, 'review', 'latest', ...commandArgs],
    {
      from: 'user',
    },
  );
}

async function writeReview(
  root: string,
  relativePath: string,
  options: {
    generatedAt: string;
    scope: string;
    type?: string;
    project?: string | null;
  },
): Promise<void> {
  const filePath = join(root, relativePath);
  await mkdir(join(filePath, '..'), { recursive: true });
  await writeFile(
    filePath,
    [
      '---',
      'oat_generated: true',
      `oat_generated_at: ${options.generatedAt}`,
      `oat_review_scope: ${options.scope}`,
      `oat_review_type: ${options.type ?? 'code'}`,
      `oat_project: ${options.project ?? 'null'}`,
      '---',
      '',
      '# Review',
    ].join('\n'),
    'utf8',
  );
}

describe('oat review latest', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-review-latest-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('returns the newest review by oat_generated_at across project and ad-hoc locations', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';

    await writeReview(root, `${projectPath}/reviews/p01-review.md`, {
      generatedAt: '2026-06-01',
      scope: 'p01',
      project: projectPath,
    });
    await writeReview(root, `${projectPath}/reviews/archived/final-review.md`, {
      generatedAt: '2026-06-02',
      scope: 'final',
      type: 'artifact',
      project: projectPath,
    });
    await writeReview(root, '.oat/repo/reviews/ad-hoc-review.md', {
      generatedAt: '2026-06-03',
      scope: 'ad-hoc',
      project: null,
    });

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result).toEqual({
      path: '.oat/repo/reviews/ad-hoc-review.md',
      scope: 'ad-hoc',
      generatedAt: '2026-06-03',
      kind: 'adhoc',
      archived: false,
      actionable: true,
    });
  });

  it('uses frontmatter date rather than filesystem mtime', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';
    const oldByFrontmatter = `${projectPath}/reviews/old-frontmatter.md`;
    const newByFrontmatter = `${projectPath}/reviews/new-frontmatter.md`;

    await writeReview(root, oldByFrontmatter, {
      generatedAt: '2026-06-01',
      scope: 'p01',
      project: projectPath,
    });
    await writeReview(root, newByFrontmatter, {
      generatedAt: '2026-06-02',
      scope: 'p02',
      project: projectPath,
    });
    await utimes(join(root, oldByFrontmatter), new Date(), new Date());
    await utimes(
      join(root, newByFrontmatter),
      new Date('2020-01-01T00:00:00Z'),
      new Date('2020-01-01T00:00:00Z'),
    );

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result?.path).toBe(newByFrontmatter);
    expect(result?.generatedAt).toBe('2026-06-02');
    expect(result?.archived).toBe(false);
    expect(result?.actionable).toBe(true);
  });

  it('prefers active project reviews over archived and ad-hoc ties', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';

    await writeReview(root, '.oat/repo/reviews/ad-hoc-review.md', {
      generatedAt: '2026-06-03',
      scope: 'ad-hoc',
      project: null,
    });
    await writeReview(root, `${projectPath}/reviews/archived/archived.md`, {
      generatedAt: '2026-06-03',
      scope: 'final',
      project: projectPath,
    });
    await writeReview(root, `${projectPath}/reviews/active.md`, {
      generatedAt: '2026-06-03',
      scope: 'p01',
      project: projectPath,
    });

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result?.path).toBe(`${projectPath}/reviews/active.md`);
    expect(result?.kind).toBe('project');
    expect(result?.scope).toBe('p01');
    expect(result?.archived).toBe(false);
    expect(result?.actionable).toBe(true);
  });

  it('marks archived-only project review results as historical and non-actionable', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';

    await writeReview(root, `${projectPath}/reviews/archived/archived.md`, {
      generatedAt: '2026-06-03',
      scope: 'final',
      project: projectPath,
    });

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result).toEqual({
      path: `${projectPath}/reviews/archived/archived.md`,
      scope: 'final',
      generatedAt: '2026-06-03',
      kind: 'project',
      archived: true,
      actionable: false,
    });
  });

  it('resolves an older active project review without changing all-history latest behavior', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';
    const activePath = `${projectPath}/reviews/active.md`;
    const archivedPath = `${projectPath}/reviews/archived/archived.md`;

    await writeReview(root, activePath, {
      generatedAt: '2026-06-02',
      scope: 'p01',
      project: projectPath,
    });
    await writeReview(root, archivedPath, {
      generatedAt: '2026-06-03',
      scope: 'final',
      project: projectPath,
    });

    const allHistoryResult = await findLatestReview({
      repoRoot: root,
      projectPath,
    });
    const actionableProjectResult = await findLatestReview({
      repoRoot: root,
      projectPath,
      actionableProjectOnly: true,
    });

    expect(allHistoryResult?.path).toBe(archivedPath);
    expect(allHistoryResult?.actionable).toBe(false);
    expect(actionableProjectResult).toEqual({
      path: activePath,
      scope: 'p01',
      generatedAt: '2026-06-02',
      kind: 'project',
      archived: false,
      actionable: true,
    });
  });

  it('prefers final review scope when active project reviews share a generated time', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';
    const generatedAt = '2026-06-03';

    await writeReview(root, `${projectPath}/reviews/p01-review.md`, {
      generatedAt,
      scope: 'p01',
      project: projectPath,
    });
    await writeReview(root, `${projectPath}/reviews/p06-review.md`, {
      generatedAt,
      scope: 'p06',
      project: projectPath,
    });
    await writeReview(root, `${projectPath}/reviews/project-final-review.md`, {
      generatedAt,
      scope: 'final',
      project: projectPath,
    });

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result?.path).toBe(`${projectPath}/reviews/project-final-review.md`);
    expect(result?.scope).toBe('final');
    expect(result?.archived).toBe(false);
    expect(result?.actionable).toBe(true);
  });

  it('prefers higher phase scope when active project reviews share a generated time', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';
    const generatedAt = '2026-06-03';

    await writeReview(root, `${projectPath}/reviews/p01-review.md`, {
      generatedAt,
      scope: 'p01',
      project: projectPath,
    });
    await writeReview(root, `${projectPath}/reviews/p06-review.md`, {
      generatedAt,
      scope: 'p06',
      project: projectPath,
    });

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result?.path).toBe(`${projectPath}/reviews/p06-review.md`);
    expect(result?.scope).toBe('p06');
    expect(result?.archived).toBe(false);
    expect(result?.actionable).toBe(true);
  });

  it('selects the newest same-scope same-day re-gate by seconds-precision generated time', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';

    // Four re-gate rounds of the same scope on the same calendar day. With
    // date-only timestamps these tie and the resolver fell back to path order;
    // seconds precision must make round 4 (the PASS) win.
    await writeReview(
      root,
      `${projectPath}/reviews/final-review-2026-07-05T110000Z.md`,
      {
        generatedAt: '2026-07-05T11:00:00Z',
        scope: 'final',
        project: projectPath,
      },
    );
    await writeReview(
      root,
      `${projectPath}/reviews/final-review-2026-07-05T110249Z.md`,
      {
        generatedAt: '2026-07-05T11:02:49Z',
        scope: 'final',
        project: projectPath,
      },
    );
    await writeReview(
      root,
      `${projectPath}/reviews/final-review-2026-07-05T111601Z.md`,
      {
        generatedAt: '2026-07-05T11:16:01Z',
        scope: 'final',
        project: projectPath,
      },
    );

    const result = await findLatestReview({ repoRoot: root, projectPath });

    expect(result?.path).toBe(
      `${projectPath}/reviews/final-review-2026-07-05T111601Z.md`,
    );
    expect(result?.generatedAt).toBe('2026-07-05T11:16:01Z');
  });

  it('emits json for the latest review', async () => {
    const root = await createRepoRoot();
    const projectPath = '.oat/projects/shared/demo';
    await writeReview(root, `${projectPath}/reviews/p01-review.md`, {
      generatedAt: '2026-06-03',
      scope: 'p01',
      project: projectPath,
    });

    const { command, capture } = createHarness({ cwd: root });
    await runCommand(
      command,
      ['--project', projectPath],
      ['--json', '--cwd', root],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      path: `${projectPath}/reviews/p01-review.md`,
      scope: 'p01',
      generatedAt: '2026-06-03',
      kind: 'project',
      archived: false,
      actionable: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it('returns a clean empty json result when no reviews exist', async () => {
    const root = await createRepoRoot();
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, [], ['--json', '--cwd', root]);

    expect(capture.jsonPayloads[0]).toEqual({
      path: null,
      scope: null,
      generatedAt: null,
      kind: null,
      archived: null,
      actionable: null,
    });
    expect(process.exitCode).toBe(0);
  });
});
