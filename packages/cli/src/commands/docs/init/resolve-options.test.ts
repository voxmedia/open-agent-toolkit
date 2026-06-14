import { describe, expect, it, vi } from 'vitest';

import {
  type DocsRepoShape,
  detectDocsRepoShape,
  getDefaultDocsAppName,
  getDefaultDocsTargetDir,
  getTemplateDir,
  humanizeAppName,
  resolveDocsInitOptions,
  resolveEffectiveDocsShape,
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

  it('includes nested-standalone as a repo shape', () => {
    const shape: DocsRepoShape = 'nested-standalone';

    expect(shape).toBe('nested-standalone');
  });

  it('promotes Fumadocs single-package subdirectories to nested-standalone', () => {
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'fumadocs',
        '/tmp/workspace',
        'documentation',
      ),
    ).toBe('nested-standalone');
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'fumadocs',
        '/tmp/workspace',
        'apps/docs',
      ),
    ).toBe('nested-standalone');
  });

  it('keeps root and outside Fumadocs single-package targets unchanged', () => {
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'fumadocs',
        '/tmp/workspace',
        '.',
      ),
    ).toBe('single-package');
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'fumadocs',
        '/tmp/workspace',
        '',
      ),
    ).toBe('single-package');
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'fumadocs',
        '/tmp/workspace',
        '../docs',
      ),
    ).toBe('single-package');
  });

  it('keeps monorepo and MkDocs shapes unchanged', () => {
    expect(
      resolveEffectiveDocsShape(
        'monorepo',
        'fumadocs',
        '/tmp/workspace',
        'apps/docs',
      ),
    ).toBe('monorepo');
    expect(
      resolveEffectiveDocsShape(
        'single-package',
        'mkdocs',
        '/tmp/workspace',
        'documentation',
      ),
    ).toBe('single-package');
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

  it('humanizes app names for default display names', () => {
    expect(humanizeAppName('remix-docs')).toBe('Remix Docs');
    expect(humanizeAppName('api_reference')).toBe('Api Reference');
  });

  it('resolves interactive prompts for monorepo options', async () => {
    const inputWithDefault = vi
      .fn()
      .mockResolvedValueOnce('oat-docs')
      .mockResolvedValueOnce('Open Agent Toolkit')
      .mockResolvedValueOnce('apps/oat-docs')
      .mockResolvedValueOnce('Project documentation');
    const selectWithAbort = vi
      .fn()
      .mockResolvedValueOnce('fumadocs')
      .mockResolvedValueOnce('none')
      .mockResolvedValueOnce('oxfmt');

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
      framework: 'fumadocs',
      appName: 'oat-docs',
      siteName: 'Open Agent Toolkit',
      targetDir: 'apps/oat-docs',
      siteDescription: 'Project documentation',
      lint: 'none',
      format: 'oxfmt',
      rootPatch: true,
    });
    expect(inputWithDefault).toHaveBeenCalledTimes(4);
    expect(inputWithDefault).toHaveBeenNthCalledWith(
      2,
      'Site name',
      'Oat Docs',
      { interactive: true },
    );
    expect(selectWithAbort).toHaveBeenCalledTimes(3);
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
      repoShape: 'nested-standalone',
      framework: 'fumadocs',
      appName: 'docs',
      siteName: 'Docs',
      targetDir: 'docs',
      siteDescription: '',
      lint: 'none',
      format: 'oxfmt',
      rootPatch: true,
    });
    expect(inputWithDefault).not.toHaveBeenCalled();
    expect(selectWithAbort).not.toHaveBeenCalled();
  });

  it('returns the effective nested-standalone shape after resolving Fumadocs target directory', async () => {
    const inputWithDefault = vi.fn();
    const selectWithAbort = vi.fn();

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/widget-service',
      repoShape: 'single-package',
      interactive: false,
      acceptDefaults: false,
      providedFramework: 'fumadocs',
      providedAppName: 'documentation',
      providedSiteName: 'Documentation',
      providedTargetDir: 'documentation',
      inputWithDefault,
      selectWithAbort,
    });

    expect(result?.repoShape).toBe('nested-standalone');
  });

  it('uses provided flags without prompting', async () => {
    const inputWithDefault = vi.fn();
    const selectWithAbort = vi.fn();

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      interactive: true,
      acceptDefaults: false,
      providedFramework: 'mkdocs',
      providedAppName: 'oat-docs',
      providedSiteName: '  Raw Docs  ',
      providedTargetDir: 'apps/oat-docs',
      providedSiteDescription: 'My docs',
      providedLint: 'none',
      providedFormat: 'oxfmt',
      providedRootPatch: false,
      inputWithDefault,
      selectWithAbort,
    });

    expect(result).toEqual({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      framework: 'mkdocs',
      appName: 'oat-docs',
      siteName: '  Raw Docs  ',
      targetDir: 'apps/oat-docs',
      siteDescription: 'My docs',
      lint: 'none',
      format: 'oxfmt',
      rootPatch: false,
    });
    expect(inputWithDefault).not.toHaveBeenCalled();
    expect(selectWithAbort).not.toHaveBeenCalled();
  });

  it('maps framework to template directory', () => {
    expect(getTemplateDir('fumadocs')).toBe('docs-app-fuma');
    expect(getTemplateDir('mkdocs')).toBe('docs-app-mkdocs');
  });

  it('accepts markdownlint-cli2 as a lint mode', async () => {
    const inputWithDefault = vi.fn();
    const selectWithAbort = vi.fn();

    const result = await resolveDocsInitOptions({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      interactive: true,
      acceptDefaults: false,
      providedFramework: 'mkdocs',
      providedAppName: 'oat-docs',
      providedSiteName: 'Oat Docs',
      providedTargetDir: 'apps/oat-docs',
      providedSiteDescription: 'My docs',
      providedLint: 'markdownlint-cli2',
      providedFormat: 'oxfmt',
      inputWithDefault,
      selectWithAbort,
    });

    expect(result).toEqual({
      repoRoot: '/tmp/open-agent-toolkit',
      repoShape: 'monorepo',
      framework: 'mkdocs',
      appName: 'oat-docs',
      siteName: 'Oat Docs',
      targetDir: 'apps/oat-docs',
      siteDescription: 'My docs',
      lint: 'markdownlint-cli2',
      format: 'oxfmt',
      rootPatch: true,
    });
    expect(inputWithDefault).not.toHaveBeenCalled();
    expect(selectWithAbort).not.toHaveBeenCalled();
  });
});
