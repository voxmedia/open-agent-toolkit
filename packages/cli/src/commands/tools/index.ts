import { Command } from 'commander';

import { createToolsHasCommand } from './has';
import { createToolsInfoCommand } from './info';
import { createToolsInstallCommand } from './install';
import { createToolsListCommand } from './list';
import { createToolsMigrateCommand } from './migrate';
import { createToolsOutdatedCommand } from './outdated';
import { createToolsRemoveCommand } from './remove';
import { createToolsUpdateCommand } from './update';

export function createToolsCommand(): Command {
  const cmd = new Command('tools').description(
    'Manage OAT tool packs (install, update, migrate, remove, list)',
  );

  cmd.addCommand(createToolsListCommand());
  cmd.addCommand(createToolsOutdatedCommand());
  cmd.addCommand(createToolsInfoCommand());
  cmd.addCommand(createToolsHasCommand());
  cmd.addCommand(createToolsUpdateCommand());
  cmd.addCommand(createToolsMigrateCommand());
  cmd.addCommand(createToolsRemoveCommand());
  cmd.addCommand(createToolsInstallCommand());

  return cmd;
}
