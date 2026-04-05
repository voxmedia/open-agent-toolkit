import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { SelectChoice } from '@commands/shared/shared.prompts';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDocsSectionBody, createDocsInitCommand } from './index';
import type { DocsInitResolvedOptions } from './resolve-options';

function createHarness(options: { interactive?: boolean } = {}) {
  const capture = createLoggerCapture();

  const runDocsInit = vi.fn(async () => {});
  const upsertAgentsMdSection = vi.fn(async () => ({
    action: 'updated' as const,
  }));

  const command = createDocsInitCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'all' as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
    detectRepoShape: vi.fn(async () => 'monorepo' as const),
    inputWithDefault: vi.fn(async () => null),
    selectWithAbort: vi.fn(
      async <T extends string>(_message: string, choices: SelectChoice<T>[]) =>
        choices[0]?.value ?? null,
    ),
    runDocsInit,
    upsertAgentsMdSection,
  });

  return { capture, command, runDocsInit, upsertAgentsMdSection };
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

  await program.parseAsync([...globalArgs, 'docs', 'init', ...args], {
    from: 'user',
  });
}

describe('createDocsInitCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('calls upsertAgentsMdSection with docs key after scaffolding', async () => {
    const { command, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'my-docs',
      '--target-dir',
      'apps/my-docs',
      '--description',
      'Test',
      '--format',
      'none',
      '--yes',
    ]);

    expect(upsertAgentsMdSection).toHaveBeenCalledTimes(1);
    expect(upsertAgentsMdSection).toHaveBeenCalledWith(
      '/tmp/workspace',
      'docs',
      expect.stringContaining('apps/my-docs'),
    );
  });

  it('logs AGENTS.md update when section is created or updated', async () => {
    const { command, capture } = createHarness({ interactive: false });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'docs',
      '--target-dir',
      'apps/docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    expect(capture.info.join('\n')).toContain(
      'AGENTS.md docs section updated.',
    );
  });

  it('does not log AGENTS.md update when section is unchanged', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });

    upsertAgentsMdSection.mockResolvedValueOnce({ action: 'no-change' });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'docs',
      '--target-dir',
      'apps/docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    expect(capture.info.join('\n')).not.toContain('AGENTS.md');
  });
  it('prints single-package next steps when repo shape is single-package', async () => {
    const capture = createLoggerCapture();
    const command = createDocsInitCommand({
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: 'all' as Scope,
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: globalOptions.cwd ?? '/tmp/workspace',
        home: '/tmp/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
      detectRepoShape: vi.fn(async () => 'single-package' as const),
      inputWithDefault: vi.fn(async () => null),
      selectWithAbort: vi.fn(
        async <T extends string>(
          _message: string,
          choices: SelectChoice<T>[],
        ) => choices[0]?.value ?? null,
      ),
      runDocsInit: vi.fn(async () => {}),
      upsertAgentsMdSection: vi.fn(async () => ({
        action: 'updated' as const,
      })),
    });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'docs',
      '--target-dir',
      'docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    const output = capture.info.join('\n');
    expect(output).toContain('cd docs');
    expect(output).toContain('pnpm install');
    expect(output).toContain('pnpm build');
  });

  it('prints monorepo next steps when repo shape is monorepo', async () => {
    const { command, capture } = createHarness({ interactive: false });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'my-docs',
      '--target-dir',
      'apps/my-docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    const output = capture.info.join('\n');
    expect(output).toContain('pnpm install');
    expect(output).toContain('pnpm --filter my-docs build');
  });
});

describe('buildDocsSectionBody', () => {
  it('builds fumadocs section with correct paths', () => {
    const options: DocsInitResolvedOptions = {
      repoRoot: '/tmp/repo',
      repoShape: 'monorepo',
      framework: 'fumadocs',
      appName: 'my-docs',
      targetDir: 'apps/my-docs',
      siteDescription: 'My docs',
      lint: 'none',
      format: 'oxfmt',
    };

    const body = buildDocsSectionBody(options);

    expect(body).toContain('`apps/my-docs`');
    expect(body).toContain('Fumadocs (Next.js + MDX)');
    expect(body).toContain('`apps/my-docs/docs/index.md`');
    expect(body).not.toContain('**Config:**');
  });

  it('builds mkdocs section with config path', () => {
    const options: DocsInitResolvedOptions = {
      repoRoot: '/tmp/repo',
      repoShape: 'single-package',
      framework: 'mkdocs',
      appName: 'docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'none',
    };

    const body = buildDocsSectionBody(options);

    expect(body).toContain('`docs`');
    expect(body).toContain('MkDocs (Python)');
    expect(body).toContain('**Index file:** `docs/docs/index.md`');
    expect(body).toContain('**Config:** `docs/mkdocs.yml`');
  });
});
