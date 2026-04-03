import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  validateChangedSkillVersionBumps as defaultValidateChangedSkillVersionBumps,
  type ValidateChangedSkillVersionBumpsOptions,
  type ValidateChangedSkillVersionBumpsResult,
} from '@validation/index';
import { Command } from 'commander';

interface ValidateSkillVersionBumpsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  validateChangedSkillVersionBumps: (
    repoRoot: string,
    options: ValidateChangedSkillVersionBumpsOptions,
  ) => Promise<ValidateChangedSkillVersionBumpsResult>;
}

const DEFAULT_DEPENDENCIES: ValidateSkillVersionBumpsDependencies = {
  buildCommandContext,
  validateChangedSkillVersionBumps: defaultValidateChangedSkillVersionBumps,
};

function reportFindings(
  context: CommandContext,
  baseRef: string,
  result: ValidateChangedSkillVersionBumpsResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'failed',
      baseRef,
      validatedSkillCount: result.validatedSkillCount,
      findings: result.findings,
    });
    return;
  }

  context.logger.error('Canonical skill version validation failed:\n');
  for (const finding of result.findings) {
    context.logger.error(`- ${finding.file}: ${finding.message}`);
  }
  context.logger.error(
    `\nFix the issues above, then re-run: oat internal validate-skill-version-bumps --base-ref ${baseRef}`,
  );
}

async function runValidateSkillVersionBumps(
  context: CommandContext,
  options: ValidateChangedSkillVersionBumpsOptions,
  dependencies: ValidateSkillVersionBumpsDependencies,
): Promise<void> {
  try {
    const result = await dependencies.validateChangedSkillVersionBumps(
      context.cwd,
      options,
    );

    if (result.findings.length > 0) {
      reportFindings(context, options.baseRef, result);
      process.exitCode = 1;
      return;
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        baseRef: options.baseRef,
        validatedSkillCount: result.validatedSkillCount,
        findings: result.findings,
      });
    } else {
      context.logger.info(
        `OK: validated ${result.validatedSkillCount} changed canonical skill version bump checks against ${options.baseRef}`,
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

export function createValidateSkillVersionBumpsCommand(
  overrides: Partial<ValidateSkillVersionBumpsDependencies> = {},
): Command {
  const dependencies: ValidateSkillVersionBumpsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('validate-skill-version-bumps')
    .description(
      'Validate that changed canonical skills bump version relative to a git base ref',
    )
    .requiredOption(
      '--base-ref <ref>',
      'Git ref used as the comparison base for changed canonical skills',
    )
    .action(
      async (
        options: ValidateChangedSkillVersionBumpsOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runValidateSkillVersionBumps(context, options, dependencies);
      },
    );
}
