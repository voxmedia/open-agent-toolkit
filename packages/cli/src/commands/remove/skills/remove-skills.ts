import { buildCommandContext, type CommandContext } from '@app/command-context';
import { IDEA_SKILLS } from '@commands/init/tools/ideas/install-ideas';
import { UTILITY_SKILLS } from '@commands/init/tools/utility/install-utility';
import { WORKFLOW_SKILLS } from '@commands/init/tools/workflows/install-workflows';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';
import {
  createDefaultRemoveSkillDependencies,
  type RemoveSkillDependencies,
  runRemoveSkill,
} from '../skill/remove-skill';

interface RemoveSkillsOptions {
  pack?: string;
  apply?: boolean;
}

type PackName = 'ideas' | 'workflows' | 'utility';

const PACK_SKILLS: Record<PackName, readonly string[]> = {
  ideas: IDEA_SKILLS,
  workflows: WORKFLOW_SKILLS,
  utility: UTILITY_SKILLS,
};

interface RemoveSkillsDependencies {
  buildCommandContext: (
    options: ReturnType<typeof readGlobalOptions>,
  ) => CommandContext;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  runRemoveSkill: (
    context: CommandContext,
    skillName: string,
    apply: boolean,
    dependencies: RemoveSkillDependencies,
  ) => Promise<boolean>;
  removeSkillDependencies: RemoveSkillDependencies;
}

function createDependencies(): RemoveSkillsDependencies {
  return {
    buildCommandContext,
    confirmAction,
    runRemoveSkill,
    removeSkillDependencies: createDefaultRemoveSkillDependencies(),
  };
}

function isPackName(value: string): value is PackName {
  return value === 'ideas' || value === 'workflows' || value === 'utility';
}

export function createRemoveSkillsCommand(
  overrides: Partial<RemoveSkillsDependencies> = {},
): Command {
  const dependencies: RemoveSkillsDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('skills')
    .description('Remove installed skills by pack')
    .requiredOption(
      '--pack <pack>',
      'Skill pack to remove (ideas|workflows|utility)',
    )
    .option('--apply', 'Apply removal changes (default is dry-run)')
    .action(async (options: RemoveSkillsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const rawPack = (options.pack ?? '').toLowerCase();
        if (!isPackName(rawPack)) {
          throw new Error(
            `Invalid pack: ${options.pack}. Expected one of: ideas, workflows, utility.`,
          );
        }

        const skills = [...PACK_SKILLS[rawPack]];

        if (context.interactive && skills.length > 3) {
          const confirmed = await dependencies.confirmAction(
            `Remove ${skills.length} skills from pack '${rawPack}'?`,
            { interactive: context.interactive },
          );
          if (!confirmed) {
            if (!context.json) {
              context.logger.info('Removal cancelled.');
            }
            process.exitCode = 0;
            return;
          }
        }

        let removedCount = 0;
        let skippedCount = 0;
        const executionContext = context.json
          ? { ...context, json: false }
          : context;

        for (const skillName of skills) {
          const removed = await dependencies.runRemoveSkill(
            executionContext,
            skillName,
            options.apply ?? false,
            dependencies.removeSkillDependencies,
          );
          if (removed) {
            removedCount += 1;
          } else {
            skippedCount += 1;
          }
        }

        if (context.json) {
          context.logger.json({
            status: 'ok',
            pack: rawPack,
            removedCount,
            skippedCount,
          });
        } else {
          context.logger.info(
            `Pack '${rawPack}' processed. Removed: ${removedCount}. Skipped: ${skippedCount}.`,
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
    });
}
