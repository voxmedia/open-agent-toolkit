import type { Command } from 'commander';
import {
  buildCommandContext,
  type GlobalOptions,
} from '../app/command-context';

interface StubCommand {
  name: string;
  description: string;
}

const STUB_COMMANDS: StubCommand[] = [
  {
    name: 'init',
    description: 'Initialize canonical directories and manifest',
  },
  { name: 'status', description: 'Report provider sync and drift status' },
  { name: 'sync', description: 'Sync canonical content to provider views' },
  { name: 'providers', description: 'Inspect provider capabilities and paths' },
  { name: 'doctor', description: 'Run environment and setup diagnostics' },
];

function readGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}

function registerStubCommand(program: Command, stub: StubCommand): void {
  program
    .command(stub.name)
    .description(stub.description)
    .action((_, command: Command) => {
      const context = buildCommandContext(readGlobalOptions(command));
      context.logger.info('Coming soon...', { command: stub.name });
    });
}

export function registerCommands(program: Command): void {
  for (const stub of STUB_COMMANDS) {
    registerStubCommand(program, stub);
  }
}
