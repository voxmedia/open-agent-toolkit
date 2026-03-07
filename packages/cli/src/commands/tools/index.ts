import { Command } from 'commander';
import { createToolsInfoCommand } from './info';
import { createToolsInstallCommand } from './install';
import { createToolsListCommand } from './list';
import { createToolsOutdatedCommand } from './outdated';
import { createToolsRemoveCommand } from './remove';
import { createToolsUpdateCommand } from './update';

export function createToolsCommand(): Command {
  const cmd = new Command('tools').description(
    'Manage OAT tool packs (install, update, remove, list)',
  );

  cmd.addCommand(createToolsListCommand());
  cmd.addCommand(createToolsOutdatedCommand());
  cmd.addCommand(createToolsInfoCommand());
  cmd.addCommand(createToolsUpdateCommand());
  cmd.addCommand(createToolsRemoveCommand());
  cmd.addCommand(createToolsInstallCommand());

  return cmd;
}
