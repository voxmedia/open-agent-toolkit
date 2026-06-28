import type { Command } from 'commander';

/**
 * Commander's `.addCommand()` does not inherit the parent's help configuration.
 * This recursive helper applies `showGlobalOptions: true` to every node in the
 * command tree after registration, so that each subcommand's `--help` output
 * includes a "Global Options" section showing `--json`, `--verbose`, and `--cwd`.
 *
 * Must be called once at the end of `registerCommands(program)` after all
 * subcommands have been added via `.addCommand()`.
 */
export function applyHelpConfiguration(command: Command): void {
  command.configureHelp({ showGlobalOptions: true });
  for (const sub of command.commands) {
    applyHelpConfiguration(sub);
  }
}
