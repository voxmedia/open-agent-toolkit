import { readFile } from 'node:fs/promises';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import { type ClericalSettlementReport } from './contract';
import { parseProposal } from './parsing';
import { verifyClericalSettlement } from './verifier';

interface CommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  verify: typeof verifyClericalSettlement;
}

const DEFAULT_DEPENDENCIES: CommandDependencies = {
  buildCommandContext,
  readFile: (path, encoding) => readFile(path, encoding),
  verify: verifyClericalSettlement,
};

function errorReport(message: string): ClericalSettlementReport {
  return {
    schemaVersion: 1,
    status: 'error',
    mode: null,
    event: null,
    repairRange: null,
    checks: [],
    settlement: null,
    reason: message,
  };
}

/** `oat project clerical-settlement verify`: read-only settlement assurance. */
export function createProjectClericalSettlementCommand(
  overrides: Partial<CommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('clerical-settlement')
    .description(
      'Verify a closed-kind clerical review repair from an explicit structured proposal (read-only)',
    )
    .addCommand(
      new Command('verify')
        .description(
          'Verify first settlement or replay from committed evidence and emit per-check JSON reasons (writes nothing)',
        )
        .requiredOption('--project <path>', 'OAT project path')
        .requiredOption(
          '--proposal <json-file>',
          'Structured clerical-settlement proposal JSON',
        )
        .action(
          async (
            options: { project: string; proposal: string },
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            let report: ClericalSettlementReport;
            try {
              const proposal = parseProposal(
                await dependencies.readFile(options.proposal, 'utf8'),
              );
              report = await dependencies.verify(
                options.project,
                proposal,
                context.cwd,
              );
            } catch (error) {
              report = errorReport(
                error instanceof Error ? error.message : String(error),
              );
            }
            context.logger.json(report);
            process.exitCode = report.status === 'verified' ? 0 : 1;
          },
        ),
    );
}

export * from './contract';
export { parseProposal, renderSettlementEntry } from './parsing';
export {
  verifyClericalSettlement,
  type ClericalSettlementDependencies,
} from './verifier';
