import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { OatDocumentationConfig } from '@config/oat-config';
import { dirExists, ensureDir, fileExists } from '@fs/io';

import type {
  DocsFormatMode,
  DocsFramework,
  DocsInitResolvedOptions,
  DocsLintMode,
} from './resolve-options';
import { getTemplateDir } from './resolve-options';

interface TemplateFile {
  source: string;
  destination: string;
}

const MKDOCS_TEMPLATE_FILES: TemplateFile[] = [
  { source: '.gitignore', destination: '.gitignore' },
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
];

const FUMA_TEMPLATE_FILES: TemplateFile[] = [
  { source: '.gitignore', destination: '.gitignore' },
  { source: 'next.config.js', destination: 'next.config.js' },
  { source: 'postcss.config.mjs', destination: 'postcss.config.mjs' },
  { source: 'source.config.ts', destination: 'source.config.ts' },
  { source: 'tsconfig.json', destination: 'tsconfig.json' },
  { source: 'package.json.template', destination: 'package.json' },
  {
    source: join('lib', 'source.ts'),
    destination: join('lib', 'source.ts'),
  },
  {
    source: join('app', 'globals.css'),
    destination: join('app', 'globals.css'),
  },
  {
    source: join('app', 'layout.tsx'),
    destination: join('app', 'layout.tsx'),
  },
  {
    source: join('app', '[[...slug]]', 'page.tsx'),
    destination: join('app', '[[...slug]]', 'page.tsx'),
  },
  {
    source: join('app', 'api', 'search', 'route.ts'),
    destination: join('app', 'api', 'search', 'route.ts'),
  },
  { source: join('docs', 'index.md'), destination: join('docs', 'index.md') },
  {
    source: join('docs', 'getting-started.md'),
    destination: join('docs', 'getting-started.md'),
  },
  {
    source: join('docs', 'contributing.md'),
    destination: join('docs', 'contributing.md'),
  },
];

interface FrameworkConfig {
  templateFiles: TemplateFile[];
  sentinelFile: string;
}

const FRAMEWORK_CONFIGS: Record<DocsFramework, FrameworkConfig> = {
  mkdocs: {
    templateFiles: MKDOCS_TEMPLATE_FILES,
    sentinelFile: 'mkdocs.yml',
  },
  fumadocs: {
    templateFiles: FUMA_TEMPLATE_FILES,
    sentinelFile: 'next.config.js',
  },
};

export interface ScaffoldDocsAppOptions extends DocsInitResolvedOptions {
  assetsRoot: string;
}

export interface ScaffoldDocsAppResult {
  appRoot: string;
  createdFiles: string[];
  documentationConfig: OatDocumentationConfig;
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

  if (format === 'oxfmt') {
    entries.push('    "oxfmt": "^0.36.0"');
  }

  return entries.join(',\n');
}

function buildFumaDevDependencies(
  lint: DocsLintMode,
  format: DocsFormatMode,
): string {
  const entries: string[] = [];

  if (format === 'oxfmt') {
    entries.push('    "oxfmt": "^0.36.0"');
  }

  if (entries.length === 0) {
    return '';
  }

  return `,\n${entries.join(',\n')}`;
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
    '{{SITE_DESCRIPTION}}': options.siteDescription,
    '{{DOCS_LINT_SCRIPT}}': "echo 'docs lint disabled'",
    '{{DOCS_FORMAT_SCRIPT}}':
      options.format === 'oxfmt'
        ? "oxfmt 'docs/**/*.md'"
        : "echo 'docs formatting disabled'",
    '{{DOCS_FORMAT_CHECK_SCRIPT}}':
      options.format === 'oxfmt'
        ? "oxfmt --check 'docs/**/*.md'"
        : "echo 'docs format check disabled'",
    '{{DEV_DEPENDENCIES}}': buildDevDependencies(options.lint, options.format),
    '{{FUMA_DEV_DEPENDENCIES}}': buildFumaDevDependencies(
      options.lint,
      options.format,
    ),
    '{{REPO_NAME}}': repoName,
    '{{APP_DIR}}': options.targetDir,
  };

  return Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template,
  );
}

function buildDocumentationConfig(
  framework: DocsFramework,
  targetDir: string,
): OatDocumentationConfig {
  if (framework === 'fumadocs') {
    return {
      root: targetDir,
      tooling: 'fumadocs',
      index: join(targetDir, 'index.md'),
    };
  }

  return {
    root: targetDir,
    tooling: 'mkdocs',
    config: join(targetDir, 'mkdocs.yml'),
    index: join(targetDir, 'mkdocs.yml'),
  };
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
  const templateDir = getTemplateDir(options.framework);
  const templateRoot = join(options.assetsRoot, 'templates', templateDir);
  const frameworkConfig = FRAMEWORK_CONFIGS[options.framework];
  const createdFiles: string[] = [];

  if (!(await fileExists(join(templateRoot, frameworkConfig.sentinelFile)))) {
    throw new Error(`Docs app templates not found under ${templateRoot}`);
  }

  await ensureTargetWritable(appRoot);
  await ensureDir(appRoot);

  for (const templateFile of frameworkConfig.templateFiles) {
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
    documentationConfig: buildDocumentationConfig(
      options.framework,
      options.targetDir,
    ),
  };
}
