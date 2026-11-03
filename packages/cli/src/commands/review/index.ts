import { Command } from 'commander';

import { createReviewCheckCommand } from './check';
import { createReviewLatestCommand } from './latest';
import { createReviewResolveCommand } from './resolve';

export function createReviewCommand(): Command {
  return new Command('review')
    .description('OAT review artifact commands')
    .addCommand(createReviewLatestCommand())
    .addCommand(createReviewCheckCommand())
    .addCommand(createReviewResolveCommand());
}
