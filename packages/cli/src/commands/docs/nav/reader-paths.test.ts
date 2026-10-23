import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { createDocsGenerateIndexCommand } from '@commands/docs/index-generate/index';
import { Command } from 'commander';
import { afterEach, expect, it } from 'vitest';

import { createDocsNavSyncCommand } from './sync';

const roots: string[] = [];
afterEach(async () => {
  process.exitCode = 0;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it('applies non-reader config only to the matching app/content root, while excludes stays manifest-only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-reader-paths-'));
  roots.push(root);
  execFileSync('git', ['init', '-q', root]);
  await mkdir(join(root, '.oat'));
  await writeFile(
    join(root, '.oat/config.json'),
    JSON.stringify({
      version: 1,
      documentation: {
        root: 'app one',
        tooling: 'fumadocs',
        nonReaderPaths: ['templates/'],
        excludes: ['manifest-only.md'],
      },
    }),
  );
  for (const app of ['app one', 'app two']) {
    await mkdir(join(root, app, 'docs/templates'), { recursive: true });
    await writeFile(join(root, app, 'source.config.ts'), 'export {};');
    await writeFile(
      join(root, app, 'docs/index.md'),
      '# Home\n## Contents\n- [Read](read.md)\n- [Nav only](manifest-only.md)\n- [Template](templates/index.md)',
    );
    await writeFile(join(root, app, 'docs/read.md'), '# Read');
    await writeFile(
      join(root, app, 'docs/manifest-only.md'),
      '# Manifest only',
    );
    await writeFile(
      join(root, app, 'docs/templates/index.md'),
      '# Templates\n## Contents\n- [Template](sample.md)',
    );
    await writeFile(join(root, app, 'docs/templates/sample.md'), '# Sample');
  }
  const capture = createLoggerCapture();
  const buildCommandContext = (options: GlobalOptions) => ({
    cwd: root,
    home: root,
    scope: 'project' as const,
    dryRun: false,
    verbose: false,
    interactive: false,
    json: options.json ?? false,
    logger: capture.logger,
  });
  async function nav(args: string[]) {
    const command = new Command().addCommand(
      createDocsNavSyncCommand({ buildCommandContext }),
    );
    await command.parseAsync(['sync', ...args], { from: 'user' });
  }
  await nav(['--target-dir', 'app one']);
  expect(process.exitCode).toBe(0);
  expect(
    JSON.parse(await readFile(join(root, 'app one/docs/meta.json'), 'utf8'))
      .pages,
  ).toEqual(['index', 'read', 'manifest-only']);
  await nav(['--target-dir', 'app one', '--check']);
  expect(process.exitCode).toBe(0);
  await nav(['--target-dir', 'app two']);
  expect(
    JSON.parse(await readFile(join(root, 'app two/docs/meta.json'), 'utf8'))
      .pages,
  ).toEqual(['index', 'read', 'manifest-only', 'templates']);
  async function manifest(app: string) {
    const command = new Command().addCommand(
      createDocsGenerateIndexCommand({ buildCommandContext }),
    );
    await command.parseAsync(
      [
        'generate-index',
        '--docs-dir',
        `${app}/docs`,
        '--output',
        `${app}/manifest.md`,
      ],
      { from: 'user' },
    );
    expect(process.exitCode).toBe(0);
    return readFile(join(root, app, 'manifest.md'), 'utf8');
  }
  expect(await manifest('app one')).not.toContain('sample.md');
  expect(await manifest('app two')).toContain('sample.md');
  expect(await manifest('app two')).not.toContain('manifest-only.md');
});
