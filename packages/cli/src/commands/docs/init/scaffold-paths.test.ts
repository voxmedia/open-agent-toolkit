import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
let assetsRoot: string;
const roots: string[] = [];

beforeAll(async () => {
  assetsRoot = await mkdtemp(join(tmpdir(), 'oat-scaffold-path-assets-'));
  execFileSync('bash', ['packages/cli/scripts/bundle-assets.sh'], {
    cwd: repo,
    env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
  });
}, 60_000);

afterEach(async () => {
  vi.doUnmock('node:path');
  vi.resetModules();
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
  roots.length = 0;
});
afterAll(async () => {
  await rm(assetsRoot, { recursive: true, force: true });
});

it.each(
  (['host', 'win32-relative'] as const).flatMap((pathMode) =>
    (['fumadocs', 'mkdocs'] as const).flatMap((framework) =>
      [false, true].map((preset) => ({ pathMode, framework, preset })),
    ),
  ),
)(
  'scaffolds the correct reader pages and toolchain link: $pathMode / $framework / preset=$preset',
  async ({ pathMode, framework, preset }) => {
    if (pathMode === 'win32-relative') {
      // Simulate Windows relative destinations in the real scaffold. Translate
      // absolute IO back to host paths; this is not native Windows execution.
      vi.doMock('node:path', async () => {
        const path =
          await vi.importActual<typeof import('node:path')>('node:path');
        return {
          ...path,
          join: (...parts: string[]) =>
            path.isAbsolute(parts[0] ?? '')
              ? path.join(
                  ...parts.map((part) => part.replaceAll('\\', path.sep)),
                )
              : path.win32.join(...parts),
        };
      });
    }
    const { scaffoldDocsApp } = await import('./scaffold');
    const root = await mkdtemp(join(tmpdir(), 'oat-scaffold-path-'));
    roots.push(root);
    const result = await scaffoldDocsApp(
      {
        assetsRoot,
        repoRoot: root,
        repoShape: 'nested-standalone',
        framework,
        appName: 'handbook',
        siteName: 'Example handbook',
        targetDir: 'handbook',
        siteDescription: 'Reader documentation',
        lint: 'none',
        format: 'none',
        ...(preset
          ? ({ iaPreset: 'domain-engineering', plannedPages: 15 } as const)
          : {}),
      },
      {
        detectPnpmVersion: () => '10.13.1',
        hasInheritedPackageManager: () => false,
      },
    );
    if (pathMode === 'win32-relative')
      expect(result.createdFiles).toContain(
        'docs\\contributing\\docs-toolchain.md',
      );
    const created = result.createdFiles.map((file) =>
      file.replaceAll('\\', '/'),
    );
    const index = await readFile(
      join(result.appRoot, 'docs', 'index.md'),
      'utf8',
    );
    const toolchain = await readFile(
      join(result.appRoot, 'docs', 'contributing', 'docs-toolchain.md'),
      'utf8',
    );
    expect
      .soft(created.filter((file) => file === 'docs/index.md'))
      .toHaveLength(1);
    if (preset) {
      expect.soft(created).not.toContain('docs/getting-started.md');
      expect
        .soft(await readdir(join(result.appRoot, 'docs')))
        .not.toContain('getting-started.md');
      expect.soft(index).toContain('](engineering/index.md)');
      expect.soft(index).not.toContain('](getting-started.md)');
      expect.soft(toolchain).toContain('[the documentation home](../index.md)');
      expect.soft(toolchain).not.toContain('[Getting Started]');
    } else {
      expect.soft(created).toContain('docs/getting-started.md');
      await expect
        .soft(
          readFile(join(result.appRoot, 'docs', 'getting-started.md'), 'utf8'),
        )
        .resolves.toContain('# Getting Started');
      expect.soft(index).toContain('](getting-started.md)');
      expect
        .soft(toolchain)
        .toContain('[Getting Started](../getting-started.md)');
    }
  },
);
