import {
  execFile,
  type ExecFileException,
  type ExecFileOptionsWithStringEncoding,
} from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import type { SyncTarget } from '@commands/project/sync/ref-sync';

import { computeLinksInput } from './compute';
import { renderLinksBlock, replaceLinksBlock } from './render';

export interface GhResult {
  stdout: string;
  stderr: string;
  code: number;
  missing?: boolean;
}

export interface GhRunner {
  run(args: string[]): Promise<GhResult>;
}

type ExecFileImplementation = (
  file: string,
  args: readonly string[],
  options: ExecFileOptionsWithStringEncoding,
  callback: (
    error: ExecFileException | null,
    stdout: string,
    stderr: string,
  ) => void,
) => unknown;

export function createGhRunner(
  execFileImpl: ExecFileImplementation = execFile,
): GhRunner {
  return {
    async run(args) {
      return new Promise<GhResult>((resolve) => {
        execFileImpl(
          'gh',
          args,
          { encoding: 'utf8' },
          (error, stdout, stderr) => {
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              code:
                typeof error?.code === 'number'
                  ? error.code
                  : error
                    ? error.code === 'ENOENT'
                      ? 127
                      : 1
                    : 0,
              ...(error?.code === 'ENOENT' ? { missing: true } : {}),
            });
          },
        );
      });
    },
  };
}

export const defaultGhRunner = createGhRunner();

interface RefreshDependencies {
  gh: GhRunner;
  git: GitRunner;
  computeLinksInput: typeof computeLinksInput;
  now: () => Date;
  warn: (message: string) => void;
}

const DEFAULT_DEPENDENCIES: RefreshDependencies = {
  gh: defaultGhRunner,
  git: defaultGitRunner,
  computeLinksInput,
  now: () => new Date(),
  warn: (message) => process.stderr.write(`${message}\n`),
};

export async function refreshPrLinks(
  target: SyncTarget,
  prUrl: string,
  overrides: Partial<RefreshDependencies> = {},
): Promise<'refreshed' | 'skipped' | 'failed'> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const viewed = await dependencies.gh.run([
    'pr',
    'view',
    prUrl,
    '--json',
    'body',
  ]);
  if (viewed.code !== 0) {
    dependencies.warn(
      viewed.missing
        ? 'Skipping PR link refresh because the GitHub CLI is unavailable.'
        : `Could not read PR body for link refresh: ${viewed.stderr || viewed.stdout || `gh exited ${viewed.code}`}`,
    );
    return viewed.missing ? 'skipped' : 'failed';
  }

  let body: string;
  try {
    const parsed = JSON.parse(viewed.stdout) as { body?: unknown };
    if (typeof parsed.body !== 'string') throw new Error('missing body');
    body = parsed.body;
  } catch {
    dependencies.warn('Could not parse the PR body returned by gh.');
    return 'failed';
  }

  const input = await dependencies.computeLinksInput(target, dependencies.git, {
    now: dependencies.now(),
  });
  const replacement = replaceLinksBlock(body, renderLinksBlock(input));
  if (replacement.malformed) {
    dependencies.warn(
      'Skipping PR link refresh because the existing OAT links markers are malformed.',
    );
    return 'skipped';
  }

  const tempDirectory = await mkdtemp(join(tmpdir(), 'oat-pr-body-'));
  const bodyFile = join(tempDirectory, 'body.md');
  try {
    await writeFile(bodyFile, replacement.body, 'utf8');
    const edited = await dependencies.gh.run([
      'pr',
      'edit',
      prUrl,
      '--body-file',
      bodyFile,
    ]);
    if (edited.code !== 0) {
      dependencies.warn(
        `Could not refresh PR links: ${edited.stderr || edited.stdout || `gh exited ${edited.code}`}`,
      );
      return edited.missing ? 'skipped' : 'failed';
    }
    return 'refreshed';
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
