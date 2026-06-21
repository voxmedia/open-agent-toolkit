import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveEffectiveConfig as defaultResolveEffectiveConfig,
  type ResolvedConfig,
} from '@config/resolve';
import {
  validateOatSkills as defaultValidateOatSkills,
  type ValidateOatSkillsOptions,
  type ValidateOatSkillsResult,
  type ValidationFinding,
} from '@validation/index';
import { Command } from 'commander';

interface ValidateOatSkillsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  validateOatSkills: (
    repoRoot: string,
    options?: ValidateOatSkillsOptions,
  ) => Promise<ValidateOatSkillsResult>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  env?: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ValidateOatSkillsDependencies = {
  buildCommandContext,
  validateOatSkills: defaultValidateOatSkills,
  resolveEffectiveConfig: defaultResolveEffectiveConfig,
};

function collectConfiguredGateSkillNames(effective: ResolvedConfig): string[] {
  const names = new Set<string>();

  for (const layer of [effective.shared, effective.local, effective.user]) {
    const skills = layer.workflow?.gates?.skills;
    if (!skills) {
      continue;
    }

    for (const skillName of Object.keys(skills)) {
      names.add(skillName);
    }
  }

  return [...names].sort();
}

function isBlockingFinding(finding: ValidationFinding): boolean {
  return finding.severity !== 'warning';
}

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

function reportWarnings(
  context: CommandContext,
  result: ValidateOatSkillsResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      validatedSkillCount: result.validatedSkillCount,
      findings: result.findings,
    });
    return;
  }

  context.logger.warn('OAT skill validation warnings:\n');
  for (const finding of result.findings) {
    context.logger.warn(`- ${finding.file}: ${finding.message}`);
  }
  context.logger.info(
    `OK: validated ${result.validatedSkillCount} oat-* skills`,
  );
}

async function runValidateOatSkills(
  context: CommandContext,
  options: ValidateOatSkillsOptions,
  dependencies: ValidateOatSkillsDependencies,
): Promise<void> {
  try {
    const effectiveConfig = await dependencies.resolveEffectiveConfig(
      context.cwd,
      join(context.home, '.oat'),
      dependencies.env ?? process.env,
    );
    const gateSkillNames = collectConfiguredGateSkillNames(effectiveConfig);
    const validationOptions =
      gateSkillNames.length > 0 ? { ...options, gateSkillNames } : options;
    const result = await dependencies.validateOatSkills(
      context.cwd,
      validationOptions,
    );

    if (result.findings.some(isBlockingFinding)) {
      reportFindings(context, result);
      process.exitCode = 1;
      return;
    }

    if (result.findings.length > 0) {
      reportWarnings(context, result);
      process.exitCode = 0;
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
