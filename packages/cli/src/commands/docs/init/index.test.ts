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
      dryRun: globalOptions.dryRun ?? false,
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
    .option('--dry-run')
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
      'mkdocs',
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
      'mkdocs',
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

  it('surfaces an unsafe AGENTS.md mutation instead of reporting success', async () => {
    const { command, capture, upsertAgentsMdSection } = createHarness({
      interactive: false,
    });
    upsertAgentsMdSection.mockRejectedValueOnce(
      new Error('AGENTS.md identity changed before mutation.'),
    );

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

    expect(capture.error.join('\n')).toMatch(/unexpected-failure/);
    expect(capture.error.join('\n')).not.toContain('/tmp/workspace');
    expect(capture.info.join('\n')).not.toContain('AGENTS.md docs section');
    expect(process.exitCode).toBe(1);
  });

  it.each([false, true])(
    'reports recovery-required guidance as one partial outcome in json=%s mode',
    async (json) => {
      const { command, capture, upsertAgentsMdSection } = createHarness({
        interactive: false,
      });
      upsertAgentsMdSection.mockResolvedValueOnce({
        action: 'recovery-required',
        recovery: {
          code: 'recovery-required',
          target: 'AGENTS.md',
          identifiers: ['.AGENTS.md.oat-recovery-1-2'],
          action: 'Review and remove .AGENTS.md.oat-recovery-1-2, then rerun.',
        },
      });

      await runCommand(
        command,
        [
          '--framework',
          'mkdocs',
          '--app-name',
          'docs',
          '--target-dir',
          'apps/docs',
          '--description',
          '',
          '--format',
          'none',
          '--yes',
        ],
        json ? ['--json'] : [],
      );

      if (json) {
        expect(capture.jsonPayloads).toHaveLength(1);
        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'partial',
          scaffold: { status: 'complete' },
          guidance: { action: 'recovery-required' },
        });
      } else {
        expect(capture.warn.join('\n')).toMatch(/requires recovery/i);
      }
      expect(process.exitCode).toBe(1);
    },
  );

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
      'mkdocs',
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
    expect(output).toContain('cd docs && pnpm install');
    expect(output).toContain('cd docs && pnpm dev');
    expect(output).toContain('cd docs && pnpm build');
  });

  it('warns and exits when existing docs config found in non-interactive mode', async () => {
    const capture = createLoggerCapture();
    const readOatConfig = vi.fn(async () => ({
      version: 1,
      documentation: { root: 'docs', tooling: 'fumadocs' },
    }));

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
      detectRepoShape: vi.fn(async () => 'monorepo' as const),
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
      readOatConfig,
      confirmAction: vi.fn(async () => false),
    });

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
    ]);

    expect(capture.warn.join('\n')).toContain('Existing docs config');
    expect(process.exitCode).toBe(1);
  });

  it('proceeds when --yes bypasses preflight warning', async () => {
    const capture = createLoggerCapture();
    const runDocsInit = vi.fn(async () => {});
    const readOatConfig = vi.fn(async () => ({
      version: 1,
      documentation: { root: 'docs', tooling: 'fumadocs' },
    }));

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
      detectRepoShape: vi.fn(async () => 'monorepo' as const),
      inputWithDefault: vi.fn(async () => null),
      selectWithAbort: vi.fn(
        async <T extends string>(
          _message: string,
          choices: SelectChoice<T>[],
        ) => choices[0]?.value ?? null,
      ),
      runDocsInit,
      upsertAgentsMdSection: vi.fn(async () => ({
        action: 'updated' as const,
      })),
      readOatConfig,
      confirmAction: vi.fn(async () => false),
    });

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

    expect(capture.warn.join('\n')).toContain('Existing docs config');
    expect(runDocsInit).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
  });

  it('prints guidance when monorepo app name differs from default', async () => {
    const { command, capture } = createHarness({ interactive: false });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'custom-docs',
      '--target-dir',
      'apps/custom-docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    const output = capture.info.join('\n');
    expect(output).toContain('custom-docs');
    expect(output).toContain('root scripts');
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
    expect(output).toContain('pnpm --filter my-docs dev');
    expect(output).toContain('pnpm --filter my-docs build');
  });

  it('passes --no-root-patch through option resolution', async () => {
    const { command, runDocsInit } = createHarness({ interactive: false });

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
      '--no-root-patch',
      '--yes',
    ]);

    expect(runDocsInit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rootPatch: false }),
      '/tmp/assets',
    );
  });

  it('passes --site-name through option resolution', async () => {
    const { command, runDocsInit } = createHarness({ interactive: false });

    await runCommand(command, [
      '--framework',
      'fumadocs',
      '--app-name',
      'my-docs',
      '--site-name',
      'Custom Docs',
      '--target-dir',
      'apps/my-docs',
      '--description',
      '',
      '--format',
      'none',
      '--yes',
    ]);

    expect(runDocsInit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ siteName: 'Custom Docs' }),
      '/tmp/assets',
    );
  });
});

describe('buildDocsSectionBody', () => {
  it('builds fumadocs section with correct paths', () => {
    const options: DocsInitResolvedOptions = {
      repoRoot: '/tmp/repo',
      repoShape: 'monorepo',
      framework: 'fumadocs',
      appName: 'my-docs',
      siteName: 'My Docs',
      targetDir: 'apps/my-docs',
      siteDescription: 'My docs',
      lint: 'none',
      format: 'oxfmt',
      rootPatch: true,
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
      siteName: 'Docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'none',
      rootPatch: true,
    };

    const body = buildDocsSectionBody(options);

    expect(body).toContain('`docs`');
    expect(body).toContain('MkDocs (Python)');
    expect(body).toContain('**Index file:** `docs/docs/index.md`');
    expect(body).toContain('**Config:** `docs/mkdocs.yml`');
  });
});
