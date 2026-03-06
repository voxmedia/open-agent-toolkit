import { Command } from 'commander';
import { createDocsAnalyzeCommand } from './analyze';
import { createDocsApplyCommand } from './apply';
import { createDocsInitCommand } from './init';
import { createDocsNavCommand } from './nav';

export function createDocsCommand(): Command {
  return new Command('docs')
    .description('OAT documentation bootstrap and maintenance commands')
    .addCommand(createDocsAnalyzeCommand())
    .addCommand(createDocsApplyCommand())
    .addCommand(createDocsInitCommand())
    .addCommand(createDocsNavCommand());
}
