import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendProjectLog, ProjectLogSealedError } from './append';
import { checkProjectLog } from './check';
import { createProjectLogCommand } from './index';
import { synthesizeProjectLog } from './synthesize';

function createHarness(
  cwd: string,
  stdin = '',
): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  return {
    capture,
    command: createProjectLogCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: options.verbose ?? false,
        json: options.json ?? false,
        cwd: options.cwd ?? cwd,
        home: join(cwd, 'home'),
        interactive: !(options.json ?? false),
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => cwd,
      readStdin: async () => stdin,
    }),
  };
}

async function runCommand(command: Command, args: string[]): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(
    ['--json', 'project', 'log', 'synthesize', ...args],
    { from: 'user' },
  );
}

describe('oat project log synthesize', () => {
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

  async function createRepo(withLog = true): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-synthesize-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    const logPath = join(projectPath, 'project-log.md');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: relativeProject })}\n`,
      'utf8',
    );
    if (withLog) {
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-17 · project · bug · gate exit

The gate returned the wrong exit code.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize before archive.
`,
        'utf8',
      );
    }
    return { root, projectPath, logPath };
  }

  it('fills the pending synthesis section from --body', async () => {
    const { root, logPath } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, [
      '--body',
      'Verdict: keep. Adopted the safer gate behavior.',
    ]);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      '## End-of-run synthesis\n\nVerdict: keep. Adopted the safer gate behavior.',
    );
    expect(content).not.toContain('pending — do not skip');
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesized',
      logPath,
    });
    expect(process.exitCode).toBe(0);
  });

  it('accepts synthesis body from stdin', async () => {
    const { root, logPath } = await createRepo();
    const { command } = createHarness(
      root,
      'Observation: The workflow improved.\nImpact: Fewer retries.',
    );

    await runCommand(command, ['--body', '-']);

    await expect(readFile(logPath, 'utf8')).resolves.toContain(
      'Observation: The workflow improved.\nImpact: Fewer retries.',
    );
  });

  it('targets the canonical synthesis section instead of marker-like entry text', async () => {
    const { root, logPath } = await createRepo();
    const pendingHeading =
      '## End-of-run synthesis (pending — do not skip at project completion)';
    const before = (await readFile(logPath, 'utf8')).replace(
      'The gate returned the wrong exit code.',
      `The entry discusses \`${pendingHeading}\` without recreating the section.`,
    );
    await writeFile(logPath, before, 'utf8');
    const entriesBefore = before.slice(
      before.indexOf('## Entries'),
      before.lastIndexOf(`\n${pendingHeading}`),
    );
    const { command } = createHarness(root);

    await runCommand(command, ['--body', 'Verdict: keep the safer workflow.']);

    const after = await readFile(logPath, 'utf8');
    const entriesAfter = after.slice(
      after.indexOf('## Entries'),
      after.indexOf('\n## End-of-run synthesis\n'),
    );
    expect(entriesAfter).toBe(entriesBefore);
    expect(after).toContain(
      '## End-of-run synthesis\n\nVerdict: keep the safer workflow.',
    );
  });

  it('errors when the project log is absent', async () => {
    const { root } = await createRepo(false);
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--body', 'Nothing to synthesize.']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('does not exist'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('errors when synthesis is already written', async () => {
    const { root, logPath } = await createRepo();
    const content = await readFile(logPath, 'utf8');
    const pendingHeading =
      '## End-of-run synthesis (pending — do not skip at project completion)';
    await writeFile(
      logPath,
      content.replace(
        `${pendingHeading}\n\nSummarize before archive.`,
        `## End-of-run synthesis\n\nThe completed synthesis discusses \`${pendingHeading}\` as marker-like text.`,
      ),
      'utf8',
    );
    const before = await readFile(logPath, 'utf8');
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--body', 'Replacement is not allowed.']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('already written'),
    });
    expect(process.exitCode).toBe(1);
    await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    await expect(checkProjectLog({ repoRoot: root })).resolves.toMatchObject({
      status: 'ok',
      synthesisPending: false,
    });
  });

  it('rejects synthesis content that recreates a command-owned marker', async () => {
    const { root, logPath } = await createRepo();
    const before = await readFile(logPath, 'utf8');
    const pendingHeading =
      '## End-of-run synthesis (pending — do not skip at project completion)';
    const { command, capture } = createHarness(root);

    await runCommand(command, [
      '--body',
      `Verdict: keep.\n${pendingHeading}\nThis must not become a section.`,
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('must not recreate'),
    });
    expect(process.exitCode).toBe(1);
    await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
  });

  it('rejects ambiguous duplicate canonical synthesis sections', async () => {
    const { root, logPath } = await createRepo();
    const content = await readFile(logPath, 'utf8');
    const pendingHeading =
      '## End-of-run synthesis (pending — do not skip at project completion)';
    const ambiguous = content.replace(
      'The gate returned the wrong exit code.',
      `${pendingHeading}\n\nSpoofed section.\n\nThe gate returned the wrong exit code.`,
    );
    await writeFile(logPath, ambiguous, 'utf8');
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--body', 'Replacement is unsafe.']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('unique canonical'),
    });
    expect(process.exitCode).toBe(1);
    await expect(readFile(logPath, 'utf8')).resolves.toBe(ambiguous);
  });

  it('preserves Entries bytes, flips check, and stays format-stable', async () => {
    const { root, logPath } = await createRepo();
    const before = await readFile(logPath, 'utf8');
    const entriesBefore = before.slice(
      before.indexOf('## Entries'),
      before.indexOf('\n## End-of-run synthesis'),
    );
    const { command } = createHarness(root);

    await runCommand(command, ['--body', 'Verdict: adopt the workflow.']);

    const after = await readFile(logPath, 'utf8');
    const entriesAfter = after.slice(
      after.indexOf('## Entries'),
      after.indexOf('\n## End-of-run synthesis'),
    );
    expect(entriesAfter).toBe(entriesBefore);
    await expect(checkProjectLog({ repoRoot: root })).resolves.toMatchObject({
      status: 'ok',
      synthesisPending: false,
    });
    execFileSync('pnpm', ['exec', 'oxfmt', '--check', logPath], {
      cwd: resolve(import.meta.dirname, '../../../../../..'),
      stdio: 'pipe',
    });
  });

  describe('sealed log', () => {
    const SEAL_HEADING =
      '### 2026-07-17 · structural · oat-project-complete · seal';

    async function seal(logPath: string): Promise<string> {
      const content = await readFile(logPath, 'utf8');
      const sealed = content.replace(
        'The gate returned the wrong exit code.',
        `The gate returned the wrong exit code.\n\n${SEAL_HEADING}\n\nCompletion sealed at 2026-07-17T10:00:00Z. oat-seal:demo`,
      );
      await writeFile(logPath, sealed, 'utf8');
      return sealed;
    }

    it('refuses to rewrite a sealed log', async () => {
      const { root, logPath } = await createRepo();
      const before = await seal(logPath);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--body',
        'Synthesis written after the seal.',
      ]);

      // At base this returned `{"status":"synthesized"}` exit 0 and mutated the
      // log after its final entry. The seal closes the whole file, not just the
      // append path.
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'sealed',
        logPath,
        heading: SEAL_HEADING,
      });
      expect(
        (capture.jsonPayloads[0] as { message: string }).message,
      ).toContain('may follow the completion seal');
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    });

    it('throws the same typed refusal from the library entry point', async () => {
      const { root, projectPath, logPath } = await createRepo();
      await seal(logPath);

      await expect(
        synthesizeProjectLog({
          repoRoot: root,
          project: projectPath,
          body: 'Refused.',
        }),
      ).rejects.toBeInstanceOf(ProjectLogSealedError);
    });

    it('still synthesizes an unsealed log', async () => {
      const { root, logPath } = await createRepo();
      const { command, capture } = createHarness(root);

      await runCommand(command, ['--body', 'Verdict: keep.']);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'synthesized' });
      await expect(readFile(logPath, 'utf8')).resolves.toContain(
        '## End-of-run synthesis\n\nVerdict: keep.',
      );
      expect(process.exitCode).toBe(0);
    });
  });

  describe('advisory lock', () => {
    it('refuses to rewrite while an append holds the log lock', async () => {
      const { root, projectPath, logPath } = await createRepo();

      // Deterministic, not a sleep race: the appending writer is parked inside
      // its own read/modify/write window and only leaves once the synthesize
      // attempt has already been refused.
      let signalHolderInWindow = (): void => {};
      const holderInWindow = new Promise<void>((settle) => {
        signalHolderInWindow = settle;
      });
      let releaseHolder = (): void => {};
      const holderReleased = new Promise<void>((settle) => {
        releaseHolder = settle;
      });

      const holder = appendProjectLog(
        {
          repoRoot: root,
          project: projectPath,
          type: 'feedback',
          scope: 'project',
          area: 'lock',
          body: 'Written by the lock holder.',
        },
        {
          readLog: async (path: string): Promise<string> => {
            signalHolderInWindow();
            return readFile(path, 'utf8');
          },
          writeLog: async (path: string, content: string): Promise<void> => {
            await holderReleased;
            await writeFile(path, content, 'utf8');
          },
        },
      );

      await holderInWindow;
      await expect(
        synthesizeProjectLog(
          { repoRoot: root, project: projectPath, body: 'Verdict: keep.' },
          { lock: { waitMs: 0 } },
        ),
      ).rejects.toThrow(/Timed out waiting for the project log lock/);

      releaseHolder();
      await expect(holder).resolves.toMatchObject({ status: 'appended' });

      // The refusal rewrote nothing: the holder's entry survived and the
      // synthesis section is still pending.
      const content = await readFile(logPath, 'utf8');
      expect(content).toContain('Written by the lock holder.');
      expect(content).toContain('pending — do not skip');
    });

    it('holds the lock across its own read, decide, and write', async () => {
      const { root, projectPath, logPath } = await createRepo();

      // The reverse direction: synthesize is parked inside its rewrite window,
      // and an append must be unable to enter. Only this direction can catch a
      // lock released before the mutation finishes.
      let signalInWindow = (): void => {};
      const inWindow = new Promise<void>((settle) => {
        signalInWindow = settle;
      });
      let release = (): void => {};
      const released = new Promise<void>((settle) => {
        release = settle;
      });

      const original = await readFile(logPath, 'utf8');
      const holder = synthesizeProjectLog(
        {
          repoRoot: root,
          project: projectPath,
          body: 'Verdict: keep.',
        },
        {
          writeLog: async (path: string, content: string): Promise<void> => {
            // Signal from inside the write, not the read. A mutant that
            // released the lock after reading would still make a
            // read-signalled contender time out, so only parking here proves
            // the lock is held all the way through the mutation.
            signalInWindow();
            await released;
            await writeFile(path, content, 'utf8');
          },
        },
      );

      // The rewriter is demonstrably inside its write, so the append's bounded
      // wait really does expire against a lock synthesize is still holding.
      await inWindow;
      await expect(
        appendProjectLog(
          {
            repoRoot: root,
            project: projectPath,
            type: 'feedback',
            scope: 'project',
            area: 'contending',
            body: 'Must not enter.',
          },
          { lock: { waitMs: 0 } },
        ),
      ).rejects.toThrow(/Timed out waiting for the project log lock/);

      release();
      await expect(holder).resolves.toMatchObject({ status: 'synthesized' });

      const content = await readFile(logPath, 'utf8');
      expect(content).not.toBe(original);
      expect(content).toContain('## End-of-run synthesis\n\nVerdict: keep.');
      expect(content).not.toContain('Must not enter.');
    });
  });

  describe('ambiguous markers', () => {
    it.each([
      ['carriage return', '\r'],
      ['U+2028 line separator', '\u2028'],
      ['U+2029 paragraph separator', '\u2029'],
    ])(
      'refuses a log with a second pending marker hidden behind a %s',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        const pending =
          '## End-of-run synthesis (pending — do not skip at project completion)';
        const content = await readFile(logPath, 'utf8');
        // Base saw two canonical synthesis sections here and refused as
        // ambiguous. An LF-only reading sees one, and would rewrite it —
        // consuming the hidden duplicate and its content.
        await writeFile(
          logPath,
          `${content}\ncarrier${terminator}${pending}\n\nhidden second pending\n`,
          'utf8',
        );
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        await runCommand(command, ['--body', 'Verdict: keep.']);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('rather than a line feed'),
        });
        expect(process.exitCode).toBe(1);
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      },
    );

    it.each([
      ['carriage return', '\r'],
      ['U+2028 line separator', '\u2028'],
      ['U+2029 paragraph separator', '\u2029'],
    ])(
      'never writes a log it would refuse, given a %s in the body',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        // The body reaches the file verbatim, so without this rule synthesize
        // would happily write `carrier<CR>## Entries` and the very next seal
        // append would refuse the log it had just produced.
        await runCommand(command, ['--body', `carrier${terminator}## Entries`]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('line feeds only'),
        });
        expect(process.exitCode).toBe(1);
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      },
    );

    it('still accepts an ordinary multi-line synthesis body', async () => {
      const { root, logPath } = await createRepo();
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--body',
        'Verdict: keep.\nImpact: fewer retries.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'synthesized' });
      await expect(readFile(logPath, 'utf8')).resolves.toContain(
        'Verdict: keep.\nImpact: fewer retries.',
      );
      expect(process.exitCode).toBe(0);
    });
  });
});
