import { Command } from 'commander';

import { createRepoArchiveCommand } from './archive';
import { createPrCommentsCommand } from './pr-comments';

export function createRepoCommand(): Command {
  const cmd = new Command('repo').description(
    'Repository-level analysis and insight tools',
  );

  cmd.addCommand(createRepoArchiveCommand());
  cmd.addCommand(createPrCommentsCommand());

  return cmd;
}
