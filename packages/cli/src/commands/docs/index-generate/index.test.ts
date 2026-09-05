import {
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { buildDocumentationConfig } from '@commands/docs/init/scaffold';
import type { OatConfig } from '@config/oat-config';
import { dirExists } from '@fs/io';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDocsGenerateIndexCommand,
  GENERATED_INDEX_WARNING,
} from './index';

const REPO_ROOT = '/tmp/repo';

/** Mirrors the command's production `readLinkIfSymlink` default. */
async function readLinkIfSymlink(path: string): Promise<string | null> {
  try {
    return await readlink(path);
  } catch {
    return null;
  }
}

/**
 * The real Fumadocs scaffold seed (`buildDocumentationConfig`), rebased onto the
 * repo-relative app root used by these tests. Deriving it from the scaffold
 * function keeps the fixture from encoding a config shape `oat docs init` never
 * writes.
 */
function fumadocsScaffoldConfig(appDir = 'apps/docs'): OatConfig {
  return {
    version: 1,
    documentation: buildDocumentationConfig('fumadocs', appDir),
  };
}

function mkdocsScaffoldConfig(appDir = 'apps/docs'): OatConfig {
  return {
    version: 1,
    documentation: buildDocumentationConfig('mkdocs', appDir),
  };
}

interface HarnessOptions {
  cwd?: string;
  repoRoot?: string;
  config?: OatConfig;
  /** Absolute directories that exist on the simulated filesystem. */
  directories?: string[];
  /** Absolute path → contents for files that exist before the run. */
  files?: Record<string, string>;
  /** Replaces the default no-symlink `realpath` stub. */
  realpath?: (path: string) => Promise<string>;
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const cwd = options.cwd ?? REPO_ROOT;
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const config: OatConfig = options.config ?? {
    version: 1,
    documentation: { root: 'apps/docs', tooling: 'fumadocs' },
  };
  const directories = new Set(
    options.directories ?? [
      `${REPO_ROOT}/apps/docs`,
      `${REPO_ROOT}/apps/docs/docs`,
    ],
  );
  const files = new Map(Object.entries(options.files ?? {}));

  const writtenConfigs: Array<{ repoRoot: string; config: OatConfig }> = [];
  const writtenFiles: Array<{ path: string; content: string }> = [];
  const indexedDirs: string[] = [];

  const readOatConfigMock = vi.fn(async () => structuredClone(config));
  const generateIndexMock = vi.fn(async (docsDir: string) => {
    indexedDirs.push(docsDir);
    return [{ title: 'Home', path: 'index.md', description: 'Welcome' }];
  });
  const writeOatConfigMock = vi.fn(
    async (root: string, nextConfig: OatConfig) => {
      writtenConfigs.push({ repoRoot: root, config: nextConfig });
    },
  );

  const command = createDocsGenerateIndexCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'all' as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    fileDeps: {
      generateIndex: generateIndexMock,
      renderIndex: vi.fn(() => '- [Home](index.md) — Welcome\n'),
      writeFile: vi.fn(async (path: string, content: string) => {
        writtenFiles.push({ path, content });
        files.set(path, content);
      }),
      readOatConfig: readOatConfigMock,
      writeOatConfig: writeOatConfigMock,
      resolveRepoRoot: vi.fn(async () => repoRoot),
      dirExists: vi.fn(async (path: string) => directories.has(path)),
      readFileIfPresent: vi.fn(async (path: string) => files.get(path) ?? null),
      // A filesystem with no symlinks: every existing path is its own real
      // path, and anything else reports ENOENT the way `realpath` does.
      realpath: vi.fn(
        options.realpath ??
          (async (path: string) => {
            if (directories.has(path) || files.has(path)) {
              return path;
            }
            const error = new Error(
              `ENOENT: no such file or directory, realpath '${path}'`,
            ) as NodeJS.ErrnoException;
            error.code = 'ENOENT';
            throw error;
          }),
      ),
      readLinkIfSymlink: vi.fn(async () => null),
    },
  });

  return {
    capture,
    command,
    files,
    generateIndexMock,
    indexedDirs,
    readOatConfigMock,
    writeOatConfigMock,
    writtenConfigs,
    writtenFiles,
  };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  const docs = new Command('docs');
  docs.addCommand(command);
  program.addCommand(docs);

  await program.parseAsync([...globalArgs, 'docs', 'generate-index', ...args], {
    from: 'user',
  });
}

describe('createDocsGenerateIndexCommand', () => {
  const createdDirs: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  afterEach(async () => {
    process.exitCode = 0;
    await Promise.all(
      createdDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    createdDirs.length = 0;
  });

  describe('configured path resolution', () => {
    it('derives both paths from documentation.root on a bare monorepo-root run', async () => {
      const { command, indexedDirs, writtenFiles } = createHarness({
        cwd: REPO_ROOT,
        config: {
          version: 1,
          documentation: { root: 'apps/docs', tooling: 'fumadocs' },
        },
        directories: [`${REPO_ROOT}/apps/docs`, `${REPO_ROOT}/apps/docs/docs`],
      });

      await runCommand(command);

      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/docs`]);
      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
      expect(writtenFiles[0]!.content.startsWith(GENERATED_INDEX_WARNING)).toBe(
        true,
      );
      expect(process.exitCode).toBe(0);
    });

    it('derives configured paths identically when invoked from a subdirectory', async () => {
      const { command, indexedDirs, readOatConfigMock, writtenFiles } =
        createHarness({
          cwd: `${REPO_ROOT}/packages/cli`,
        });

      await runCommand(command);

      // Config is read from the repo root, not the CWD, or the derivation
      // would silently depend on where the command was invoked.
      expect(readOatConfigMock).toHaveBeenCalledWith(REPO_ROOT);
      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/docs`]);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
    });

    const explicitCases: Array<{
      name: string;
      cwd: string;
      args: string[];
      expectedDocsDir: string;
      expectedOutput: string;
    }> = [
      {
        name: 'both paths explicit are resolved from the CWD',
        cwd: `${REPO_ROOT}/apps/docs`,
        args: ['--docs-dir', 'docs', '--output', 'index.md'],
        expectedDocsDir: `${REPO_ROOT}/apps/docs/docs`,
        expectedOutput: `${REPO_ROOT}/apps/docs/index.md`,
      },
      {
        name: 'explicit --docs-dir overrides the configured derivation',
        cwd: REPO_ROOT,
        args: ['--docs-dir', 'apps/docs/guides'],
        expectedDocsDir: `${REPO_ROOT}/apps/docs/guides`,
        expectedOutput: `${REPO_ROOT}/apps/docs/index.md`,
      },
      {
        name: 'explicit --output overrides the configured derivation',
        cwd: REPO_ROOT,
        args: ['--output', 'apps/docs/manifest.md'],
        expectedDocsDir: `${REPO_ROOT}/apps/docs/docs`,
        expectedOutput: `${REPO_ROOT}/apps/docs/manifest.md`,
      },
      {
        name: 'explicit relative paths stay CWD-relative, not repo-relative',
        cwd: `${REPO_ROOT}/apps/docs`,
        args: ['--docs-dir', 'docs', '--output', '../../generated/docs.md'],
        expectedDocsDir: `${REPO_ROOT}/apps/docs/docs`,
        expectedOutput: `${REPO_ROOT}/generated/docs.md`,
      },
    ];

    for (const testCase of explicitCases) {
      it(testCase.name, async () => {
        const { command, indexedDirs, writtenFiles } = createHarness({
          cwd: testCase.cwd,
        });

        await runCommand(command, testCase.args);

        expect(indexedDirs).toEqual([testCase.expectedDocsDir]);
        expect(writtenFiles).toHaveLength(1);
        expect(writtenFiles[0]!.path).toBe(testCase.expectedOutput);
      });
    }
  });

  describe('fail-closed configuration', () => {
    it('fails before generation when documentation.root is missing', async () => {
      const {
        capture,
        command,
        generateIndexMock,
        writtenConfigs,
        writtenFiles,
      } = createHarness({
        config: { version: 1, documentation: {} },
      });

      await runCommand(command);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writtenFiles).toHaveLength(0);
      expect(writtenConfigs).toHaveLength(0);
      expect(capture.error.join('\n')).toContain('documentation.root');
      expect(process.exitCode).toBe(2);
    });

    it('fails when documentation.root is blank even if --docs-dir is explicit', async () => {
      const { command, generateIndexMock, writtenFiles } = createHarness({
        config: { version: 1, documentation: { root: '   ' } },
      });

      await runCommand(command, ['--docs-dir', 'apps/docs/docs']);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writtenFiles).toHaveLength(0);
      expect(process.exitCode).toBe(2);
    });

    it('fails when the configured documentation.root is not a directory', async () => {
      const { capture, command, generateIndexMock, writtenFiles } =
        createHarness({
          config: {
            version: 1,
            documentation: { root: 'apps/missing', tooling: 'fumadocs' },
          },
          directories: [],
        });

      await runCommand(command, ['--output', 'generated/docs.md']);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writtenFiles).toHaveLength(0);
      expect(capture.error.join('\n')).toContain('is not a directory');
      expect(capture.error.join('\n')).toContain('apps/missing');
      expect(process.exitCode).toBe(2);
    });

    it('fails when the configured root is unusable even if --docs-dir is explicit', async () => {
      const { capture, command, generateIndexMock, writtenFiles } =
        createHarness({
          config: {
            version: 1,
            documentation: { root: 'apps/missing', tooling: 'fumadocs' },
          },
          directories: [`${REPO_ROOT}/apps/docs/docs`],
        });

      await runCommand(command, ['--docs-dir', 'apps/docs/docs']);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writtenFiles).toHaveLength(0);
      expect(capture.error.join('\n')).toContain('is not a directory');
      expect(process.exitCode).toBe(2);
    });

    it('reports the failure as machine-readable JSON', async () => {
      const { capture, command } = createHarness({
        config: { version: 1, documentation: {} },
      });

      await runCommand(command, [], ['--json']);

      expect(capture.jsonPayloads).toHaveLength(1);
      const payload = capture.jsonPayloads[0] as {
        status: string;
        message: string;
      };
      expect(payload.status).toBe('error');
      expect(payload.message).toContain('documentation.root');
      expect(payload.message).toContain('--docs-dir');
    });
  });

  describe('scaffold-derived safety', () => {
    it('leaves the authored Fumadocs docs/index.md untouched and records the manifest transition', async () => {
      const authored = '---\ntitle: Docs\n---\n\n# Docs\n\n## Contents\n';
      const config = fumadocsScaffoldConfig();
      // Pre-fix seed: documentation.index still points at the authored page.
      config.documentation!.index = 'apps/docs/docs/index.md';

      const { command, files, writtenConfigs, writtenFiles } = createHarness({
        config,
        files: { [`${REPO_ROOT}/apps/docs/docs/index.md`]: authored },
      });

      await runCommand(command);

      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
      expect(files.get(`${REPO_ROOT}/apps/docs/docs/index.md`)).toBe(authored);

      expect(writtenConfigs).toHaveLength(1);
      expect(writtenConfigs[0]!.repoRoot).toBe(REPO_ROOT);
      expect(writtenConfigs[0]!.config.documentation?.index).toBe(
        'apps/docs/index.md',
      );
    });

    it('does not rewrite config when documentation.index already names the manifest', async () => {
      const { command, writtenConfigs, writtenFiles } = createHarness({
        config: fumadocsScaffoldConfig(),
      });

      await runCommand(command);

      expect(writtenFiles).toHaveLength(1);
      expect(writtenConfigs).toHaveLength(0);
    });

    it('never writes config or mkdocs.yml on an MkDocs scaffold', async () => {
      const mkdocsYaml = 'site_name: Docs\nnav:\n  - Home: index.md\n';
      const { command, files, writeOatConfigMock, writtenFiles } =
        createHarness({
          config: mkdocsScaffoldConfig(),
          files: { [`${REPO_ROOT}/apps/docs/mkdocs.yml`]: mkdocsYaml },
        });

      await runCommand(command);

      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
      expect(files.get(`${REPO_ROOT}/apps/docs/mkdocs.yml`)).toBe(mkdocsYaml);
      expect(writeOatConfigMock).toHaveBeenCalledTimes(0);
    });

    it('records the manifest when neither tooling nor config is declared', async () => {
      const { command, writtenConfigs } = createHarness({
        config: { version: 1, documentation: { root: 'apps/docs' } },
      });

      await runCommand(command);

      expect(writtenConfigs).toHaveLength(1);
      expect(writtenConfigs[0]!.config.documentation?.index).toBe(
        'apps/docs/index.md',
      );
    });

    it('does not write config when tooling is undeclared but documentation.config is set', async () => {
      const { command, writeOatConfigMock, writtenFiles } = createHarness({
        config: {
          version: 1,
          documentation: {
            root: 'apps/docs',
            config: 'apps/docs/next.config.js',
          },
        },
      });

      await runCommand(command);

      expect(writtenFiles).toHaveLength(1);
      expect(writeOatConfigMock).not.toHaveBeenCalled();
    });

    it('records a repo-relative documentation.index for an aliased output path', async () => {
      // Simulates the macOS `/tmp` → `/private/tmp` alias: the operator names
      // the aliased spelling, which must not be persisted into tracked config.
      const existing = new Set([
        `${REPO_ROOT}/apps/docs`,
        `${REPO_ROOT}/apps/docs/docs`,
      ]);
      const aliasConfig = fumadocsScaffoldConfig();
      aliasConfig.documentation!.index = 'apps/docs/docs/index.md';
      const { command, writtenConfigs } = createHarness({
        config: aliasConfig,
        directories: [...existing],
        realpath: async (path: string) => {
          const lexical = path.startsWith('/private')
            ? path.slice('/private'.length)
            : path;
          if (existing.has(lexical)) {
            return `/private${lexical}`;
          }
          const error = new Error('ENOENT') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        },
      });

      await runCommand(command, [
        '--output',
        `/private${REPO_ROOT}/apps/docs/index.md`,
      ]);

      expect(writtenConfigs).toHaveLength(1);
      expect(writtenConfigs[0]!.config.documentation?.index).toBe(
        'apps/docs/index.md',
      );
    });

    it('does not persist a documentation.index that escapes the repository', async () => {
      const { command, writeOatConfigMock, writtenFiles } = createHarness({
        config: {
          version: 1,
          documentation: { root: '../shared-docs', tooling: 'fumadocs' },
        },
        directories: ['/tmp/shared-docs', '/tmp/shared-docs/docs'],
      });

      await runCommand(command);

      // The manifest is still written; only the nonportable config value is
      // withheld.
      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]!.path).toBe('/tmp/shared-docs/index.md');
      expect(writeOatConfigMock).not.toHaveBeenCalled();
    });

    it('does not write config when the output lands outside documentation.root', async () => {
      const { command, writeOatConfigMock, writtenFiles } = createHarness({
        config: fumadocsScaffoldConfig(),
      });

      await runCommand(command, ['--output', 'generated/docs.md']);

      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/generated/docs.md`);
      expect(writeOatConfigMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('output refusals', () => {
    const refusalCases: Array<{
      name: string;
      config: OatConfig;
      args: string[];
      files?: Record<string, string>;
      expectedMessage: string;
    }> = [
      {
        name: 'refuses an --output inside the indexed docs directory',
        config: fumadocsScaffoldConfig(),
        args: ['--output', 'apps/docs/docs/index.md'],
        expectedMessage: 'inside the docs directory',
      },
      {
        name: 'refuses an --output at documentation.config',
        config: mkdocsScaffoldConfig(),
        args: ['--output', 'apps/docs/mkdocs.yml'],
        expectedMessage: 'documentation tool config',
      },
      {
        name: 'refuses a YAML --output path',
        config: fumadocsScaffoldConfig(),
        args: ['--output', 'generated/index.yaml'],
        expectedMessage: 'YAML file',
      },
      {
        name: 'refuses a mixed-case YAML --output path',
        config: fumadocsScaffoldConfig(),
        args: ['--output', 'generated/index.YAML'],
        expectedMessage: 'YAML file',
      },
      {
        name: 'refuses a child directory whose name begins with two dots',
        config: fumadocsScaffoldConfig(),
        args: ['--output', 'apps/docs/docs/..draft/page.md'],
        expectedMessage: 'inside the docs directory',
      },
      {
        name: 'refuses a derived output whose existing file lacks the generated header',
        config: fumadocsScaffoldConfig(),
        args: [],
        files: {
          [`${REPO_ROOT}/apps/docs/index.md`]: '# Hand-authored landing page\n',
        },
        expectedMessage: 'not a generated index',
      },
    ];

    for (const testCase of refusalCases) {
      it(testCase.name, async () => {
        const {
          capture,
          command,
          generateIndexMock,
          writeOatConfigMock,
          writtenFiles,
        } = createHarness({
          config: testCase.config,
          files: testCase.files,
        });

        await runCommand(command, testCase.args);

        expect(generateIndexMock).not.toHaveBeenCalled();
        expect(writtenFiles).toHaveLength(0);
        expect(writeOatConfigMock).not.toHaveBeenCalled();
        expect(capture.error.join('\n')).toContain(testCase.expectedMessage);
        expect(process.exitCode).toBe(2);
      });
    }

    it('allows a sibling directory whose name shares the docs prefix', async () => {
      const { command, generateIndexMock, writtenFiles } = createHarness({
        config: fumadocsScaffoldConfig(),
      });

      await runCommand(command, [
        '--output',
        'apps/docs/docs-archive/index.md',
      ]);

      expect(generateIndexMock).toHaveBeenCalledTimes(1);
      expect(writtenFiles[0]!.path).toBe(
        `${REPO_ROOT}/apps/docs/docs-archive/index.md`,
      );
    });

    it('overwrites an unmarked file when --output names it explicitly', async () => {
      const { command, generateIndexMock, writtenFiles } = createHarness({
        config: fumadocsScaffoldConfig(),
        files: {
          [`${REPO_ROOT}/apps/docs/index.md`]: '# Hand-authored landing page\n',
        },
      });

      await runCommand(command, ['--output', 'apps/docs/index.md']);

      expect(generateIndexMock).toHaveBeenCalledTimes(1);
      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
      expect(writtenFiles[0]!.content.startsWith(GENERATED_INDEX_WARNING)).toBe(
        true,
      );
    });
  });

  describe('legacy source-root compatibility', () => {
    it('indexes a legacy source root directly when it has no docs child', async () => {
      const { command, indexedDirs, writtenFiles } = createHarness({
        config: {
          version: 1,
          documentation: { root: 'apps/docs/docs', tooling: 'fumadocs' },
        },
        directories: [`${REPO_ROOT}/apps/docs`, `${REPO_ROOT}/apps/docs/docs`],
        // no `${REPO_ROOT}/apps/docs/docs/docs`
      });

      await runCommand(command, ['--output', 'apps/docs/index.md']);

      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/docs`]);
      expect(writtenFiles[0]!.path).toBe(`${REPO_ROOT}/apps/docs/index.md`);
    });

    it('refuses the bare run on a legacy source root rather than writing into the indexed tree', async () => {
      const { capture, command, generateIndexMock, writtenFiles } =
        createHarness({
          config: {
            version: 1,
            documentation: { root: 'apps/docs/docs', tooling: 'fumadocs' },
          },
          directories: [`${REPO_ROOT}/apps/docs/docs`],
        });

      await runCommand(command);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writtenFiles).toHaveLength(0);
      expect(capture.error.join('\n')).toContain('inside the docs directory');
      expect(process.exitCode).toBe(2);
    });

    it('narrows a source root that itself contains a nested docs directory', async () => {
      const { command, indexedDirs, writtenFiles } = createHarness({
        config: {
          version: 1,
          documentation: { root: 'apps/docs/docs', tooling: 'fumadocs' },
        },
        directories: [
          `${REPO_ROOT}/apps/docs/docs`,
          `${REPO_ROOT}/apps/docs/docs/docs`,
        ],
      });

      await runCommand(command);

      // The `<root>/docs` rule wins over the root itself; `--docs-dir` is the
      // escape hatch when that narrowing is wrong for a legacy layout.
      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/docs/docs`]);
      expect(writtenFiles[0]!.path).toBe(
        `${REPO_ROOT}/apps/docs/docs/index.md`,
      );
    });

    it('reports the derived docs directory in JSON output', async () => {
      const { capture, command, indexedDirs } = createHarness({
        config: {
          version: 1,
          documentation: { root: 'apps/docs', tooling: 'fumadocs' },
        },
        directories: [`${REPO_ROOT}/apps/docs`, `${REPO_ROOT}/apps/docs/docs`],
      });

      await runCommand(command, [], ['--json']);

      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/docs`]);
      const payload = capture.jsonPayloads[0] as {
        status: string;
        docsDir: string;
        docsDirSource: string;
        outputPath: string;
      };
      expect(payload.status).toBe('ok');
      expect(payload.docsDir).toBe(`${REPO_ROOT}/apps/docs/docs`);
      expect(payload.docsDirSource).toBe('config-docs-subdirectory');
      expect(payload.outputPath).toBe(`${REPO_ROOT}/apps/docs/index.md`);
    });

    it('falls back to the configured root when it has no docs child', async () => {
      const { capture, command, indexedDirs } = createHarness({
        config: {
          version: 1,
          documentation: { root: 'apps/docs', tooling: 'fumadocs' },
        },
        // The root exists; only the `docs` child is absent.
        directories: [`${REPO_ROOT}/apps/docs`],
      });

      await runCommand(command, ['--output', 'generated/docs.md'], ['--json']);

      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs`]);
      const payload = capture.jsonPayloads[0] as { docsDirSource: string };
      expect(payload.docsDirSource).toBe('config-root');
    });

    it('reports an explicit --docs-dir as the flag source', async () => {
      const { capture, command, indexedDirs } = createHarness({
        directories: [`${REPO_ROOT}/apps/docs`, `${REPO_ROOT}/apps/docs/docs`],
      });

      await runCommand(command, ['--docs-dir', 'apps/docs/guides'], ['--json']);

      expect(indexedDirs).toEqual([`${REPO_ROOT}/apps/docs/guides`]);
      const payload = capture.jsonPayloads[0] as { docsDirSource: string };
      expect(payload.docsDirSource).toBe('flag');
    });
  });

  describe('real filesystem safety', () => {
    /**
     * Lexical containment is not enough: `<appRoot>/link` symlinked to
     * `<appRoot>/docs` names a path outside the docs tree that resolves back
     * into it, so the authored source would be overwritten.
     */
    it('refuses an --output that reaches the docs tree through a symlink', async () => {
      const repoRoot = await mkdtemp(
        join(tmpdir(), 'oat-generate-index-link-'),
      );
      createdDirs.push(repoRoot);
      const appRoot = join(repoRoot, 'apps', 'docs');
      await mkdir(join(appRoot, 'docs'), { recursive: true });
      const authored = '---\ntitle: Docs\n---\n\n# Docs\n';
      await writeFile(join(appRoot, 'docs', 'index.md'), authored, 'utf8');
      await symlink(join(appRoot, 'docs'), join(appRoot, 'link'), 'dir');

      const capture = createLoggerCapture();
      const generateIndexMock = vi.fn(async () => [
        { title: 'Home', path: 'index.md', description: 'Welcome' },
      ]);
      const writeFileMock = vi.fn(async () => undefined);

      const program = createDocsGenerateIndexCommand({
        buildCommandContext: (
          globalOptions: GlobalOptions,
        ): CommandContext => ({
          scope: 'all' as Scope,
          dryRun: false,
          verbose: globalOptions.verbose ?? false,
          json: globalOptions.json ?? false,
          cwd: repoRoot,
          home: '/tmp/home',
          interactive: !(globalOptions.json ?? false),
          logger: capture.logger,
        }),
        fileDeps: {
          generateIndex: generateIndexMock,
          renderIndex: vi.fn(() => '- [Home](index.md)\n'),
          writeFile: writeFileMock,
          readOatConfig: vi.fn(async () => fumadocsScaffoldConfig()),
          writeOatConfig: vi.fn(async () => undefined),
          resolveRepoRoot: vi.fn(async () => repoRoot),
          dirExists,
          readFileIfPresent: vi.fn(async (path: string) => {
            try {
              return await readFile(path, 'utf8');
            } catch {
              return null;
            }
          }),
          realpath,
          readLinkIfSymlink,
        },
      });

      await runCommand(program, ['--output', 'apps/docs/link/index.md']);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(capture.error.join('\n')).toContain('inside the docs directory');
      expect(process.exitCode).toBe(2);
      // The authored page survives byte-for-byte.
      await expect(
        readFile(join(appRoot, 'docs', 'index.md'), 'utf8'),
      ).resolves.toBe(authored);
    });
  });

  describe('real filesystem symlink refusals', () => {
    interface LinkHarness {
      appRoot: string;
      capture: ReturnType<typeof createLoggerCapture>;
      generateIndexMock: ReturnType<typeof vi.fn>;
      program: Command;
      repoRoot: string;
      writeFileMock: ReturnType<typeof vi.fn>;
    }

    async function createLinkHarness(): Promise<LinkHarness> {
      const repoRoot = await mkdtemp(
        join(tmpdir(), 'oat-generate-index-link-'),
      );
      const appRoot = join(repoRoot, 'apps', 'docs');
      await mkdir(join(appRoot, 'docs'), { recursive: true });

      const capture = createLoggerCapture();
      const generateIndexMock = vi.fn(async () => [
        { title: 'Home', path: 'index.md', description: 'Welcome' },
      ]);
      const writeFileMock = vi.fn(async () => undefined);

      const program = createDocsGenerateIndexCommand({
        buildCommandContext: (
          globalOptions: GlobalOptions,
        ): CommandContext => ({
          scope: 'all' as Scope,
          dryRun: false,
          verbose: globalOptions.verbose ?? false,
          json: globalOptions.json ?? false,
          cwd: repoRoot,
          home: '/tmp/home',
          interactive: !(globalOptions.json ?? false),
          logger: capture.logger,
        }),
        fileDeps: {
          generateIndex: generateIndexMock,
          renderIndex: vi.fn(() => '- [Home](index.md)\n'),
          writeFile: writeFileMock,
          readOatConfig: vi.fn(async () => fumadocsScaffoldConfig()),
          writeOatConfig: vi.fn(async () => undefined),
          resolveRepoRoot: vi.fn(async () => repoRoot),
          dirExists,
          readFileIfPresent: vi.fn(async (path: string) => {
            try {
              return await readFile(path, 'utf8');
            } catch {
              return null;
            }
          }),
          realpath,
          readLinkIfSymlink,
        },
      });

      return {
        appRoot,
        capture,
        generateIndexMock,
        program,
        repoRoot,
        writeFileMock,
      };
    }

    it('refuses an --output that reaches the docs tree through a live symlink', async () => {
      const harness = await createLinkHarness();
      createdDirs.push(harness.repoRoot);
      const authored = '---\ntitle: Docs\n---\n\n# Docs\n';
      await writeFile(
        join(harness.appRoot, 'docs', 'index.md'),
        authored,
        'utf8',
      );
      await symlink(
        join(harness.appRoot, 'docs'),
        join(harness.appRoot, 'link'),
        'dir',
      );

      await runCommand(harness.program, [
        '--output',
        'apps/docs/link/index.md',
      ]);

      expect(harness.generateIndexMock).not.toHaveBeenCalled();
      expect(harness.writeFileMock).not.toHaveBeenCalled();
      expect(harness.capture.error.join('\n')).toContain(
        'inside the docs directory',
      );
      expect(process.exitCode).toBe(2);
      await expect(
        readFile(join(harness.appRoot, 'docs', 'index.md'), 'utf8'),
      ).resolves.toBe(authored);
    });

    it('refuses a dangling symlink whose destination is inside the docs tree', async () => {
      const harness = await createLinkHarness();
      createdDirs.push(harness.repoRoot);
      // `docs/new.md` does not exist, so `realpath` reports ENOENT — but a
      // write through the link would still land inside the indexed tree.
      await symlink(
        join(harness.appRoot, 'docs', 'new.md'),
        join(harness.appRoot, 'index.md'),
      );

      await runCommand(harness.program);

      expect(harness.generateIndexMock).not.toHaveBeenCalled();
      expect(harness.writeFileMock).not.toHaveBeenCalled();
      expect(harness.capture.error.join('\n')).toContain(
        'inside the docs directory',
      );
      expect(process.exitCode).toBe(2);
      await expect(
        readFile(join(harness.appRoot, 'docs', 'new.md'), 'utf8'),
      ).rejects.toThrow();
    });

    it('refuses a relative dangling link resolved through a symlinked parent', async () => {
      const harness = await createLinkHarness();
      createdDirs.push(harness.repoRoot);
      // `links` → `docs/sub`, and `links/index.md` → `../new.md`. Resolved
      // lexically that is `apps/docs/new.md` (outside the docs tree); resolved
      // in filesystem order it is `apps/docs/docs/new.md`, inside it.
      await mkdir(join(harness.appRoot, 'docs', 'sub'), { recursive: true });
      await symlink(
        join(harness.appRoot, 'docs', 'sub'),
        join(harness.appRoot, 'links'),
        'dir',
      );
      await symlink('../new.md', join(harness.appRoot, 'links', 'index.md'));

      await runCommand(harness.program, [
        '--output',
        'apps/docs/links/index.md',
      ]);

      expect(harness.generateIndexMock).not.toHaveBeenCalled();
      expect(harness.writeFileMock).not.toHaveBeenCalled();
      expect(harness.capture.error.join('\n')).toContain(
        'inside the docs directory',
      );
      expect(process.exitCode).toBe(2);
    });

    it('refuses a Markdown --output that is a symlink to a YAML file', async () => {
      const harness = await createLinkHarness();
      createdDirs.push(harness.repoRoot);
      const yamlPath = join(harness.repoRoot, 'navigation.YAML');
      await writeFile(yamlPath, 'nav: []\n', 'utf8');
      await symlink(yamlPath, join(harness.repoRoot, 'manifest.md'));

      await runCommand(harness.program, ['--output', 'manifest.md']);

      expect(harness.generateIndexMock).not.toHaveBeenCalled();
      expect(harness.writeFileMock).not.toHaveBeenCalled();
      expect(harness.capture.error.join('\n')).toContain('YAML file');
      expect(process.exitCode).toBe(2);
      await expect(readFile(yamlPath, 'utf8')).resolves.toBe('nav: []\n');
    });
  });

  describe('symlink chain and configured-root tolerance', () => {
    function createChainHarness(
      overrides: {
        readLinkIfSymlink?: (path: string) => Promise<string | null>;
        realpath?: (path: string) => Promise<string>;
      } = {},
    ) {
      const capture = createLoggerCapture();
      const generateIndexMock = vi.fn(async () => [
        { title: 'Home', path: 'index.md', description: 'Welcome' },
      ]);
      const writeFileMock = vi.fn(async () => undefined);
      const enoent = () => {
        const error = new Error('ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      };

      const command = createDocsGenerateIndexCommand({
        buildCommandContext: (
          globalOptions: GlobalOptions,
        ): CommandContext => ({
          scope: 'all' as Scope,
          dryRun: false,
          verbose: globalOptions.verbose ?? false,
          json: globalOptions.json ?? false,
          cwd: REPO_ROOT,
          home: '/tmp/home',
          interactive: !(globalOptions.json ?? false),
          logger: capture.logger,
        }),
        fileDeps: {
          generateIndex: generateIndexMock,
          renderIndex: vi.fn(() => '- [Home](index.md)\n'),
          writeFile: writeFileMock,
          readOatConfig: vi.fn(async () => fumadocsScaffoldConfig()),
          writeOatConfig: vi.fn(async () => undefined),
          resolveRepoRoot: vi.fn(async () => REPO_ROOT),
          dirExists: vi.fn(async (path: string) =>
            [`${REPO_ROOT}/apps/docs`, `${REPO_ROOT}/apps/docs/docs`].includes(
              path,
            ),
          ),
          readFileIfPresent: vi.fn(async () => null),
          realpath: vi.fn(overrides.realpath ?? (async () => enoent())),
          readLinkIfSymlink: vi.fn(
            overrides.readLinkIfSymlink ?? (async () => null),
          ),
        },
      });

      return { capture, command, generateIndexMock, writeFileMock };
    }

    it('fails closed when the symlink chain exceeds the hop cap', async () => {
      // Every candidate is a link to a fresh name, so the chain never resolves.
      let hop = 0;
      const { capture, command, generateIndexMock, writeFileMock } =
        createChainHarness({
          readLinkIfSymlink: async () => `link-${hop++}.md`,
        });

      await runCommand(command, ['--output', 'apps/docs/manifest.md']);

      expect(generateIndexMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(capture.error.join('\n')).toContain('symlink chain');
      expect(process.exitCode).toBe(2);
    });

    it('still writes when both paths are explicit and the configured root is unresolvable', async () => {
      const { capture, command, generateIndexMock, writeFileMock } =
        createChainHarness({
          realpath: async (path: string) => {
            if (path === `${REPO_ROOT}/apps/docs`) {
              const error = new Error('ELOOP') as NodeJS.ErrnoException;
              error.code = 'ELOOP';
              throw error;
            }
            const error = new Error('ENOENT') as NodeJS.ErrnoException;
            error.code = 'ENOENT';
            throw error;
          },
        });

      // Both explicit paths live outside the unresolvable configured root, so
      // only the config-write eligibility check depends on it.
      await runCommand(command, [
        '--docs-dir',
        'generated/docs',
        '--output',
        'generated/docs.md',
      ]);

      expect(capture.error).toHaveLength(0);
      expect(generateIndexMock).toHaveBeenCalledTimes(1);
      expect(writeFileMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('generated header handling', () => {
    it('writes a single autogenerated header on repeated runs', async () => {
      const { command, writtenFiles } = createHarness({
        config: fumadocsScaffoldConfig(),
      });

      await runCommand(command);
      await runCommand(command);

      expect(writtenFiles).toHaveLength(2);
      for (const file of writtenFiles) {
        expect(file.content.startsWith(GENERATED_INDEX_WARNING)).toBe(true);
        expect(file.content.split(GENERATED_INDEX_WARNING)).toHaveLength(2);
      }
      expect(writtenFiles[1]!.content).toBe(writtenFiles[0]!.content);
    });

    it('overwrites stale on-disk index output with a single correct header', async () => {
      const repoRoot = await mkdtemp(join(tmpdir(), 'oat-generate-index-'));
      createdDirs.push(repoRoot);
      const appRoot = join(repoRoot, 'apps', 'docs');
      await mkdir(join(appRoot, 'docs'), { recursive: true });

      const outputPath = join(appRoot, 'index.md');
      await writeFile(
        outputPath,
        `${GENERATED_INDEX_WARNING}\n\nstale content\n${GENERATED_INDEX_WARNING}`,
        'utf8',
      );

      const program = createDocsGenerateIndexCommand({
        buildCommandContext: (
          globalOptions: GlobalOptions,
        ): CommandContext => ({
          scope: 'all' as Scope,
          dryRun: false,
          verbose: globalOptions.verbose ?? false,
          json: globalOptions.json ?? false,
          cwd: repoRoot,
          home: '/tmp/home',
          interactive: !(globalOptions.json ?? false),
          logger: createLoggerCapture().logger,
        }),
        fileDeps: {
          generateIndex: vi.fn(async () => [
            { title: 'Home', path: 'index.md', description: 'Welcome' },
          ]),
          renderIndex: vi.fn(() => '- [Home](index.md) — Welcome\n'),
          writeFile,
          readOatConfig: vi.fn(async () => fumadocsScaffoldConfig()),
          writeOatConfig: vi.fn(async () => undefined),
          resolveRepoRoot: vi.fn(async () => repoRoot),
          dirExists,
          readFileIfPresent: vi.fn(async (path: string) => {
            try {
              return await readFile(path, 'utf8');
            } catch {
              return null;
            }
          }),
          realpath,
          readLinkIfSymlink,
        },
      });

      await runCommand(program);

      const content = await readFile(outputPath, 'utf8');
      expect(content.startsWith(GENERATED_INDEX_WARNING)).toBe(true);
      expect(content.split(GENERATED_INDEX_WARNING)).toHaveLength(2);
      expect(content).toContain('- [Home](index.md) — Welcome');
      expect(content).not.toContain('stale content');
    });
  });
});
