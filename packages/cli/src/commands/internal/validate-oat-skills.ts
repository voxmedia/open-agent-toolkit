import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  validateOatSkills as defaultValidateOatSkills,
  type ValidateOatSkillsOptions,
  type ValidateOatSkillsResult,
} from '@validation/index';
import { Command } from 'commander';

interface ValidateOatSkillsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  validateOatSkills: (
    repoRoot: string,
    options?: ValidateOatSkillsOptions,
  ) => Promise<ValidateOatSkillsResult>;
}

const DEFAULT_DEPENDENCIES: ValidateOatSkillsDependencies = {
  buildCommandContext,
  validateOatSkills: defaultValidateOatSkills,
};

function reportFindings(
  context: CommandContext,
  result: ValidateOatSkillsResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'failed',
      validatedSkillCount: result.validatedSkillCount,
      findings: result.findings,
    });
    return;
  }

  context.logger.error('OAT skill validation failed:\n');
  for (const finding of result.findings) {
    context.logger.error(`- ${finding.file}: ${finding.message}`);
  }
  context.logger.error(
    '\nFix the issues above, then re-run: pnpm oat:validate-skills',
  );
}

async function runValidateOatSkills(
  context: CommandContext,
  options: ValidateOatSkillsOptions,
  dependencies: ValidateOatSkillsDependencies,
): Promise<void> {
  try {
    const result = await dependencies.validateOatSkills(context.cwd, options);

    if (result.findings.length > 0) {
      reportFindings(context, result);
      process.exitCode = 1;
      return;
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        validatedSkillCount: result.validatedSkillCount,
        findings: result.findings,
      });
    } else {
      context.logger.info(
        `OK: validated ${result.validatedSkillCount} oat-* skills`,
      );
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 2;
  }
}

export function createValidateOatSkillsCommand(
  overrides: Partial<ValidateOatSkillsDependencies> = {},
): Command {
  const dependencies: ValidateOatSkillsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('validate-oat-skills')
    .description('Validate required structure of oat-* workflow skills')
    .option(
      '--base-ref <ref>',
      'Also require changed canonical skills to bump version relative to this git ref',
    )
    .action(async (options: ValidateOatSkillsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runValidateOatSkills(context, options, dependencies);
    });
}
