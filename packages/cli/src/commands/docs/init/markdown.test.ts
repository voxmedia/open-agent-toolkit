import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyMarkdownDocsPlan,
  MarkdownDocsWriteError,
  planMarkdownDocs,
  type MarkdownDocsOptions,
  type MarkdownDocsPlan,
} from './markdown';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, open: vi.fn(actual.open), unlink: vi.fn(actual.unlink) };
});

const actualFs =
  await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
const assetsRoot = fileURLToPath(
  new URL('../../../../../../.oat/', import.meta.url),
);
const partialContent = 'incomplete baseline';

describe('Markdown baseline write recovery', () => {
  let repoRoot: string;
  let options: MarkdownDocsOptions;

  beforeEach(async () => {
    vi.mocked(open).mockImplementation(actualFs.open);
    vi.mocked(unlink).mockImplementation(actualFs.unlink);
    repoRoot = await mkdtemp(join(tmpdir(), 'oat-markdown-write-recovery-'));
    options = {
      repoRoot,
      repoShape: 'single-package',
      framework: 'markdown',
      appName: 'docs',
      siteName: 'Recovery docs',
      targetDir: 'docs',
      siteDescription: 'Documentation recovery contract.',
      lint: 'none',
      format: 'none',
      rootPatch: false,
      assetsRoot,
    };
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  function failWrite(
    name: string,
    afterPartialWrite?: (path: string) => Promise<void>,
  ) {
    vi.mocked(open).mockImplementation(async (path, flags, mode) => {
      const handle = await actualFs.open(path, flags, mode);
      if (basename(String(path)) !== name) return handle;
      return new Proxy(handle, {
        get(target, property) {
          if (property === 'writeFile') {
            return async () => {
              await target.writeFile(partialContent, 'utf8');
              await afterPartialWrite?.(String(path));
              throw Object.assign(new Error('No space left on device'), {
                code: 'ENOSPC',
              });
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    });
  }

  async function failedApply(
    plan: MarkdownDocsPlan,
  ): Promise<MarkdownDocsWriteError> {
    try {
      await applyMarkdownDocsPlan(plan);
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownDocsWriteError);
      expect((error as Error).message).toContain('No space left on device');
      expect((error as Error).cause).toMatchObject({ code: 'ENOSPC' });
      return error as MarkdownDocsWriteError;
    }
    throw new Error('Expected injected baseline write failure');
  }

  it.each(['index.md', 'contributing.md'])(
    'removes its partial %s write, preserves completed and authored files, and repairs the baseline on retry',
    async (failedName) => {
      await mkdir(join(repoRoot, 'docs'));
      const authored = '# Authored guide\n\nKeep my content.\n';
      await writeFile(join(repoRoot, 'docs', 'guide.md'), authored);
      const plan = await planMarkdownDocs({ ...options, adopt: true });
      failWrite(failedName);

      const failure = await failedApply(plan);

      await expect(
        readFile(join(repoRoot, 'docs', failedName), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
      expect(failure.result.incompleteFiles).toEqual([]);
      expect(failure.result.createdFiles).toEqual(
        failedName === 'index.md' ? [] : ['index.md'],
      );
      expect(await readFile(join(repoRoot, 'docs', 'guide.md'), 'utf8')).toBe(
        authored,
      );
      if (failedName === 'contributing.md') {
        expect(await readFile(join(repoRoot, 'docs', 'index.md'), 'utf8')).toBe(
          plan.files[0]!.content,
        );
      }

      vi.mocked(open).mockImplementation(actualFs.open);
      const retryPlan = await planMarkdownDocs({ ...options, adopt: true });
      const retry = await applyMarkdownDocsPlan(retryPlan);
      expect(retry.incompleteFiles).toEqual([]);
      for (const file of plan.files) {
        expect(await readFile(join(repoRoot, 'docs', file.name), 'utf8')).toBe(
          file.content,
        );
      }
      expect(await readFile(join(repoRoot, 'docs', 'guide.md'), 'utf8')).toBe(
        authored,
      );
    },
  );

  it('preserves an authored index through a contributing write failure and adoption retry', async () => {
    await mkdir(join(repoRoot, 'docs'));
    const authoredIndex = '# My authored index\n\nNever replace this page.\n';
    await writeFile(join(repoRoot, 'docs', 'index.md'), authoredIndex);
    const plan = await planMarkdownDocs({ ...options, adopt: true });
    failWrite('contributing.md');

    const failure = await failedApply(plan);

    expect(failure.result.preservedFiles).toContain('index.md');
    expect(await readFile(join(repoRoot, 'docs', 'index.md'), 'utf8')).toBe(
      authoredIndex,
    );
    await expect(
      readFile(join(repoRoot, 'docs', 'contributing.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    vi.mocked(open).mockImplementation(actualFs.open);
    const retry = await applyMarkdownDocsPlan(
      await planMarkdownDocs({ ...options, adopt: true }),
    );
    expect(retry.createdFiles).toEqual(['contributing.md']);
    expect(await readFile(join(repoRoot, 'docs', 'index.md'), 'utf8')).toBe(
      authoredIndex,
    );
    expect(
      await readFile(join(repoRoot, 'docs', 'contributing.md'), 'utf8'),
    ).toBe(plan.files[0]!.content);
  });

  it('reports an incomplete file when removing its partial write fails, without claiming it was created successfully', async () => {
    const plan = await planMarkdownDocs(options);
    failWrite('index.md');
    vi.mocked(unlink).mockRejectedValue(
      Object.assign(new Error('Permission denied'), { code: 'EACCES' }),
    );

    const failure = await failedApply(plan);

    expect(failure.result.incompleteFiles).toEqual(['index.md']);
    expect(failure.result.createdFiles).toEqual([]);
    expect(await readFile(join(repoRoot, 'docs', 'index.md'), 'utf8')).toBe(
      partialContent,
    );
  });

  it('preserves a replacement inode instead of deleting a file another writer owns', async () => {
    const plan = await planMarkdownDocs(options);
    const replacement = '# Another writer\n';
    failWrite('index.md', async (path) => {
      const replacementPath = join(repoRoot, 'replacement.md');
      await writeFile(replacementPath, replacement);
      await rename(replacementPath, path);
    });

    const failure = await failedApply(plan);

    expect(await readFile(join(repoRoot, 'docs', 'index.md'), 'utf8')).toBe(
      replacement,
    );
    expect(failure.result.createdFiles).toEqual([]);
    expect(failure.result.incompleteFiles).toEqual(['index.md']);
  });
});
