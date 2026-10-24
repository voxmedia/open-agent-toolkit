import { Command } from 'commander';

import { createDocsAnalyzeCommand } from './analyze';
import { createDocsApplyCommand } from './apply';
import { createDocsCheckCommand } from './check/check';
import { createDocsGenerateIndexCommand } from './index-generate';
import { createDocsInitCommand } from './init';
import { createDocsLiteralsCommand } from './literals/literals';
import { createDocsMigrateCommand } from './migrate';
import { createDocsNavCommand } from './nav';

export function createDocsCommand(): Command {
  return new Command('docs')
    .description('OAT documentation bootstrap and maintenance commands')
    .addCommand(createDocsCheckCommand())
    .addCommand(createDocsLiteralsCommand())
    .addCommand(createDocsAnalyzeCommand())
    .addCommand(createDocsApplyCommand())
    .addCommand(createDocsGenerateIndexCommand())
    .addCommand(createDocsInitCommand())
    .addCommand(createDocsMigrateCommand())
    .addCommand(createDocsNavCommand());
}
