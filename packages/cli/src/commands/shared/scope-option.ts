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
 *
 * @param cmd - The Commander command to add the option to.
 * @param defaultScope - The default scope value. Defaults to `'all'` for most
 *   commands. Use `'project'` for commands that only support project scope
 *   (e.g. `providers set`) so bare invocations succeed without requiring an
 *   explicit `--scope project` flag.
 */
export function withScopeOption(
  cmd: Command,
  defaultScope: 'project' | 'user' | 'all' = 'all',
): Command {
  return cmd.addOption(
    new Option('--scope <scope>', 'Limit execution scope')
      .choices(['project', 'user', 'all'])
      .default(defaultScope),
  );
}
