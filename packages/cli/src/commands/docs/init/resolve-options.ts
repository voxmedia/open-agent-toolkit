import { basename, join } from 'node:path';
import type {
  PromptContext,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import { dirExists, fileExists } from '@fs/io';

export type DocsRepoShape = 'monorepo' | 'single-package';
export type DocsFramework = 'fumadocs' | 'mkdocs';
export type DocsLintMode = 'markdownlint' | 'none';
export type DocsFormatMode = 'prettier' | 'none';

export interface DocsInitResolvedOptions {
  repoRoot: string;
  repoShape: DocsRepoShape;
  framework: DocsFramework;
  appName: string;
  targetDir: string;
  siteDescription: string;
  lint: DocsLintMode;
  format: DocsFormatMode;
}

export interface ResolveDocsInitOptionsInput {
  repoRoot: string;
  repoShape: DocsRepoShape;
  interactive: boolean;
  acceptDefaults: boolean;
  providedFramework?: DocsFramework;
  providedAppName?: string;
  providedTargetDir?: string;
  providedSiteDescription?: string;
  providedLint?: DocsLintMode;
  providedFormat?: DocsFormatMode;
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
  { label: 'markdownlint', value: 'markdownlint' },
  { label: 'none', value: 'none' },
];

const FORMAT_CHOICES: SelectChoice<DocsFormatMode>[] = [
  { label: 'prettier', value: 'prettier' },
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
): Promise<DocsRepoShape> {
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
      : 'markdownlint');

  if (!lint) {
    return null;
  }

  const format =
    input.providedFormat ||
    (input.interactive && !input.acceptDefaults
      ? await input.selectWithAbort('Markdown format mode', FORMAT_CHOICES, ctx)
      : 'prettier');

  if (!format) {
    return null;
  }

  return {
    repoRoot: input.repoRoot,
    repoShape: input.repoShape,
    framework,
    appName,
    targetDir,
    siteDescription,
    lint,
    format,
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
