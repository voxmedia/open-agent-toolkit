import { basename, isAbsolute, join, relative, resolve } from 'node:path';

import type {
  PromptContext,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import { dirExists, fileExists } from '@fs/io';

export type DocsRepoShape = 'monorepo' | 'single-package' | 'nested-standalone';
export type DocsDetectedRepoShape = Exclude<DocsRepoShape, 'nested-standalone'>;
export type DocsFramework = 'fumadocs' | 'mkdocs';
export type DocsLintMode = 'none' | 'markdownlint-cli2';
export type DocsFormatMode = 'oxfmt' | 'none';

export interface DocsInitResolvedOptions {
  repoRoot: string;
  repoShape: DocsRepoShape;
  framework: DocsFramework;
  appName: string;
  siteName: string;
  targetDir: string;
  siteDescription: string;
  lint: DocsLintMode;
  format: DocsFormatMode;
  rootPatch: boolean;
}

export interface ResolveDocsInitOptionsInput {
  repoRoot: string;
  repoShape: DocsRepoShape;
  interactive: boolean;
  acceptDefaults: boolean;
  providedFramework?: DocsFramework;
  providedAppName?: string;
  providedSiteName?: string;
  providedTargetDir?: string;
  providedSiteDescription?: string;
  providedLint?: DocsLintMode;
  providedFormat?: DocsFormatMode;
  providedRootPatch?: boolean;
  inputWithDefault: (
    message: string,
    defaultValue: string,
    ctx: PromptContext,
  ) => Promise<string | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
}

export interface DocsRepoShapeDependencies {
  fileExists: (path: string) => Promise<boolean>;
  dirExists: (path: string) => Promise<boolean>;
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
}

const FRAMEWORK_CHOICES: SelectChoice<DocsFramework>[] = [
  { label: 'Fumadocs (Next.js + MDX, static export)', value: 'fumadocs' },
  { label: 'MkDocs (Python, Material theme)', value: 'mkdocs' },
];

const LINT_CHOICES: SelectChoice<DocsLintMode>[] = [
  { label: 'none', value: 'none' },
  { label: 'markdownlint-cli2', value: 'markdownlint-cli2' },
];

const FORMAT_CHOICES: SelectChoice<DocsFormatMode>[] = [
  { label: 'oxfmt', value: 'oxfmt' },
  { label: 'none', value: 'none' },
];

export function getDefaultDocsAppName(
  repoRoot: string,
  repoShape: DocsRepoShape,
): string {
  if (repoShape === 'monorepo') {
    return `${basename(repoRoot)}-docs`;
  }

  return 'docs';
}

export function getDefaultDocsTargetDir(
  repoShape: DocsRepoShape,
  appName: string,
): string {
  if (repoShape === 'monorepo') {
    return join('apps', appName);
  }

  return appName;
}

export function humanizeAppName(appName: string): string {
  return appName
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hasWorkspaceConfig(rawPackageJson: string): boolean {
  try {
    const parsed = JSON.parse(rawPackageJson) as {
      workspaces?: string[] | { packages?: string[] };
    };
    if (Array.isArray(parsed.workspaces)) {
      return parsed.workspaces.length > 0;
    }

    return (
      Array.isArray(parsed.workspaces?.packages) &&
      parsed.workspaces.packages.length > 0
    );
  } catch {
    return false;
  }
}

export async function detectDocsRepoShape(
  repoRoot: string,
  dependencies: DocsRepoShapeDependencies,
): Promise<DocsDetectedRepoShape> {
  if (await dependencies.fileExists(join(repoRoot, 'pnpm-workspace.yaml'))) {
    return 'monorepo';
  }

  const packageJsonPath = join(repoRoot, 'package.json');
  if (await dependencies.fileExists(packageJsonPath)) {
    const rawPackageJson = await dependencies.readFile(packageJsonPath, 'utf8');
    if (hasWorkspaceConfig(rawPackageJson)) {
      return 'monorepo';
    }
  }

  if (
    (await dependencies.dirExists(join(repoRoot, 'apps'))) &&
    (await dependencies.dirExists(join(repoRoot, 'packages')))
  ) {
    return 'monorepo';
  }

  return 'single-package';
}

export function getTemplateDir(framework: DocsFramework): string {
  return framework === 'fumadocs' ? 'docs-app-fuma' : 'docs-app-mkdocs';
}

export function resolveEffectiveDocsShape(
  repoShape: DocsRepoShape,
  framework: DocsFramework,
  repoRoot: string,
  targetDir: string,
): DocsRepoShape {
  if (repoShape !== 'single-package' || framework !== 'fumadocs') {
    return repoShape;
  }

  if (!targetDir.trim()) {
    return repoShape;
  }

  const targetPath = resolve(repoRoot, targetDir);
  const relativeTarget = relative(resolve(repoRoot), targetPath);
  const isRepoSubdirectory =
    relativeTarget !== '' &&
    relativeTarget !== '.' &&
    !relativeTarget.startsWith('..') &&
    !isAbsolute(relativeTarget);

  return isRepoSubdirectory ? 'nested-standalone' : repoShape;
}

export async function resolveDocsInitOptions(
  input: ResolveDocsInitOptionsInput,
): Promise<DocsInitResolvedOptions | null> {
  const ctx = { interactive: input.interactive };

  const framework =
    input.providedFramework ||
    (input.interactive && !input.acceptDefaults
      ? await input.selectWithAbort(
          'Documentation framework',
          FRAMEWORK_CHOICES,
          ctx,
        )
      : 'fumadocs');

  if (!framework) {
    return null;
  }

  const defaultAppName = getDefaultDocsAppName(input.repoRoot, input.repoShape);
  const appName =
    input.providedAppName?.trim() ||
    (input.interactive && !input.acceptDefaults
      ? await input.inputWithDefault('Docs app name', defaultAppName, ctx)
      : defaultAppName);

  if (!appName) {
    return null;
  }

  const defaultSiteName = humanizeAppName(appName);
  const siteName =
    input.providedSiteName ??
    (input.interactive && !input.acceptDefaults
      ? await input.inputWithDefault('Site name', defaultSiteName, ctx)
      : defaultSiteName);

  if (siteName === null) {
    return null;
  }

  const defaultTargetDir = getDefaultDocsTargetDir(input.repoShape, appName);
  const targetDir =
    input.providedTargetDir?.trim() ||
    (input.interactive && !input.acceptDefaults
      ? await input.inputWithDefault(
          'Docs app target directory',
          defaultTargetDir,
          ctx,
        )
      : defaultTargetDir);

  if (!targetDir) {
    return null;
  }

  const siteDescription =
    input.providedSiteDescription ??
    (input.interactive && !input.acceptDefaults
      ? ((await input.inputWithDefault('Site description', '', ctx)) ?? '')
      : '');

  const lint =
    input.providedLint ||
    (input.interactive && !input.acceptDefaults
      ? await input.selectWithAbort('Markdown lint mode', LINT_CHOICES, ctx)
      : 'none');

  if (!lint) {
    return null;
  }

  const format =
    input.providedFormat ||
    (input.interactive && !input.acceptDefaults
      ? await input.selectWithAbort('Markdown format mode', FORMAT_CHOICES, ctx)
      : 'oxfmt');

  if (!format) {
    return null;
  }

  const repoShape = resolveEffectiveDocsShape(
    input.repoShape,
    framework,
    input.repoRoot,
    targetDir,
  );

  return {
    repoRoot: input.repoRoot,
    repoShape,
    framework,
    appName,
    siteName,
    targetDir,
    siteDescription,
    lint,
    format,
    rootPatch: input.providedRootPatch ?? true,
  };
}

export const DEFAULT_DOCS_REPO_SHAPE_DEPENDENCIES: DocsRepoShapeDependencies = {
  fileExists,
  dirExists,
  readFile: async (path, encoding) => {
    const { readFile } = await import('node:fs/promises');
    return readFile(path, encoding);
  },
};
