import { describe, expect, it } from 'vitest';

import { buildDocsCommands } from './docs-commands';

describe('buildDocsCommands', () => {
  it('builds monorepo commands from the workspace root', () => {
    expect(buildDocsCommands('monorepo', 'apps/oat-docs', 'oat-docs')).toEqual({
      install: 'pnpm install',
      dev: 'pnpm --filter oat-docs dev',
      build: 'pnpm --filter oat-docs build',
    });
  });

  it('builds nested-standalone commands from the docs app directory', () => {
    expect(
      buildDocsCommands('nested-standalone', 'documentation', 'docs'),
    ).toEqual({
      install: 'cd documentation && pnpm install',
      dev: 'cd documentation && pnpm dev',
      build: 'cd documentation && pnpm build',
    });
  });

  it('builds subdirectory single-package commands from the app directory', () => {
    expect(buildDocsCommands('single-package', 'docs', 'docs')).toEqual({
      install: 'cd docs && pnpm install',
      dev: 'cd docs && pnpm dev',
      build: 'cd docs && pnpm build',
    });
  });

  it('builds repo-root single-package commands without a directory prefix', () => {
    expect(buildDocsCommands('single-package', '.', 'docs')).toEqual({
      install: 'pnpm install',
      dev: 'pnpm dev',
      build: 'pnpm build',
    });
  });
});
