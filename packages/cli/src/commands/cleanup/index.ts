import { Command } from 'commander';

import { createCleanupArtifactsCommand } from './artifacts/artifacts';
import { createCleanupProjectCommand } from './project/project';

export function createCleanupCommand(): Command {
  return new Command('cleanup')
    .description('Cleanup OAT project and artifact hygiene issues')
    .addCommand(createCleanupProjectCommand())
    .addCommand(createCleanupArtifactsCommand());
}
