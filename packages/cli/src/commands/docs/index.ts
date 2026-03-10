import { Command } from 'commander';

import { createDocsAnalyzeCommand } from './analyze';
import { createDocsApplyCommand } from './apply';
import { createDocsGenerateIndexCommand } from './index-generate';
import { createDocsInitCommand } from './init';
import { createDocsMigrateCommand } from './migrate';
import { createDocsNavCommand } from './nav';

export function createDocsCommand(): Command {
  return new Command('docs')
    .description('OAT documentation bootstrap and maintenance commands')
    .addCommand(createDocsAnalyzeCommand())
    .addCommand(createDocsApplyCommand())
    .addCommand(createDocsGenerateIndexCommand())
    .addCommand(createDocsInitCommand())
    .addCommand(createDocsMigrateCommand())
    .addCommand(createDocsNavCommand());
}
