import { normalize } from 'node:path';

import type { DocsRepoShape } from './resolve-options';

export interface DocsCommands {
  install: string;
  dev: string;
  build: string;
}

export function shellQuote(value: string): string {
  return /^[a-zA-Z0-9_./-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}

function isRootTarget(targetDir: string): boolean {
  return targetDir.trim() === '' || normalize(targetDir) === '.';
}

export function buildDocsCommands(
  repoShape: DocsRepoShape,
  targetDir: string,
  appName: string,
): DocsCommands {
  if (repoShape === 'monorepo') {
    return {
      install: 'pnpm install',
      dev: `pnpm --filter ${appName} dev`,
      build: `pnpm --filter ${appName} build`,
    };
  }

  if (isRootTarget(targetDir)) {
    return {
      install: 'pnpm install',
      dev: 'pnpm dev',
      build: 'pnpm build',
    };
  }

  return {
    install: `cd ${shellQuote(targetDir)} && pnpm install`,
    dev: `cd ${shellQuote(targetDir)} && pnpm dev`,
    build: `cd ${shellQuote(targetDir)} && pnpm build`,
  };
}
