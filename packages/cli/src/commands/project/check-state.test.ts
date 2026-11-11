import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectCheckStateCommand } from './check-state';

describe('oat project check-state', () => {
  let projectPath: string;
  let previousExitCode: typeof process.exitCode;

  beforeEach(async () => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
    projectPath = await mkdtemp(join(tmpdir(), 'oat-check-state-'));
  });

  afterEach(async () => {
    process.exitCode = previousExitCode;
    await rm(projectPath, { recursive: true, force: true });
  });

  async function run(json = true) {
    const capture = createLoggerCapture();
    const program = new Command().option('--json').option('--cwd <path>');
    program.addCommand(
      new Command('project').addCommand(
        createProjectCheckStateCommand({
          buildCommandContext: (options) => ({
            ...buildCommandContext(options),
            logger: capture.logger,
          }),
        }),
      ),
    );
    await program.parseAsync(
      [
        ...(json ? ['--json'] : []),
        '--cwd',
        tmpdir(),
        'project',
        'check-state',
        projectPath,
      ],
      { from: 'user' },
    );
    return capture;
  }

  it('rejects the incident-derived commented-parent indentation failure', async () => {
    const malformed = await readFile(
      new URL(
        './__tests__/fixtures/manual-state-bad-indent.md',
        import.meta.url,
      ),
      'utf8',
    );
    await writeFile(join(projectPath, 'state.md'), malformed);
    const capture = await run();
    expect(process.exitCode).toBe(1);
    expect(capture.jsonPayloads).toEqual([
      expect.objectContaining({
        valid: false,
        code: 'BAD_INDENT',
        errors: [
          expect.stringContaining(
            'All mapping items must start at the same column',
          ),
        ],
      }),
    ]);
  });

  it.each(['---', '--- \t'])(
    'accepts a commented mapping without semantic validation or rewriting (closing fence %j)',
    async (closingFence) => {
      const content = [
        '---',
        '# optional gate remains a comment',
        '# oat_implement_exit_gate:',
        '#   receive_correlation: null',
        'oat_workflow_mode: custom-mode',
        'oat_phase: future-phase # parse only',
        'custom:',
        '  nested: [one, two]',
        closingFence,
        '# Body is preserved',
        '--- arbitrary body',
      ].join('\n');
      await writeFile(join(projectPath, 'state.md'), content);
      const capture = await run();
      expect(process.exitCode).toBe(0);
      expect(capture.jsonPayloads).toEqual([
        { valid: true, statePath: join(projectPath, 'state.md') },
      ]);
      expect(await readFile(join(projectPath, 'state.md'), 'utf8')).toBe(
        content,
      );
    },
  );

  it.each([
    ['missing block', '# No frontmatter'],
    [
      'CRLF block unsupported by lifecycle readers',
      '---\r\noat_phase: implement\r\n---\r\n',
    ],
    ['unclosed block', '---\noat_phase: implement'],
    ['sequence', '---\n- implement\n---\n'],
    ['tagged sequence', '---\n!!omap\n- key: value\n---\n'],
    ['scalar', '---\nhello\n---\n'],
    ['null', '---\nnull\n---\n'],
  ])('rejects %s frontmatter', async (_name, content) => {
    await writeFile(join(projectPath, 'state.md'), content);
    const capture = await run();
    expect(process.exitCode).toBe(1);
    expect(capture.jsonPayloads).toEqual([
      expect.objectContaining({ valid: false, code: 'invalid-frontmatter' }),
    ]);
  });

  it('reports unavailable state as an I/O failure', async () => {
    const capture = await run();
    expect(process.exitCode).toBe(2);
    expect(capture.jsonPayloads).toEqual([
      expect.objectContaining({ valid: false, code: 'read-failed' }),
    ]);
  });

  it('gives human repair instructions for invalid frontmatter', async () => {
    await writeFile(join(projectPath, 'state.md'), '---\n- no mapping\n---\n');
    const capture = await run(false);
    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain('invalid-frontmatter');
    expect(capture.info.join('\n')).toContain(
      'before committing or continuing',
    );
  });
});
