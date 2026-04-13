import { OAT_VERSION } from '@shared/oat-version';
import { Command, Option } from 'commander';

const PROGRAM_NAME = 'oat';
const PROGRAM_DESCRIPTION =
  'Open Agent Toolkit CLI for provider interoperability';
const SCOPE_CHOICES = ['project', 'user', 'all'] as const;

export function createProgram(): Command {
  return new Command()
    .name(PROGRAM_NAME)
    .description(PROGRAM_DESCRIPTION)
    .version(OAT_VERSION)
    .option('--json', 'Output a single JSON document')
    .option('--verbose', 'Enable verbose debug output')
    .addOption(
      new Option('--scope <scope>', 'Limit execution scope')
        .choices([...SCOPE_CHOICES])
        .default('all'),
    )
    .option('--cwd <path>', 'Override working directory');
}
