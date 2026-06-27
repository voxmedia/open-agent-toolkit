import { OAT_VERSION } from '@shared/oat-version';
import { Command } from 'commander';

const PROGRAM_NAME = 'oat';
const PROGRAM_DESCRIPTION =
  'Open Agent Toolkit CLI for provider interoperability';

export function createProgram(): Command {
  return new Command()
    .name(PROGRAM_NAME)
    .description(PROGRAM_DESCRIPTION)
    .version(OAT_VERSION)
    .option('--json', 'Output a single JSON document')
    .option('--verbose', 'Enable verbose debug output')
    .option('--cwd <path>', 'Override working directory')
    .configureHelp({ showGlobalOptions: true });
}
