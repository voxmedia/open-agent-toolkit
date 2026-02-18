import { Command } from 'commander';

function createCleanupProjectCommand(): Command {
  return new Command('project').description(
    'Cleanup project pointers, state, and lifecycle drift',
  );
}

function createCleanupArtifactsCommand(): Command {
  return new Command('artifacts').description(
    'Cleanup stale review and external-plan artifacts',
  );
}

export function createCleanupCommand(): Command {
  return new Command('cleanup')
    .description('Cleanup OAT project and artifact hygiene issues')
    .addCommand(createCleanupProjectCommand())
    .addCommand(createCleanupArtifactsCommand());
}
