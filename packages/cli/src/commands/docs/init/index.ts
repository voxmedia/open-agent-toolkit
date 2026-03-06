import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  inputWithDefault,
  type PromptContext,
  type SelectChoice,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { Command, Option } from 'commander';
import {
  DEFAULT_DOCS_REPO_SHAPE_DEPENDENCIES,
  type DocsFormatMode,
  type DocsInitResolvedOptions,
  type DocsLintMode,
  detectDocsRepoShape,
  resolveDocsInitOptions,
} from './resolve-options';
import { scaffoldDocsApp } from './scaffold';

interface DocsInitCommandOptions {
  appName?: string;
  targetDir?: string;
  lint?: DocsLintMode;
  format?: DocsFormatMode;
  yes?: boolean;
}

interface DocsInitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveAssetsRoot: () => Promise<string>;
  detectRepoShape: (repoRoot: string) => Promise<'monorepo' | 'single-package'>;
  inputWithDefault: (
    message: string,
    defaultValue: string,
    ctx: PromptContext,
  ) => Promise<string | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  runDocsInit: (
    context: CommandContext,
    options: DocsInitResolvedOptions,
    assetsRoot: string,
  ) => Promise<void>;
}

const DEFAULT_DEPENDENCIES: DocsInitDependencies = {
  buildCommandContext,
  resolveAssetsRoot,
  detectRepoShape: (repoRoot: string) =>
    detectDocsRepoShape(repoRoot, DEFAULT_DOCS_REPO_SHAPE_DEPENDENCIES),
  inputWithDefault,
  selectWithAbort,
  runDocsInit: async (context, options, assetsRoot) => {
    const result = await scaffoldDocsApp({
      assetsRoot,
      ...options,
    });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...options,
        createdFiles: result.createdFiles,
        appRoot: result.appRoot,
      });
      return;
    }

    context.logger.info(`Scaffolded docs app at ${options.targetDir}`);
    context.logger.info(`  Repo shape: ${options.repoShape}`);
    context.logger.info(`  App name: ${options.appName}`);
    context.logger.info(`  Lint: ${options.lint}`);
    context.logger.info(`  Format: ${options.format}`);
  },
};

async function runDocsInitCommand(
  context: CommandContext,
  options: DocsInitCommandOptions,
  dependencies: DocsInitDependencies,
): Promise<void> {
  try {
    const repoShape = await dependencies.detectRepoShape(context.cwd);
    const resolved = await resolveDocsInitOptions({
      repoRoot: context.cwd,
      repoShape,
      interactive: context.interactive,
      acceptDefaults: options.yes ?? false,
      providedAppName: options.appName,
      providedTargetDir: options.targetDir,
      providedLint: options.lint,
      providedFormat: options.format,
      inputWithDefault: dependencies.inputWithDefault,
      selectWithAbort: dependencies.selectWithAbort,
    });

    if (!resolved) {
      if (!context.json) {
        context.logger.info('Docs init cancelled.');
      }
      process.exitCode = 0;
      return;
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    await dependencies.runDocsInit(context, resolved, assetsRoot);
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createDocsInitCommand(
  overrides: Partial<DocsInitDependencies> = {},
): Command {
  const dependencies: DocsInitDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('init')
    .description('Scaffold an OAT docs app')
    .addOption(new Option('--app-name <name>', 'Docs app name'))
    .addOption(
      new Option('--target-dir <path>', 'Target directory for the docs app'),
    )
    .addOption(
      new Option('--lint <mode>', 'Markdown lint mode').choices([
        'markdownlint',
        'none',
      ]),
    )
    .addOption(
      new Option('--format <mode>', 'Markdown format mode').choices([
        'prettier',
        'none',
      ]),
    )
    .option('--yes', 'Accept defaults without prompting')
    .action(async (options: DocsInitCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsInitCommand(context, options, dependencies);
    });
}
