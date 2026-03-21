import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  DOCS_SKILLS,
  installDocs as defaultInstallDocs,
  type InstallDocsOptions,
  type InstallDocsResult,
} from './install-docs';

interface InitToolsDocsOptions {
  force?: boolean;
}

type DocsScope = 'project' | 'user';

interface InitToolsDocsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: DocsScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installDocs: (options: InstallDocsOptions) => Promise<InstallDocsResult>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const DEFAULT_DEPENDENCIES: InitToolsDocsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installDocs: defaultInstallDocs,
  selectManyWithAbort,
  confirmAction,
};

function resolveScope(context: CommandContext): DocsScope {
  return context.scope === 'user' ? 'user' : 'project';
}

function reportSuccess(
  context: CommandContext,
  scope: DocsScope,
  targetRoot: string,
  assetsRoot: string,
  selectedSkills: string[],
  result: InstallDocsResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope,
      targetRoot,
      assetsRoot,
      selectedSkills,
      result,
    });
    return;
  }

  context.logger.info('Installed docs tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(
    `Selected skills: ${selectedSkills.join(', ') || '(none)'}`,
  );
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(
    `Scripts: copied=${result.copiedScripts.length}, updated=${result.updatedScripts.length}, skipped=${result.skippedScripts.length}`,
  );
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function runInitToolsDocs(
  context: CommandContext,
  options: InitToolsDocsOptions,
  dependencies: InitToolsDocsDependencies,
): Promise<void> {
  try {
    const scope = resolveScope(context);
    const targetRoot =
      scope === 'project'
        ? await dependencies.resolveProjectRoot(context.cwd)
        : dependencies.resolveScopeRoot('user', context.cwd, context.home);

    const selectedSkills = context.interactive
      ? await dependencies.selectManyWithAbort(
          'Select docs skills to install',
          DOCS_SKILLS.map((skill) => ({
            label: skill,
            value: skill,
            checked: true,
          })),
          { interactive: context.interactive },
        )
      : [...DOCS_SKILLS];

    if (selectedSkills === null) {
      if (!context.json) {
        context.logger.info('Cancelled: no docs skills installed.');
      }
      process.exitCode = 0;
      return;
    }

    if (selectedSkills.length === 0) {
      if (!context.json) {
        context.logger.info('No docs skills selected.');
      }
      process.exitCode = 0;
      return;
    }

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing docs assets in ${scope} scope?`,
        { interactive: context.interactive },
      );
      if (!confirmed) {
        if (!context.json) {
          context.logger.info('Cancelled: no files were overwritten.');
        }
        process.exitCode = 0;
        return;
      }
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const result = await dependencies.installDocs({
      assetsRoot,
      targetRoot,
      skills: selectedSkills,
      force: options.force,
    });

    reportSuccess(
      context,
      scope,
      targetRoot,
      assetsRoot,
      selectedSkills,
      result,
    );
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

export function createInitToolsDocsCommand(
  overrides: Partial<InitToolsDocsDependencies> = {},
): Command {
  const dependencies: InitToolsDocsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('docs')
    .description('Install OAT docs workflow skills')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsDocsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitToolsDocs(context, options, dependencies);
    });
}
