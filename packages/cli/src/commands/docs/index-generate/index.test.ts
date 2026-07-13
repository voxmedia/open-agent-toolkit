import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDocsGenerateIndexCommand,
  GENERATED_INDEX_WARNING,
} from './index';

function createHarness(
  options: {
    cwd?: string;
    repoRoot?: string;
    documentationIndex?: string;
  } = {},
) {
  const capture = createLoggerCapture();
  const cwd = options.cwd ?? '/tmp/repo/apps/docs';
  const repoRoot = options.repoRoot ?? '/tmp/repo';

  const writtenConfigs: Array<{ repoRoot: string; config: unknown }> = [];
  const writtenFiles: Array<{ path: string; content: string }> = [];

  const command = createDocsGenerateIndexCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'all' as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    fileDeps: {
      generateIndex: vi.fn(async () => [
        { title: 'Home', path: 'index.md', description: 'Welcome' },
      ]),
      renderIndex: vi.fn(() => '- [Home](index.md) — Welcome\n'),
      writeFile: vi.fn(async (path: string, content: string) => {
        writtenFiles.push({ path, content });
      }),
      readOatConfig: vi.fn(async () => ({
        version: 1,
        documentation: options.documentationIndex
          ? { index: options.documentationIndex }
          : {},
      })),
      writeOatConfig: vi.fn(
        async (root: string, config: Record<string, unknown>) => {
          writtenConfigs.push({ repoRoot: root, config });
        },
      ),
      resolveRepoRoot: vi.fn(async () => repoRoot),
    },
  });

  return { capture, command, writtenConfigs, writtenFiles };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  const docs = new Command('docs');
  docs.addCommand(command);
  program.addCommand(docs);

  await program.parseAsync([...globalArgs, 'docs', 'generate-index', ...args], {
    from: 'user',
  });
}

describe('createDocsGenerateIndexCommand', () => {
  const createdDirs: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      createdDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  it('writes config to repo root, not CWD, when run from subdirectory', async () => {
    const { command, writtenConfigs } = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
    });

    await runCommand(command);

    expect(writtenConfigs).toHaveLength(1);
    expect(writtenConfigs[0]!.repoRoot).toBe('/tmp/repo');
  });

  it('stores index path relative to repo root in config', async () => {
    const { command, writtenConfigs } = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
    });

    await runCommand(command);

    expect(writtenConfigs).toHaveLength(1);
    const config = writtenConfigs[0]!.config as {
      documentation?: { index?: string };
    };
    expect(config.documentation?.index).toBe('apps/docs/index.md');
  });

  it('does not rewrite config when the stored index path is unchanged', async () => {
    const { command, writtenConfigs, writtenFiles } = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
      documentationIndex: 'apps/docs/index.md',
    });

    await runCommand(command);

    expect(writtenFiles).toHaveLength(1);
    expect(writtenConfigs).toHaveLength(0);
  });

  it('reads config from repo root, not CWD', async () => {
    const harness = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
    });

    await runCommand(harness.command);

    // readOatConfig was called with repo root (verified indirectly via writeOatConfig target)
    expect(harness.writtenConfigs[0]!.repoRoot).toBe('/tmp/repo');
  });

  it('resolves docsDir and outputPath relative to CWD', async () => {
    const { command, writtenFiles } = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
    });

    await runCommand(command, ['--docs-dir', 'docs', '--output', 'index.md']);

    expect(writtenFiles).toHaveLength(1);
    expect(writtenFiles[0]!.path).toBe('/tmp/repo/apps/docs/index.md');
    expect(writtenFiles[0]!.content.startsWith(GENERATED_INDEX_WARNING)).toBe(
      true,
    );
  });

  it('works when CWD is repo root', async () => {
    const { command, writtenConfigs } = createHarness({
      cwd: '/tmp/repo',
      repoRoot: '/tmp/repo',
    });

    await runCommand(command);

    expect(writtenConfigs).toHaveLength(1);
    expect(writtenConfigs[0]!.repoRoot).toBe('/tmp/repo');
    const config = writtenConfigs[0]!.config as {
      documentation?: { index?: string };
    };
    expect(config.documentation?.index).toBe('index.md');
  });

  it('writes a single autogenerated header on repeated runs', async () => {
    const { command, writtenFiles } = createHarness({
      cwd: '/tmp/repo/apps/docs',
      repoRoot: '/tmp/repo',
    });

    await runCommand(command);
    await runCommand(command);

    expect(writtenFiles).toHaveLength(2);
    for (const file of writtenFiles) {
      expect(file.content.startsWith(GENERATED_INDEX_WARNING)).toBe(true);
      expect(file.content.split(GENERATED_INDEX_WARNING)).toHaveLength(2);
    }
    expect(writtenFiles[1]!.content).toBe(writtenFiles[0]!.content);
  });

  it('overwrites stale on-disk index output with a single correct header', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'oat-generate-index-'));
    createdDirs.push(cwd);
    const outputPath = join(cwd, 'index.md');

    await writeFile(
      outputPath,
      `${GENERATED_INDEX_WARNING}\n\nstale content\n${GENERATED_INDEX_WARNING}`,
      'utf8',
    );

    const { command } = createHarness({
      cwd,
      repoRoot: cwd,
    });

    command.configureHelp({ helpWidth: 120 });

    const program = createDocsGenerateIndexCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: 'all' as Scope,
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd,
        home: '/tmp/home',
        interactive: !(globalOptions.json ?? false),
        logger: createLoggerCapture().logger,
      }),
      fileDeps: {
        generateIndex: vi.fn(async () => [
          { title: 'Home', path: 'index.md', description: 'Welcome' },
        ]),
        renderIndex: vi.fn(() => '- [Home](index.md) — Welcome\n'),
        writeFile,
        readOatConfig: vi.fn(async () => ({
          version: 1,
          documentation: {},
        })),
        writeOatConfig: vi.fn(async () => undefined),
        resolveRepoRoot: vi.fn(async () => cwd),
      },
    });

    await runCommand(program);

    const content = await readFile(outputPath, 'utf8');
    expect(content.startsWith(GENERATED_INDEX_WARNING)).toBe(true);
    expect(content.split(GENERATED_INDEX_WARNING)).toHaveLength(2);
    expect(content).toContain('- [Home](index.md) — Welcome');
    expect(content).not.toContain('stale content');
  });
});
