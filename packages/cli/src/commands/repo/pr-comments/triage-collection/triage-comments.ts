import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type { CommandContext } from '@app/command-context';
import { CliError } from '@errors/cli-error';
import { ensureDir, fileExists } from '@fs/io';

import type {
  CollectionChunk,
  IndexedComment,
} from '../collect/pr-comments.types';

export interface TriageOptions {
  readonly inputDir: string;
  readonly outputDir: string;
  readonly month: string;
}

export interface TriageDependencies {
  readJsonFile: (path: string) => Promise<CollectionChunk>;
}

export const defaultTriageDependencies: TriageDependencies = {
  readJsonFile: async (path) => {
    const content = await readFile(path, 'utf8');
    return JSON.parse(content) as CollectionChunk;
  },
};

export async function runTriageComments(
  context: CommandContext,
  options: TriageOptions,
  deps: TriageDependencies = defaultTriageDependencies,
): Promise<void> {
  const { logger } = context;
  const { inputDir, outputDir, month } = options;

  const inputPath = join(inputDir, `${month}.json`);
  if (!(await fileExists(inputPath))) {
    throw new CliError(`Collection file not found: ${inputPath}`);
  }

  const chunk = await deps.readJsonFile(inputPath);

  if (chunk.comments.length === 0) {
    logger.warn(`No comments in ${month} to triage.`);
    return;
  }

  if (!context.interactive) {
    throw new CliError(
      'Triage requires an interactive terminal. Remove --json flag or run in a TTY.',
    );
  }

  logger.info(`Triaging ${chunk.comments.length} comments from ${month}...`);
  logger.info('For each comment, enter [k]eep or [d]iscard (default: keep).\n');

  const kept: IndexedComment[] = [];
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  try {
    for (const comment of chunk.comments) {
      printCommentSummary(comment);

      const answer = await askQuestion(rl, `  ${comment.rcId} [k/d]? `);
      const choice = answer.trim().toLowerCase();

      if (choice === 'd' || choice === 'discard') {
        logger.info(`  → Discarded ${comment.rcId}`);
      } else {
        kept.push(comment);
        logger.info(`  → Kept ${comment.rcId}`);
      }
      logger.info('');
    }
  } finally {
    rl.close();
  }

  await ensureDir(outputDir);
  const outputChunk: CollectionChunk = { month, comments: kept };
  const outputPath = join(outputDir, `${month}.triaged.json`);
  await writeFile(
    outputPath,
    `${JSON.stringify(outputChunk, null, 2)}\n`,
    'utf8',
  );

  logger.success(
    `Triage complete: kept ${kept.length}/${chunk.comments.length} comments → ${outputPath}`,
  );

  if (context.json) {
    logger.json({
      status: 'ok',
      month,
      total: chunk.comments.length,
      kept: kept.length,
      discarded: chunk.comments.length - kept.length,
      outputPath,
    });
  }
}

function printCommentSummary(comment: IndexedComment): void {
  const lines = [
    `  ──── ${comment.rcId} ────`,
    `  PR #${comment.prNumber}: ${comment.prTitle}`,
    `  File: ${comment.filePath}${comment.line ? `:${comment.line}` : ''}`,
    `  Author: ${comment.author} (${comment.createdAt.slice(0, 10)})`,
    `  ${comment.body.length > 200 ? `${comment.body.slice(0, 200)}...` : comment.body}`,
  ];
  for (const line of lines) {
    process.stderr.write(`${line}\n`);
  }
}

function askQuestion(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}
