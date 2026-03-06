import { describe, expect, it, vi } from 'vitest';
import {
  detectDocsRepoShape,
  getDefaultDocsAppName,
  getDefaultDocsTargetDir,
  resolveDocsInitOptions,
} from './resolve-options';

describe('docs init option resolution', () => {
  it('detects monorepo from pnpm-workspace.yaml', async () => {
    const result = await detectDocsRepoShape('/tmp/workspace', {
      fileExists: vi.fn(async (path: string) =>
        path.endsWith('pnpm-workspace.yaml'),
      ),
      dirExists: vi.fn(async () => false),
      readFile: vi.fn(async () => ''),
    });

    expect(result).toBe('monorepo');
  });

  it('detects monorepo from package.json workspaces', async () => {
    const result = await detectDocsRepoShape('/tmp/workspace', {
      fileExists: vi.fn(async (path: string) => path.endsWith('package.json')),
      dirExists: vi.fn(async () => false),
      readFile: vi.fn(async () => JSON.stringify({ workspaces: ['apps/*'] })),
    });

    expect(result).toBe('monorepo');
  });

  it('detects monorepo from apps and packages directories', async () => {
    const result = await detectDocsRepoShape('/tmp/workspace', {
      fileExists: vi.fn(async () => false),
      dirExists: vi.fn(
        async (path: string) =>
          path.endsWith('/apps') || path.endsWith('/packages'),
      ),
      readFile: vi.fn(async () => ''),
    });

    expect(result).toBe('monorepo');
  });

  it('defaults to single-package when no monorepo signals exist', async () => {
    const result = await detectDocsRepoShape('/tmp/workspace', {
      fileExists: vi.fn(async () => false),
      dirExists: vi.fn(async () => false),
      readFile: vi.fn(async () => ''),
    });

    expect(result).toBe('single-package');
  });

  it('derives default app name and target dir from repo shape', () => {
    expect(getDefaultDocsAppName('/tmp/open-agent-toolkit', 'monorepo')).toBe(
      'open-agent-toolkit-docs',
    );
    expect(getDefaultDocsTargetDir('monorepo', 'oat-docs')).toBe(
      'apps/oat-docs',
    );
    expect(getDefaultDocsAppName('/tmp/widget-service', 'single-package')).toBe(
      'docs',
    );
    expect(getDefaultDocsTargetDir('single-package', 'docs')).toBe('docs');
  });

  it('resolves interactive prompts for monorepo options', async () => {
    const inputWithDefault = vi
      .fn()
      .mockResolvedValueOnce('oat-docs')
      .mockResolvedValueOnce('apps/oat-docs');
    const selectWithAbort = vi
      .fn()
      .mockResolvedValueOnce('markdownlint')
      .mockResolvedValueOnce('prettier');

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      interactive: true,
      acceptDefaults: false,
      inputWithDefault,
      selectWithAbort,
    });

    expect(result).toEqual({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      appName: 'oat-docs',
      targetDir: 'apps/oat-docs',
      lint: 'markdownlint',
      format: 'prettier',
    });
    expect(inputWithDefault).toHaveBeenCalledTimes(2);
    expect(selectWithAbort).toHaveBeenCalledTimes(2);
  });

  it('uses defaults without prompts in non-interactive mode', async () => {
    const inputWithDefault = vi.fn();
    const selectWithAbort = vi.fn();

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/widget-service',
      repoShape: 'single-package',
      interactive: false,
      acceptDefaults: false,
      inputWithDefault,
      selectWithAbort,
    });

    expect(result).toEqual({
      repoRoot: '/tmp/widget-service',
      repoShape: 'single-package',
      appName: 'docs',
      targetDir: 'docs',
      lint: 'markdownlint',
      format: 'prettier',
    });
    expect(inputWithDefault).not.toHaveBeenCalled();
    expect(selectWithAbort).not.toHaveBeenCalled();
  });

  it('uses provided flags without prompting', async () => {
    const inputWithDefault = vi.fn();
    const selectWithAbort = vi.fn();

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      interactive: true,
      acceptDefaults: false,
      providedAppName: 'oat-docs',
      providedTargetDir: 'apps/oat-docs',
      providedLint: 'none',
      providedFormat: 'prettier',
      inputWithDefault,
      selectWithAbort,
    });

    expect(result).toEqual({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      appName: 'oat-docs',
      targetDir: 'apps/oat-docs',
      lint: 'none',
      format: 'prettier',
    });
    expect(inputWithDefault).not.toHaveBeenCalled();
    expect(selectWithAbort).not.toHaveBeenCalled();
  });
});
