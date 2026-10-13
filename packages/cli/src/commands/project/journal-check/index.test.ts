import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  contextFactory,
  createLoggerCapture,
  PROJECT_REL,
  runProjectSubcommand,
} from '@commands/project/closeout-check/__tests__/fixtures';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { journal, PLAN, realRunLine, STATE } from './__tests__/fixtures';
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

  async function project(journalContent: string) {
    const root = await mkdtemp(join(tmpdir(), 'oat-journal-check-'));
    tempDirs.push(root);
    const projectPath = join(root, PROJECT_REL);
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'plan.md'), PLAN, 'utf8');
    await writeFile(join(projectPath, 'implementation.md'), journalContent);
    await writeFile(join(projectPath, 'state.md'), STATE, 'utf8');
    return { root, home: root, projectPath };
  }

  async function run(
    fixture: { root: string; home: string },
    args: string[],
    json = true,
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
});
