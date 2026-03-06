import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { dirExists, ensureDir, fileExists } from '@fs/io';
import type {
  DocsFormatMode,
  DocsInitResolvedOptions,
  DocsLintMode,
} from './resolve-options';

const TEMPLATE_FILES = [
  {
    source: '.markdownlint-cli2.jsonc',
    destination: '.markdownlint-cli2.jsonc',
  },
  { source: 'mkdocs.yml', destination: 'mkdocs.yml' },
  { source: 'package.json.template', destination: 'package.json' },
  { source: 'requirements.txt', destination: 'requirements.txt' },
  { source: 'setup-docs.sh', destination: 'setup-docs.sh' },
  { source: join('docs', 'index.md'), destination: join('docs', 'index.md') },
  {
    source: join('docs', 'getting-started.md'),
    destination: join('docs', 'getting-started.md'),
  },
  {
    source: join('docs', 'contributing.md'),
    destination: join('docs', 'contributing.md'),
  },
] as const;

export interface ScaffoldDocsAppOptions extends DocsInitResolvedOptions {
  assetsRoot: string;
}

export interface ScaffoldDocsAppResult {
  appRoot: string;
  createdFiles: string[];
}

function humanizeAppName(appName: string): string {
  return appName
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDevDependencies(
  lint: DocsLintMode,
  format: DocsFormatMode,
): string {
  const entries: string[] = [];

  if (lint === 'markdownlint') {
    entries.push('    "markdownlint-cli2": "^0.13.0"');
  }

  if (format === 'prettier') {
    entries.push('    "prettier": "^3.4.2"');
  }

  return entries.join(',\n');
}

function renderTemplate(
  template: string,
  options: DocsInitResolvedOptions,
): string {
  const repoName = basename(options.repoRoot);
  const siteName = `${humanizeAppName(options.appName)} Documentation`;
  const replacements: Record<string, string> = {
    '{{APP_NAME}}': options.appName,
    '{{PACKAGE_NAME}}': options.appName,
    '{{SITE_NAME}}': siteName,
    '{{DOCS_LINT_SCRIPT}}':
      options.lint === 'markdownlint'
        ? "markdownlint-cli2 'docs/**/*.md'"
        : "echo 'docs lint disabled'",
    '{{DOCS_FORMAT_SCRIPT}}':
      options.format === 'prettier'
        ? "prettier --write 'docs/**/*.md'"
        : "echo 'docs formatting disabled'",
    '{{DOCS_FORMAT_CHECK_SCRIPT}}':
      options.format === 'prettier'
        ? "prettier --check 'docs/**/*.md'"
        : "echo 'docs format check disabled'",
    '{{DEV_DEPENDENCIES}}': buildDevDependencies(options.lint, options.format),
    '{{REPO_NAME}}': repoName,
  };

  return Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template,
  );
}

async function ensureTargetWritable(appRoot: string): Promise<void> {
  if (!(await dirExists(appRoot))) {
    return;
  }

  const entries = await readdir(appRoot);
  if (entries.length > 0) {
    throw new Error(`Docs app target directory is not empty: ${appRoot}`);
  }
}

export async function scaffoldDocsApp(
  options: ScaffoldDocsAppOptions,
): Promise<ScaffoldDocsAppResult> {
  const appRoot = join(options.repoRoot, options.targetDir);
  const templateRoot = join(options.assetsRoot, 'templates', 'docs-app');
  const createdFiles: string[] = [];

  if (!(await fileExists(join(templateRoot, 'mkdocs.yml')))) {
    throw new Error(`Docs app templates not found under ${templateRoot}`);
  }

  await ensureTargetWritable(appRoot);
  await ensureDir(appRoot);

  for (const templateFile of TEMPLATE_FILES) {
    const source = join(templateRoot, templateFile.source);
    const destination = join(appRoot, templateFile.destination);
    const template = await readFile(source, 'utf8');
    const rendered = renderTemplate(template, options);
    await ensureDir(dirname(destination));
    await writeFile(destination, rendered, 'utf8');
    createdFiles.push(templateFile.destination);
  }

  return {
    appRoot,
    createdFiles,
  };
}
