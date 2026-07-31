import { Command } from 'commander';

import { createReviewAuthorityBrokerCommand } from './authority-broker';
import { createReviewBeginEvidenceCommand } from './begin-evidence';
import { createReviewCheckpointArtifactsCommand } from './checkpoint-artifacts';
import { createReviewLatestCommand } from './latest';
import { createReviewPrepareContextCommand } from './prepare-context';
import { createReviewValidatePlanCommand } from './validate-plan';

export function createReviewCommand(): Command {
  return new Command('review')
    .description('OAT review artifact commands')
    .addCommand(createReviewLatestCommand())
    .addCommand(createReviewAuthorityBrokerCommand(), { hidden: true })
    .addCommand(createReviewPrepareContextCommand())
    .addCommand(createReviewCheckpointArtifactsCommand())
    .addCommand(createReviewValidatePlanCommand())
    .addCommand(createReviewBeginEvidenceCommand());
}
