import type { Command } from 'commander';
import { Option } from 'commander';

/**
 * Adds a local `--scope <scope>` option to the given command.
 *
 * `--scope` is deliberately NOT a global option because only a subset of
 * commands consume it. Attaching it here (as a per-command option) means it
 * appears in the command's own Options section and is rejected with an
 * "unknown option" error on commands that do not call this helper.
 *
 * `readGlobalOptions` uses `command.optsWithGlobals()` which merges local and
 * parent options, so `context.scope` is populated correctly with no changes to
 * `buildCommandContext`.
 */
export function withScopeOption(cmd: Command): Command {
  return cmd.addOption(
    new Option('--scope <scope>', 'Limit execution scope')
      .choices(['project', 'user', 'all'])
      .default('all'),
  );
}
