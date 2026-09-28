import { buildCommandContext } from '@app/command-context';
import {
  INSTRUCTION_SYNC_STRATEGIES,
  type InstructionSyncStrategy,
  type InstructionsValidateCommandDependencies,
} from '@commands/instructions/instructions.types';
import {
  buildInstructionsPayload,
  buildLeftoverClaudeWarnings,
  buildShimRemovalBlockWarning,
  findLeftoverClaudeFiles,
  findShimRemovalBlockers,
  listShimRemovals,
  markBlockedShimEntries,
  formatInstructionsReport,
  readConfiguredInstructionSyncStrategy,
  resolveInstructionPointerExcludes,
  resolveInstructionSyncStrategy,
  scanInstructionFiles,
} from '@commands/instructions/instructions.utils';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command, Option } from 'commander';

function defaultDependencies(): InstructionsValidateCommandDependencies {
  return {
    buildCommandContext,
    findLeftoverClaudeFiles,
    readConfiguredInstructionSyncStrategy,
    resolveInstructionPointerExcludes,
    resolveProjectRoot,
    scanInstructionFiles,
  };
}

export function createInstructionsValidateCommand(
  overrides: Partial<InstructionsValidateCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  // `--strategy` has no Commander default; see `oat instructions sync`.
  return new Command('validate')
    .description(
      'Validate AGENTS.md/CLAUDE.md sync integrity for the selected strategy',
    )
    .addOption(
      new Option(
        '--strategy <strategy>',
        'Sync strategy to check (overrides instructions.claude.shims)',
      ).choices([...INSTRUCTION_SYNC_STRATEGIES]),
    )
    .action(
      async (options: { strategy?: InstructionSyncStrategy }, command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const strategy = resolveInstructionSyncStrategy(
            options.strategy,
            await dependencies.readConfiguredInstructionSyncStrategy(repoRoot),
          );
          const exclusions =
            await dependencies.resolveInstructionPointerExcludes(repoRoot);
          // Warned before any work: an operator whose opt-out silently matches
          // nothing must hear about it even when validate then reports `ok`.
          for (const warning of exclusions.warnings) {
            context.logger.warn(warning);
          }
          const entries = await dependencies.scanInstructionFiles(repoRoot, {
            excludedPaths: exclusions.configured,
            strategy,
          });
          const leftovers =
            strategy === 'none'
              ? await dependencies.findLeftoverClaudeFiles(repoRoot)
              : [];
          // The same all-or-nothing rule sync applies: while a CLAUDE.md has
          // content of its own, sync removes none of the shims below.
          const blockers = findShimRemovalBlockers(entries, leftovers);
          const wouldRemove = listShimRemovals(entries);
          const blocked = blockers.length > 0 && wouldRemove.length > 0;
          const payload = buildInstructionsPayload({
            mode: 'validate',
            strategy,
            entries: blocked ? markBlockedShimEntries(entries) : entries,
            actions: [],
            excludedPaths: exclusions.configured,
            effectiveExcludedPaths: exclusions.effective,
            exclusionWarnings: exclusions.warnings,
            // Warnings, never drift: they do not change the exit code.
            warnings: [
              ...(blocked
                ? [
                    buildShimRemovalBlockWarning(
                      repoRoot,
                      blockers,
                      wouldRemove,
                      'validate',
                    ),
                  ]
                : []),
              ...buildLeftoverClaudeWarnings(repoRoot, leftovers),
            ],
          });

          if (context.json) {
            context.logger.json(payload);
          } else {
            context.logger.info(formatInstructionsReport(payload, repoRoot));
            for (const warning of payload.warnings ?? []) {
              context.logger.warn(warning.message);
            }
            // While the block holds, sync cannot clear this drift; the
            // warning above names what can.
            if (payload.status === 'drift' && !blocked) {
              // Repeat the flag only when this run was given one: without it,
              // a bare sync resolves the same configured or default strategy.
              const fixCommand =
                options.strategy === undefined
                  ? 'Fix with: oat instructions sync'
                  : `Fix with: oat instructions sync --strategy ${strategy}`;
              context.logger.info(fixCommand);
            }
          }

          process.exitCode = payload.status === 'ok' ? 0 : 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 2;
        }
      },
    );
}
