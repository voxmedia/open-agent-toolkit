import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { createDocsGenerateIndexCommand } from '@commands/docs/index-generate/index';
import { dirExists } from '@fs/io';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BUILTIN_EXEC_TARGETS,
  clearActiveIdea,
  clearActiveProject,
  normalizeWorkflowPostImplementSequence,
  readOatConfig,
  readOatConfigForDefaultScopeRepair,
  readOatConfigForDocumentationExcludesRepair,
  readOatConfigForInstructionPointerExcludesRepair,
  readOatConfigWithWarnings,
  readOatLocalConfig,
  readUserConfig,
  resolveDocumentationContentRoot,
  resolveActiveIdea,
  resolveActiveProject,
  resolveLocalPaths,
  setActiveIdea,
  setActiveProject,
  writeOatConfig,
  writeOatLocalConfig,
  writeUserConfig,
  type WorkflowPostImplementStructuredSequence,
} from './oat-config';

describe('oat-config', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-local-config-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    return root;
  }

  it('returns defaults when config files are missing', async () => {
    const repoRoot = await createRepoRoot();

    await expect(readOatConfig(repoRoot)).resolves.toEqual({ version: 1 });
    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({ version: 1 });
  });

  it('reads and writes .oat/config.json round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 99,
      git: { defaultBranch: 'main' },
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
      archive: {
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
        summaryExportPath: '.oat/repo/reference/project-summaries',
        wrapUpExportPath: '.oat/repo/reference/wrap-ups',
        awsProfile: 'work-sso',
        awsRegion: 'us-east-1',
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      git: { defaultBranch: 'main' },
      projects: { root: '.oat/projects/custom' },
      worktrees: { root: '.worktrees' },
      archive: {
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
        summaryExportPath: '.oat/repo/reference/project-summaries',
        wrapUpExportPath: '.oat/repo/reference/wrap-ups',
        awsProfile: 'work-sso',
        awsRegion: 'us-east-1',
      },
    });
  });

  it('preserves projects.defaultScope without projects.root', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      JSON.stringify({ version: 1, projects: { defaultScope: 'local' } }),
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      projects: { defaultScope: 'local' },
    });
  });

  it('rejects an invalid projects.defaultScope', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      JSON.stringify({ version: 1, projects: { defaultScope: 'remote' } }),
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).rejects.toMatchObject({
      message: `Invalid projects.defaultScope in ${join(repoRoot, '.oat', 'config.json')}: "remote". Expected one of: shared, local, synced. Repair it with oat config set projects.defaultScope <shared|local|synced>.`,
      exitCode: 2,
    });
  });

  describe('documentation.excludes', () => {
    async function writeSharedConfig(
      repoRoot: string,
      documentation: unknown,
    ): Promise<void> {
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation }),
        'utf8',
      );
    }

    it('parses a trimmed, de-duplicated, order-preserving list', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedConfig(repoRoot, {
        root: 'apps/docs',
        excludes: ['  **/CLAUDE.md  ', 'drafts/', '**/CLAUDE.md'],
      });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: {
          root: 'apps/docs',
          excludes: ['**/CLAUDE.md', 'drafts/'],
        },
      });
    });

    it('round-trips through writeOatConfig', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        documentation: { root: 'apps/docs', excludes: ['drafts/', '*.tmp.md'] },
      });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: {
          root: 'apps/docs',
          excludes: ['drafts/', '*.tmp.md'],
        },
      });
    });

    it('omits the key for an absent or empty list', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedConfig(repoRoot, { root: 'apps/docs', excludes: [] });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: { root: 'apps/docs' },
      });
    });

    const invalidCases: Array<{ name: string; value: unknown }> = [
      { name: 'a non-array value', value: 'drafts/' },
      { name: 'a non-string entry', value: ['drafts/', 7] },
      { name: 'an empty entry', value: ['drafts/', ''] },
      { name: 'a whitespace-only entry', value: ['   '] },
    ];

    for (const testCase of invalidCases) {
      it(`rejects ${testCase.name}`, async () => {
        const repoRoot = await createRepoRoot();
        await writeSharedConfig(repoRoot, { excludes: testCase.value });

        await expect(readOatConfig(repoRoot)).rejects.toMatchObject({
          message: `Invalid documentation.excludes in ${join(repoRoot, '.oat', 'config.json')}: expected an array of non-empty strings. Repair it with oat config set documentation.excludes "<glob>,<glob>" (an empty value clears it).`,
          exitCode: 2,
        });
      });
    }
  });

  describe('documentation.instructionPointerExcludes', () => {
    async function writeSharedConfig(
      repoRoot: string,
      documentation: unknown,
    ): Promise<void> {
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation }),
        'utf8',
      );
    }

    it('parses a trimmed, de-duplicated, order-preserving list', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedConfig(repoRoot, {
        root: 'apps/docs',
        instructionPointerExcludes: ['  vendor  ', 'apps/docs', 'vendor'],
      });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: {
          root: 'apps/docs',
          instructionPointerExcludes: ['vendor', 'apps/docs'],
        },
      });
    });

    it('round-trips through writeOatConfig', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        documentation: {
          root: 'apps/docs',
          instructionPointerExcludes: ['vendor', 'third_party'],
        },
      });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: {
          root: 'apps/docs',
          instructionPointerExcludes: ['vendor', 'third_party'],
        },
      });
    });

    it('omits the key for an absent or empty list', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedConfig(repoRoot, {
        root: 'apps/docs',
        instructionPointerExcludes: [],
      });

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        documentation: { root: 'apps/docs' },
      });
    });

    // Fails closed like `documentation.excludes`: a key that exists to keep
    // files out of a tree must never silently protect less than was asked for.
    const invalidCases: Array<{ name: string; value: unknown }> = [
      { name: 'a non-array value', value: 'vendor' },
      { name: 'a non-string entry', value: ['vendor', 7] },
      { name: 'an empty entry', value: ['vendor', ''] },
      { name: 'a whitespace-only entry', value: ['   '] },
    ];

    for (const testCase of invalidCases) {
      it(`rejects ${testCase.name}`, async () => {
        const repoRoot = await createRepoRoot();
        await writeSharedConfig(repoRoot, {
          root: 'apps/docs',
          instructionPointerExcludes: testCase.value,
        });

        await expect(readOatConfig(repoRoot)).rejects.toMatchObject({
          message: `Invalid documentation.instructionPointerExcludes in ${join(repoRoot, '.oat', 'config.json')}: expected an array of non-empty strings. Repair it with \`oat config set documentation.instructionPointerExcludes <path[,path...]>\` (an empty value clears the key), or by editing that file.`,
          exitCode: 2,
        });
      });
    }

    it('names the oat config set command that repairs the key', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedConfig(repoRoot, {
        instructionPointerExcludes: 'vendor',
      });

      // The key is catalogued, so the repair instruction names the validated
      // write path. A repair message that only said "edit the file" would send
      // operators around a command that exists -- and this assertion fails if
      // the catalog entry is ever removed and the message is not restored.
      await expect(readOatConfig(repoRoot)).rejects.toMatchObject({
        message: expect.stringContaining(
          'oat config set documentation.instructionPointerExcludes',
        ),
      });
    });
  });

  // A `documentation.root` whose stored value is not a string was dropped with
  // no signal anywhere: the scalar branch accepts only a non-empty string and
  // had no else branch, so a wrong-typed value looked exactly like "never
  // configured" on every surface. The accept/reject decision is unchanged --
  // the value is still dropped -- but the drop now reaches the caller.
  describe('documentation.root type warnings', () => {
    async function writeSharedRoot(
      repoRoot: string,
      root: unknown,
    ): Promise<void> {
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation: { root } }),
        'utf8',
      );
    }

    const wrongTypes: Array<{
      name: string;
      value: unknown;
      observed: string;
    }> = [
      { name: 'a number', value: 5, observed: 'number' },
      { name: 'an object', value: { a: 1 }, observed: 'object' },
      { name: 'an array', value: [1], observed: 'array' },
      { name: 'null', value: null, observed: 'null' },
      { name: 'a boolean', value: true, observed: 'boolean' },
    ];

    for (const testCase of wrongTypes) {
      it(`warns once for ${testCase.name} and still drops the value`, async () => {
        const repoRoot = await createRepoRoot();
        await writeSharedRoot(repoRoot, testCase.value);

        const { config, warnings } = await readOatConfigWithWarnings(repoRoot);

        expect(config.documentation?.root).toBeUndefined();
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('documentation.root');
        expect(warnings[0]).toContain(`got ${testCase.observed}`);
        expect(warnings[0]).toContain(join(repoRoot, '.oat', 'config.json'));
        expect(warnings[0]).toContain('oat config set documentation.root');
      });

      // The item's "does not silently fall back" criterion has two halves: the
      // documentation tree really does fall back, and the operator really is
      // told. Asserting both against one read is what closes it here, without
      // reaching into `commands/instructions/**`.
      it(`reports the content-root fallback alongside the warning for ${testCase.name}`, async () => {
        const repoRoot = await createRepoRoot();
        await writeSharedRoot(repoRoot, testCase.value);

        const { config, warnings } = await readOatConfigWithWarnings(repoRoot);

        await expect(
          resolveDocumentationContentRoot(repoRoot, config),
        ).resolves.toBeNull();
        expect(warnings).toHaveLength(1);
      });
    }

    it('stays silent for a valid root and for a whitespace-only root', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'content'), { recursive: true });
      await writeSharedRoot(repoRoot, 'content');

      const valid = await readOatConfigWithWarnings(repoRoot);
      expect(valid.warnings).toEqual([]);
      expect(valid.config.documentation?.root).toBe('content');
      await expect(
        resolveDocumentationContentRoot(repoRoot, valid.config),
      ).resolves.toBe('content');

      // Deliberately unchanged: `"   "` is a string, so it is not a type
      // error. It is dropped today and still is, silently.
      await writeSharedRoot(repoRoot, '   ');
      const blank = await readOatConfigWithWarnings(repoRoot);
      expect(blank.warnings).toEqual([]);
      expect(blank.config.documentation?.root).toBeUndefined();
    });

    it('stays silent when documentation.root is absent', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation: { tooling: 'tools' } }),
        'utf8',
      );

      await expect(readOatConfigWithWarnings(repoRoot)).resolves.toEqual({
        config: { version: 1, documentation: { tooling: 'tools' } },
        warnings: [],
      });
    });

    it('leaves readOatConfig behavior unchanged', async () => {
      const missing = await createRepoRoot();
      await expect(readOatConfig(missing)).resolves.toEqual({ version: 1 });

      const valid = await createRepoRoot();
      await writeSharedRoot(valid, 'content');
      await expect(readOatConfig(valid)).resolves.toEqual({
        version: 1,
        documentation: { root: 'content' },
      });

      // The wrapper must not fold a parse failure into the missing-file
      // default: only a missing file returns defaults, everything else throws.
      const malformed = await createRepoRoot();
      const malformedPath = join(malformed, '.oat', 'config.json');
      await writeFile(malformedPath, '{"version":1,', 'utf8');
      await expect(readOatConfig(malformed)).rejects.toThrow(SyntaxError);
      await expect(readOatConfig(malformed)).rejects.toThrow(
        `Config at ${malformedPath} is not valid JSON`,
      );
      await expect(readOatConfigWithWarnings(malformed)).rejects.toThrow(
        SyntaxError,
      );
    });

    // The three lenient repair readers pass no sink, so they stay silent.
    // What this can detect is the regression that would actually happen: one
    // of them switching to `readOatConfigWithWarnings` and handing its caller
    // an `OatConfigRead`. It cannot detect a diagnostic emitted through some
    // channel that does not exist yet, because a reader passing no sink has
    // nowhere to emit one -- `pnpm type-check` is what holds that half.
    it('leaves the lenient repair readers silent', async () => {
      const repoRoot = await createRepoRoot();
      await writeSharedRoot(repoRoot, 5);

      for (const read of [
        readOatConfigForDefaultScopeRepair,
        readOatConfigForDocumentationExcludesRepair,
        readOatConfigForInstructionPointerExcludesRepair,
      ]) {
        await expect(read(repoRoot)).resolves.toEqual({ version: 1 });
      }
    });
  });

  describe('resolveDocumentationContentRoot', () => {
    it('prefers the docs child when it is a directory', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'apps', 'oat-docs', 'docs'), {
        recursive: true,
      });

      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: 'apps/oat-docs' },
        }),
      ).resolves.toBe('apps/oat-docs/docs');
    });

    it('falls back to the root itself when it has no docs child', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'content'), { recursive: true });

      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: 'content' },
        }),
      ).resolves.toBe('content');
    });

    it('ignores a docs child that is a file rather than a directory', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'content'), { recursive: true });
      await writeFile(join(repoRoot, 'content', 'docs'), 'not a dir\n', 'utf8');

      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: 'content' },
        }),
      ).resolves.toBe('content');
    });

    it('returns null when documentation.root is unset or empty', async () => {
      const repoRoot = await createRepoRoot();

      await expect(
        resolveDocumentationContentRoot(repoRoot, { version: 1 }),
      ).resolves.toBeNull();
      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: '   ' },
        }),
      ).resolves.toBeNull();
    });

    it('returns null rather than excluding the repository root itself', async () => {
      const repoRoot = await createRepoRoot();

      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: '.' },
        }),
      ).resolves.toBeNull();
    });

    it('returns null for a root outside the repository', async () => {
      const repoRoot = await createRepoRoot();

      await expect(
        resolveDocumentationContentRoot(repoRoot, {
          version: 1,
          documentation: { root: '../elsewhere' },
        }),
      ).resolves.toBeNull();
    });

    // The plan forbids encoding a second content-root rule. Rather than
    // restating the generator's ternary here (a mirror cannot detect
    // divergence, because it drifts with nobody), this drives the real
    // `oat docs generate-index` command and observes the docs directory its own
    // `resolveIndexGeneratePaths` selected. If either rule changes
    // independently, this fails.
    it('agrees with the docs-index generator on the directory it actually indexes', async () => {
      const repoRoot = await createRepoRoot();
      await mkdir(join(repoRoot, 'apps', 'with-child', 'docs'), {
        recursive: true,
      });
      await mkdir(join(repoRoot, 'apps', 'bare-root'), { recursive: true });

      async function generatorDocsDir(root: string): Promise<string> {
        let observedDocsDir = '';
        const errors: string[] = [];
        const command = createDocsGenerateIndexCommand({
          buildCommandContext: () => ({
            scope: 'project',
            dryRun: false,
            verbose: false,
            json: true,
            cwd: repoRoot,
            home: join(repoRoot, 'home'),
            interactive: false,
            logger: {
              debug() {},
              info() {},
              warn() {},
              error(message: string) {
                errors.push(message);
              },
              success() {},
              json() {},
            },
          }),
          fileDeps: {
            generateIndex: async (docsDir: string) => {
              observedDocsDir = docsDir;
              return [];
            },
            renderIndex: () => '',
            writeFile: async () => undefined,
            readOatConfig: async () => ({
              version: 1,
              documentation: { root },
            }),
            writeOatConfig: async () => undefined,
            resolveRepoRoot: async () => repoRoot,
            dirExists,
            readFileIfPresent: async () => null,
            realpath: async (path: string) => path,
            readLinkIfSymlink: async () => null,
          },
        });

        const program = new Command().name('oat').exitOverride();
        program.addCommand(command);
        // `--output` is explicit only to dodge an unrelated safety refusal (a
        // derived `<root>/index.md` would sit inside a bare content root).
        // `--docs-dir` stays omitted, so the derivation under test is the
        // generator's own.
        await program.parseAsync(
          ['generate-index', '--output', join(repoRoot, 'generated-index.md')],
          { from: 'user' },
        );

        if (!observedDocsDir) {
          throw new Error(
            `generator did not index anything: ${errors.join(' | ')}`,
          );
        }
        return relative(repoRoot, observedDocsDir);
      }

      for (const root of ['apps/with-child', 'apps/bare-root']) {
        const expected = await generatorDocsDir(root);
        await expect(
          resolveDocumentationContentRoot(repoRoot, {
            version: 1,
            documentation: { root },
          }),
        ).resolves.toBe(expected);
      }

      // Guards the assertion itself: the two fixtures must exercise both
      // branches, or the parity claim would be vacuous.
      await expect(generatorDocsDir('apps/with-child')).resolves.toBe(
        'apps/with-child/docs',
      );
      await expect(generatorDocsDir('apps/bare-root')).resolves.toBe(
        'apps/bare-root',
      );
    });
  });

  it('accepts trailing commas in shared, local, and user config files', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
    tempDirs.push(userConfigDir);

    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      `{
  "version": 1,
  "worktrees": { "root": ".worktrees", },
  "localPaths": [".env",],
}
`,
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `{
  "version": 1,
  "activeIdea": "repo-idea",
  "workflow": { "designMode": "draft", },
}
`,
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      `{
  "version": 1,
  "activeIdea": "user-idea",
}
`,
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      worktrees: { root: '.worktrees' },
      localPaths: ['.env'],
    });
    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({
      version: 1,
      activeIdea: 'repo-idea',
      workflow: { designMode: 'draft' },
    });
    await expect(readUserConfig(userConfigDir)).resolves.toEqual({
      version: 1,
      activeIdea: 'user-idea',
    });
  });

  it('normalizes archive.awsProfile and archive.awsRegion (trim, drop empty, ignore non-string)', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: '  work-sso  ',
          awsRegion: '  us-east-1  ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
      awsProfile: 'work-sso',
      awsRegion: 'us-east-1',
    });
  });

  it('drops empty archive.awsProfile and archive.awsRegion during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: '   ',
          awsRegion: '',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('ignores non-string archive.awsProfile and archive.awsRegion values', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          awsProfile: 42,
          awsRegion: true,
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('normalizes archive config values from config.json', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive/',
          s3SyncOnComplete: true,
          summaryExportPath: ' .oat/repo/reference/project-summaries/ ',
          wrapUpExportPath: ' .oat/repo/reference/wrap-ups/ ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
      s3SyncOnComplete: true,
      summaryExportPath: '.oat/repo/reference/project-summaries',
      wrapUpExportPath: '.oat/repo/reference/wrap-ups',
    });
  });

  it('drops empty wrapUpExportPath during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        archive: {
          s3Uri: 's3://example-bucket/oat-archive',
          wrapUpExportPath: '   ',
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.archive).toEqual({
      s3Uri: 's3://example-bucket/oat-archive',
    });
  });

  it('reads and writes tools config round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {
        'project-management': true,
        workflows: true,
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      tools: {
        'project-management': true,
        workflows: true,
      },
    });
  });

  it('normalizes sorted deduplicated dependency leases independently of direct intent', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        tools: {
          research: true,
          requiredBy: {
            utility: ['research', 'brainstorm', 'research', 42],
            workflows: [],
            unknown: ['research'],
          },
        },
      }),
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      tools: {
        research: true,
        requiredBy: {
          utility: ['brainstorm', 'research'],
        },
      },
    });
  });

  it('reads and writes PJM adoption config round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      pjm: { initialized: true, schemaVersion: 1 },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      pjm: { initialized: true, schemaVersion: 1 },
    });
  });

  it('reads and writes shared PJM remote policy and storage config', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      pjm: {
        initialized: true,
        schemaVersion: 1,
        remote: {
          schemaVersion: 1,
          storage: { state: 'shared' },
          policy: {
            description: 'managed-section',
            authority: {
              default: 'read-only',
              operations: { annotate: 'user-approved' },
            },
            providers: {
              github: {
                description: 'replace',
                authority: { operations: { create: 'user-authorized' } },
              },
            },
          },
        },
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
      pjm: {
        remote: {
          schemaVersion: 1,
          storage: { state: 'shared' },
          policy: {
            description: 'managed-section',
            authority: {
              default: 'read-only',
              operations: { annotate: 'user-approved' },
            },
          },
        },
      },
    });
  });

  it('fails closed when malformed narrowing policy is combined with permissive defaults', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        pjm: {
          remote: {
            schemaVersion: 1,
            policy: {
              description: 'replace',
              authority: {
                default: 'autonomous',
                operations: {
                  'update-fields': 'misspelled-read-only',
                },
              },
              providers: {
                github: {
                  description: 'unsafe-description',
                  authority: {
                    operations: { delete: 'misspelled-read-only' },
                  },
                },
              },
            },
          },
        },
      }),
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
      pjm: {
        remote: {
          policy: {
            authority: {
              default: 'autonomous',
              operations: { 'update-fields': 'read-only' },
            },
            providers: {
              github: {
                description: 'none',
                authority: { operations: { delete: 'read-only' } },
              },
            },
          },
        },
      },
    });
  });

  it.each([
    [
      'operation',
      {
        authority: {
          default: 'autonomous',
          operations: { 'update-fileds': 'read-only' },
        },
      },
      /pjm\.remote\.policy\.authority\.operations\.update-fileds/,
    ],
    [
      'provider',
      {
        authority: { default: 'autonomous' },
        providers: {
          gitub: { authority: { default: 'read-only' } },
        },
      },
      /pjm\.remote\.policy\.providers\.gitub/,
    ],
  ] as const)(
    'rejects an unknown %s narrowing key before permissive authority reaches runtime',
    async (_kind, policy, expectedPath) => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          pjm: {
            remote: {
              schemaVersion: 1,
              policy: { description: 'replace', ...policy },
            },
          },
        }),
        'utf8',
      );

      await expect(readOatConfig(repoRoot)).rejects.toThrow(expectedPath);
    },
  );

  it.each([
    [
      'providers string',
      { providers: 'ghp_structure_value_must_not_leak' },
      /pjm\.remote\.policy\.providers.*expected object.*string/i,
    ],
    [
      'providers array',
      { providers: ['ghp_structure_value_must_not_leak'] },
      /pjm\.remote\.policy\.providers.*expected object.*array/i,
    ],
    [
      'providers null',
      { providers: null },
      /pjm\.remote\.policy\.providers.*expected object.*null/i,
    ],
    [
      'known provider string',
      {
        providers: { github: 'ghp_structure_value_must_not_leak' },
      },
      /pjm\.remote\.policy\.providers\.github.*expected object.*string/i,
    ],
    [
      'known provider array',
      {
        providers: { github: ['ghp_structure_value_must_not_leak'] },
      },
      /pjm\.remote\.policy\.providers\.github.*expected object.*array/i,
    ],
    [
      'known provider null',
      { providers: { github: null } },
      /pjm\.remote\.policy\.providers\.github.*expected object.*null/i,
    ],
    [
      'repository authority string',
      { authority: 'ghp_structure_value_must_not_leak' },
      /pjm\.remote\.policy\.authority.*expected object.*string/i,
    ],
    [
      'repository authority array',
      { authority: ['ghp_structure_value_must_not_leak'] },
      /pjm\.remote\.policy\.authority.*expected object.*array/i,
    ],
    [
      'repository authority null',
      { authority: null },
      /pjm\.remote\.policy\.authority.*expected object.*null/i,
    ],
    [
      'repository operations string',
      {
        authority: {
          default: 'autonomous',
          operations: 'ghp_structure_value_must_not_leak',
        },
      },
      /pjm\.remote\.policy\.authority\.operations.*expected object.*string/i,
    ],
    [
      'repository operations array',
      {
        authority: {
          default: 'autonomous',
          operations: ['ghp_structure_value_must_not_leak'],
        },
      },
      /pjm\.remote\.policy\.authority\.operations.*expected object.*array/i,
    ],
    [
      'repository operations null',
      { authority: { default: 'autonomous', operations: null } },
      /pjm\.remote\.policy\.authority\.operations.*expected object.*null/i,
    ],
    [
      'provider authority scalar',
      {
        authority: { default: 'autonomous' },
        providers: {
          github: { authority: 'ghp_structure_value_must_not_leak' },
        },
      },
      /pjm\.remote\.policy\.providers\.github\.authority.*expected object.*string/i,
    ],
    [
      'provider authority array',
      {
        authority: { default: 'autonomous' },
        providers: {
          github: { authority: ['ghp_structure_value_must_not_leak'] },
        },
      },
      /pjm\.remote\.policy\.providers\.github\.authority.*expected object.*array/i,
    ],
    [
      'provider authority null',
      {
        authority: { default: 'autonomous' },
        providers: { github: { authority: null } },
      },
      /pjm\.remote\.policy\.providers\.github\.authority.*expected object.*null/i,
    ],
    [
      'provider operations string',
      {
        authority: { default: 'autonomous' },
        providers: {
          github: {
            authority: {
              operations: 'ghp_structure_value_must_not_leak',
            },
          },
        },
      },
      /pjm\.remote\.policy\.providers\.github\.authority\.operations.*expected object.*string/i,
    ],
    [
      'provider operations array',
      {
        authority: { default: 'autonomous' },
        providers: {
          github: {
            authority: {
              operations: ['ghp_structure_value_must_not_leak'],
            },
          },
        },
      },
      /pjm\.remote\.policy\.providers\.github\.authority\.operations.*expected object.*array/i,
    ],
    [
      'provider operations null',
      {
        authority: { default: 'autonomous' },
        providers: {
          github: { authority: { operations: null } },
        },
      },
      /pjm\.remote\.policy\.providers\.github\.authority\.operations.*expected object.*null/i,
    ],
  ] as const)(
    'rejects malformed %s policy structure without exposing values',
    async (_kind, policy, expectedMessage) => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          pjm: {
            remote: {
              schemaVersion: 1,
              policy: {
                description: 'replace',
                authority: { default: 'autonomous' },
                ...policy,
              },
            },
          },
        }),
        'utf8',
      );

      let failure: unknown;
      try {
        await readOatConfig(repoRoot);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      const message = failure instanceof Error ? failure.message : '';
      expect(message).toMatch(expectedMessage);
      expect(message).not.toContain('ghp_structure_value_must_not_leak');
    },
  );

  it('rejects retired execution preferences from local and user PJM config', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-remote-'));
    tempDirs.push(userConfigDir);

    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      JSON.stringify({
        version: 1,
        pjm: { remote: { transports: { github: ['legacy'] } } },
      }),
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      JSON.stringify({
        version: 1,
        pjm: { remote: { transports: { jira: ['legacy'] } } },
      }),
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).rejects.toThrow(
      /retired.*discover live/i,
    );
    await expect(readUserConfig(userConfigDir)).rejects.toThrow(
      /retired.*discover live/i,
    );
  });

  it('rejects transport config on the shared surface', async () => {
    const repoRoot = await createRepoRoot();
    await writeFile(
      join(repoRoot, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        pjm: {
          remote: { transports: { github: ['legacy-native-surface'] } },
        },
      }),
      'utf8',
    );

    await expect(readOatConfig(repoRoot)).rejects.toThrow(
      /pjm\.remote\.transports.*retired/i,
    );
  });

  it('rejects shared policy and storage config on local and user surfaces', async () => {
    const repoRoot = await createRepoRoot();
    const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-remote-'));
    tempDirs.push(userConfigDir);
    const remote = {
      schemaVersion: 1,
      storage: { state: 'shared' },
      policy: {
        description: 'none',
        authority: { default: 'read-only' },
      },
    };
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      JSON.stringify({ version: 1, pjm: { remote } }),
      'utf8',
    );
    await writeFile(
      join(userConfigDir, 'config.json'),
      JSON.stringify({ version: 1, pjm: { remote } }),
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).rejects.toThrow(
      /pjm\.remote\.(policy|storage).*shared/i,
    );
    await expect(readUserConfig(userConfigDir)).rejects.toThrow(
      /pjm\.remote\.(policy|storage).*shared/i,
    );
  });

  it('preserves tools.brainstorm through readOatConfig round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {
        brainstorm: true,
      },
    });

    await expect(readOatConfig(repoRoot)).resolves.toEqual({
      version: 1,
      tools: {
        brainstorm: true,
      },
    });
  });

  it('drops invalid tools config values during normalization', async () => {
    const repoRoot = await createRepoRoot();
    const configPath = join(repoRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        tools: {
          'project-management': 'yes',
          workflows: true,
        },
      }),
      'utf8',
    );

    const config = await readOatConfig(repoRoot);
    expect(config.tools).toEqual({
      workflows: true,
    });
  });

  it('omits empty tools objects during normalization', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatConfig(repoRoot, {
      version: 1,
      tools: {},
    });

    const config = await readOatConfig(repoRoot);
    expect(config.tools).toBeUndefined();

    const raw = await readFile(join(repoRoot, '.oat', 'config.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({ version: 1 });
  });

  it('reads and writes .oat/config.local.json round-trip', async () => {
    const repoRoot = await createRepoRoot();

    await writeOatLocalConfig(repoRoot, {
      version: 7,
      activeProject: '.oat/projects/shared/demo',
      lastPausedProject: null,
    });

    await expect(readOatLocalConfig(repoRoot)).resolves.toEqual({
      version: 1,
      activeProject: '.oat/projects/shared/demo',
      lastPausedProject: null,
    });
  });

  it('normalizes legacy absolute activeProject paths to repo-relative', async () => {
    const repoRoot = await createRepoRoot();
    const absoluteProjectPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );
    await mkdir(absoluteProjectPath, { recursive: true });
    await writeFile(
      join(absoluteProjectPath, 'state.md'),
      '---\n---\n',
      'utf8',
    );
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: absoluteProjectPath })}\n`,
      'utf8',
    );

    const localConfig = await readOatLocalConfig(repoRoot);
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');
  });

  it('resolves relative activeProject paths and rejects repo traversal', async () => {
    const repoRoot = await createRepoRoot();
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(externalProject);
    await writeFile(join(externalProject, 'state.md'), '---\n---\n', 'utf8');
    const externalRelativePath = relative(repoRoot, externalProject);

    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: externalRelativePath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: null,
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
    await expect(
      setActiveProject(repoRoot, externalRelativePath),
    ).rejects.toThrow(/inside repo root/i);

    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/../demo',
    });
    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: '.oat/projects/demo',
    });
  });

  it('rejects an activeProject symlink whose real target escapes the repo', async () => {
    const repoRoot = await createRepoRoot();
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-external-project-'),
    );
    tempDirs.push(externalProject);
    await writeFile(join(externalProject, 'state.md'), '---\n---\n', 'utf8');
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const linkedProject = join(projectsRoot, 'external-link');
    await mkdir(projectsRoot, { recursive: true });
    await symlink(externalProject, linkedProject, 'dir');
    const projectPath = '.oat/projects/shared/external-link';
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectPath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: null,
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
    await expect(setActiveProject(repoRoot, projectPath)).rejects.toThrow(
      /inside repo root/i,
    );
  });

  it('keeps an activeProject symlink whose real target remains inside the repo', async () => {
    const repoRoot = await createRepoRoot();
    const projectsRoot = join(repoRoot, '.oat', 'projects', 'shared');
    const realProject = join(projectsRoot, 'real-project');
    const linkedProject = join(projectsRoot, 'linked-project');
    await mkdir(realProject, { recursive: true });
    await writeFile(join(realProject, 'state.md'), '---\n---\n', 'utf8');
    await symlink('real-project', linkedProject, 'dir');
    const projectPath = '.oat/projects/shared/linked-project';
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectPath })}\n`,
      'utf8',
    );

    await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
      activeProject: '.oat/projects/shared/real-project',
    });
    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'real-project',
      path: '.oat/projects/shared/real-project',
      status: 'active',
    });
  });

  it('resolveActiveProject reports active for valid config-local project paths', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/demo',
    });

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'demo',
      path: '.oat/projects/shared/demo',
      status: 'active',
    });
  });

  it('resolveActiveProject reports missing when configured path does not exist', async () => {
    const repoRoot = await createRepoRoot();
    await writeOatLocalConfig(repoRoot, {
      version: 1,
      activeProject: '.oat/projects/shared/missing-project',
    });

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: 'missing-project',
      path: '.oat/projects/shared/missing-project',
      status: 'missing',
    });
  });

  it('resolveActiveProject reports unset when activeProject is missing', async () => {
    const repoRoot = await createRepoRoot();

    await expect(resolveActiveProject(repoRoot)).resolves.toEqual({
      name: null,
      path: null,
      status: 'unset',
    });
  });

  describe('localPaths normalization', () => {
    it('should deduplicate and sort localPaths', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        localPaths: [
          '.oat/projects',
          '.oat/config.local.json',
          '.oat/projects',
          '.oat/ideas',
        ],
      });

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toEqual([
        '.oat/config.local.json',
        '.oat/ideas',
        '.oat/projects',
      ]);
    });

    it('should default to undefined when omitted', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, { version: 1 });

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toBeUndefined();
    });

    it('should filter out non-string values', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          localPaths: ['.oat/projects', 42, null, '', '.oat/ideas'],
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.localPaths).toEqual(['.oat/ideas', '.oat/projects']);
    });

    it('resolveLocalPaths returns empty array when localPaths is undefined', () => {
      expect(resolveLocalPaths({ version: 1 })).toEqual([]);
    });

    it('resolveLocalPaths returns the localPaths array when defined', () => {
      expect(
        resolveLocalPaths({ version: 1, localPaths: ['.oat/projects'] }),
      ).toEqual(['.oat/projects']);
    });
  });

  describe('activeIdea config', () => {
    it('should normalize activeIdea in local config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatLocalConfig(repoRoot, {
        version: 1,
        activeIdea: '.oat/ideas/my-idea',
      });

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBe('.oat/ideas/my-idea');
    });

    it('should resolve activeIdea with repo > user precedence', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      // Set user-level idea
      await writeUserConfig(userConfigDir, {
        version: 1,
        activeIdea: '.oat/ideas/user-idea',
      });

      // No repo-level idea set
      const result1 = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result1).toBe('.oat/ideas/user-idea');

      // Set repo-level idea (should take precedence)
      await writeOatLocalConfig(repoRoot, {
        version: 1,
        activeIdea: '.oat/ideas/repo-idea',
      });

      const result2 = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result2).toBe('.oat/ideas/repo-idea');
    });

    it('should read/write user-level config at ~/.oat/config.json', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        activeIdea: '.oat/ideas/test',
      });

      const config = await readUserConfig(userConfigDir);
      expect(config.activeIdea).toBe('.oat/ideas/test');
    });

    it('normalizes and round-trips the user update notification preference', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        updateNotifications: false,
      });

      await expect(readUserConfig(userConfigDir)).resolves.toEqual({
        version: 1,
        updateNotifications: false,
      });

      await writeFile(
        join(userConfigDir, 'config.json'),
        JSON.stringify({ version: 1, updateNotifications: 'false' }),
        'utf8',
      );
      await expect(readUserConfig(userConfigDir)).resolves.toEqual({
        version: 1,
      });
    });

    it('normalizes and round-trips user-scoped tool intent', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-tools-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        tools: { workflows: true, research: false },
      });

      await expect(readUserConfig(userConfigDir)).resolves.toEqual({
        version: 1,
        tools: { workflows: true, research: false },
      });
    });

    it('does not expose legacy known strays as a general user preference', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);
      await writeFile(
        join(userConfigDir, 'config.json'),
        JSON.stringify({
          version: 1,
          activeIdea: '.oat/ideas/example',
          knownStrays: ['.cursor/skills/local-only'],
        }),
        'utf8',
      );

      await expect(readUserConfig(userConfigDir)).resolves.toEqual({
        version: 1,
        activeIdea: '.oat/ideas/example',
      });
    });

    it('migrates legacy known strays before an unrelated user-config write', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);
      const userConfigPath = join(userConfigDir, 'config.json');
      await writeFile(
        userConfigPath,
        JSON.stringify({
          version: 1,
          activeIdea: '.oat/ideas/example',
          knownStrays: [' .cursor\\skills\\legacy-only '],
          futureField: { preserved: true },
        }),
        'utf8',
      );

      const userConfig = await readUserConfig(userConfigDir);
      await writeUserConfig(userConfigDir, {
        ...userConfig,
        updateNotifications: false,
      });
      await writeUserConfig(userConfigDir, {
        ...(await readUserConfig(userConfigDir)),
        updateNotifications: false,
      });

      expect(
        JSON.parse(
          await readFile(join(userConfigDir, 'sync', 'config.json'), 'utf8'),
        ),
      ).toMatchObject({
        knownStrays: ['.cursor/skills/legacy-only'],
      });
      expect(JSON.parse(await readFile(userConfigPath, 'utf8'))).toEqual({
        version: 1,
        activeIdea: '.oat/ideas/example',
        updateNotifications: false,
        futureField: { preserved: true },
      });
    });

    it('setActiveIdea writes to local config', async () => {
      const repoRoot = await createRepoRoot();

      await setActiveIdea(repoRoot, '.oat/ideas/new-idea');

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBe('.oat/ideas/new-idea');
    });

    it('clearActiveIdea removes from local config', async () => {
      const repoRoot = await createRepoRoot();

      await setActiveIdea(repoRoot, '.oat/ideas/new-idea');
      await clearActiveIdea(repoRoot);

      const config = await readOatLocalConfig(repoRoot);
      expect(config.activeIdea).toBeNull();
    });

    it('returns null when no activeIdea is set anywhere', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-config-'));
      tempDirs.push(userConfigDir);

      const result = await resolveActiveIdea(repoRoot, userConfigDir);
      expect(result).toBeNull();
    });
  });

  it('setActiveProject stores repo-relative path and clearActiveProject stores lastPausedProject', async () => {
    const repoRoot = await createRepoRoot();
    const absoluteProjectPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );
    await mkdir(absoluteProjectPath, { recursive: true });

    await setActiveProject(repoRoot, absoluteProjectPath);
    let localConfig = await readOatLocalConfig(repoRoot);
    expect(localConfig.activeProject).toBe('.oat/projects/shared/demo');

    await clearActiveProject(repoRoot, {
      lastPaused: '.oat/projects/shared/demo',
    });
    localConfig = await readOatLocalConfig(repoRoot);

    expect(localConfig.activeProject).toBeNull();
    expect(localConfig.lastPausedProject).toBe('.oat/projects/shared/demo');

    const raw = await readFile(
      join(repoRoot, '.oat', 'config.local.json'),
      'utf8',
    );
    expect(raw.endsWith('\n')).toBe(true);
  });

  describe('workflow preferences', () => {
    it.each([
      ['wait', { preApproval: [], postApproval: [] }],
      ['summary', { preApproval: ['summary'], postApproval: [] }],
      ['pr', { preApproval: ['summary', 'pr'], postApproval: [] }],
      [
        'docs-pr',
        {
          preApproval: ['summary', 'document', 'pr'],
          postApproval: [],
        },
      ],
    ] as const)(
      'normalizes legacy post-implementation sequence %s canonically',
      (sequence, expected) => {
        expect(normalizeWorkflowPostImplementSequence(sequence)).toEqual(
          expected,
        );
      },
    );

    it.each([
      { preApproval: [], postApproval: [] },
      { preApproval: ['summary'], postApproval: [] },
      { preApproval: [], postApproval: ['document'] },
      { preApproval: ['summary'], postApproval: ['document', 'pr'] },
      { preApproval: ['summary', 'pr'], postApproval: ['retro'] },
    ])(
      'accepts structured post-implementation sequence %#',
      async (sequence) => {
        const repoRoot = await createRepoRoot();
        await writeFile(
          join(repoRoot, '.oat', 'config.json'),
          JSON.stringify({
            version: 1,
            workflow: { postImplementSequence: sequence },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.postImplementSequence).toEqual(sequence);
      },
    );

    it.each([
      null,
      [],
      {},
      { preApproval: [] },
      { postApproval: [] },
      { preApproval: 'summary', postApproval: [] },
      { preApproval: [], postApproval: 'pr' },
      { preApproval: ['unknown'], postApproval: [] },
      { preApproval: [], postApproval: ['summary'], extra: true },
      { preApproval: ['summary', 'summary'], postApproval: [] },
      { preApproval: ['summary'], postApproval: ['summary'] },
      { preApproval: ['retro'], postApproval: [] },
      { preApproval: ['retro'], postApproval: ['retro'] },
    ])(
      'rejects malformed post-implementation sequence %# atomically',
      async (sequence) => {
        const repoRoot = await createRepoRoot();
        await writeFile(
          join(repoRoot, '.oat', 'config.json'),
          JSON.stringify({
            version: 1,
            workflow: {
              archiveOnComplete: true,
              postImplementSequence: sequence,
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({ archiveOnComplete: true });
      },
    );

    it('round-trips structured sequences in shared, local, and user config', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-sequence-'));
      tempDirs.push(userConfigDir);
      const sharedSequence = {
        preApproval: ['summary'],
        postApproval: ['document'],
      } satisfies WorkflowPostImplementStructuredSequence;
      const localSequence = {
        preApproval: [],
        postApproval: ['pr'],
      } satisfies WorkflowPostImplementStructuredSequence;
      const userSequence = {
        preApproval: ['document', 'pr'],
        postApproval: [],
      } satisfies WorkflowPostImplementStructuredSequence;

      await writeOatConfig(repoRoot, {
        version: 1,
        workflow: { postImplementSequence: sharedSequence },
      });
      await writeOatLocalConfig(repoRoot, {
        version: 1,
        workflow: { postImplementSequence: localSequence },
      });
      await writeUserConfig(userConfigDir, {
        version: 1,
        workflow: { postImplementSequence: userSequence },
      });

      await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
        workflow: { postImplementSequence: sharedSequence },
      });
      await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
        workflow: { postImplementSequence: localSequence },
      });
      await expect(readUserConfig(userConfigDir)).resolves.toMatchObject({
        workflow: { postImplementSequence: userSequence },
      });
    });

    it('normalizes valid workflow.retro values and drops unknown keys', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            retro: {
              filing: { repo: 'backlog', upstream: 'issues', unknown: true },
              apply: 'auto',
              upstreamRepo: 'voxmedia/open-agent-toolkit',
              unknown: true,
            },
          },
        }),
        'utf8',
      );

      await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
        workflow: {
          retro: {
            filing: { repo: 'backlog', upstream: 'issues' },
            apply: 'auto',
            upstreamRepo: 'voxmedia/open-agent-toolkit',
          },
        },
      });
    });

    it('drops invalid workflow.retro values independently', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            archiveOnComplete: true,
            retro: {
              filing: { repo: 'project', upstream: 'backlog' },
              apply: 'always',
              upstreamRepo: 'not-a-repo',
            },
          },
        }),
        'utf8',
      );

      await expect(readOatConfig(repoRoot)).resolves.toEqual({
        version: 1,
        workflow: { archiveOnComplete: true },
      });
    });

    it('reads valid workflow config from .oat/config.json', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'final',
            archiveOnComplete: true,
            createPrOnComplete: true,
            postImplementSequence: 'pr',
            reviewExecutionModel: 'subagent',
            autoReviewAtHillCheckpoints: true,
            autoNarrowReReviewScope: false,
            autoArtifactReview: {
              plan: true,
              analysis: true,
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        hillCheckpointDefault: 'final',
        archiveOnComplete: true,
        createPrOnComplete: true,
        postImplementSequence: 'pr',
        reviewExecutionModel: 'subagent',
        autoReviewAtHillCheckpoints: true,
        autoNarrowReReviewScope: false,
        autoArtifactReview: {
          plan: true,
          analysis: true,
        },
      });
    });

    it('accepts workflow.autoArtifactReview boolean overrides', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            autoArtifactReview: {
              plan: false,
              analysis: true,
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        autoArtifactReview: {
          plan: false,
          analysis: true,
        },
      });
    });

    it('drops non-boolean workflow.autoArtifactReview values', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            autoArtifactReview: {
              plan: 'yes',
              analysis: 1,
            },
            archiveOnComplete: true,
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('strips invalid enum values from workflow config', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'invalid-value',
            postImplementSequence: 'not-an-option',
            reviewExecutionModel: 42,
            archiveOnComplete: true,
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('drops empty workflow object', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({ version: 1, workflow: {} }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toBeUndefined();
    });

    it('reads workflow config from .oat/config.local.json', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.local.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'every',
            archiveOnComplete: false,
            postImplementSequence: 'docs-pr',
            reviewExecutionModel: 'inline',
            autoReviewAtHillCheckpoints: false,
          },
        }),
        'utf8',
      );

      const localConfig = await readOatLocalConfig(repoRoot);
      expect(localConfig.workflow).toEqual({
        hillCheckpointDefault: 'every',
        archiveOnComplete: false,
        postImplementSequence: 'docs-pr',
        reviewExecutionModel: 'inline',
        autoReviewAtHillCheckpoints: false,
      });
    });

    it('reads workflow config from ~/.oat/config.json (user)', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-wf-'));
      tempDirs.push(userConfigDir);
      await writeFile(
        join(userConfigDir, 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            hillCheckpointDefault: 'final',
            createPrOnComplete: true,
            reviewExecutionModel: 'fresh-session',
            autoReviewAtHillCheckpoints: true,
          },
        }),
        'utf8',
      );

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({
        hillCheckpointDefault: 'final',
        createPrOnComplete: true,
        reviewExecutionModel: 'fresh-session',
        autoReviewAtHillCheckpoints: true,
      });
    });

    it('returns undefined workflow when not set in any surface', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-empty-'));
      tempDirs.push(userConfigDir);

      const sharedConfig = await readOatConfig(repoRoot);
      const localConfig = await readOatLocalConfig(repoRoot);
      const userConfig = await readUserConfig(userConfigDir);

      expect(sharedConfig.workflow).toBeUndefined();
      expect(localConfig.workflow).toBeUndefined();
      expect(userConfig.workflow).toBeUndefined();
    });

    it('round-trips workflow config in shared config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        workflow: {
          hillCheckpointDefault: 'final',
          archiveOnComplete: true,
          createPrOnComplete: true,
          postImplementSequence: 'docs-pr',
          reviewExecutionModel: 'subagent',
          autoReviewAtHillCheckpoints: true,
          autoNarrowReReviewScope: true,
        },
      });

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({
        hillCheckpointDefault: 'final',
        archiveOnComplete: true,
        createPrOnComplete: true,
        postImplementSequence: 'docs-pr',
        reviewExecutionModel: 'subagent',
        autoReviewAtHillCheckpoints: true,
        autoNarrowReReviewScope: true,
      });
    });

    it('round-trips workflow config in user config', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-rt-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        workflow: {
          hillCheckpointDefault: 'every',
          createPrOnComplete: true,
        },
      });

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({
        hillCheckpointDefault: 'every',
        createPrOnComplete: true,
      });
    });

    it('normalizes workflow.gates.skills entries and preserves null tombstones', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              skills: {
                'oat-project-implement': {
                  command: 'pnpm test',
                  onFailure: 'block',
                  description: 'Run tests before done',
                  maxAttempts: 3,
                  execPolicy: { avoid: 'none' },
                },
                'oat-project-plan': {
                  command: 'pnpm lint',
                  onFailure: 'prompt',
                },
                'warn-only': {
                  command: 'pnpm type-check',
                  onFailure: 'warn',
                  maxAttempts: 0,
                },
                disabled: null,
                missingCommand: { onFailure: 'block' },
                emptyCommand: { command: '   ', onFailure: 'block' },
                badFailure: { command: 'pnpm build', onFailure: 'stop' },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.gates?.skills).toEqual({
        'oat-project-implement': {
          command: 'pnpm test',
          onFailure: 'block',
          description: 'Run tests before done',
          maxAttempts: 3,
        },
        'oat-project-plan': {
          command: 'pnpm lint',
          onFailure: 'prompt',
          maxAttempts: 2,
        },
        'warn-only': {
          command: 'pnpm type-check',
          onFailure: 'warn',
          maxAttempts: 2,
        },
        disabled: null,
      });
      expect(
        config.workflow?.gates?.skills?.['oat-project-implement'],
      ).not.toHaveProperty('execPolicy');
    });

    it('keeps a `__proto__` gate-skill entry as data instead of a prototype', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      // Written as raw JSON: an object literal spelling of this key would set
      // the fixture's own prototype and never reach the file.
      await writeFile(
        configPath,
        '{"version":1,"workflow":{"gates":{"skills":{"__proto__":{"command":"echo pwned","onFailure":"block"},"real":{"command":"echo ok","onFailure":"warn"}}}}}',
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      const skills = config.workflow?.gates?.skills;
      expect(skills).toBeDefined();
      const map = skills as NonNullable<typeof skills>;

      expect(Object.keys(map).sort()).toEqual(['__proto__', 'real']);
      expect(Object.getPrototypeOf(map)).toBe(Object.prototype);
      expect('command' in map).toBe(false);
      const seen: string[] = [];
      for (const key in map) {
        seen.push(key);
      }
      expect(seen.sort()).toEqual(['__proto__', 'real']);
      expect(map['__proto__']).toEqual({
        command: 'echo pwned',
        onFailure: 'block',
        maxAttempts: 2,
      });
      expect(map.real).toEqual({
        command: 'echo ok',
        onFailure: 'warn',
        maxAttempts: 2,
      });
      // The global prototype chain is untouched either way.
      expect(({} as Record<string, unknown>).command).toBeUndefined();
    });

    it('keeps a null record-map tombstone distinct from a dropped entry', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              skills: {
                tombstone: null,
                dropped: { onFailure: 'block' },
                kept: { command: 'pnpm test', onFailure: 'block' },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      const skills = config.workflow?.gates?.skills;
      // A `null` normalizer result is a real entry; only `undefined` drops.
      expect(Object.keys(skills ?? {}).sort()).toEqual(['kept', 'tombstone']);
      expect(skills?.tombstone).toBeNull();
      expect(skills).toHaveProperty('tombstone');
    });

    it('normalizes workflow.gates.execTargets partial entries and preserves null tombstones', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              execTargets: {
                'codex-custom': {
                  runtime: 'codex',
                  baseCommand: ['codex', 'exec'],
                  invocation: {
                    model: '  gpt-5.6-sol  ',
                    reasoningEffort: '  max  ',
                  },
                  hostDetectionCommand: [
                    'sh',
                    '-c',
                    'test -n "$CODEX_THREAD_ID"',
                  ],
                  availabilityCommand: ['codex', '--version'],
                  priority: 80,
                },
                'codex-default': {
                  priority: 80,
                  invocation: {
                    model: 'provider-default',
                  },
                },
                'partial-command': {
                  baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
                },
                'partial-runtime': {
                  runtime: 'custom',
                },
                'complete-without-priority': {
                  runtime: 'custom',
                  baseCommand: ['custom-agent'],
                },
                'invalid-optional-commands': {
                  runtime: 'custom',
                  baseCommand: ['custom-agent'],
                  hostDetectionCommand: ['sh', 1],
                  availabilityCommand: 'custom-agent --version',
                  priority: 10,
                  invocation: {
                    model: '   ',
                    reasoningEffort: 42,
                  },
                },
                disabled: null,
                invalidOnly: {
                  runtime: '   ',
                  baseCommand: [],
                  priority: 'high',
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.gates?.execTargets).toEqual({
        'codex-custom': {
          runtime: 'codex',
          baseCommand: ['codex', 'exec'],
          invocation: {
            model: 'gpt-5.6-sol',
            reasoningEffort: 'max',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CODEX_THREAD_ID"'],
          availabilityCommand: ['codex', '--version'],
          priority: 80,
        },
        'codex-default': {
          priority: 80,
          invocation: {
            model: 'provider-default',
          },
        },
        'partial-command': {
          baseCommand: ['codex', 'exec', '--model', 'gpt-5.5'],
        },
        'partial-runtime': {
          runtime: 'custom',
        },
        'complete-without-priority': {
          runtime: 'custom',
          baseCommand: ['custom-agent'],
        },
        'invalid-optional-commands': {
          runtime: 'custom',
          baseCommand: ['custom-agent'],
          priority: 10,
        },
        disabled: null,
      });
    });

    it('exports built-in exec targets with pinned detector shapes', () => {
      expect(BUILTIN_EXEC_TARGETS).toEqual({
        'codex-default': {
          runtime: 'codex',
          baseCommand: ['codex', 'exec'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: [
            'sh',
            '-c',
            '[ -n "$CODEX_THREAD_ID" ] || [ -n "$CODEX_SESSION_ID" ]',
          ],
          availabilityCommand: ['codex', '--version'],
          priority: 100,
        },
        'claude-default': {
          runtime: 'claude',
          baseCommand: ['claude', '-p'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CLAUDECODE"'],
          availabilityCommand: ['claude', '--version'],
          priority: 100,
        },
        'cursor-default': {
          runtime: 'cursor',
          baseCommand: ['cursor-agent', '-p'],
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
          },
          hostDetectionCommand: ['sh', '-c', 'test -n "$CURSOR_AGENT"'],
          availabilityCommand: [
            'sh',
            '-c',
            'command -v cursor-agent || command -v agent',
          ],
          priority: 70,
        },
      });
      expect(BUILTIN_EXEC_TARGETS['cursor-default'].baseCommand).not.toContain(
        '--force',
      );
      expect(BUILTIN_EXEC_TARGETS['cursor-default'].baseCommand).not.toContain(
        '--model',
      );
    });

    it('normalizes bounded gate timeout config surfaces', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          workflow: {
            gateTimeouts: {
              code: 1_000,
              artifact: 14_400_000,
              invalid: 2_000,
            },
            gates: {
              execTargets: {
                valid: {
                  runtime: 'custom',
                  baseCommand: ['custom'],
                  timeoutMs: 45_000,
                },
                tooLow: {
                  runtime: 'custom',
                  baseCommand: ['custom'],
                  timeoutMs: 999,
                },
                fractional: {
                  runtime: 'custom',
                  baseCommand: ['custom'],
                  timeoutMs: 1_000.5,
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.gateTimeouts).toEqual({
        code: 1_000,
        artifact: 14_400_000,
      });
      expect(config.workflow?.gates?.execTargets?.valid).toMatchObject({
        timeoutMs: 45_000,
      });
      expect(config.workflow?.gates?.execTargets?.tooLow).not.toHaveProperty(
        'timeoutMs',
      );
      expect(
        config.workflow?.gates?.execTargets?.fractional,
      ).not.toHaveProperty('timeoutMs');
    });

    it('accepts workflow.designMode "collaborative"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'collaborative' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'collaborative' });
    });

    it('accepts workflow.designMode "draft"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'draft' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'draft' });
    });

    it('accepts workflow.designMode "selective"', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'selective' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'selective' });
    });

    it('drops invalid workflow.designMode values silently', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { designMode: 'xyz', archiveOnComplete: true },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ archiveOnComplete: true });
    });

    it('leaves workflow.designMode undefined when missing', async () => {
      const repoRoot = await createRepoRoot();
      const configPath = join(repoRoot, '.oat', 'config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          version: 1,
          workflow: { hillCheckpointDefault: 'final' },
        }),
        'utf8',
      );

      const config = await readOatConfig(repoRoot);
      expect(config.workflow?.designMode).toBeUndefined();
    });

    it('round-trips workflow.designMode in shared config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatConfig(repoRoot, {
        version: 1,
        workflow: { designMode: 'draft' },
      });

      const config = await readOatConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'draft' });
    });

    it('round-trips workflow.designMode in local config', async () => {
      const repoRoot = await createRepoRoot();

      await writeOatLocalConfig(repoRoot, {
        version: 1,
        workflow: { designMode: 'collaborative' },
      });

      const config = await readOatLocalConfig(repoRoot);
      expect(config.workflow).toEqual({ designMode: 'collaborative' });
    });

    it('round-trips workflow.designMode in user config', async () => {
      const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-dm-'));
      tempDirs.push(userConfigDir);

      await writeUserConfig(userConfigDir, {
        version: 1,
        workflow: { designMode: 'draft' },
      });

      const userConfig = await readUserConfig(userConfigDir);
      expect(userConfig.workflow).toEqual({ designMode: 'draft' });
    });

    describe('normalizeWorkflowConfig dispatchCeiling (new shape)', () => {
      it('accepts preset + providers and preserves both', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                preset: 'balanced',
                providers: { codex: 'high', claude: 'sonnet' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'balanced',
            providers: { codex: 'high', claude: 'sonnet' },
          },
        });
      });

      it('accepts providers-only (advanced/manual) with no preset', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { codex: 'medium' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.preset).toBeUndefined();
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: 'medium',
        });
      });

      it('preserves dispatch matrix recommendation version stamps', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                recommendationVersion: '2026-07-07.1',
                providers: { cursor: { high: 'composer-2.5' } },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling).toEqual({
          recommendationVersion: '2026-07-07.1',
          providers: {
            cursor: { high: { candidates: ['composer-2.5'] } },
          },
        });

        await writeOatConfig(repoRoot, config);
        const raw = await readFile(configPath, 'utf8');
        expect(JSON.parse(raw).workflow.dispatchCeiling).toMatchObject({
          recommendationVersion: '2026-07-07.1',
        });
      });

      it('accepts cursor dispatch matrix cells under providers', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    economy: 'composer-2.5',
                    balanced: [
                      'composer-2.5-fast',
                      {
                        harness: 'cursor',
                        model: 'gpt-5.3-codex-high',
                        effort: 'high',
                        ignored: true,
                      },
                    ],
                    high: [
                      { harness: 'cursor', model: 'glm-5.2-max' },
                      'claude-opus-4-8',
                    ],
                    frontier: 'fable-5',
                    experimental: 'not-a-tier',
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: {
            economy: { candidates: ['composer-2.5'] },
            balanced: {
              candidates: [
                {
                  route: [
                    'composer-2.5-fast',
                    {
                      harness: 'cursor',
                      model: 'gpt-5.3-codex-high',
                      effort: 'high',
                    },
                  ],
                },
              ],
            },
            high: {
              candidates: [
                {
                  route: [
                    { harness: 'cursor', model: 'glm-5.2-max' },
                    'claude-opus-4-8',
                  ],
                },
              ],
            },
            frontier: { candidates: ['fable-5'] },
          },
        });
      });

      it('accepts bare cursor model slugs as single pinned provider values', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { cursor: 'composer-2.5' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: 'composer-2.5',
        });
      });

      it('accepts per-tier maps for codex and claude while keeping bare enum values valid', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    economy: 'low',
                    balanced: 'medium',
                    high: 'high',
                    frontier: 'max',
                    stray: 'ignored',
                  },
                  claude: {
                    economy: 'haiku',
                    balanced: 'sonnet',
                    high: 'opus',
                    frontier: 'fable',
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            economy: { candidates: ['low'] },
            balanced: { candidates: ['medium'] },
            high: { candidates: ['high'] },
            frontier: { candidates: ['max'] },
          },
          claude: {
            economy: { candidates: ['haiku'] },
            balanced: { candidates: ['sonnet'] },
            high: { candidates: ['opus'] },
            frontier: { candidates: ['fable'] },
          },
        });
      });

      it('accepts codex materialized route targets with model and effort', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    high: [
                      {
                        harness: 'codex',
                        model: 'gpt-5.6-terra',
                        effort: 'xhigh',
                      },
                    ],
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            high: {
              candidates: [
                {
                  route: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'xhigh',
                    },
                  ],
                },
              ],
            },
          },
        });
      });

      it('normalizes ordered provider candidates without conflating fallback routes', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  codex: {
                    high: {
                      candidates: [
                        {
                          harness: 'codex',
                          model: 'gpt-5.6-luna',
                          effort: 'medium',
                          ignored: true,
                        },
                        {
                          route: [
                            {
                              harness: 'codex',
                              model: 'gpt-5.6-terra',
                              effort: 'high',
                            },
                            {
                              harness: 'claude',
                              model: 'opus',
                            },
                          ],
                          ignored: true,
                        },
                        {
                          harness: 'codex',
                          model: 'gpt-5.6-sol',
                          effort: 'high',
                        },
                      ],
                    },
                  },
                  claude: {
                    high: { candidates: ['haiku', 'sonnet', 'opus'] },
                  },
                  cursor: {
                    high: {
                      candidates: [
                        'opaque:model/a',
                        'opaque model value with no capability name',
                      ],
                    },
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: {
            high: {
              candidates: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-luna',
                  effort: 'medium',
                },
                {
                  route: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'high',
                    },
                    { harness: 'claude', model: 'opus' },
                  ],
                },
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
          claude: {
            high: { candidates: ['haiku', 'sonnet', 'opus'] },
          },
          cursor: {
            high: {
              candidates: [
                'opaque:model/a',
                'opaque model value with no capability name',
              ],
            },
          },
        });
      });

      it('normalizes legacy single values and routes as one-candidate ladders', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  claude: { high: 'opus' },
                  cursor: {
                    high: [
                      'opaque-primary',
                      { harness: 'claude', model: 'opaque-fallback' },
                    ],
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          claude: { high: { candidates: ['opus'] } },
          cursor: {
            high: {
              candidates: [
                {
                  route: [
                    'opaque-primary',
                    { harness: 'claude', model: 'opaque-fallback' },
                  ],
                },
              ],
            },
          },
        });
      });

      it('drops invalid dispatch matrix provider shapes silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    economy: [],
                    balanced: [{ unknown: true }],
                  },
                  codex: 'ultra',
                  claude: {
                    high: 'super-opus',
                  },
                },
              },
              dispatchPolicy: {
                mode: 'managed',
                policy: 'high',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchPolicy: {
            mode: 'managed',
            policy: 'high',
          },
        });
      });

      it('keeps valid layered candidates while silently dropping malformed siblings', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: {
                  cursor: {
                    high: {
                      candidates: [
                        '  opaque-primary  ',
                        null,
                        {},
                        {
                          route: [
                            'opaque-fallback',
                            false,
                            { harness: 'claude', model: 'opus' },
                          ],
                        },
                      ],
                    },
                    unsupported: 'ignored-tier',
                  },
                  codex: {
                    economy: { candidates: ['low', 'invalid-effort'] },
                  },
                },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          cursor: {
            high: {
              candidates: [
                'opaque-primary',
                {
                  route: [
                    'opaque-fallback',
                    { harness: 'claude', model: 'opus' },
                  ],
                },
              ],
            },
          },
          codex: {
            economy: { candidates: ['low'] },
          },
        });
      });

      it('drops invalid preset values silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                preset: 'turbo',
                providers: { codex: 'high' },
              },
              archiveOnComplete: true,
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling?.preset).toBeUndefined();
        expect(config.workflow?.dispatchCeiling?.providers).toEqual({
          codex: 'high',
        });
      });

      it('drops invalid provider enum values silently', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchCeiling: {
                providers: { codex: 'ultra', claude: 'high' },
              },
              archiveOnComplete: true,
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchCeiling).toBeUndefined();
        expect(config.workflow).toEqual({ archiveOnComplete: true });
      });

      it('round-trips preset + providers in shared config', async () => {
        const repoRoot = await createRepoRoot();

        await writeOatConfig(repoRoot, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              preset: 'maximum',
              providers: { codex: 'xhigh', claude: 'opus' },
            },
          },
        });

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'maximum',
            providers: { codex: 'xhigh', claude: 'opus' },
          },
        });
      });

      it('round-trips providers-only in local config', async () => {
        const repoRoot = await createRepoRoot();

        await writeOatLocalConfig(repoRoot, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              providers: { codex: 'medium' },
            },
          },
        });

        const config = await readOatLocalConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            providers: { codex: 'medium' },
          },
        });
      });

      it('round-trips dispatchCeiling in user config', async () => {
        const userConfigDir = await mkdtemp(join(tmpdir(), 'oat-user-ceil-'));
        tempDirs.push(userConfigDir);

        await writeUserConfig(userConfigDir, {
          version: 1,
          workflow: {
            dispatchCeiling: {
              preset: 'cost-conscious',
              providers: { claude: 'sonnet' },
            },
          },
        });

        const userConfig = await readUserConfig(userConfigDir);
        expect(userConfig.workflow).toEqual({
          dispatchCeiling: {
            preset: 'cost-conscious',
            providers: { claude: 'sonnet' },
          },
        });
      });
    });

    describe('normalizeWorkflowConfig dispatchPolicy', () => {
      it('reads managed dispatch policy config from .oat/config.json', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'managed',
                policy: 'frontier',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'managed',
          policy: 'frontier',
        });
      });

      it('reads inherit dispatch policy config without a managed policy', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'inherit',
                policy: 'uncapped',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'inherit',
        });
      });

      it('accepts explicit uncapped as a managed dispatch policy', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'managed',
                policy: 'uncapped',
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow?.dispatchPolicy).toEqual({
          mode: 'managed',
          policy: 'uncapped',
        });
      });

      it('drops invalid dispatch policy values while preserving legacy dispatch ceiling values', async () => {
        const repoRoot = await createRepoRoot();
        const configPath = join(repoRoot, '.oat', 'config.json');
        await writeFile(
          configPath,
          JSON.stringify({
            version: 1,
            workflow: {
              dispatchPolicy: {
                mode: 'auto',
                policy: 'maximum',
              },
              dispatchCeiling: {
                preset: 'balanced',
                providers: { codex: 'high' },
              },
            },
          }),
          'utf8',
        );

        const config = await readOatConfig(repoRoot);
        expect(config.workflow).toEqual({
          dispatchCeiling: {
            preset: 'balanced',
            providers: { codex: 'high' },
          },
        });
      });
    });

    it.each([true, false, 'auto'] as const)(
      'accepts workflow.projectLog value %s',
      async (projectLog) => {
        const repoRoot = await createRepoRoot();
        await writeFile(
          join(repoRoot, '.oat', 'config.json'),
          JSON.stringify({
            version: 1,
            workflow: {
              projectLog,
              projectLogLedgerPath: '.oat/custom/project-observations.md',
            },
          }),
          'utf8',
        );

        await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
          workflow: {
            projectLog,
            projectLogLedgerPath: '.oat/custom/project-observations.md',
          },
        });
      },
    );

    it.each(['yes', 1, null, {}, []])(
      'rejects invalid workflow.projectLog value %#',
      async (projectLog) => {
        const repoRoot = await createRepoRoot();
        await writeFile(
          join(repoRoot, '.oat', 'config.json'),
          JSON.stringify({
            version: 1,
            workflow: { projectLog, archiveOnComplete: true },
          }),
          'utf8',
        );

        await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
          workflow: { archiveOnComplete: true },
        });
        expect((await readOatConfig(repoRoot)).workflow).not.toHaveProperty(
          'projectLog',
        );
      },
    );
  });

  describe('explainer configuration', () => {
    it('normalizes the shared explainer build and publish surface', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          explainers: {
            defaults: {
              style: ' business-corporate ',
              palette: ' ocean ',
              visualProfile: ' editorial ',
              themeBundlePath: 'themes/team.json',
            },
            publish: {
              provider: 's3-static',
              s3Uri: 's3://example-bucket/explainers/',
              publicBaseUrl: 'https://docs.example.com/explainers/',
              awsRegion: ' us-east-1 ',
              publicAccess: 'protected',
              awsProfile: 'not-shared',
            },
          },
          workflow: {
            explainers: {
              projectExplainer: 'always',
              projectRecap: 'never',
            },
          },
        }),
        'utf8',
      );

      await expect(readOatConfig(repoRoot)).resolves.toMatchObject({
        explainers: {
          defaults: {
            style: 'business-corporate',
            palette: 'ocean',
            visualProfile: 'editorial',
            themeBundlePath: 'themes/team.json',
          },
          publish: {
            provider: 's3-static',
            s3Uri: 's3://example-bucket/explainers',
            publicBaseUrl: 'https://docs.example.com/explainers',
            awsRegion: 'us-east-1',
            publicAccess: 'protected',
          },
        },
        workflow: {
          explainers: {
            projectExplainer: 'always',
            projectRecap: 'never',
          },
        },
      });
    });

    it('keeps local and user explainer fields within their allowed surfaces', async () => {
      const repoRoot = await createRepoRoot();
      const userConfigDir = await mkdtemp(
        join(tmpdir(), 'oat-user-explainers-'),
      );
      tempDirs.push(userConfigDir);

      const config = {
        version: 1,
        explainers: {
          defaults: {
            style: 'navy-ocean',
            palette: 'violet',
            visualProfile: 'clean',
            themeBundlePath: '/tmp/private-theme.json',
          },
          publish: {
            provider: 's3-static',
            awsProfile: 'work-sso',
          },
        },
        workflow: {
          explainers: {
            projectExplainer: 'ask',
            projectRecap: 'always',
          },
        },
      };
      await writeFile(
        join(repoRoot, '.oat', 'config.local.json'),
        JSON.stringify(config),
        'utf8',
      );
      await writeFile(
        join(userConfigDir, 'config.json'),
        JSON.stringify(config),
        'utf8',
      );

      await expect(readOatLocalConfig(repoRoot)).resolves.toMatchObject({
        explainers: {
          defaults: {
            style: 'navy-ocean',
            palette: 'violet',
            visualProfile: 'clean',
            themeBundlePath: '/tmp/private-theme.json',
          },
          publish: { awsProfile: 'work-sso' },
        },
      });
      await expect(readUserConfig(userConfigDir)).resolves.toMatchObject({
        explainers: {
          defaults: {
            style: 'navy-ocean',
            palette: 'violet',
            visualProfile: 'clean',
          },
          publish: { awsProfile: 'work-sso' },
        },
      });
    });

    it('drops unknown named explainer styles', async () => {
      const repoRoot = await createRepoRoot();
      await writeFile(
        join(repoRoot, '.oat', 'config.json'),
        JSON.stringify({
          version: 1,
          explainers: { defaults: { style: 'vintage' } },
        }),
        'utf8',
      );

      await expect(readOatConfig(repoRoot)).resolves.not.toHaveProperty(
        'explainers.defaults.style',
      );
    });
  });
});
