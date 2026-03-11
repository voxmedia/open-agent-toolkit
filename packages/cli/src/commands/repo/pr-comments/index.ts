import { Command } from 'commander';

import { createPrCommentsCollectCommand } from './collect';
import { createPrCommentsTriageCommand } from './triage-collection';

export function createPrCommentsCommand(): Command {
  const cmd = new Command('pr-comments').description(
    'Collect and triage PR review comments for analysis',
  );

  cmd.addCommand(createPrCommentsCollectCommand());
  cmd.addCommand(createPrCommentsTriageCommand());

  return cmd;
}
